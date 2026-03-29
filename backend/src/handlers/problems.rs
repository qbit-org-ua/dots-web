use axum::extract::{Multipart, Path, Query, State};
use axum::http::header;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;
use serde_json::json;

use crate::auth::middleware::{AppState, OptionalUser, RequireAuth};
use crate::error::{AppError, AppResult};
use crate::models::Problem;

#[derive(Deserialize)]
pub struct ProblemListParams {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub contest_id: Option<i32>,
    pub search: Option<String>,
}

#[derive(Deserialize)]
pub struct ProblemCreateRequest {
    pub title: String,
    pub description: Option<String>,
    pub complexity: Option<i32>,
    pub tex: Option<String>,
    #[serde(rename = "type")]
    pub problem_type: Option<String>,
    pub answer_options_count: Option<i32>,
}

#[derive(Deserialize)]
pub struct ProblemUpdateRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub attachment: Option<String>,
    pub complexity: Option<i32>,
    pub tex: Option<String>,
    #[serde(rename = "type")]
    pub problem_type: Option<String>,
    pub answer_options_count: Option<i32>,
}

pub async fn list_problems(
    State(state): State<AppState>,
    OptionalUser(_user): OptionalUser,
    Query(params): Query<ProblemListParams>,
) -> AppResult<Json<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(50).min(200);
    let offset = (page - 1) * per_page;

    if let Some(contest_id) = params.contest_id {
        // List problems for a contest
        let problems: Vec<Problem> = sqlx::query_as(
            "SELECT p.problem_id, p.title, p.description, p.attachment, p.complexity, \
             p.user_id, p.posted_time, p.tex, p.type, p.answer_options_count \
             FROM labs_problems p \
             JOIN labs_contest_problems cp ON cp.problem_id = p.problem_id \
             WHERE cp.contest_id = ? \
             ORDER BY cp.short_name ASC"
        )
        .bind(contest_id)
        .fetch_all(&state.pool)
        .await?;

        return Ok(Json(json!({ "problems": problems, "total": problems.len() })));
    }

    let mut where_clauses = Vec::new();

    if let Some(ref search) = params.search {
        where_clauses.push(format!("(title LIKE '%{}%' OR problem_id = {})",
            search.replace('\'', ""),
            search.parse::<u32>().unwrap_or(0)));
    }

    let where_sql = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    let total: (i64,) = sqlx::query_as(&format!(
        "SELECT COUNT(*) FROM labs_problems {}", where_sql
    ))
    .fetch_one(&state.pool)
    .await?;

    let problems: Vec<Problem> = sqlx::query_as(&format!(
        "SELECT problem_id, title, description, attachment, complexity, \
         user_id, posted_time, tex, type, answer_options_count \
         FROM labs_problems {} ORDER BY problem_id ASC LIMIT ? OFFSET ?",
        where_sql
    ))
    .bind(per_page)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(json!({
        "problems": problems,
        "total": total.0,
        "page": page,
        "per_page": per_page,
    })))
}

pub async fn get_problem(
    State(state): State<AppState>,
    Path(problem_id): Path<u32>,
    OptionalUser(_user): OptionalUser,
) -> AppResult<Json<serde_json::Value>> {
    let problem: Option<Problem> = sqlx::query_as(
        "SELECT problem_id, title, description, attachment, complexity, \
         user_id, posted_time, tex, type, answer_options_count \
         FROM labs_problems WHERE problem_id = ?"
    )
    .bind(problem_id)
    .fetch_optional(&state.pool)
    .await?;

    let problem = problem.ok_or(AppError::ProblemNotFound)?;

    Ok(Json(json!({ "problem": problem })))
}

pub async fn create_problem(
    State(state): State<AppState>,
    RequireAuth(user): RequireAuth,
    Json(req): Json<ProblemCreateRequest>,
) -> AppResult<Json<serde_json::Value>> {
    if !crate::auth::access::is_teacher(user.access) && !crate::auth::access::is_admin(user.access) {
        return Err(AppError::AccessDenied);
    }

    let now = chrono::Utc::now().timestamp() as i32;

    let result = sqlx::query(
        "INSERT INTO labs_problems (title, description, attachment, complexity, user_id, \
         posted_time, tex, type, answer_options_count) \
         VALUES (?, ?, '', ?, ?, ?, ?, ?, ?)"
    )
    .bind(&req.title)
    .bind(req.description.as_deref().unwrap_or(""))
    .bind(req.complexity.unwrap_or(0))
    .bind(user.user_id)
    .bind(now)
    .bind(req.tex.as_deref())
    .bind(req.problem_type.as_deref())
    .bind(req.answer_options_count.unwrap_or(4))
    .execute(&state.pool)
    .await?;

    let problem_id = result.last_insert_id() as u32;
    Ok(Json(json!({ "ok": true, "problem_id": problem_id })))
}

