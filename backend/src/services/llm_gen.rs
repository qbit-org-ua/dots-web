use std::sync::Arc;

use futures::stream::{self, StreamExt};
use sqlx::MySqlPool;

use crate::config::Config;
use crate::services::file_storage;

/// Maximum number of solutions processed in parallel by the LLM job.
const MAX_CONCURRENCY: usize = 40;

/// Per-solution timeout for the LLM call + file replacement step.
const LLM_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(180);

/// Spawn the background LLM generation loop.
/// Polls for solutions with test_result = -4 and processes up to
/// MAX_CONCURRENCY in parallel via a `buffered` stream of futures.
/// Sends source to LLM, replaces source file with generated C++, sets
/// test_result = -1. On timeout, resets to -4 so another worker can retry.
pub fn spawn(pool: MySqlPool, config: Arc<Config>) {
    tokio::spawn(async move {
        // A stream that yields one processing future per claimed solution.
        // The unfold itself is sequential (claim DB row → produce future);
        // the produced futures are then run concurrently by `.buffered(N)`.
        let work_stream = stream::unfold(
            (pool.clone(), config.clone()),
            |(pool, config)| async move {
                loop {
                    match claim_one(&pool).await {
                        Ok(Some(claimed)) => {
                            let pool_fut = pool.clone();
                            let config_fut = config.clone();
                            let fut = async move {
                                process_claimed(&pool_fut, &config_fut, claimed).await;
                            };
                            return Some((fut, (pool, config)));
                        }
                        Ok(None) => {}
                        Err(e) => tracing::error!("llm_gen claim error: {e:#}"),
                    }
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                }
            },
        );

        work_stream
            .buffered(MAX_CONCURRENCY)
            .for_each(|()| async {})
            .await;
    });
}

/// TL bitmask flag used by the frontend verdict display.
const TEST_RESULT_TL: i32 = 0x0010;

/// Atomically claim one pending solution by flipping it from -4 (first
/// attempt) or -6 (retry) to -5.  Uses MySQL's LAST_INSERT_ID(expr) trick
/// so the claimed id is returned on the same connection — safe under
/// concurrent callers because each UPDATE+LIMIT 1 affects a distinct row.
async fn claim_one(pool: &MySqlPool) -> anyhow::Result<Option<ClaimedSolution>> {
    // Try first-attempt solutions (-4) first, then retries (-6).
    for (status, is_retry) in [(-4, false), (-6, true)] {
        let result = sqlx::query(
            "UPDATE labs_solutions \
             SET test_result = -5, solution_id = LAST_INSERT_ID(solution_id) \
             WHERE test_result = ? LIMIT 1",
        )
        .bind(status)
        .execute(pool)
        .await?;

        if result.rows_affected() == 0 {
            continue;
        }

        let sid = result.last_insert_id() as u32;

        let row = sqlx::query_as::<_, SolutionRow>(
            "SELECT solution_id, problem_id, user_id, lang_id, check_type \
             FROM labs_solutions WHERE solution_id = ?",
        )
        .bind(sid)
        .fetch_optional(pool)
        .await?;

        return Ok(row.map(|r| ClaimedSolution {
            row: r,
            is_retry,
        }));
    }

    Ok(None)
}

async fn process_claimed(pool: &MySqlPool, config: &Config, claimed: ClaimedSolution) {
    let sid = claimed.row.solution_id;
    let is_retry = claimed.is_retry;
    tracing::info!(
        "llm_gen: processing solution {sid} ({})",
        if is_retry { "retry" } else { "first attempt" }
    );

    let result =
        tokio::time::timeout(LLM_TIMEOUT, generate_and_replace(pool, config, &claimed.row)).await;

    match result {
        Ok(Ok(())) => {
            tracing::info!("llm_gen: solution {sid} done, set to -1");
        }
        Err(_elapsed) => {
            if is_retry {
                // Second timeout — give up with TL verdict.
                tracing::warn!(
                    "llm_gen: solution {sid} timed out twice, marking as TL"
                );
                if let Err(e) = sqlx::query(
                    "UPDATE labs_solutions SET test_result = ?, \
                     compile_error = 'LLM inference timed out' WHERE solution_id = ?",
                )
                .bind(TEST_RESULT_TL)
                .bind(sid)
                .execute(pool)
                .await
                {
                    tracing::error!("llm_gen: failed to set TL for solution {sid}: {e:#}");
                }
            } else {
                // First timeout — queue for one more attempt (-6).
                tracing::warn!(
                    "llm_gen: solution {sid} timed out after {}s, queuing retry (-6)",
                    LLM_TIMEOUT.as_secs()
                );
                if let Err(e) = sqlx::query(
                    "UPDATE labs_solutions SET test_result = -6 WHERE solution_id = ?",
                )
                .bind(sid)
                .execute(pool)
                .await
                {
                    tracing::error!("llm_gen: failed to set solution {sid} to -6: {e:#}");
                }
            }
        }
        Ok(Err(e)) => {
            tracing::error!("llm_gen: solution {sid} failed: {e:#}");
            if let Err(e2) = sqlx::query(
                "UPDATE labs_solutions SET test_result = -1, \
                 compile_error = ? WHERE solution_id = ?",
            )
            .bind(format!("LLM generation failed: {e}"))
            .bind(sid)
            .execute(pool)
            .await
            {
                tracing::error!("llm_gen: failed to mark solution {sid} as failed: {e2:#}");
            }
        }
    }
}

