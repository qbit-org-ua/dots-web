use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct Solution {
    pub solution_id: u32,
    pub problem_id: u32,
    pub user_id: u32,
    pub contest_id: Option<i32>,
    pub filename: String,
    pub checksum: String,
    pub lang_id: u32,
    pub check_type: String,
    pub posted_time: i32,
    pub checked_time: u32,
    pub contest_time: u32,
    pub test_result: i32,
    pub test_score: Decimal,
    pub score: Decimal,
    pub module_val: i32,
    pub compile_error: Option<String>,
    pub is_passed: i8,
}
