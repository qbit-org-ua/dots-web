use axum::extract::{Multipart, Path, Query, State};
use sqlx::Executor;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::auth::middleware::{AppState, OptionalUser, RequireAdmin, RequireAuth};
use crate::auth::session::{build_session_data, write_session};
use crate::error::{AppError, AppResult};
use crate::models::{Contest, ContestData, ContestProblem, ContestUser};
use crate::services::contest_engine::{compute_pages, compute_status, ContestStatus};

#[derive(Deserialize)]
pub struct ContestListParams {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub contest_type: Option<String>,
    pub visible: Option<i8>,
}

#[derive(Deserialize)]
pub struct ContestCreateRequest {
    pub title: String,
    pub contest_type: Option<String>,
    pub start_time: Option<i64>,
    pub data: Option<String>,
    pub info: Option<String>,
    pub visible: Option<i8>,
    pub allow_languages: Option<String>,
}

#[derive(Deserialize)]
pub struct ContestUpdateRequest {
    pub title: Option<String>,
    pub contest_type: Option<String>,
    pub start_time: Option<i64>,
    pub data: Option<String>,
    pub info: Option<String>,
    pub visible: Option<i8>,
    pub allow_languages: Option<String>,
    pub options: Option<i32>,
}

#[derive(Deserialize)]
pub struct AddProblemRequest {
    pub problem_id: i32,
    pub short_name: Option<String>,
    pub max_score: Option<i32>,
}

#[derive(Deserialize)]
pub struct ContestSolutionParams {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub problem_id: Option<u32>,
    pub user_id: Option<u32>,
}

#[derive(Serialize)]
pub struct ContestListResponse {
    pub contests: Vec<ContestListItem>,
    pub total: i64,
    pub page: u32,
    pub per_page: u32,
}

#[derive(Serialize)]
pub struct ContestListItem {
    pub contest_id: i32,
    pub title: String,
    pub contest_type: String,
    pub start_time: i64,
    pub visible: i8,
    pub status: String,
    pub reg_status: Option<String>,
    pub user_count: i64,
}

pub async fn list_contests(
    State(state): State<AppState>,
    OptionalUser(user): OptionalUser,
    Query(params): Query<ContestListParams>,
) -> AppResult<Json<ContestListResponse>> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;

    let is_admin = user
        .as_ref()
        .map(|u| crate::auth::access::is_admin(u.access))
        .unwrap_or(false);

    let mut where_clauses = Vec::new();
    let mut bind_values: Vec<String> = Vec::new();

    if !is_admin {
        where_clauses.push("visible = 1".to_string());
    } else if let Some(visible) = params.visible {
        where_clauses.push("visible = ?".to_string());
        bind_values.push(visible.to_string());
    }

    if let Some(ref ct) = params.contest_type {
        where_clauses.push("contest_type = ?".to_string());
        bind_values.push(ct.clone());
    }

    let where_sql = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    let count_sql = format!("SELECT COUNT(*) FROM labs_contests {}", where_sql);
    let list_sql = format!(
        "SELECT contest_id, title, contest_type, start_time, options, data, info, visible, author_id, allow_languages \
         FROM labs_contests {} ORDER BY start_time DESC LIMIT ? OFFSET ?",
        where_sql
    );

    // Execute count query
    let mut count_query = sqlx::query_as::<_, (i64,)>(&count_sql);
    for v in &bind_values {
        count_query = count_query.bind(v);
    }
    let (total,) = count_query.fetch_one(&state.pool).await?;

    // Execute list query
    let mut list_query = sqlx::query_as::<_, Contest>(&list_sql);
    for v in &bind_values {
        list_query = list_query.bind(v);
    }
    let contests: Vec<Contest> = list_query
        .bind(per_page)
        .bind(offset)
        .fetch_all(&state.pool)
        .await?;

    // Build response with status and user count
    let mut items = Vec::new();
    for contest in &contests {
        let status = compute_status(contest);

        // Get user count
        let (user_count,): (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM labs_contest_users WHERE contest_id = ?"
        )
        .bind(contest.contest_id)
        .fetch_one(&state.pool)
        .await?;

        // Check user registration status
        let reg_status = if let Some(ref u) = user {
            let reg: Option<(i32,)> = sqlx::query_as(
                "SELECT reg_status FROM labs_contest_users WHERE contest_id = ? AND user_id = ?"
            )
            .bind(contest.contest_id)
            .bind(u.user_id)
            .fetch_optional(&state.pool)
            .await?;
            reg.map(|(s,)| s.to_string())
        } else {
            None
        };

        items.push(ContestListItem {
            contest_id: contest.contest_id,
            title: contest.title.clone(),
            contest_type: contest.contest_type.clone(),
            start_time: contest.start_time,
            visible: contest.visible,
            status: format!("{:?}", status),
            reg_status,
            user_count,
        });
    }

    Ok(Json(ContestListResponse {
        contests: items,
        total,
        page,
        per_page,
    }))
}

