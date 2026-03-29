use serde::{Deserialize, Serialize};

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct Group {
    pub group_id: i32,
    pub group_name: String,
    pub teacher_id: i32,
    pub group_description: Option<String>,
}

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct UserGroupRelationship {
    pub user_id: Option<i32>,
    pub group_id: Option<i32>,
}

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct UserTeacherRelationship {
    pub user_id: Option<i32>,
    pub teacher_id: Option<i32>,
}
