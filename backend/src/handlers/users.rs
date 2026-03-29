use axum::extract::{Multipart, Path, Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::auth::middleware::{AppState, OptionalUser, RequireAuth};
use crate::auth::password::encrypt_password;
use crate::error::{AppError, AppResult};
use crate::models::user::{UserFull, USEROPT_HIDE_EMAIL, USEROPT_HIDE_PROFILE};

#[derive(Deserialize)]
pub struct PaginationParams {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub search: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateUserRequest {
    pub nickname: Option<String>,
    pub birthday: Option<String>,
    pub city_name: Option<String>,
    pub region_name: Option<String>,
    pub country_name: Option<String>,
    pub fio: Option<String>,
    pub job: Option<String>,
    pub options: Option<u32>,
    pub u_region: Option<String>,
    pub u_institution_type: Option<String>,
    pub u_institution_name: Option<String>,
    pub u_specialty: Option<String>,
    pub u_kurs: Option<String>,
    pub u_teachers: Option<String>,
    pub u_about: Option<String>,
    pub u_near: Option<String>,
    pub o_region: Option<String>,
    pub o_district: Option<String>,
    pub o_full_name: Option<String>,
    pub o_short_name: Option<String>,
    pub o_grade: Option<String>,
    pub o_teacher: Option<String>,
}

#[derive(Deserialize)]
pub struct PasswordRequest {
    pub old_password: String,
    pub new_password: String,
}

#[derive(Serialize)]
pub struct UserListResponse {
    pub users: Vec<UserListItem>,
    pub total: i64,
    pub page: u32,
    pub per_page: u32,
}

#[derive(sqlx::FromRow, Serialize)]
pub struct UserListItem {
    pub user_id: u32,
    pub nickname: String,
    pub city_name: String,
    pub region_name: String,
    pub country_name: String,
    #[sqlx(rename = "FIO")]
    pub fio: String,
    pub avatar: String,
    pub options: u32,
}

pub async fn list_users(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
    RequireAuth(user): RequireAuth,
) -> AppResult<Json<UserListResponse>> {
    // ACCESS_READ_PROFILES (0x0004) — teachers and admins only
    if !crate::auth::access::has_access(user.access, crate::auth::ACCESS_READ_PROFILES) {
        return Err(AppError::AccessDenied);
    }
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(50).min(200);
    let offset = (page - 1) * per_page;

    let (users, total) = if let Some(search) = &params.search {
        let pattern = format!("%{}%", search);
        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM labs_users WHERE is_activated = 1 AND \
             (nickname LIKE ? OR FIO LIKE ? OR email LIKE ?)"
        )
        .bind(&pattern)
        .bind(&pattern)
        .bind(&pattern)
        .fetch_one(&state.pool)
        .await?;

        let users: Vec<UserListItem> = sqlx::query_as(
            "SELECT user_id, nickname, city_name, region_name, country_name, FIO, avatar, options \
             FROM labs_users WHERE is_activated = 1 AND \
             (nickname LIKE ? OR FIO LIKE ? OR email LIKE ?) \
             ORDER BY user_id ASC LIMIT ? OFFSET ?"
        )
        .bind(&pattern)
        .bind(&pattern)
        .bind(&pattern)
        .bind(per_page)
        .bind(offset)
        .fetch_all(&state.pool)
        .await?;

        (users, total.0)
    } else {
        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM labs_users WHERE is_activated = 1"
        )
        .fetch_one(&state.pool)
        .await?;

        let users: Vec<UserListItem> = sqlx::query_as(
            "SELECT user_id, nickname, city_name, region_name, country_name, FIO, avatar, options \
             FROM labs_users WHERE is_activated = 1 \
             ORDER BY user_id ASC LIMIT ? OFFSET ?"
        )
        .bind(per_page)
        .bind(offset)
        .fetch_all(&state.pool)
        .await?;

        (users, total.0)
    };

    Ok(Json(UserListResponse {
        users,
        total,
        page,
        per_page,
    }))
}

