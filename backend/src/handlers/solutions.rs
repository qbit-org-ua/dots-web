use axum::extract::{Path, Query, State};
use axum::http::header;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;
use serde_json::json;

use crate::auth::middleware::{AppState, RequireAdmin, RequireAuth};
use crate::error::{AppError, AppResult};
use crate::models::{Solution, Test};

#[derive(Deserialize)]
pub struct SolutionListParams {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub user_id: Option<u32>,
    pub contest_id: Option<i32>,
    pub problem_id: Option<u32>,
}

#[derive(Deserialize)]
pub struct UpdateScoreRequest {
    pub score: String,
    pub is_passed: Option<i8>,
}

pub async fn list_solutions(
    State(state): State<AppState>,
    RequireAuth(user): RequireAuth,
    Query(params): Query<SolutionListParams>,
) -> AppResult<Json<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(50).min(200);
    let offset = (page - 1) * per_page;

    let is_admin = crate::auth::access::is_admin(user.access);

    let mut where_parts = Vec::new();
    let mut bind_values: Vec<String> = Vec::new();

    // Non-admins can only see their own solutions
    if !is_admin {
        where_parts.push("s.user_id = ?".to_string());
        bind_values.push(user.user_id.to_string());
    } else if let Some(uid) = params.user_id {
        where_parts.push("s.user_id = ?".to_string());
        bind_values.push(uid.to_string());
    }

    if let Some(cid) = params.contest_id {
        where_parts.push("s.contest_id = ?".to_string());
        bind_values.push(cid.to_string());
    }

    if let Some(pid) = params.problem_id {
        where_parts.push("s.problem_id = ?".to_string());
        bind_values.push(pid.to_string());
    }

    let where_sql = if where_parts.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_parts.join(" AND "))
    };

    let count_sql = format!("SELECT COUNT(*) FROM labs_solutions s {}", where_sql);
    let list_sql = format!(
        "SELECT s.solution_id, s.problem_id, s.user_id, s.contest_id, s.filename, \
         s.checksum, s.lang_id, s.check_type, s.posted_time, s.checked_time, \
         s.contest_time, s.test_result, s.test_score, s.score, s.module_val, \
         s.compile_error, s.is_passed \
         FROM labs_solutions s {} ORDER BY s.solution_id DESC LIMIT ? OFFSET ?",
        where_sql
    );

    let mut cq = sqlx::query_as::<_, (i64,)>(&count_sql);
    for v in &bind_values {
        cq = cq.bind(v);
    }
    let (total,) = cq.fetch_one(&state.pool).await?;

    let mut lq = sqlx::query_as::<_, Solution>(&list_sql);
    for v in &bind_values {
        lq = lq.bind(v);
    }
    let solutions = lq.bind(per_page).bind(offset).fetch_all(&state.pool).await?;

    // Enrich all solutions with problem/contest/user names
    if !solutions.is_empty() {
        use std::collections::HashMap;

        let problem_ids: Vec<u32> = solutions.iter().map(|s| s.problem_id).collect();
        let contest_ids: Vec<i32> = solutions.iter().filter_map(|s| s.contest_id).collect();

        // Problem titles
        let mut problem_info: HashMap<u32, String> = HashMap::new();
        if !problem_ids.is_empty() {
            let ph = problem_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let sql = format!("SELECT problem_id, title FROM labs_problems WHERE problem_id IN ({})", ph);
            let mut q = sqlx::query_as::<_, (u32, String)>(&sql);
            for id in &problem_ids { q = q.bind(id); }
            for (pid, title) in q.fetch_all(&state.pool).await? {
                problem_info.insert(pid, title);
            }
        }

        // Contest titles
        let mut contest_info: HashMap<i32, String> = HashMap::new();
        if !contest_ids.is_empty() {
            let ph = contest_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let sql = format!("SELECT contest_id, title FROM labs_contests WHERE contest_id IN ({})", ph);
            let mut q = sqlx::query_as::<_, (i32, String)>(&sql);
            for id in &contest_ids { q = q.bind(id); }
            for (cid, title) in q.fetch_all(&state.pool).await? {
                contest_info.insert(cid, title);
            }
        }

        // Short names from contest_problems (contest_id + problem_id → short_name)
        let mut short_names: HashMap<(i32, u32), String> = HashMap::new();
        for s in &solutions {
            if let Some(cid) = s.contest_id {
                let key = (cid, s.problem_id);
                if let std::collections::hash_map::Entry::Vacant(e) = short_names.entry(key) {
                    let sn: Option<(String,)> = sqlx::query_as(
                        "SELECT short_name FROM labs_contest_problems WHERE contest_id = ? AND problem_id = ?"
                    )
                    .bind(cid).bind(s.problem_id)
                    .fetch_optional(&state.pool).await?;
                    if let Some((name,)) = sn {
                        e.insert(name);
                    }
                }
            }
        }

        // User info (admin only — regular users don't need other users' names)
        let mut user_info: HashMap<u32, (String, String)> = HashMap::new();
        if is_admin {
            let user_ids: Vec<u32> = solutions.iter().map(|s| s.user_id).collect();
            if !user_ids.is_empty() {
                let ph = user_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
                let sql = format!("SELECT user_id, nickname, FIO FROM labs_users WHERE user_id IN ({})", ph);
                let mut q = sqlx::query_as::<_, (u32, String, String)>(&sql);
                for id in &user_ids { q = q.bind(id); }
                for (uid, nick, fio) in q.fetch_all(&state.pool).await? {
                    user_info.insert(uid, (nick, fio));
                }
            }
        }

        let enriched: Vec<serde_json::Value> = solutions.iter().map(|s| {
            let mut val = serde_json::to_value(s).unwrap_or_default();
            if let Some(obj) = val.as_object_mut() {
                obj.insert("problem_title".to_string(), json!(problem_info.get(&s.problem_id).cloned().unwrap_or_default()));
                if let Some(cid) = s.contest_id {
                    obj.insert("contest_title".to_string(), json!(contest_info.get(&cid).cloned().unwrap_or_default()));
                    if let Some(sn) = short_names.get(&(cid, s.problem_id)) {
                        obj.insert("short_name".to_string(), json!(sn));
                    }
                }
                if is_admin {
                    let (nick, fio) = user_info.get(&s.user_id).cloned().unwrap_or_default();
                    obj.insert("nickname".to_string(), json!(nick));
                    obj.insert("fio".to_string(), json!(fio));
                }
            }
            val
        }).collect();

        return Ok(Json(json!({
            "solutions": enriched,
            "total": total,
            "page": page,
            "per_page": per_page,
        })));
    }

    Ok(Json(json!({
        "solutions": solutions,
        "total": total,
        "page": page,
        "per_page": per_page,
    })))
}

