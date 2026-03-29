use axum::extract::{Path, Query, State};
use axum::Json;
use serde::Deserialize;
use serde_json::json;

use crate::auth::middleware::{AppState, OptionalUser};
use crate::error::{AppError, AppResult};
use crate::models::Contest;
use crate::services::standings::StandingsParams;

#[derive(Deserialize)]
pub struct StandingsQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub group_id: Option<i32>,
    pub show_frozen: Option<bool>,
}

pub async fn get_standings(
    State(state): State<AppState>,
    Path(contest_id): Path<i32>,
    OptionalUser(user): OptionalUser,
    Query(query): Query<StandingsQuery>,
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

    let params = StandingsParams {
        page: query.page.unwrap_or(1),
        per_page: query.per_page.unwrap_or(200),
        group_id: query.group_id,
        show_frozen: query.show_frozen.unwrap_or(false) && is_admin,
    };

    let result = crate::services::standings::compute_standings(&state.pool, &contest, &params).await?;

    Ok(Json(json!({
        "contest": {
            "contest_id": contest.contest_id,
            "title": contest.title,
            "contest_type": contest.contest_type,
        },
        "standings": result,
    })))
}
