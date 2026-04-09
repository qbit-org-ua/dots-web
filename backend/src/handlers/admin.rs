use axum::extract::{Path, Query, State};
use axum::http::header::SET_COOKIE;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Deserialize;
use serde_json::json;

use crate::auth::middleware::{AppState, RequireAdmin, RequireAuth};
use crate::auth::password::encrypt_password;
use crate::auth::session::{create_session, generate_session_id, write_session};
use crate::auth::{ACCESS_REGISTERED_USER};
use crate::error::{AppError, AppResult};
use crate::models::Group;

#[derive(Deserialize)]
pub struct LogParams {
    pub file: Option<String>,
    pub lines: Option<usize>,
}

#[derive(Deserialize)]
pub struct BatchRegisterRequest {
    pub users: Vec<BatchUser>,
    pub contest_id: Option<i32>,
    pub access: Option<u32>,
}

#[derive(Deserialize)]
pub struct BatchUser {
    pub email: String,
    pub nickname: String,
    pub password: Option<String>,
    pub fio: Option<String>,
}

#[derive(Deserialize)]
pub struct GroupCreateRequest {
    pub group_name: String,
    pub group_description: Option<String>,
    pub user_ids: Option<Vec<i32>>,
}

#[derive(Deserialize)]
pub struct GroupUpdateRequest {
    pub group_name: Option<String>,
    pub group_description: Option<String>,
    pub user_ids: Option<Vec<i32>>,
}

#[derive(Deserialize)]
pub struct RejudgeRequest {
    pub contest_id: Option<i32>,
    pub problem_id: Option<u32>,
    pub solution_id: Option<u32>,
}

pub async fn get_logs(
    State(state): State<AppState>,
    RequireAdmin(_user): RequireAdmin,
    Query(params): Query<LogParams>,
) -> AppResult<Json<serde_json::Value>> {
    let file = params.file.as_deref().unwrap_or("error.log");
    let max_lines = params.lines.unwrap_or(100).min(1000);

    // Sanitize filename
    let safe_file = file.replace(['/', '\\'], "").replace("..", "");
    let path = format!("{}/log/{}", state.config.upload_dir, safe_file);

    let content = match tokio::fs::read_to_string(&path).await {
        Ok(c) => c,
        Err(_) => return Ok(Json(json!({ "lines": [], "file": safe_file }))),
    };

    let lines: Vec<&str> = content.lines().collect();
    let start = if lines.len() > max_lines {
        lines.len() - max_lines
    } else {
        0
    };
    let tail: Vec<&str> = lines[start..].to_vec();

    Ok(Json(json!({ "lines": tail, "file": safe_file })))
}

pub async fn su_user(
    State(state): State<AppState>,
    RequireAdmin(_admin): RequireAdmin,
    Path(target_user_id): Path<u32>,
    jar: axum_extra::extract::CookieJar,
    headers: axum::http::HeaderMap,
) -> AppResult<Response> {
    // Verify target user exists
    let target: Option<(u32, String)> = sqlx::query_as(
        "SELECT user_id, nickname FROM labs_users WHERE user_id = ?"
    )
    .bind(target_user_id)
    .fetch_optional(&state.pool)
    .await?;
    let _target = target.ok_or(AppError::UserNotFound)?;

    // Save admin session ID for su_back
    let old_session_id = jar.get("DSID").map(|c| c.value().to_string()).unwrap_or_default();

    // Create new session for target user
    let new_session_id = generate_session_id();
    let user_agent_full = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let user_agent = if user_agent_full.len() > 80 { &user_agent_full[..80] } else { user_agent_full };

    create_session(&state.pool, &new_session_id, user_agent, 0, target_user_id).await?;

    // Store the admin's original session in the new session data for su_back
    let session_data = json!({
        "uid": target_user_id,
        "lt": chrono::Utc::now().timestamp(),
        "su_from": old_session_id,
    })
    .to_string();
    write_session(&state.pool, &new_session_id, 0, &session_data).await?;

    let cookie = format!(
        "DSID={}; Path=/; HttpOnly; SameSite=Lax; Max-Age={}",
        new_session_id, 86400
    );

    let mut response = Json(json!({ "ok": true, "user_id": target_user_id })).into_response();
    response.headers_mut().insert(SET_COOKIE, cookie.parse().unwrap());

    Ok(response)
}

