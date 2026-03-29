use serde::{Deserialize, Serialize};

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct ContestProblem {
    pub contest_id: i32,
    pub short_name: String,
    pub problem_id: i32,
    pub max_score: i32,
    pub is_with_code_review: i8,
    pub user_id: i32,
}
