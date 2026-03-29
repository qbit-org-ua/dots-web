use serde::{Deserialize, Serialize};

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct ContestUser {
    pub contest_id: i32,
    pub user_id: i32,
    pub reg_status: i32,
    pub reg_data: String,
}