pub async fn su_back(
    State(state): State<AppState>,
    RequireAuth(_user): RequireAuth,
    jar: axum_extra::extract::CookieJar,
) -> AppResult<Response> {
    let session_id = jar.get("DSID").map(|c| c.value().to_string()).unwrap_or_default();

    // Read current session to get su_from
    let session: Option<(String,)> = sqlx::query_as(
        "SELECT CAST(session_data AS CHAR) FROM labs_sessions WHERE session_id = ?"
    )
    .bind(&session_id)
    .fetch_optional(&state.pool)
    .await?;

    let session_data = session.ok_or(AppError::LoginFailed)?.0;

    // Parse su_from from session data
    let su_from = serde_json::from_str::<serde_json::Value>(&session_data)
        .ok()
        .and_then(|v| v.get("su_from").and_then(|s| s.as_str().map(String::from)));

    let original_session = su_from.ok_or(AppError::BadRequest("Not in su mode".to_string()))?;

    // Destroy the su session
    crate::auth::session::destroy_session(&state.pool, &session_id).await?;

    // Restore original admin session cookie
    let cookie = format!(
        "DSID={}; Path=/; HttpOnly; SameSite=Lax; Max-Age={}",
        original_session, 86400 * 30
    );

    let mut response = Json(json!({ "ok": true })).into_response();
    response.headers_mut().insert(SET_COOKIE, cookie.parse().unwrap());

    Ok(response)
}

pub async fn batch_register(
    State(state): State<AppState>,
    RequireAdmin(_user): RequireAdmin,
    Json(req): Json<BatchRegisterRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let access = req.access.unwrap_or(ACCESS_REGISTERED_USER);
    let now = chrono::Utc::now().timestamp() as i32;
    let mut created = Vec::new();
    let mut errors = Vec::new();

    for batch_user in &req.users {
        // Check if email already exists
        let exists: Option<(u32,)> = sqlx::query_as(
            "SELECT user_id FROM labs_users WHERE email = ?"
        )
        .bind(&batch_user.email)
        .fetch_optional(&state.pool)
        .await?;

        if let Some((existing_id,)) = exists {
            // If contest_id provided, just register for contest
            if let Some(cid) = req.contest_id {
                let _ = sqlx::query(
                    "INSERT IGNORE INTO labs_contest_users (contest_id, user_id, reg_status, reg_data) VALUES (?, ?, 0, '')"
                )
                .bind(cid)
                .bind(existing_id)
                .execute(&state.pool)
                .await;
            }
            errors.push(json!({
                "email": batch_user.email,
                "error": "already exists",
                "user_id": existing_id,
            }));
            continue;
        }

        let password = batch_user
            .password
            .clone()
            .unwrap_or_else(|| crate::auth::password::generate_random_password(8));
        let hashed = encrypt_password(&batch_user.email, &password);

        let result = sqlx::query(
            "INSERT INTO labs_users (email, password, nickname, access, created, is_activated, \
             FIO, birthday) VALUES (?, ?, ?, ?, ?, 1, ?, '2000-01-01')"
        )
        .bind(&batch_user.email)
        .bind(&hashed)
        .bind(&batch_user.nickname)
        .bind(access)
        .bind(now)
        .bind(batch_user.fio.as_deref().unwrap_or(""))
        .execute(&state.pool)
        .await;

        match result {
            Ok(r) => {
                let user_id = r.last_insert_id() as u32;

                // Register for contest if provided
                if let Some(cid) = req.contest_id {
                    let _ = sqlx::query(
                        "INSERT IGNORE INTO labs_contest_users (contest_id, user_id, reg_status, reg_data) VALUES (?, ?, 0, '')"
                    )
                    .bind(cid)
                    .bind(user_id)
                    .execute(&state.pool)
                    .await;
                }

                created.push(json!({
                    "email": batch_user.email,
                    "nickname": batch_user.nickname,
                    "password": password,
                    "user_id": user_id,
                }));
            }
            Err(e) => {
                errors.push(json!({
                    "email": batch_user.email,
                    "error": e.to_string(),
                }));
            }
        }
    }

    Ok(Json(json!({
        "ok": true,
        "created": created,
        "errors": errors,
    })))
}

pub async fn list_groups(
    State(state): State<AppState>,
    RequireAdmin(_user): RequireAdmin,
) -> AppResult<Json<serde_json::Value>> {
    let groups: Vec<Group> = sqlx::query_as(
        "SELECT group_id, group_name, teacher_id, group_description FROM labs_groups ORDER BY group_id ASC"
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(json!({ "groups": groups })))
}