pub async fn get_user(
    State(state): State<AppState>,
    Path(user_id): Path<u32>,
    OptionalUser(current_user): OptionalUser,
) -> AppResult<Json<serde_json::Value>> {
    let user: Option<UserFull> = sqlx::query_as(
        "SELECT user_id, email, password, nickname, birthday, access, created, lastlogin, \
         options, messages, avatar, city_name, region_name, country_name, FIO, job, \
         is_activated, near, u_region, u_institution_type, u_institution_name, \
         u_specialty, u_kurs, u_teachers, u_about, u_near, u_certificate, \
         o_region, o_district, o_full_name, o_short_name, o_grade, o_teacher, o_cert \
         FROM labs_users WHERE user_id = ?"
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?;

    let user = user.ok_or(AppError::UserNotFound)?;

    // Check if profile is hidden
    let is_self = current_user.as_ref().map(|u| u.user_id) == Some(user_id);
    let is_admin = current_user
        .as_ref()
        .map(|u| crate::auth::access::is_admin(u.access))
        .unwrap_or(false);

    if (user.options & USEROPT_HIDE_PROFILE) != 0 && !is_self && !is_admin {
        return Err(AppError::AccessDenied);
    }

    // Build response, hiding email if requested
    let mut response = serde_json::to_value(&user).unwrap();
    if (user.options & USEROPT_HIDE_EMAIL) != 0 && !is_self && !is_admin {
        response["email"] = json!("");
    }

    Ok(Json(json!({ "user": response })))
}

pub async fn update_user(
    State(state): State<AppState>,
    Path(user_id): Path<u32>,
    RequireAuth(current_user): RequireAuth,
    Json(req): Json<UpdateUserRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let is_admin = crate::auth::access::is_admin(current_user.access);
    if current_user.user_id != user_id && !is_admin {
        return Err(AppError::AccessDenied);
    }

    // Build dynamic UPDATE query
    let mut sets = Vec::new();
    let mut binds: Vec<String> = Vec::new();

    macro_rules! add_field {
        ($field:ident, $col:expr) => {
            if let Some(ref val) = req.$field {
                sets.push(format!("{} = ?", $col));
                binds.push(val.clone());
            }
        };
    }

    add_field!(city_name, "city_name");
    add_field!(region_name, "region_name");
    add_field!(country_name, "country_name");
    add_field!(fio, "FIO");
    add_field!(job, "job");
    add_field!(u_region, "u_region");
    add_field!(u_institution_type, "u_institution_type");
    add_field!(u_institution_name, "u_institution_name");
    add_field!(u_specialty, "u_specialty");
    add_field!(u_kurs, "u_kurs");
    add_field!(u_teachers, "u_teachers");
    add_field!(u_about, "u_about");
    add_field!(u_near, "u_near");
    add_field!(o_region, "o_region");
    add_field!(o_district, "o_district");
    add_field!(o_full_name, "o_full_name");
    add_field!(o_short_name, "o_short_name");
    add_field!(o_grade, "o_grade");
    add_field!(o_teacher, "o_teacher");

    if let Some(ref nickname) = req.nickname {
        if nickname.len() < 3 || nickname.len() > 20 {
            return Err(AppError::InvalidNickname);
        }
        // Check uniqueness
        let exists: Option<(u32,)> = sqlx::query_as(
            "SELECT user_id FROM labs_users WHERE nickname = ? AND user_id != ?"
        )
        .bind(nickname)
        .bind(user_id)
        .fetch_optional(&state.pool)
        .await?;
        if exists.is_some() {
            return Err(AppError::NicknameExists);
        }
        sets.push("nickname = ?".to_string());
        binds.push(nickname.clone());
    }

    if let Some(ref birthday) = req.birthday {
        sets.push("birthday = ?".to_string());
        binds.push(birthday.clone());
    }

    if let Some(options) = req.options {
        sets.push("options = ?".to_string());
        binds.push(options.to_string());
    }

    if sets.is_empty() {
        return Ok(Json(json!({ "ok": true })));
    }

    let sql = format!("UPDATE labs_users SET {} WHERE user_id = ?", sets.join(", "));
    let mut query = sqlx::query(&sql);
    for bind in &binds {
        query = query.bind(bind);
    }
    query = query.bind(user_id);
    query.execute(&state.pool).await?;

    Ok(Json(json!({ "ok": true })))
}

pub async fn change_password(
    State(state): State<AppState>,
    Path(user_id): Path<u32>,
    RequireAuth(current_user): RequireAuth,
    Json(req): Json<PasswordRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let is_admin = crate::auth::access::is_admin(current_user.access);
    if current_user.user_id != user_id && !is_admin {
        return Err(AppError::AccessDenied);
    }

    // Get user email for hashing
    let user_row: (String, String) = sqlx::query_as(
        "SELECT email, password FROM labs_users WHERE user_id = ?"
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await?;

    let (email, stored_hash) = user_row;

    // If not admin, verify old password
    if !is_admin {
        let old_hash = encrypt_password(&email, &req.old_password);
        if old_hash != stored_hash {
            return Err(AppError::LoginFailed);
        }
    }

    let new_hash = encrypt_password(&email, &req.new_password);
    sqlx::query("UPDATE labs_users SET password = ? WHERE user_id = ?")
        .bind(&new_hash)
        .bind(user_id)
        .execute(&state.pool)
        .await?;

    Ok(Json(json!({ "ok": true })))
}

pub async fn upload_avatar(
    State(state): State<AppState>,
    Path(user_id): Path<u32>,
    RequireAuth(current_user): RequireAuth,
    mut multipart: Multipart,
) -> AppResult<Json<serde_json::Value>> {
    let is_admin = crate::auth::access::is_admin(current_user.access);
    if current_user.user_id != user_id && !is_admin {
        return Err(AppError::AccessDenied);
    }

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        let file_name = field.file_name().unwrap_or("avatar.jpg").to_string();

        // Validate extension
        let ext = file_name.rsplit('.').next().unwrap_or("").to_lowercase();
        if !matches!(ext.as_str(), "jpg" | "jpeg" | "gif" | "png") {
            return Err(AppError::BadRequest("Only JPG, GIF, PNG allowed".to_string()));
        }

        let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;

        // Max 20KB
        if data.len() > 20 * 1024 {
            return Err(AppError::BadRequest("Avatar must be under 20KB".to_string()));
        }

        // Save to upload_dir/avatars/
        let avatar_filename = format!("{}.{}", user_id, ext);
        let avatar_dir = format!("{}/avatars", state.config.upload_dir);
        tokio::fs::create_dir_all(&avatar_dir).await.map_err(|e| AppError::Internal(e.into()))?;
        let avatar_path = format!("{}/{}", avatar_dir, avatar_filename);
        tokio::fs::write(&avatar_path, &data).await.map_err(|e| AppError::Internal(e.into()))?;

        // Update DB
        sqlx::query("UPDATE labs_users SET avatar = ? WHERE user_id = ?")
            .bind(&avatar_filename)
            .bind(user_id)
            .execute(&state.pool)
            .await?;

        return Ok(Json(json!({ "ok": true, "avatar": avatar_filename })));
    }

    Err(AppError::BadRequest("No file uploaded".to_string()))
}

pub async fn delete_avatar(
    State(state): State<AppState>,
    Path(user_id): Path<u32>,
    RequireAuth(current_user): RequireAuth,
) -> AppResult<Json<serde_json::Value>> {
    let is_admin = crate::auth::access::is_admin(current_user.access);
    if current_user.user_id != user_id && !is_admin {
        return Err(AppError::AccessDenied);
    }

    // Get current avatar
    let avatar: Option<(String,)> = sqlx::query_as(
        "SELECT avatar FROM labs_users WHERE user_id = ?"
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?;

    if let Some((avatar_name,)) = avatar {
        if !avatar_name.is_empty() {
            let path = format!("{}/avatars/{}", state.config.upload_dir, avatar_name);
            let _ = tokio::fs::remove_file(&path).await;
        }
    }

    sqlx::query("UPDATE labs_users SET avatar = '' WHERE user_id = ?")
        .bind(user_id)
        .execute(&state.pool)
        .await?;

    Ok(Json(json!({ "ok": true })))
}

pub fn router() -> axum::Router<AppState> {
    use axum::routing::{delete, get, post, put};
    axum::Router::new()
        .route("/", get(list_users))
        .route("/{user_id}", get(get_user))
        .route("/{user_id}", put(update_user))
        .route("/{user_id}/password", post(change_password))
        .route("/{user_id}/avatar", post(upload_avatar))
        .route("/{user_id}/avatar", delete(delete_avatar))
}
