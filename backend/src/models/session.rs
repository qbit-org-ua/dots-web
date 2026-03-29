use serde::{Deserialize, Serialize};

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct Session {
    pub session_id: String,
    pub user_agent: String,
    pub created_ip: u32,
    pub updated_ip: u32,
    pub created: i32,
    pub lifetime: i32,
    pub expire: i32,
    pub session_data: String,
}