pub async fn create_group(
    State(state): State<AppState>,
    RequireAdmin(user): RequireAdmin,
    Json(req): Json<GroupCreateRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let result = sqlx::query(
        "INSERT INTO labs_groups (group_name, group_description, teacher_id) VALUES (?, ?, ?)"
    )
    .bind(&req.group_name)
    .bind(req.group_description.as_deref().unwrap_or(""))
    .bind(user.user_id)
    .execute(&state.pool)
    .await?;

    let group_id = result.last_insert_id() as i32;

    // Add users to group if provided
    if let Some(ref user_ids) = req.user_ids {
        for uid in user_ids {
            let _ = sqlx::query(
                "INSERT IGNORE INTO labs_user_group_relationships (user_id, group_id) VALUES (?, ?)"
            )
            .bind(uid)
            .bind(group_id)
            .execute(&state.pool)
            .await;
        }
    }

    Ok(Json(json!({ "ok": true, "group_id": group_id })))
}

pub async fn update_group(
    State(state): State<AppState>,
    Path(group_id): Path<i32>,
    RequireAdmin(_user): RequireAdmin,
    Json(req): Json<GroupUpdateRequest>,
) -> AppResult<Json<serde_json::Value>> {
    if let Some(ref group_name) = req.group_name {
        sqlx::query("UPDATE labs_groups SET group_name = ? WHERE group_id = ?")
            .bind(group_name)
            .bind(group_id)
            .execute(&state.pool)
            .await?;
    }
    if let Some(ref desc) = req.group_description {
        sqlx::query("UPDATE labs_groups SET group_description = ? WHERE group_id = ?")
            .bind(desc)
            .bind(group_id)
            .execute(&state.pool)
            .await?;
    }

    // Replace user list if provided
    if let Some(ref user_ids) = req.user_ids {
        sqlx::query("DELETE FROM labs_user_group_relationships WHERE group_id = ?")
            .bind(group_id)
            .execute(&state.pool)
            .await?;

        for uid in user_ids {
            let _ = sqlx::query(
                "INSERT INTO labs_user_group_relationships (user_id, group_id) VALUES (?, ?)"
            )
            .bind(uid)
            .bind(group_id)
            .execute(&state.pool)
            .await;
        }
    }

    Ok(Json(json!({ "ok": true })))
}

pub async fn delete_group(
    State(state): State<AppState>,
    Path(group_id): Path<i32>,
    RequireAdmin(_user): RequireAdmin,
) -> AppResult<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM labs_user_group_relationships WHERE group_id = ?")
        .bind(group_id)
        .execute(&state.pool)
        .await?;

    sqlx::query("DELETE FROM labs_groups WHERE group_id = ?")
        .bind(group_id)
        .execute(&state.pool)
        .await?;

    Ok(Json(json!({ "ok": true })))
}

pub async fn rejudge(
    State(state): State<AppState>,
    RequireAdmin(_user): RequireAdmin,
    Json(req): Json<RejudgeRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let mut where_parts = Vec::new();
    let mut bind_values: Vec<String> = Vec::new();

    if let Some(sid) = req.solution_id {
        where_parts.push("solution_id = ?".to_string());
        bind_values.push(sid.to_string());
    }
    if let Some(cid) = req.contest_id {
        where_parts.push("contest_id = ?".to_string());
        bind_values.push(cid.to_string());
    }
    if let Some(pid) = req.problem_id {
        where_parts.push("problem_id = ?".to_string());
        bind_values.push(pid.to_string());
    }

    if where_parts.is_empty() {
        return Err(AppError::BadRequest("Must specify at least one filter".to_string()));
    }

    let sql = format!(
        "UPDATE labs_solutions SET test_result = -1, test_score = 0, compile_error = '' WHERE {}",
        where_parts.join(" AND ")
    );

    let mut query = sqlx::query(&sql);
    for v in &bind_values {
        query = query.bind(v);
    }
    let result = query.execute(&state.pool).await?;

    // Delete test results for affected solutions
    let delete_sql = format!(
        "DELETE t FROM labs_tests t JOIN labs_solutions s ON t.solution_id = s.solution_id WHERE {}",
        where_parts
            .iter()
            .map(|p| format!("s.{}", p))
            .collect::<Vec<_>>()
            .join(" AND ")
    );
    let mut del_query = sqlx::query(&delete_sql);
    for v in &bind_values {
        del_query = del_query.bind(v);
    }
    let _ = del_query.execute(&state.pool).await;

    Ok(Json(json!({
        "ok": true,
        "affected": result.rows_affected(),
    })))
}

pub fn router() -> axum::Router<AppState> {
    use axum::routing::{delete, get, post, put};
    axum::Router::new()
        .route("/logs", get(get_logs))
        .route("/su/{user_id}", post(su_user))
        .route("/su/back", post(su_back))
        .route("/batch-register", post(batch_register))
        .route("/groups", get(list_groups))
        .route("/groups", post(create_group))
        .route("/groups/{group_id}", put(update_group))
        .route("/groups/{group_id}", delete(delete_group))
        .route("/rejudge", post(rejudge))
}
