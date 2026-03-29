use sqlx::MySqlPool;
use std::collections::HashMap;

use super::*;
use crate::error::AppResult;
use crate::models::{Contest, ContestData};
use crate::services::contest_engine::{compute_status, ContestStatus};

#[derive(sqlx::FromRow, Debug)]
struct AcmSolutionRow {
    user_id: u32,
    problem_id: u32,
    test_result: i32,
    contest_time: u32,
    is_passed: i8,
    posted_time: i32,
}

struct AcmProblemResult {
    solved: bool,
    attempts: i32,
    time: i64, // time of first AC in minutes
    is_frozen: bool,
}

/// Compute ACM-style standings
pub async fn compute_acm_standings(
    pool: &MySqlPool,
    contest: &Contest,
    params: &StandingsParams,
) -> AppResult<StandingsResult> {
    let contest_data = ContestData::parse(&contest.data);
    let status = compute_status(contest);

    let frozen_time = contest_data.frozen_time.unwrap_or(0);
    let duration = contest_data.duration_time.unwrap_or(0);

    // Determine freeze point
    let freeze_after: Option<i64> = if frozen_time > 0
        && !params.show_frozen
        && matches!(
            status,
            ContestStatus::GoingFrozen | ContestStatus::FinishedFrozen
        )
    {
        Some(duration - frozen_time)
    } else {
        None
    };

    // Get problems
    let problems: Vec<(i32, String, String)> = sqlx::query_as(
        "SELECT cp.problem_id, cp.short_name, COALESCE(p.title, '') as title \
         FROM labs_contest_problems cp \
         LEFT JOIN labs_problems p ON cp.problem_id = p.problem_id \
         WHERE cp.contest_id = ? \
         ORDER BY cp.short_name ASC"
    )
    .bind(contest.contest_id)
    .fetch_all(pool)
    .await?;

    // Get group filter
    let group_users: Option<Vec<u32>> = if let Some(gid) = params.group_id {
        let users: Vec<(i32,)> = sqlx::query_as(
            "SELECT user_id FROM labs_user_group_relationships WHERE group_id = ?"
        )
        .bind(gid)
        .fetch_all(pool)
        .await?;
        Some(users.into_iter().map(|(uid,)| uid as u32).collect())
    } else {
        None
    };

    // Get all solutions ordered by time
    let solutions: Vec<AcmSolutionRow> = sqlx::query_as(
        "SELECT s.user_id, s.problem_id, s.test_result, s.contest_time, s.is_passed, s.posted_time \
         FROM labs_solutions s \
         WHERE s.contest_id = ? AND s.test_result >= 0 \
         ORDER BY s.user_id, s.problem_id, s.posted_time ASC"
    )
    .bind(contest.contest_id)
    .fetch_all(pool)
    .await?;

    // Process solutions per user per problem
    // user_id -> problem_id -> AcmProblemResult
    let mut user_results: HashMap<u32, HashMap<i32, AcmProblemResult>> = HashMap::new();

    // Track first solve times per problem for "first solve" marking
    let mut first_solve: HashMap<i32, (u32, i64)> = HashMap::new(); // problem_id -> (user_id, time)

    for sol in &solutions {
        if let Some(ref gu) = group_users {
            if !gu.contains(&sol.user_id) {
                continue;
            }
        }

        let entry = user_results
            .entry(sol.user_id)
            .or_default()
            .entry(sol.problem_id as i32)
            .or_insert(AcmProblemResult {
                solved: false,
                attempts: 0,
                time: 0,
                is_frozen: false,
            });

        // Skip if already solved
        if entry.solved {
            continue;
        }

        // Check if this submission is in frozen period
        let ct = sol.contest_time as i64;
        if let Some(freeze) = freeze_after {
            if ct > freeze {
                entry.is_frozen = true;
                entry.attempts += 1;
                continue;
            }
        }

        if sol.test_result == 0 { // test_result == 0 means OK (accepted)
            entry.solved = true;
            entry.time = ct / 60; // convert to minutes
            entry.attempts += 1;

            // Track first solve
            let first = first_solve.entry(sol.problem_id as i32).or_insert((sol.user_id, ct));
            if ct < first.1 {
                *first = (sol.user_id, ct);
            }
        } else {
            entry.attempts += 1;
        }
    }

    // Get user info
    let user_ids: Vec<u32> = user_results.keys().cloned().collect();
    let mut user_info: HashMap<u32, (String, String)> = HashMap::new();

    if !user_ids.is_empty() {
        for chunk in user_ids.chunks(500) {
            let placeholders = chunk.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let sql = format!(
                "SELECT user_id, nickname, FIO FROM labs_users WHERE user_id IN ({})",
                placeholders
            );
            let mut query = sqlx::query_as::<_, (u32, String, String)>(&sql);
            for id in chunk {
                query = query.bind(id);
            }
            let rows = query.fetch_all(pool).await?;
            for (uid, nick, fio) in rows {
                user_info.insert(uid, (nick, fio));
            }
        }
    }

    // Include registered users with no solutions
    let registered: Vec<(i32,)> = sqlx::query_as(
        "SELECT user_id FROM labs_contest_users WHERE contest_id = ?"
    )
    .bind(contest.contest_id)
    .fetch_all(pool)
    .await?;

    for (uid,) in &registered {
        let uid_u32 = *uid as u32;
        if let Some(ref gu) = group_users {
            if !gu.contains(&uid_u32) {
                continue;
            }
        }
        user_results.entry(uid_u32).or_default();
        if !user_info.contains_key(&uid_u32) {
            let info: Option<(String, String)> = sqlx::query_as(
                "SELECT nickname, FIO FROM labs_users WHERE user_id = ?"
            )
            .bind(uid)
            .fetch_optional(pool)
            .await?;
            if let Some((nick, fio)) = info {
                user_info.insert(uid_u32, (nick, fio));
            }
        }
    }

    // Build user rows
    let mut user_rows: Vec<UserRow> = Vec::new();

    for (uid, results) in &user_results {
        let (nickname, fio) = user_info
            .get(uid)
            .cloned()
            .unwrap_or_else(|| (format!("User {}", uid), String::new()));

        let mut problem_scores = Vec::new();
        let mut total_solved = 0i32;
        let mut penalty = 0i64;

        for (pid, _short_name, _title) in &problems {
            let result = results.get(pid);

            let (score_str, attempts, is_solved, time, is_first) = match result {
                Some(r) => {
                    if r.solved {
                        total_solved += 1;
                        let wrong_attempts = r.attempts - 1; // subtract the successful attempt
                        penalty += r.time + (wrong_attempts as i64 * 20);

                        let is_first = first_solve
                            .get(pid)
                            .map(|(fuid, _)| *fuid == *uid)
                            .unwrap_or(false);

                        let score_display = if wrong_attempts > 0 {
                            format!("+{}", wrong_attempts)
                        } else {
                            "+".to_string()
                        };

                        (score_display, r.attempts, true, r.time, is_first)
                    } else if r.is_frozen {
                        let display = format!("?{}", r.attempts);
                        (display, r.attempts, false, 0, false)
                    } else if r.attempts > 0 {
                        (format!("-{}", r.attempts), r.attempts, false, 0, false)
                    } else {
                        (String::new(), 0, false, 0, false)
                    }
                }
                None => (String::new(), 0, false, 0, false),
            };

            problem_scores.push(ProblemScore {
                problem_id: *pid as u32,
                score: score_str,
                attempts,
                is_solved,
                time,
                is_first_solve: is_first,
            });
        }

        user_rows.push(UserRow {
            place: 0,
            user_id: *uid,
            nickname,
            fio,
            scores: problem_scores,
            total_score: total_solved.to_string(),
            total_solved,
            penalty,
        });
    }

    // Sort: problems solved DESC, then penalty ASC
    user_rows.sort_by(|a, b| {
        b.total_solved
            .cmp(&a.total_solved)
            .then(a.penalty.cmp(&b.penalty))
    });

    // Assign places
    let mut place = 1;
    for i in 0..user_rows.len() {
        if i > 0
            && (user_rows[i].total_solved != user_rows[i - 1].total_solved
                || user_rows[i].penalty != user_rows[i - 1].penalty)
        {
            place = i as i32 + 1;
        }
        user_rows[i].place = place;
    }

    // Problem stats
    let mut problem_tried: HashMap<i32, i32> = HashMap::new();
    let mut problem_solved: HashMap<i32, i32> = HashMap::new();

    for results in user_results.values() {
        for (pid, result) in results {
            if result.attempts > 0 {
                *problem_tried.entry(*pid).or_default() += 1;
            }
            if result.solved {
                *problem_solved.entry(*pid).or_default() += 1;
            }
        }
    }

    let problem_infos: Vec<ProblemInfo> = problems
        .iter()
        .map(|(pid, short_name, title)| ProblemInfo {
            problem_id: *pid as u32,
            short_name: short_name.clone(),
            title: title.clone(),
            tried: *problem_tried.get(pid).unwrap_or(&0),
            solved: *problem_solved.get(pid).unwrap_or(&0),
        })
        .collect();

    let summary: Vec<SummaryRow> = problems
        .iter()
        .map(|(pid, _, _)| SummaryRow {
            problem_id: *pid as u32,
            tried: *problem_tried.get(pid).unwrap_or(&0),
            solved: *problem_solved.get(pid).unwrap_or(&0),
            avg_score: "0".to_string(),
        })
        .collect();

    // Paginate
    let start = ((params.page - 1) * params.per_page) as usize;
    let end = (start + params.per_page as usize).min(user_rows.len());
    let paginated = if start < user_rows.len() {
        user_rows[start..end].to_vec()
    } else {
        Vec::new()
    };

    Ok(StandingsResult {
        problems: problem_infos,
        users: paginated,
        summary,
    })
}