pub async fn get_contest(
    State(state): State<AppState>,
    Path(contest_id): Path<i32>,
    OptionalUser(user): OptionalUser,
) -> AppResult<Json<serde_json::Value>> {
    let contest: Option<Contest> = sqlx::query_as(
        "SELECT contest_id, title, contest_type, start_time, options, data, info, visible, author_id, allow_languages \
         FROM labs_contests WHERE contest_id = ?"
    )
    .bind(contest_id)
    .fetch_optional(&state.pool)
    .await?;

    let contest = contest.ok_or(AppError::ContestNotFound)?;

    let is_admin = user
        .as_ref()
        .map(|u| crate::auth::access::is_admin(u.access))
        .unwrap_or(false);

    if contest.visible == 0 && !is_admin {
        return Err(AppError::ContestNotFound);
    }

    let status = compute_status(&contest);
    let contest_data = ContestData::parse(&contest.data);

    // Check user registration
    let (user_registered, reg_status) = if let Some(ref u) = user {
        let reg: Option<(i32,)> = sqlx::query_as(
            "SELECT reg_status FROM labs_contest_users WHERE contest_id = ? AND user_id = ?"
        )
        .bind(contest_id)
        .bind(u.user_id)
        .fetch_optional(&state.pool)
        .await?;
        match reg {
            Some((rs,)) => (true, Some(rs)),
            None => (false, None),
        }
    } else {
        (false, None)
    };

    let pages = compute_pages(&contest, &status, user_registered);

    // Get problem count
    let (problem_count,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM labs_contest_problems WHERE contest_id = ?"
    )
    .bind(contest_id)
    .fetch_one(&state.pool)
    .await?;

    // Get user count
    let (user_count,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM labs_contest_users WHERE contest_id = ?"
    )
    .bind(contest_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(json!({
        "contest": contest,
        "contest_data": contest_data,
        "status": format!("{:?}", status),
        "pages": pages,
        "user_registered": user_registered,
        "reg_status": reg_status,
        "problem_count": problem_count,
        "user_count": user_count,
    })))
}

pub async fn create_contest(
    State(state): State<AppState>,
    RequireAdmin(user): RequireAdmin,
    Json(req): Json<ContestCreateRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let now = chrono::Utc::now().timestamp();
    let result = sqlx::query(
        "INSERT INTO labs_contests (title, contest_type, start_time, data, info, visible, author_id, allow_languages, options) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)"
    )
    .bind(&req.title)
    .bind(req.contest_type.as_deref().unwrap_or("classic"))
    .bind(req.start_time.unwrap_or(now))
    .bind(req.data.as_deref().unwrap_or("{}"))
    .bind(req.info.as_deref().unwrap_or(""))
    .bind(req.visible.unwrap_or(0))
    .bind(user.user_id)
    .bind(req.allow_languages.as_deref().unwrap_or(""))
    .execute(&state.pool)
    .await?;

    let contest_id = result.last_insert_id() as i32;
    Ok(Json(json!({ "ok": true, "contest_id": contest_id })))
}

