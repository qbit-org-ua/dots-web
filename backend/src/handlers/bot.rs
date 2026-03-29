use axum::body::Bytes;
use axum::extract::{Query, State};
use axum::http::{header, HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use base64::Engine;
use serde::Deserialize;

use crate::auth::middleware::AppState;
use crate::services::file_storage;

#[derive(Deserialize)]
pub struct BotParams {
    pub action: Option<String>,
    #[allow(dead_code)]
    pub id: Option<u32>,
    pub sid: Option<u32>,
    pub pid: Option<u32>,
    #[allow(dead_code)]
    pub uid: Option<u32>,
}

/// Verify HTTP Basic Auth against bot_friends list
fn verify_bot_auth(headers: &HeaderMap, state: &AppState) -> bool {
    let auth_header = match headers.get(header::AUTHORIZATION) {
        Some(h) => match h.to_str() {
            Ok(s) => s.to_string(),
            Err(_) => return false,
        },
        None => return false,
    };

    if !auth_header.starts_with("Basic ") {
        return false;
    }

    let decoded = match base64::engine::general_purpose::STANDARD.decode(&auth_header[6..]) {
        Ok(d) => match String::from_utf8(d) {
            Ok(s) => s,
            Err(_) => return false,
        },
        Err(_) => return false,
    };

    let parts: Vec<&str> = decoded.splitn(2, ':').collect();
    if parts.len() != 2 {
        return false;
    }

    let (user, pass) = (parts[0], parts[1]);

    state
        .config
        .bot_friends
        .iter()
        .any(|(u, p)| u == user && p == pass)
}

fn unauthorized() -> Response {
    (
        StatusCode::UNAUTHORIZED,
        [(header::WWW_AUTHENTICATE, "Basic realm=\"Bot API\"")],
        "Unauthorized",
    )
        .into_response()
}

fn text_response(body: &str) -> Response {
    (StatusCode::OK, [(header::CONTENT_TYPE, "text/plain")], body.to_string()).into_response()
}

fn binary_response(data: Vec<u8>, filename: &str) -> Response {
    (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "application/octet-stream"),
            (
                header::CONTENT_DISPOSITION,
                &format!("attachment; filename=\"{}\"", filename),
            ),
        ],
        data,
    )
        .into_response()
}

pub async fn bot_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<BotParams>,
    body: Bytes,
) -> Response {
    if !verify_bot_auth(&headers, &state) {
        return unauthorized();
    }

    let action = params.action.as_deref().unwrap_or("");

    match action.chars().next() {
        Some('s') => handle_solution(&state, &params, action).await,
        Some('c') | Some('l') => handle_checkout(&state, &params, action).await,
        Some('u') => handle_unlock(&state, &params).await,
        Some('r') => handle_results(&state, &params, &body).await,
        Some('t') => handle_tests(&state, &params).await,
        Some('b') => handle_gc(&state).await,
        Some('i') => handle_import(&state, &params).await,
        _ => text_response("ERR: unknown action"),
    }
}

/// Solution download: get next pending solution or download by ID
async fn handle_solution(state: &AppState, params: &BotParams, action: &str) -> Response {
    if let Some(sid) = params.sid {
        // Download specific solution by ID
        return download_solution(state, sid).await;
    }

    // Get next solution to test (test_result = -1)
    // Lock to prevent race conditions
    let solution: Option<(u32, u32, u32, u32, String)> = sqlx::query_as(
        "SELECT solution_id, problem_id, user_id, lang_id, check_type \
         FROM labs_solutions WHERE test_result = -1 \
         ORDER BY solution_id ASC LIMIT 1"
    )
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    match solution {
        Some((sid, pid, uid, lang_id, check_type)) => {
            // Mark as being tested (test_result = -2)
            let _ = sqlx::query(
                "UPDATE labs_solutions SET test_result = -2 WHERE solution_id = ? AND test_result = -1"
            )
            .bind(sid)
            .execute(&state.pool)
            .await;

            if action == "sd" {
                // Download the source file
                download_solution(state, sid).await
            } else {
                // Return solution info
                text_response(&format!("{}|{}|{}|{}|{}", sid, pid, uid, lang_id, check_type))
            }
        }
        None => text_response("EMPTY"),
    }
}

async fn download_solution(state: &AppState, solution_id: u32) -> Response {
    let solution: Option<(u32, u32, u32, u32, String)> = sqlx::query_as(
        "SELECT solution_id, problem_id, user_id, lang_id, check_type \
         FROM labs_solutions WHERE solution_id = ?"
    )
    .bind(solution_id)
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    match solution {
        Some((sid, pid, uid, lang_id, check_type)) => {
            let path = file_storage::solution_fullname(
                &state.config.upload_dir, sid, pid, uid, lang_id as i32, &check_type,
            );

            match tokio::fs::read(&path).await {
                Ok(data) => {
                    let filename = file_storage::solution_filename(sid, pid, uid, lang_id as i32, &check_type);
                    binary_response(data, &filename)
                }
                Err(_) => text_response("ERR: file not found"),
            }
        }
        None => text_response("ERR: solution not found"),
    }
}