pub async fn get_solution(
    State(state): State<AppState>,
    Path(solution_id): Path<u32>,
    RequireAuth(user): RequireAuth,
) -> AppResult<Json<serde_json::Value>> {
    let solution: Option<Solution> = sqlx::query_as(
        "SELECT solution_id, problem_id, user_id, contest_id, filename, \
         checksum, lang_id, check_type, posted_time, checked_time, \
         contest_time, test_result, test_score, score, module_val, \
         compile_error, is_passed \
         FROM labs_solutions WHERE solution_id = ?"
    )
    .bind(solution_id)
    .fetch_optional(&state.pool)
    .await?;

    let solution = solution.ok_or(AppError::SolutionNotFound)?;

    let is_admin = crate::auth::access::is_admin(user.access);
    if solution.user_id != user.user_id && !is_admin {
        return Err(AppError::AccessDenied);
    }

    // Get test results
    let tests: Vec<Test> = sqlx::query_as(
        "SELECT test_id, solution_id, test_no, test_result, test_score, test_time, test_mem \
         FROM labs_tests WHERE solution_id = ? ORDER BY test_no ASC"
    )
    .bind(solution_id)
    .fetch_all(&state.pool)
    .await?;

    // Get user nickname
    let nickname: Option<(String,)> = sqlx::query_as(
        "SELECT nickname FROM labs_users WHERE user_id = ?"
    )
    .bind(solution.user_id)
    .fetch_optional(&state.pool)
    .await?;

    // Get problem title
    let problem: Option<(String,)> = sqlx::query_as(
        "SELECT title FROM labs_problems WHERE problem_id = ?"
    )
    .bind(solution.problem_id)
    .fetch_optional(&state.pool)
    .await?;

    Ok(Json(json!({
        "solution": solution,
        "tests": tests,
        "nickname": nickname.map(|n| n.0).unwrap_or_default(),
        "problem_title": problem.map(|p| p.0).unwrap_or_default(),
        "language": crate::models::language::language_name(solution.lang_id as i32),
    })))
}