pub async fn update_contest(
    State(state): State<AppState>,
    Path(contest_id): Path<i32>,
    RequireAdmin(_user): RequireAdmin,
    Json(req): Json<ContestUpdateRequest>,
) -> AppResult<Json<serde_json::Value>> {
    // Check contest exists
    let exists: Option<(i32,)> = sqlx::query_as(
        "SELECT contest_id FROM labs_contests WHERE contest_id = ?"
    )
    .bind(contest_id)
    .fetch_optional(&state.pool)
    .await?;
    if exists.is_none() {
        return Err(AppError::ContestNotFound);
    }

    let mut sets = Vec::new();
    let mut binds: Vec<String> = Vec::new();

    if let Some(ref title) = req.title {
        sets.push("title = ?");
        binds.push(title.clone());
    }
    if let Some(ref ct) = req.contest_type {
        sets.push("contest_type = ?");
        binds.push(ct.clone());
    }
    if let Some(st) = req.start_time {
        sets.push("start_time = ?");
        binds.push(st.to_string());
    }
    if let Some(ref data) = req.data {
        sets.push("data = ?");
        binds.push(data.clone());
    }
    if let Some(ref info) = req.info {
        sets.push("info = ?");
        binds.push(info.clone());
    }
    if let Some(v) = req.visible {
        sets.push("visible = ?");
        binds.push(v.to_string());
    }
    if let Some(ref al) = req.allow_languages {
        sets.push("allow_languages = ?");
        binds.push(al.clone());
    }
    if let Some(opts) = req.options {
        sets.push("options = ?");
        binds.push(opts.to_string());
    }

    if !sets.is_empty() {
        let sql = format!("UPDATE labs_contests SET {} WHERE contest_id = ?", sets.join(", "));
        let mut query = sqlx::query(&sql);
        for b in &binds {
            query = query.bind(b);
        }
        query = query.bind(contest_id);
        query.execute(&state.pool).await?;
    }

    Ok(Json(json!({ "ok": true })))
}

pub async fn register_contest(
    State(state): State<AppState>,
    Path(contest_id): Path<i32>,
    RequireAuth(user): RequireAuth,
) -> AppResult<Json<serde_json::Value>> {
    // Check contest exists
    let contest: Option<Contest> = sqlx::query_as(
        "SELECT contest_id, title, contest_type, start_time, options, data, info, visible, author_id, allow_languages \
         FROM labs_contests WHERE contest_id = ?"
    )
    .bind(contest_id)
    .fetch_optional(&state.pool)
    .await?;
    let _contest = contest.ok_or(AppError::ContestNotFound)?;

    // Insert or ignore (already registered)
    sqlx::query(
        "INSERT IGNORE INTO labs_contest_users (contest_id, user_id, reg_status, reg_data) VALUES (?, ?, 0, '')"
    )
    .bind(contest_id)
    .bind(user.user_id)
    .execute(&state.pool)
    .await?;

    Ok(Json(json!({ "ok": true })))
}

pub async fn login_contest(
    State(state): State<AppState>,
    Path(contest_id): Path<i32>,
    RequireAuth(user): RequireAuth,
    jar: axum_extra::extract::CookieJar,
) -> AppResult<Json<serde_json::Value>> {
    let contest: Option<Contest> = sqlx::query_as(
        "SELECT contest_id, title, contest_type, start_time, options, data, info, visible, author_id, allow_languages \
         FROM labs_contests WHERE contest_id = ?"
    )
    .bind(contest_id)
    .fetch_optional(&state.pool)
    .await?;
    let contest = contest.ok_or(AppError::ContestNotFound)?;

    // Update session with contest_id
    if let Some(cookie) = jar.get("DSID") {
        let session_data = build_session_data(user.user_id, Some(contest_id));
        write_session(&state.pool, cookie.value(), 0, &session_data).await?;
    }

    let status = compute_status(&contest);
    let user_registered = true; // They must be registered to login
    let pages = compute_pages(&contest, &status, user_registered);

    Ok(Json(json!({
        "contest": contest,
        "status": format!("{:?}", status),
        "pages": pages,
    })))
}