pub async fn update_problem(
    State(state): State<AppState>,
    Path(problem_id): Path<u32>,
    RequireAuth(user): RequireAuth,
    Json(req): Json<ProblemUpdateRequest>,
) -> AppResult<Json<serde_json::Value>> {
    if !crate::auth::access::is_teacher(user.access) && !crate::auth::access::is_admin(user.access) {
        return Err(AppError::AccessDenied);
    }

    // Check problem exists
    let exists: Option<(u32,)> = sqlx::query_as(
        "SELECT problem_id FROM labs_problems WHERE problem_id = ?"
    )
    .bind(problem_id)
    .fetch_optional(&state.pool)
    .await?;
    if exists.is_none() {
        return Err(AppError::ProblemNotFound);
    }

    let mut sets = Vec::new();
    let mut binds: Vec<String> = Vec::new();

    macro_rules! opt_field {
        ($field:ident, $col:expr) => {
            if let Some(ref val) = req.$field {
                sets.push(format!("{} = ?", $col));
                binds.push(val.to_string());
            }
        };
    }

    opt_field!(title, "title");
    opt_field!(description, "description");
    opt_field!(attachment, "attachment");
    opt_field!(tex, "tex");
    opt_field!(problem_type, "type");

    if let Some(v) = req.complexity {
        sets.push("complexity = ?".to_string());
        binds.push(v.to_string());
    }
    if let Some(v) = req.answer_options_count {
        sets.push("answer_options_count = ?".to_string());
        binds.push(v.to_string());
    }

    if !sets.is_empty() {
        let sql = format!("UPDATE labs_problems SET {} WHERE problem_id = ?", sets.join(", "));
        let mut query = sqlx::query(&sql);
        for b in &binds {
            query = query.bind(b);
        }
        query = query.bind(problem_id);
        query.execute(&state.pool).await?;
    }

    Ok(Json(json!({ "ok": true })))
}

pub async fn get_attachment(
    State(state): State<AppState>,
    Path(problem_id): Path<u32>,
) -> AppResult<impl IntoResponse> {
    let problem: Option<(String,)> = sqlx::query_as(
        "SELECT attachment FROM labs_problems WHERE problem_id = ?"
    )
    .bind(problem_id)
    .fetch_optional(&state.pool)
    .await?;

    let (attachment,) = problem.ok_or(AppError::ProblemNotFound)?;
    if attachment.is_empty() {
        return Err(AppError::NotFound);
    }

    let path = format!("{}/attachments/{}", state.config.upload_dir, attachment);
    let data = tokio::fs::read(&path).await.map_err(|_| AppError::NotFound)?;

    let content_type = if attachment.ends_with(".pdf") {
        "application/pdf"
    } else if attachment.ends_with(".zip") {
        "application/zip"
    } else {
        "application/octet-stream"
    };

    Ok((
        [
            (header::CONTENT_TYPE, content_type.to_string()),
            (
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{}\"", attachment),
            ),
        ],
        data,
    ))
}

pub async fn upload_attachment(
    State(state): State<AppState>,
    Path(problem_id): Path<u32>,
    RequireAuth(user): RequireAuth,
    mut multipart: Multipart,
) -> AppResult<Json<serde_json::Value>> {
    if !crate::auth::access::is_teacher(user.access) && !crate::auth::access::is_admin(user.access) {
        return Err(AppError::AccessDenied);
    }

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        let file_name = field.file_name().unwrap_or("attachment").to_string();
        let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;

        let attachment_name = format!("{}_{}", problem_id, file_name);
        let dir = format!("{}/attachments", state.config.upload_dir);
        tokio::fs::create_dir_all(&dir).await.map_err(|e| AppError::Internal(e.into()))?;
        let path = format!("{}/{}", dir, attachment_name);
        tokio::fs::write(&path, &data).await.map_err(|e| AppError::Internal(e.into()))?;

        sqlx::query("UPDATE labs_problems SET attachment = ? WHERE problem_id = ?")
            .bind(&attachment_name)
            .bind(problem_id)
            .execute(&state.pool)
            .await?;

        return Ok(Json(json!({ "ok": true, "attachment": attachment_name })));
    }

    Err(AppError::BadRequest("No file uploaded".to_string()))
}

pub fn router() -> axum::Router<AppState> {
    use axum::routing::{get, post, put};
    axum::Router::new()
        .route("/", get(list_problems))
        .route("/", post(create_problem))
        .route("/{problem_id}", get(get_problem))
        .route("/{problem_id}", put(update_problem))
        .route("/{problem_id}/attachment", get(get_attachment))
        .route("/{problem_id}/attachment", post(upload_attachment))
}
