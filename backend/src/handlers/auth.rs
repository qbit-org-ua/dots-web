use axum::extract::State;
use axum::http::header::SET_COOKIE;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Deserialize;
use serde_json::json;

use crate::auth::middleware::{AppState, OptionalUser, RequireAuth};
use crate::auth::password::{encrypt_password, generate_random_password};
use crate::auth::session::{create_session, destroy_session, generate_session_id};
use crate::auth::{ACCESS_REGISTERED_USER};
use crate::error::{AppError, AppResult};
use crate::models::User;

#[derive(Deserialize)]
pub struct LoginRequest {
    pub login: String,
    pub password: String,
    pub remember_me: Option<bool>,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub nickname: String,
}

#[derive(Deserialize)]
pub struct RestoreStartRequest {
    pub email: String,
}

#[derive(Deserialize)]
pub struct RestoreVerifyRequest {
    pub email: String,
    pub code: String,
}

#[derive(Deserialize)]
pub struct RestoreResetRequest {
    pub email: String,
    pub code: String,
    pub password: String,
}

pub async fn login(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<LoginRequest>,
) -> AppResult<Response> {
    // Look up user by email or nickname (matching PHP user_info() logic)
    let is_email = req.login.contains('@') && req.login.contains('.');
    let row: Option<(u32, String, String, u32, i32, i8, String)> = if is_email {
        sqlx::query_as(
            "SELECT user_id, email, nickname, access, messages, is_activated, password \
             FROM labs_users WHERE email = ? LIMIT 1"
        )
        .bind(&req.login)
        .fetch_optional(&state.pool)
        .await?
    } else {
        sqlx::query_as(
            "SELECT user_id, email, nickname, access, messages, is_activated, password \
             FROM labs_users WHERE nickname = ? LIMIT 1"
        )
        .bind(&req.login)
        .fetch_optional(&state.pool)
        .await?
    };

    let (user_id, email, nickname, access, messages, is_activated, stored_hash) =
        row.ok_or(AppError::LoginFailed)?;

    // Verify password: always hash against the email from DB (matching PHP behavior)
    let computed_hash = encrypt_password(&email, &req.password);
    if stored_hash != computed_hash {
        return Err(AppError::LoginFailed);
    }

    let user = User { user_id, email, nickname, access, messages, is_activated };

    // Create session
    let session_id = generate_session_id();
    let ip = crate::auth::middleware::extract_ip_from_headers(&headers);
    let user_agent_full = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let user_agent = if user_agent_full.len() > 80 {
        user_agent_full[..80].to_string()
    } else {
        user_agent_full.to_string()
    };

    create_session(&state.pool, &session_id, &user_agent, ip, user.user_id).await?;

    // Update last login
    let now = chrono::Utc::now().timestamp() as i32;
    sqlx::query("UPDATE labs_users SET lastlogin = ? WHERE user_id = ?")
        .bind(now)
        .bind(user.user_id)
        .execute(&state.pool)
        .await?;

    // Build response with Set-Cookie
    let max_age = if req.remember_me.unwrap_or(false) {
        86400 * 30
    } else {
        86400
    };
    let cookie = format!(
        "DSID={}; Path=/; HttpOnly; SameSite=Lax; Max-Age={}",
        session_id, max_age
    );

    let body = json!({ "user": user });
    let mut response = Json(body).into_response();
    response.headers_mut().insert(
        SET_COOKIE,
        cookie.parse().unwrap(),
    );

    Ok(response)
}

pub async fn logout(
    State(state): State<AppState>,
    jar: axum_extra::extract::CookieJar,
    _user: RequireAuth,
) -> AppResult<Response> {
    if let Some(cookie) = jar.get("DSID") {
        destroy_session(&state.pool, cookie.value()).await?;
    }

    let clear_cookie = "DSID=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
    let mut response = Json(json!({"ok": true})).into_response();
    response.headers_mut().insert(
        SET_COOKIE,
        clear_cookie.parse().unwrap(),
    );

    Ok(response)
}

pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> AppResult<Json<serde_json::Value>> {
    // Validate email
    if !req.email.contains('@') || req.email.len() < 5 {
        return Err(AppError::InvalidEmail);
    }

    // Validate nickname
    if req.nickname.len() < 3 || req.nickname.len() > 20 {
        return Err(AppError::InvalidNickname);
    }
    if !req.nickname.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return Err(AppError::InvalidNickname);
    }

    // Check email uniqueness
    let exists: Option<(u32,)> = sqlx::query_as(
        "SELECT user_id FROM labs_users WHERE email = ?"
    )
    .bind(&req.email)
    .fetch_optional(&state.pool)
    .await?;

    if exists.is_some() {
        return Err(AppError::EmailExists);
    }

    // Check nickname uniqueness
    let exists: Option<(u32,)> = sqlx::query_as(
        "SELECT user_id FROM labs_users WHERE nickname = ?"
    )
    .bind(&req.nickname)
    .fetch_optional(&state.pool)
    .await?;

    if exists.is_some() {
        return Err(AppError::NicknameExists);
    }

    // Generate random password and hash
    let raw_password = generate_random_password(8);
    let hashed = encrypt_password(&req.email, &raw_password);
    let now = chrono::Utc::now().timestamp() as i32;

    sqlx::query(
        "INSERT INTO labs_users (email, password, nickname, access, created, is_activated, birthday) \
         VALUES (?, ?, ?, ?, ?, 1, '2000-01-01')"
    )
    .bind(&req.email)
    .bind(&hashed)
    .bind(&req.nickname)
    .bind(ACCESS_REGISTERED_USER)
    .bind(now)
    .execute(&state.pool)
    .await?;

    // In production, send email with password. For now, return it in dev mode.
    Ok(Json(json!({
        "ok": true,
        "message": "Registration successful. Check your email for the password.",
        "debug_password": raw_password
    })))
}