pub async fn logout_contest(
    State(state): State<AppState>,
    Path(_contest_id): Path<i32>,
    RequireAuth(user): RequireAuth,
    jar: axum_extra::extract::CookieJar,
) -> AppResult<Json<serde_json::Value>> {
    // Clear contest from session
    if let Some(cookie) = jar.get("DSID") {
        let session_data = build_session_data(user.user_id, None);
        write_session(&state.pool, cookie.value(), 0, &session_data).await?;
    }

    Ok(Json(json!({ "ok": true })))
}

pub async fn list_contest_problems(
    State(state): State<AppState>,
    Path(contest_id): Path<i32>,
    OptionalUser(user): OptionalUser,
) -> AppResult<Json<serde_json::Value>> {
    let problems: Vec<ContestProblem> = sqlx::query_as(
        "SELECT contest_id, short_name, problem_id, max_score, is_with_code_review, user_id \
         FROM labs_contest_problems WHERE contest_id = ? ORDER BY short_name ASC"
    )
    .bind(contest_id)
    .fetch_all(&state.pool)
    .await?;

    // If user is authenticated, get their best results per problem
    let user_results: std::collections::HashMap<u32, (i32, rust_decimal::Decimal)> = if let Some(ref u) = user {
        let rows: Vec<(u32, i32, rust_decimal::Decimal)> = sqlx::query_as(
            "SELECT problem_id, MAX(test_result) as best_result, MAX(test_score) as best_score \
             FROM labs_solutions \
             WHERE contest_id = ? AND user_id = ? AND test_result >= 0 \
             GROUP BY problem_id"
        )
        .bind(contest_id)
        .bind(u.user_id)
        .fetch_all(&state.pool)
        .await?;
        rows.into_iter().map(|(pid, res, score)| (pid, (res, score))).collect()
    } else {
        std::collections::HashMap::new()
    };

    // Get problem details
    let mut result = Vec::new();
    for cp in &problems {
        let problem: Option<(u32, String, i32)> = sqlx::query_as(
            "SELECT problem_id, title, complexity \
             FROM labs_problems WHERE problem_id = ?"
        )
        .bind(cp.problem_id)
        .fetch_optional(&state.pool)
        .await?;

        if let Some((pid, title, complexity)) = problem {
            let (user_result, user_score) = user_results
                .get(&pid)
                .map(|(r, s)| (Some(*r), Some(*s)))
                .unwrap_or((None, None));
            result.push(json!({
                "problem_id": pid,
                "short_name": cp.short_name,
                "max_score": cp.max_score,
                "title": title,
                "complexity": complexity,
                "user_result": user_result,
                "user_score": user_score,
            }));
        }
    }

    Ok(Json(json!({ "problems": result })))
}

pub async fn add_contest_problem(
    State(state): State<AppState>,
    Path(contest_id): Path<i32>,
    RequireAdmin(_user): RequireAdmin,
    Json(req): Json<AddProblemRequest>,
) -> AppResult<Json<serde_json::Value>> {
    // Verify contest exists
    let exists: Option<(i32,)> = sqlx::query_as(
        "SELECT contest_id FROM labs_contests WHERE contest_id = ?"
    )
    .bind(contest_id)
    .fetch_optional(&state.pool)
    .await?;
    if exists.is_none() {
        return Err(AppError::ContestNotFound);
    }

    // Count existing problems to auto-generate short_name
    let (count,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM labs_contest_problems WHERE contest_id = ?"
    )
    .bind(contest_id)
    .fetch_one(&state.pool)
    .await?;

    let short_name = req
        .short_name
        .unwrap_or_else(|| {
            let letter = (b'A' + count as u8) as char;
            letter.to_string()
        });

    let max_score = req.max_score.unwrap_or(100);

    sqlx::query(
        "INSERT INTO labs_contest_problems (contest_id, short_name, problem_id, max_score, is_with_code_review, user_id) \
         VALUES (?, ?, ?, ?, 0, 0) ON DUPLICATE KEY UPDATE short_name = VALUES(short_name), max_score = VALUES(max_score)"
    )
    .bind(contest_id)
    .bind(&short_name)
    .bind(req.problem_id)
    .bind(max_score)
    .execute(&state.pool)
    .await?;

    Ok(Json(json!({ "ok": true })))
}

