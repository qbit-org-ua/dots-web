use axum::Json;
use axum::extract::{Path, Query, State};
use serde::Deserialize;
use serde_json::json;

use crate::auth::middleware::{AppState, RequireAuth};
use crate::error::{AppError, AppResult};
use crate::models::Message;

#[derive(Deserialize)]
pub struct MessageListParams {
    pub folder: Option<String>,
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

#[derive(Deserialize)]
pub struct CreateMessageRequest {
    pub to_nickname: String,
    pub subject: String,
    pub body: String,
    pub in_reply_to: Option<i32>,
}

pub async fn list_messages(
    State(state): State<AppState>,
    RequireAuth(user): RequireAuth,
    Query(params): Query<MessageListParams>,
) -> AppResult<Json<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;
    let folder = params.folder.as_deref().unwrap_or("inbox");

    let (messages, total) = match folder {
        "sent" => {
            let total: (i64,) =
                sqlx::query_as("SELECT COUNT(*) FROM labs_messages WHERE from_user_id = ?")
                    .bind(user.user_id)
                    .fetch_one(&state.pool)
                    .await?;

            let messages: Vec<Message> = sqlx::query_as(
                "SELECT message_id, from_user_id, to_user_id, in_reply_to, message_state, \
                 message_date, message_subj, message_text \
                 FROM labs_messages WHERE from_user_id = ? \
                 ORDER BY message_date DESC LIMIT ? OFFSET ?",
            )
            .bind(user.user_id)
            .bind(per_page)
            .bind(offset)
            .fetch_all(&state.pool)
            .await?;

            (messages, total.0)
        }
        _ => {
            // inbox
            let total: (i64,) =
                sqlx::query_as("SELECT COUNT(*) FROM labs_messages WHERE to_user_id = ?")
                    .bind(user.user_id)
                    .fetch_one(&state.pool)
                    .await?;

            let messages: Vec<Message> = sqlx::query_as(
                "SELECT message_id, from_user_id, to_user_id, in_reply_to, message_state, \
                 message_date, message_subj, message_text \
                 FROM labs_messages WHERE to_user_id = ? \
                 ORDER BY message_date DESC LIMIT ? OFFSET ?",
            )
            .bind(user.user_id)
            .bind(per_page)
            .bind(offset)
            .fetch_all(&state.pool)
            .await?;

            (messages, total.0)
        }
    };

    // Get sender/recipient nicknames
    let mut enriched = Vec::new();
    for msg in &messages {
        let other_id = if folder == "sent" {
            msg.to_user_id
        } else {
            msg.from_user_id
        };
        let nickname: Option<(String,)> =
            sqlx::query_as("SELECT nickname FROM labs_users WHERE user_id = ?")
                .bind(other_id)
                .fetch_optional(&state.pool)
                .await?;

        enriched.push(json!({
            "message_id": msg.message_id,
            "from_user_id": msg.from_user_id,
            "to_user_id": msg.to_user_id,
            "message_subj": msg.message_subj,
            "message_date": msg.message_date,
            "message_state": msg.message_state,
            "in_reply_to": msg.in_reply_to,
            "other_nickname": nickname.map(|n| n.0).unwrap_or_default(),
        }));
    }

    Ok(Json(json!({
        "messages": enriched,
        "total": total,
        "page": page,
        "per_page": per_page,
    })))
}

pub async fn create_message(
    State(state): State<AppState>,
    RequireAuth(user): RequireAuth,
    Json(req): Json<CreateMessageRequest>,
) -> AppResult<Json<serde_json::Value>> {
    // Find recipient by nickname
    let recipient: Option<(u32,)> =
        sqlx::query_as("SELECT user_id FROM labs_users WHERE nickname = ?")
            .bind(&req.to_nickname)
            .fetch_optional(&state.pool)
            .await?;

    let to_id = recipient.ok_or(AppError::UserNotFound)?.0;

    if to_id == user.user_id {
        return Err(AppError::BadRequest(
            "Cannot send message to yourself".to_string(),
        ));
    }

    let now = chrono::Utc::now().timestamp() as i32;

    sqlx::query(
        "INSERT INTO labs_messages (from_user_id, to_user_id, in_reply_to, message_state, \
         message_date, message_subj, message_text) \
         VALUES (?, ?, ?, 0, ?, ?, ?)",
    )
    .bind(user.user_id)
    .bind(to_id)
    .bind(req.in_reply_to.unwrap_or(0))
    .bind(now)
    .bind(&req.subject)
    .bind(&req.body)
    .execute(&state.pool)
    .await?;

    // Update recipient's messages flag (increment unread count)
    sqlx::query("UPDATE labs_users SET messages = messages + 1 WHERE user_id = ?")
        .bind(to_id)
        .execute(&state.pool)
        .await?;

    Ok(Json(json!({ "ok": true })))
}

