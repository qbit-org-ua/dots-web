use rand::Rng;
use sqlx::MySqlPool;
use std::collections::HashMap;

use crate::error::AppResult;
use crate::models::Session;

/// Generate a random 16-character alphanumeric session ID
pub fn generate_session_id() -> String {
    let charset = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut rng = rand::rng();
    (0..16)
        .map(|_| {
            let idx = rng.random_range(0..charset.len());
            charset[idx] as char
        })
        .collect()
}

/// Create a new session in labs_sessions
pub async fn create_session(
    pool: &MySqlPool,
    session_id: &str,
    user_agent: &str,
    ip: u32,
    user_id: u32,
) -> AppResult<()> {
    let now = chrono::Utc::now().timestamp() as i32;
    let lifetime = 86400 * 30; // 30 days
    let expire = now + lifetime;

    let session_data = serde_json::json!({"uid": user_id, "lt": now}).to_string();

    sqlx::query(
        "INSERT INTO labs_sessions (session_id, user_agent, created_ip, updated_ip, created, lifetime, expire, session_data) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) \
         ON DUPLICATE KEY UPDATE session_data = VALUES(session_data), updated_ip = VALUES(updated_ip), expire = VALUES(expire)"
    )
    .bind(session_id)
    .bind(user_agent)
    .bind(ip)
    .bind(ip)
    .bind(now)
    .bind(lifetime)
    .bind(expire)
    .bind(&session_data)
    .execute(pool)
    .await?;

    Ok(())
}

/// Read a session and parse the user_id from session_data
pub async fn read_session(
    pool: &MySqlPool,
    session_id: &str,
) -> AppResult<Option<(Session, Option<u32>)>> {
    let session: Option<Session> = sqlx::query_as(
        "SELECT CAST(session_id AS CHAR) as session_id, CAST(user_agent AS CHAR) as user_agent, \
         created_ip, updated_ip, created, lifetime, expire, CAST(session_data AS CHAR) as session_data \
         FROM labs_sessions WHERE session_id = ?"
    )
    .bind(session_id)
    .fetch_optional(pool)
    .await?;

    match session {
        Some(s) => {
            let now = chrono::Utc::now().timestamp() as i32;
            if s.expire < now {
                // Session expired
                destroy_session(pool, session_id).await?;
                return Ok(None);
            }
            let uid = parse_session_uid(&s.session_data);
            Ok(Some((s, uid)))
        }
        None => Ok(None),
    }
}

/// Write/update session data
pub async fn write_session(
    pool: &MySqlPool,
    session_id: &str,
    ip: u32,
    session_data: &str,
) -> AppResult<()> {
    let now = chrono::Utc::now().timestamp() as i32;
    let expire = now + 86400 * 30;

    sqlx::query(
        "UPDATE labs_sessions SET session_data = ?, updated_ip = ?, expire = ? WHERE session_id = ?"
    )
    .bind(session_data)
    .bind(ip)
    .bind(expire)
    .bind(session_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// Destroy a session
pub async fn destroy_session(pool: &MySqlPool, session_id: &str) -> AppResult<()> {
    sqlx::query("DELETE FROM labs_sessions WHERE session_id = ?")
        .bind(session_id)
        .execute(pool)
        .await?;
    Ok(())
}

/// Delete expired sessions
pub async fn _gc_sessions(pool: &MySqlPool) -> AppResult<()> {
    let now = chrono::Utc::now().timestamp() as i32;
    sqlx::query("DELETE FROM labs_sessions WHERE expire < ?")
        .bind(now)
        .execute(pool)
        .await?;
    Ok(())
}

/// Parse user_id from session_data.
/// Try JSON first: {"uid":123}
/// Then try PHP serialized: uid|i:1234;lt|i:1700000000;cid|i:5;
fn parse_session_uid(data: &str) -> Option<u32> {
    // Try JSON
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(data)
        && let Some(uid) = val.get("uid").and_then(|v| v.as_u64())
    {
        return Some(uid as u32);
    }

    // Try PHP session format: key|TYPE:VALUE;key|TYPE:VALUE;
    parse_php_session_data(data)
        .get("uid")
        .and_then(|v| v.parse().ok())
}

/// Parse contest_id from session_data
pub fn _parse_session_contest_id(data: &str) -> Option<i32> {
    // Try JSON
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(data)
        && let Some(cid) = val.get("cid").and_then(|v| v.as_i64())
    {
        return Some(cid as i32);
    }

    parse_php_session_data(data)
        .get("cid")
        .and_then(|v| v.parse().ok())
}

/// Parse PHP session format: uid|i:1234;lt|i:1700000000;cid|i:5;
fn parse_php_session_data(data: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();

    // Split by ; to get segments
    for segment in data.split(';') {
        let segment = segment.trim();
        if segment.is_empty() {
            continue;
        }
        // Each segment is key|TYPE:VALUE
        if let Some(pipe_pos) = segment.find('|') {
            let key = &segment[..pipe_pos];
            let type_value = &segment[pipe_pos + 1..];
            // Parse TYPE:VALUE
            if let Some(colon_pos) = type_value.find(':') {
                let value = &type_value[colon_pos + 1..];
                map.insert(key.to_string(), value.to_string());
            }
        }
    }

    map
}

/// Build session data JSON with optional contest_id
pub fn build_session_data(user_id: u32, contest_id: Option<i32>) -> String {
    let now = chrono::Utc::now().timestamp();
    let mut data = serde_json::json!({
        "uid": user_id,
        "lt": now,
    });
    if let Some(cid) = contest_id {
        data["cid"] = serde_json::json!(cid);
    }
    data.to_string()
}