pub async fn remove_contest_problem(
    State(state): State<AppState>,
    Path((contest_id, problem_id)): Path<(i32, i32)>,
    RequireAdmin(_user): RequireAdmin,
) -> AppResult<Json<serde_json::Value>> {
    sqlx::query(
        "DELETE FROM labs_contest_problems WHERE contest_id = ? AND problem_id = ?"
    )
    .bind(contest_id)
    .bind(problem_id)
    .execute(&state.pool)
    .await?;

    Ok(Json(json!({ "ok": true })))
}

pub async fn list_contest_users(
    State(state): State<AppState>,
    Path(contest_id): Path<i32>,
    OptionalUser(_user): OptionalUser,
) -> AppResult<Json<serde_json::Value>> {
    let users: Vec<ContestUser> = sqlx::query_as(
        "SELECT contest_id, user_id, reg_status, reg_data \
         FROM labs_contest_users WHERE contest_id = ? ORDER BY user_id ASC"
    )
    .bind(contest_id)
    .fetch_all(&state.pool)
    .await?;

    // Get user details
    let mut result = Vec::new();
    for cu in &users {
        let user: Option<(u32, String, String, String)> = sqlx::query_as(
            "SELECT user_id, nickname, FIO, u_institution_name FROM labs_users WHERE user_id = ?"
        )
        .bind(cu.user_id)
        .fetch_optional(&state.pool)
        .await?;

        if let Some((uid, nickname, fio, institution)) = user {
            result.push(json!({
                "user_id": uid,
                "nickname": nickname,
                "fio": fio,
                "u_institution_name": institution,
                "reg_status": cu.reg_status,
            }));
        }
    }

    Ok(Json(json!({ "users": result })))
}

pub async fn list_contest_solutions(
    State(state): State<AppState>,
    Path(contest_id): Path<i32>,
    RequireAuth(user): RequireAuth,
    Query(params): Query<ContestSolutionParams>,
) -> AppResult<Json<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(50).min(200);
    let offset = (page - 1) * per_page;

    let is_admin = crate::auth::access::is_admin(user.access);

    let mut where_parts = vec!["s.contest_id = ?".to_string()];

    if !is_admin {
        where_parts.push("s.user_id = ?".to_string());
    } else if let Some(_uid) = params.user_id {
        where_parts.push("s.user_id = ?".to_string());
    }

    if let Some(_pid) = params.problem_id {
        where_parts.push("s.problem_id = ?".to_string());
    }

    let where_sql = where_parts.join(" AND ");

    let count_sql = format!("SELECT COUNT(*) FROM labs_solutions s WHERE {}", where_sql);
    let list_sql = format!(
        "SELECT s.solution_id, s.problem_id, s.user_id, s.contest_id, s.filename, \
         s.checksum, s.lang_id, s.check_type, s.posted_time, s.checked_time, \
         s.contest_time, s.test_result, s.test_score, s.score, s.module_val, \
         s.compile_error, s.is_passed \
         FROM labs_solutions s WHERE {} ORDER BY s.posted_time DESC LIMIT ? OFFSET ?",
        where_sql
    );

    // Build count query
    let mut cq = sqlx::query_as::<_, (i64,)>(&count_sql);
    cq = cq.bind(contest_id);
    if !is_admin {
        cq = cq.bind(user.user_id);
    } else if let Some(uid) = params.user_id {
        cq = cq.bind(uid);
    }
    if let Some(pid) = params.problem_id {
        cq = cq.bind(pid);
    }
    let (total,) = cq.fetch_one(&state.pool).await?;

    // Build list query
    let mut lq = sqlx::query_as::<_, crate::models::Solution>(&list_sql);
    lq = lq.bind(contest_id);
    if !is_admin {
        lq = lq.bind(user.user_id);
    } else if let Some(uid) = params.user_id {
        lq = lq.bind(uid);
    }
    if let Some(pid) = params.problem_id {
        lq = lq.bind(pid);
    }
    let solutions = lq.bind(per_page).bind(offset).fetch_all(&state.pool).await?;

    // Enrich with problem titles and short names from contest_problems
    let problem_ids: Vec<u32> = solutions.iter().map(|s| s.problem_id).collect();
    let mut problem_info: std::collections::HashMap<u32, (String, String)> = std::collections::HashMap::new();
    if !problem_ids.is_empty() {
        let placeholders = problem_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let sql = format!(
            "SELECT cp.problem_id, cp.short_name, COALESCE(p.title, '') \
             FROM labs_contest_problems cp \
             LEFT JOIN labs_problems p ON cp.problem_id = p.problem_id \
             WHERE cp.contest_id = ? AND cp.problem_id IN ({})",
            placeholders
        );
        let mut q = sqlx::query_as::<_, (i32, String, String)>(&sql);
        q = q.bind(contest_id);
        for pid in &problem_ids {
            q = q.bind(*pid);
        }
        let rows = q.fetch_all(&state.pool).await?;
        for (pid, sn, title) in rows {
            problem_info.insert(pid as u32, (sn, title));
        }
    }

    let enriched: Vec<serde_json::Value> = solutions.iter().map(|s| {
        let (short_name, problem_title) = problem_info.get(&s.problem_id)
            .cloned()
            .unwrap_or_default();
        let mut val = serde_json::to_value(s).unwrap_or_default();
        if let Some(obj) = val.as_object_mut() {
            obj.insert("short_name".to_string(), serde_json::json!(short_name));
            obj.insert("problem_title".to_string(), serde_json::json!(problem_title));
        }
        val
    }).collect();

    Ok(Json(json!({
        "solutions": enriched,
        "total": total,
        "page": page,
        "per_page": per_page,
    })))
}

