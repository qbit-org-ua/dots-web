use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct Test {
    pub test_id: u32,
    pub solution_id: u32,
    pub test_no: u32,
    pub test_result: u32,
    pub test_score: Decimal,
    pub test_time: u32,
    pub test_mem: u32,
}
