use serde::{Deserialize, Serialize};

/// Lightweight user for session/auth contexts
#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct User {
    pub user_id: u32,
    pub email: String,
    pub nickname: String,
    pub access: u32,
    pub messages: i32,
    pub is_activated: i8,
}

/// Full user with all 35 columns from labs_users
#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct UserFull {
    pub user_id: u32,
    pub email: String,
    #[serde(skip_serializing)]
    #[allow(dead_code)]
    pub password: String,
    pub nickname: String,
    pub birthday: Option<chrono::NaiveDate>,
    pub access: u32,
    pub created: i32,
    pub lastlogin: i32,
    pub options: u32,
    pub messages: i32,
    pub avatar: String,
    pub city_name: String,
    pub region_name: String,
    pub country_name: String,
    #[sqlx(rename = "FIO")]
    pub fio: String,
    pub job: String,
    pub is_activated: i8,
    pub near: String,
    pub u_region: String,
    pub u_institution_type: String,
    pub u_institution_name: String,
    pub u_specialty: String,
    pub u_kurs: String,
    pub u_teachers: String,
    pub u_about: String,
    pub u_near: String,
    pub u_certificate: String,
    pub o_region: String,
    pub o_district: String,
    pub o_full_name: String,
    pub o_short_name: String,
    pub o_grade: String,
    pub o_teacher: String,
    pub o_cert: String,
}

pub const USEROPT_HIDE_EMAIL: u32 = 0x0001;
pub const USEROPT_HIDE_PROFILE: u32 = 0x8000;
