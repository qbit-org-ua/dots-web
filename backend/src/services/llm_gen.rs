use std::sync::Arc;

use sqlx::MySqlPool;

use crate::config::Config;
use crate::services::file_storage;

/// Spawn the background LLM generation loop.
/// Runs every second, picks up solutions with test_result = -4,
/// sends source to LLM, replaces source file with generated C++, sets test_result = -1.
pub fn spawn(pool: MySqlPool, config: Arc<Config>) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(1));
        loop {
            interval.tick().await;
            if let Err(e) = process_one(&pool, &config).await {
                tracing::error!("llm_gen job error: {e:#}");
            }
        }
    });
}

async fn process_one(pool: &MySqlPool, config: &Config) -> anyhow::Result<()> {
    // Atomically claim a solution: set test_result = -5 where it was -4 (LIMIT 1)
    let result = sqlx::query(
        "UPDATE labs_solutions SET test_result = -5 WHERE test_result = -4 LIMIT 1",
    )
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Ok(());
    }

    // Fetch the claimed solution
    let solution = sqlx::query_as::<_, SolutionRow>(
        "SELECT solution_id, problem_id, user_id, lang_id, check_type \
         FROM labs_solutions WHERE test_result = -5 LIMIT 1",
    )
    .fetch_optional(pool)
    .await?;

    let solution = match solution {
        Some(s) => s,
        None => return Ok(()),
    };

    let sid = solution.solution_id;
    tracing::info!("llm_gen: processing solution {sid}");

    match generate_and_replace(pool, config, &solution).await {
        Ok(()) => {
            tracing::info!("llm_gen: solution {sid} done, setting test_result = -1");
        }
        Err(e) => {
            tracing::error!("llm_gen: solution {sid} failed: {e:#}");
            // Put it back as pending for normal judging with an error note
            sqlx::query(
                "UPDATE labs_solutions SET test_result = -1, \
                 compile_error = ? WHERE solution_id = ?",
            )
            .bind(format!("LLM generation failed: {e}"))
            .bind(sid)
            .execute(pool)
            .await?;
        }
    }

    Ok(())
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

    // Call LLM API
    let api_key = &config.nearai_api_key;
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": "zai-org/GLM-5-FP8",
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

    let response = client
        .post("https://cloud-api.near.ai/v1/chat/completions")
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        anyhow::bail!("LLM API returned {status}: {text}");
    }

    let resp: serde_json::Value = response.json().await?;

    // Extract the assistant message content
    let content = resp["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("No content in LLM response: {resp}"))?;

    // Extract C++ code from markdown block
    let cpp_code = extract_cpp_code(content)?;

    // Escape original source as a C++ block comment and prepend
    let escaped_prompt = original_source.replace("*/", "* /");
    let final_source = format!(
        "/*\nOriginal prompt:\n{escaped_prompt}\n*/\n{cpp_code}"
    );

    // Overwrite the source file on disk
    if let Some(parent) = source_path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    tokio::fs::write(&source_path, &final_source).await?;

    // Update checksum and set test_result = -1 so the judge picks it up
    use md5::{Md5, Digest};
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

#[derive(sqlx::FromRow)]
struct SolutionRow {
    solution_id: u32,
    problem_id: u32,
    user_id: u32,
    lang_id: u32,
    check_type: String,
}