pub async fn update_score(
    State(state): State<AppState>,
    Path(solution_id): Path<u32>,
    RequireAdmin(_user): RequireAdmin,
    Json(req): Json<UpdateScoreRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let exists: Option<(u32,)> = sqlx::query_as(
        "SELECT solution_id FROM labs_solutions WHERE solution_id = ?"
    )
    .bind(solution_id)
    .fetch_optional(&state.pool)
    .await?;
    if exists.is_none() {
        return Err(AppError::SolutionNotFound);
    }

    let is_passed = req.is_passed.unwrap_or(0);

    sqlx::query(
        "UPDATE labs_solutions SET score = ?, is_passed = ? WHERE solution_id = ?"
    )
    .bind(&req.score)
    .bind(is_passed)
    .bind(solution_id)
    .execute(&state.pool)
    .await?;

    Ok(Json(json!({ "ok": true })))
}

pub async fn rejudge_solution(
    State(state): State<AppState>,
    Path(solution_id): Path<u32>,
    RequireAdmin(_user): RequireAdmin,
) -> AppResult<Json<serde_json::Value>> {
    sqlx::query(
        "UPDATE labs_solutions SET test_result = -1, test_score = 0, \
         compile_error = '' WHERE solution_id = ?"
    )
    .bind(solution_id)
    .execute(&state.pool)
    .await?;

    // Delete existing test results
    sqlx::query("DELETE FROM labs_tests WHERE solution_id = ?")
        .bind(solution_id)
        .execute(&state.pool)
        .await?;

    Ok(Json(json!({ "ok": true })))
}

pub async fn get_source(
    State(state): State<AppState>,
    Path(solution_id): Path<u32>,
    RequireAuth(user): RequireAuth,
) -> AppResult<impl IntoResponse> {
    let solution: Option<Solution> = sqlx::query_as(
        "SELECT solution_id, problem_id, user_id, contest_id, filename, \
         checksum, lang_id, check_type, posted_time, checked_time, \
         contest_time, test_result, test_score, score, module_val, \
         compile_error, is_passed \
         FROM labs_solutions WHERE solution_id = ?"
    )
    .bind(solution_id)
    .fetch_optional(&state.pool)
    .await?;

    let solution = solution.ok_or(AppError::SolutionNotFound)?;

    let is_admin = crate::auth::access::is_admin(user.access);
    let can_download = crate::auth::access::has_access(user.access, crate::auth::ACCESS_DOWNLOAD_SOLUTIONS);
    if solution.user_id != user.user_id && !is_admin && !can_download {
        return Err(AppError::AccessDenied);
    }

    let lang = solution.lang_id as i32;
    let path = crate::services::file_storage::solution_fullname(
        &state.config.upload_dir,
        solution.solution_id,
        solution.problem_id,
        solution.user_id,
        lang,
        &solution.check_type,
    );

    let data = tokio::fs::read(&path).await.map_err(|_| AppError::NotFound)?;

    let filename = crate::services::file_storage::solution_filename(
        solution.solution_id,
        solution.problem_id,
        solution.user_id,
        lang,
        &solution.check_type,
    );

    Ok((
        [
            (header::CONTENT_TYPE, "text/plain; charset=utf-8".to_string()),
            (
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{}\"", filename),
            ),
        ],
        data,
    ))
}

pub fn router() -> axum::Router<AppState> {
    use axum::routing::{get, post, put};
    axum::Router::new()
        .route("/", get(list_solutions))
        .route("/{solution_id}", get(get_solution))
        .route("/{solution_id}/score", put(update_score))
        .route("/{solution_id}/rejudge", post(rejudge_solution))
        .route("/{solution_id}/source", get(get_source))
}