/// Safe checkout: verify file exists, set test_result to -3
async fn handle_checkout(state: &AppState, params: &BotParams, action: &str) -> Response {
    let sid = match params.sid {
        Some(s) => s,
        None => return text_response("ERR: sid required"),
    };

    let solution: Option<(u32, u32, u32, u32, String)> = sqlx::query_as(
        "SELECT solution_id, problem_id, user_id, lang_id, check_type \
         FROM labs_solutions WHERE solution_id = ?"
    )
    .bind(sid)
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    match solution {
        Some((sid, pid, uid, lang_id, check_type)) => {
            let path = file_storage::solution_fullname(
                &state.config.upload_dir, sid, pid, uid, lang_id as i32, &check_type,
            );

            if !tokio::fs::try_exists(&path).await.unwrap_or(false) {
                // File not found, mark as error
                let _ = sqlx::query(
                    "UPDATE labs_solutions SET test_result = 0, compile_error = 'Source file not found' WHERE solution_id = ?"
                )
                .bind(sid)
                .execute(&state.pool)
                .await;
                return text_response("ERR: source not found");
            }

            // Set test_result = -3 (checked out)
            let _ = sqlx::query(
                "UPDATE labs_solutions SET test_result = -3 WHERE solution_id = ?"
            )
            .bind(sid)
            .execute(&state.pool)
            .await;

            if action == "l" {
                // Return problem complexity (labs_problems doesn't have time_limit/memory_limit/test_count)
                let limits: Option<(i32,)> = sqlx::query_as(
                    "SELECT complexity FROM labs_problems WHERE problem_id = ?"
                )
                .bind(pid)
                .fetch_optional(&state.pool)
                .await
                .ok()
                .flatten();

                match limits {
                    Some((complexity,)) => text_response(&format!("OK|{}", complexity)),
                    None => text_response("ERR: problem not found"),
                }
            } else {
                text_response("OK")
            }
        }
        None => text_response("ERR: solution not found"),
    }
}

/// Unlock: reset test_result to -1
async fn handle_unlock(state: &AppState, params: &BotParams) -> Response {
    let sid = match params.sid {
        Some(s) => s,
        None => return text_response("ERR: sid required"),
    };

    let _ = sqlx::query(
        "UPDATE labs_solutions SET test_result = -1 WHERE solution_id = ? AND test_result IN (-2, -3)"
    )
    .bind(sid)
    .execute(&state.pool)
    .await;

    text_response("OK")
}

/// Results: save result file and trigger import
async fn handle_results(state: &AppState, params: &BotParams, body: &Bytes) -> Response {
    let sid = match params.sid {
        Some(s) => s,
        None => return text_response("ERR: sid required"),
    };

    // Save result file
    let path = file_storage::results_fullname_create(&state.config.upload_dir, sid);

    // Create parent directories
    if let Some(parent) = std::path::Path::new(&path).parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }

    if let Err(e) = tokio::fs::write(&path, body.as_ref()).await {
        return text_response(&format!("ERR: write failed: {}", e));
    }

    // Import results
    match crate::services::import::import_solution(&state.pool, sid, &state.config.upload_dir).await
    {
        Ok(true) => text_response("OK"),
        Ok(false) => text_response("ERR: import failed"),
        Err(e) => text_response(&format!("ERR: {}", e)),
    }
}

/// Tests: serve test archive
async fn handle_tests(state: &AppState, params: &BotParams) -> Response {
    let pid = match params.pid {
        Some(p) => p,
        None => return text_response("ERR: pid required"),
    };

    let path = file_storage::test_archive_path(&state.config.upload_dir, pid);

    match tokio::fs::read(&path).await {
        Ok(data) => {
            let filename = format!("{}.tar.gz", pid);
            binary_response(data, &filename)
        }
        Err(_) => text_response("ERR: test archive not found"),
    }
}

/// GC: randomly reset stale solutions (stuck in testing for > 10 minutes)
async fn handle_gc(state: &AppState) -> Response {
    let cutoff = chrono::Utc::now().timestamp() - 600; // 10 minutes ago

    let result = sqlx::query(
        "UPDATE labs_solutions SET test_result = -1 \
         WHERE test_result IN (-2, -3) AND posted_time < ?"
    )
    .bind(cutoff)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) => text_response(&format!("OK: reset {} stale solutions", r.rows_affected())),
        Err(e) => text_response(&format!("ERR: {}", e)),
    }
}

/// Import: trigger import for a specific solution
async fn handle_import(state: &AppState, params: &BotParams) -> Response {
    let sid = match params.sid {
        Some(s) => s,
        None => return text_response("ERR: sid required"),
    };

    match crate::services::import::import_solution(&state.pool, sid, &state.config.upload_dir).await
    {
        Ok(true) => text_response("OK"),
        Ok(false) => text_response("ERR: import failed"),
        Err(e) => text_response(&format!("ERR: {}", e)),
    }
}

pub fn router() -> axum::Router<AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route("/", get(bot_handler).post(bot_handler))
}