async fn generate_and_replace(
    pool: &MySqlPool,
    config: &Config,
    solution: &SolutionRow,
) -> anyhow::Result<()> {
    let sid = solution.solution_id;
    let pid = solution.problem_id;
    let uid = solution.user_id;
    let lang = solution.lang_id as i32;
    let check_type = &solution.check_type;

    // Read source file from disk
    let source_path =
        file_storage::solution_fullname(&config.upload_dir, sid, pid, uid, lang, check_type);
    let original_source = tokio::fs::read_to_string(&source_path)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to read source at {}: {e}", source_path.display()))?;

    // Call LLM API — model depends on lang_id
    let model = match solution.lang_id {
        40 => "zai-org/GLM-5.1-FP8",
        41 => "Qwen/Qwen3.5-122B-A10B",
        other => anyhow::bail!("Unsupported lang_id {other} for LLM generation"),
    };

    let llm_endpoint = match solution.lang_id {
        40 => "https://glm-5-1.completions.near.ai/v1",
        41 => "https://qwen35-122b.completions.near.ai/v1",
        _ => "https://cloud-api.near.ai/v1",
    };

    let api_key = &config.nearai_api_key;
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "Ти генератор коду для задач спортивного програмування.\nКористувач надсилає промпт українською мовою.\nТвоє завдання: повернути лише готову програму на C++17.\n\nПравила:\n1. Поверни рівно один markdown-блок виду ```cpp ... ```\n2. Не пиши жодних пояснень до або після коду.\n3. Код має компілюватися як один файл.\n4. Використовуй стандартний ввід і стандартний вивід.\n5. Якщо в промпті бракує деталей, зроби найрозумніше припущення, але все одно поверни лише код."
            },
            {
                "role": "user",
                "content": original_source
            }
        ]
    });

    let resp: serde_json::Value = loop {
        let send_result = client
            .post(format!("{llm_endpoint}/chat/completions"))
            .bearer_auth(api_key)
            .json(&body)
            .send()
            .await;

        match send_result {
            Ok(response) if response.status().is_success() => {
                match response.json().await {
                    Ok(v) => break v,
                    Err(e) => {
                        tracing::warn!(
                            "llm_gen: solution {sid} failed to parse response: {e:#}, retrying in 10s"
                        );
                    }
                }
            }
            Ok(response) => {
                let status = response.status();
                let text = response.text().await.unwrap_or_default();
                tracing::warn!(
                    "llm_gen: solution {sid} API returned {status}: {text}, retrying in 10s"
                );
            }
            Err(e) => {
                tracing::warn!(
                    "llm_gen: solution {sid} request failed: {e:#}, retrying in 10s"
                );
            }
        }

        tokio::time::sleep(std::time::Duration::from_secs(10)).await;
    };

    // Extract the assistant message content
    let content = resp["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("No content in LLM response: {resp}"))?;

    // Extract C++ code from markdown block
    let cpp_code = extract_cpp_code(content)?;

    // Extract total_tokens from usage
    let total_tokens = resp["usage"]["total_tokens"]
        .as_u64()
        .map(|t| t.to_string())
        .unwrap_or_else(|| "unknown".to_string());

    // Escape original source as a C++ block comment and prepend
    let escaped_prompt = original_source.replace("*/", "* /");
    let final_source = format!(
        "/*\nOriginal prompt:\n{escaped_prompt}\n\ntotal_tokens: {total_tokens}\n*/\n{cpp_code}"
    );

    // Overwrite the source file on disk
    if let Some(parent) = source_path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    tokio::fs::write(&source_path, &final_source).await?;

    // Update checksum and set test_result = -1 so the judge picks it up
    use md5::{Digest, Md5};
    let mut hasher = Md5::new();
    hasher.update(final_source.as_bytes());
    let checksum = hex::encode(hasher.finalize());

    sqlx::query(
        "UPDATE labs_solutions SET test_result = -1, compile_error = NULL, \
         checksum = ? WHERE solution_id = ?",
    )
    .bind(&checksum)
    .bind(sid)
    .execute(pool)
    .await?;

    Ok(())
}

/// Extract C++ code from a markdown ```cpp ... ``` block.
fn extract_cpp_code(content: &str) -> anyhow::Result<String> {
    // Try to find ```cpp ... ``` block
    if let Some(start) = content.find("```cpp") {
        let code_start = start + "```cpp".len();
        if let Some(end) = content[code_start..].find("```") {
            let code = content[code_start..code_start + end].trim();
            return Ok(code.to_string());
        }
    }
    // Fallback: try ``` ... ``` block
    if let Some(start) = content.find("```") {
        let code_start = start + 3;
        // Skip optional language tag on first line
        let code_after = &content[code_start..];
        let code_after = if let Some(nl) = code_after.find('\n') {
            &code_after[nl + 1..]
        } else {
            code_after
        };
        if let Some(end) = code_after.find("```") {
            let code = code_after[..end].trim();
            return Ok(code.to_string());
        }
    }
    // Last resort: use the entire content as code
    Ok(content.trim().to_string())
}

struct ClaimedSolution {
    row: SolutionRow,
    is_retry: bool,
}

#[derive(sqlx::FromRow)]
struct SolutionRow {
    solution_id: u32,
    problem_id: u32,
    user_id: u32,
    lang_id: u32,
    check_type: String,
}
