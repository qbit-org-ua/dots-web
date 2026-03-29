use serde::{Deserialize, Serialize};

#[allow(dead_code)]
#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct Cache {
    pub cache_key: String,
    pub created: i32,
    pub expire: i32,
    pub data: Vec<u8>,
}
