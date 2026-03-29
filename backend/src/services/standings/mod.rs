pub mod acm;
pub mod classic;

use serde::Serialize;
use sqlx::MySqlPool;

use crate::error::AppResult;
use crate::models::Contest;

#[derive(Debug, Clone)]
pub struct StandingsParams {
    pub page: u32,
    pub per_page: u32,
    pub group_id: Option<i32>,
    pub show_frozen: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct StandingsResult {
    pub problems: Vec<ProblemInfo>,
    pub users: Vec<UserRow>,
    pub summary: Vec<SummaryRow>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProblemInfo {
    pub problem_id: u32,
    pub short_name: String,
    pub title: String,
    pub tried: i32,
    pub solved: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct UserRow {
    pub place: i32,
    pub user_id: u32,
    pub nickname: String,
    pub fio: String,
    pub scores: Vec<ProblemScore>,
    pub total_score: String,
    pub total_solved: i32,
    pub penalty: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProblemScore {
    pub problem_id: u32,
    pub score: String,
    pub attempts: i32,
    pub is_solved: bool,
    pub time: i64,
    pub is_first_solve: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct SummaryRow {
    pub problem_id: u32,
    pub tried: i32,
    pub solved: i32,
    pub avg_score: String,
}

/// Main dispatcher: compute standings based on contest type
pub async fn compute_standings(
    pool: &MySqlPool,
    contest: &Contest,
    params: &StandingsParams,
) -> AppResult<StandingsResult> {
    match contest.contest_type.as_str() {
        "acm" => acm::compute_acm_standings(pool, contest, params).await,
        _ => classic::compute_classic_standings(pool, contest, params).await,
    }
}