pub async fn me(
    _state: State<AppState>,
    OptionalUser(user): OptionalUser,
) -> AppResult<Json<serde_json::Value>> {
    match user {
        Some(u) => Ok(Json(json!({ "user": u }))),
        None => Ok(Json(json!({ "user": null }))),
    }
}

pub async fn restore_start(
    State(state): State<AppState>,
    Json(req): Json<RestoreStartRequest>,
) -> AppResult<Json<serde_json::Value>> {
    // Check user exists
    let user: Option<(u32, String)> = sqlx::query_as(
        "SELECT user_id, nickname FROM labs_users WHERE email = ?"
    )
    .bind(&req.email)
    .fetch_optional(&state.pool)
    .await?;

    if user.is_none() {
        return Err(AppError::UserNotFound);
    }

    // Generate a 6-digit code and store in cache
    let code = format!("{:06}", rand::random::<u32>() % 1_000_000);
    let now = chrono::Utc::now().timestamp();
    let expire = now + 3600; // 1 hour

    let cache_key = format!("restore:{}", req.email);
    let cache_created = chrono::Utc::now().timestamp() as i32;
    sqlx::query(
        "INSERT INTO labs_cache (cache_key, created, expire, data) VALUES (?, ?, ?, ?) \
         ON DUPLICATE KEY UPDATE data = VALUES(data), expire = VALUES(expire)"
    )
    .bind(&cache_key)
    .bind(cache_created)
    .bind(expire as i32)
    .bind(code.as_bytes())
    .execute(&state.pool)
    .await?;

    // In production, send email with code
    Ok(Json(json!({
        "ok": true,
        "message": "Recovery code sent to your email.",
        "debug_code": code
    })))
}

pub async fn restore_verify(
    State(state): State<AppState>,
    Json(req): Json<RestoreVerifyRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let cache_key = format!("restore:{}", req.email);
    let now = chrono::Utc::now().timestamp();

    let cached: Option<(Vec<u8>,)> = sqlx::query_as(
        "SELECT data FROM labs_cache WHERE cache_key = ? AND expire > ?"
    )
    .bind(&cache_key)
    .bind(now)
    .fetch_optional(&state.pool)
    .await?;

    match cached {
        Some((code_bytes,)) if String::from_utf8_lossy(&code_bytes) == req.code => {
            Ok(Json(json!({ "ok": true, "valid": true })))
        }
        _ => {
            Ok(Json(json!({ "ok": false, "valid": false, "message": "Invalid or expired code" })))
        }
    }
}

pub async fn restore_reset(
    State(state): State<AppState>,
    Json(req): Json<RestoreResetRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let cache_key = format!("restore:{}", req.email);
    let now = chrono::Utc::now().timestamp();

    let cached: Option<(Vec<u8>,)> = sqlx::query_as(
        "SELECT data FROM labs_cache WHERE cache_key = ? AND expire > ?"
    )
    .bind(&cache_key)
    .bind(now)
    .fetch_optional(&state.pool)
    .await?;

    match cached {
        Some((code_bytes,)) if String::from_utf8_lossy(&code_bytes) == req.code => {
            let hashed = encrypt_password(&req.email, &req.password);
            sqlx::query("UPDATE labs_users SET password = ? WHERE email = ?")
                .bind(&hashed)
                .bind(&req.email)
                .execute(&state.pool)
                .await?;

            // Delete the cache entry
            sqlx::query("DELETE FROM labs_cache WHERE cache_key = ?")
                .bind(&cache_key)
                .execute(&state.pool)
                .await?;

            Ok(Json(json!({ "ok": true, "message": "Password updated successfully" })))
        }
        _ => Err(AppError::BadRequest("Invalid or expired code".to_string())),
    }
}

pub fn router() -> axum::Router<AppState> {
    use axum::routing::{get, post};
    axum::Router::new()
        .route("/login", post(login))
        .route("/logout", post(logout))
        .route("/register", post(register))
        .route("/me", get(me))
        .route("/restore/start", post(restore_start))
        .route("/restore/verify", post(restore_verify))
        .route("/restore/reset", post(restore_reset))
}
