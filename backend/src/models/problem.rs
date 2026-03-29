use serde::{Deserialize, Serialize};

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct Problem {
    pub problem_id: u32,
    pub title: String,
    pub description: String,
    pub attachment: String,
    pub complexity: i32,
    pub user_id: u32,
    pub posted_time: i32,
    pub tex: Option<String>,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub problem_type: Option<String>,
    pub answer_options_count: Option<i32>,
}