pub async fn get_message(
    State(state): State<AppState>,
    Path(message_id): Path<i32>,
    RequireAuth(user): RequireAuth,
) -> AppResult<Json<serde_json::Value>> {
    let message: Option<Message> = sqlx::query_as(
        "SELECT message_id, from_user_id, to_user_id, in_reply_to, message_state, \
         message_date, message_subj, message_text \
         FROM labs_messages WHERE message_id = ?",
    )
    .bind(message_id)
    .fetch_optional(&state.pool)
    .await?;

    let message = message.ok_or(AppError::MessageNotFound)?;

    // Check access
    if message.from_user_id != user.user_id as i32 && message.to_user_id != user.user_id as i32 {
        return Err(AppError::AccessDenied);
    }

    // Mark as read if recipient is viewing (message_state = 1 means read)
    if message.to_user_id == user.user_id as i32 && message.message_state == 0 {
        sqlx::query("UPDATE labs_messages SET message_state = 1 WHERE message_id = ?")
            .bind(message_id)
            .execute(&state.pool)
            .await?;

        // Decrement messages counter
        sqlx::query("UPDATE labs_users SET messages = GREATEST(messages - 1, 0) WHERE user_id = ?")
            .bind(user.user_id)
            .execute(&state.pool)
            .await?;
    }

    // Get other user's nickname
    let from_nick: Option<(String,)> =
        sqlx::query_as("SELECT nickname FROM labs_users WHERE user_id = ?")
            .bind(message.from_user_id)
            .fetch_optional(&state.pool)
            .await?;

    let to_nick: Option<(String,)> =
        sqlx::query_as("SELECT nickname FROM labs_users WHERE user_id = ?")
            .bind(message.to_user_id)
            .fetch_optional(&state.pool)
            .await?;

    Ok(Json(json!({
        "message": message,
        "from_nickname": from_nick.map(|n| n.0).unwrap_or_default(),
        "to_nickname": to_nick.map(|n| n.0).unwrap_or_default(),
    })))
}

pub async fn mark_read(
    State(state): State<AppState>,
    Path(message_id): Path<i32>,
    RequireAuth(user): RequireAuth,
) -> AppResult<Json<serde_json::Value>> {
    let message: Option<(i32, i32)> =
        sqlx::query_as("SELECT to_user_id, message_state FROM labs_messages WHERE message_id = ?")
            .bind(message_id)
            .fetch_optional(&state.pool)
            .await?;

    let (to_user_id, message_state) = message.ok_or(AppError::MessageNotFound)?;

    if to_user_id != user.user_id as i32 {
        return Err(AppError::AccessDenied);
    }

    if message_state == 0 {
        sqlx::query("UPDATE labs_messages SET message_state = 1 WHERE message_id = ?")
            .bind(message_id)
            .execute(&state.pool)
            .await?;

        sqlx::query("UPDATE labs_users SET messages = GREATEST(messages - 1, 0) WHERE user_id = ?")
            .bind(user.user_id)
            .execute(&state.pool)
            .await?;
    }

    Ok(Json(json!({ "ok": true })))
}

pub fn router() -> axum::Router<AppState> {
    use axum::routing::{get, post, put};
    axum::Router::new()
        .route("/", get(list_messages))
        .route("/", post(create_message))
        .route("/{message_id}", get(get_message))
        .route("/{message_id}/read", put(mark_read))
}
