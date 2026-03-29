use serde::{Deserialize, Serialize};

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct Message {
    pub message_id: i32,
    pub from_user_id: i32,
    pub to_user_id: i32,
    pub in_reply_to: i32,
    pub message_state: i32,
    pub message_date: i32,
    pub message_subj: String,
    pub message_text: String,
}