pub async fn submit_solution(
    State(state): State<AppState>,
    Path(contest_id): Path<i32>,
    RequireAuth(user): RequireAuth,
    mut multipart: Multipart,
) -> AppResult<Json<serde_json::Value>> {
    // Check contest exists and is going
    let contest: Option<Contest> = sqlx::query_as(
        "SELECT contest_id, title, contest_type, start_time, options, data, info, visible, author_id, allow_languages \
         FROM labs_contests WHERE contest_id = ?"
    )
    .bind(contest_id)
    .fetch_optional(&state.pool)
    .await?;
    let contest = contest.ok_or(AppError::ContestNotFound)?;

    let status = compute_status(&contest);
    let is_admin = crate::auth::access::is_admin(user.access);
    if !matches!(status, ContestStatus::Going | ContestStatus::GoingFrozen) && !is_admin {
        return Err(AppError::BadRequest("Contest is not currently running".to_string()));
    }

    // Check user is registered
    let reg: Option<(i32,)> = sqlx::query_as(
        "SELECT reg_status FROM labs_contest_users WHERE contest_id = ? AND user_id = ?"
    )
    .bind(contest_id)
    .bind(user.user_id)
    .fetch_optional(&state.pool)
    .await?;
    if reg.is_none() && !is_admin {
        return Err(AppError::BadRequest("Not registered for this contest".to_string()));
    }

    let mut problem_id: Option<u32> = None;
    let mut lang_id: Option<u32> = None;
    let mut source_data: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "problem_id" => {
                let text = field.text().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
                problem_id = Some(text.parse().map_err(|_| AppError::BadRequest("Invalid problem_id".to_string()))?);
            }
            "lang_id" | "lang" => {
                let text = field.text().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
                lang_id = Some(text.parse().map_err(|_| AppError::BadRequest("Invalid lang_id".to_string()))?);
            }
            "source" | "file" => {
                source_data = Some(field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?.to_vec());
            }
            _ => {}
        }
    }

    let problem_id = problem_id.ok_or_else(|| AppError::BadRequest("problem_id required".to_string()))?;
    let lang_id = lang_id.ok_or_else(|| AppError::BadRequest("lang_id required".to_string()))?;
    let source_data = source_data.ok_or_else(|| AppError::BadRequest("source file required".to_string()))?;

    // Verify problem is in contest
    let cp: Option<(String,)> = sqlx::query_as(
        "SELECT short_name FROM labs_contest_problems WHERE contest_id = ? AND problem_id = ?"
    )
    .bind(contest_id)
    .bind(problem_id)
    .fetch_optional(&state.pool)
    .await?;
    if cp.is_none() {
        return Err(AppError::BadRequest("Problem not in contest".to_string()));
    }

    let now = chrono::Utc::now().timestamp() as i32;
    let contest_data = ContestData::parse(&contest.data);
    let contest_time = if contest_data.absolute_time.unwrap_or(false) {
        now as u32
    } else {
        (now as i64 - contest.start_time) as u32
    };

    // Insert solution
    tracing::info!("submit_solution: inserting problem_id={}, lang_id={}, contest_time={}", problem_id, lang_id, contest_time);

    // Use raw_sql to avoid prepared statement issues with MariaDB
    let insert_sql = format!(
        "INSERT INTO labs_solutions \
         (problem_id, user_id, contest_id, lang_id, posted_time, contest_time, test_result, is_passed) \
         VALUES ({}, {}, {}, {}, {}, {}, -1, 1)",
        problem_id, user.user_id, contest_id, lang_id, now, contest_time
    );
    // Use unprepared query to avoid MariaDB prepared statement type issues
    state.pool.execute(sqlx::raw_sql(&insert_sql)).await?;

    let row: (u64,) = sqlx::query_as("SELECT LAST_INSERT_ID()")
        .fetch_one(&state.pool)
        .await?;
    let solution_id = row.0 as u32;

    // Save source file to <UPLOAD_DIR>/sorted/<userId>/<problemId>/<filename>
    let filename = crate::services::file_storage::solution_filename(
        solution_id, problem_id, user.user_id, lang_id as i32, "F",
    );
    let sorted_dir = crate::services::file_storage::solution_dir(
        &state.config.upload_dir, user.user_id, problem_id,
    );
    tokio::fs::create_dir_all(&sorted_dir).await.map_err(|e| AppError::Internal(e.into()))?;
    let source_path = format!("{}/{}", sorted_dir, filename);
    tokio::fs::write(&source_path, &source_data).await.map_err(|e| AppError::Internal(e.into()))?;

    // Update solution with filename and checksum
    let checksum = {
        use md5::Digest;
        let mut hasher = md5::Md5::new();
        hasher.update(&source_data);
        hex::encode(hasher.finalize())
    };
    let update_sql = format!(
        "UPDATE labs_solutions SET filename = '{}', checksum = '{}' WHERE solution_id = {}",
        filename, checksum, solution_id
    );
    state.pool.execute(sqlx::raw_sql(&update_sql)).await?;

    Ok(Json(json!({ "ok": true, "solution_id": solution_id })))
}

pub fn router() -> axum::Router<AppState> {
    use axum::routing::{delete, get, post, put};
    axum::Router::new()
        .route("/", get(list_contests))
        .route("/", post(create_contest))
        .route("/{contest_id}", get(get_contest))
        .route("/{contest_id}", put(update_contest))
        .route("/{contest_id}/register", post(register_contest))
        .route("/{contest_id}/login", post(login_contest))
        .route("/{contest_id}/logout", post(logout_contest))
        .route("/{contest_id}/problems", get(list_contest_problems))
        .route("/{contest_id}/problems", post(add_contest_problem))
        .route("/{contest_id}/problems/{problem_id}", delete(remove_contest_problem))
        .route("/{contest_id}/users", get(list_contest_users))
        .route("/{contest_id}/solutions", get(list_contest_solutions))
        .route("/{contest_id}/solutions", post(submit_solution))
        .route("/{contest_id}/standings", get(crate::handlers::standings::get_standings))
}
