use rust_decimal::Decimal;
use sqlx::MySqlPool;
use std::collections::HashMap;

use super::*;
use crate::error::AppResult;
use crate::models::Contest;

type UserScoreMap = HashMap<u32, HashMap<i32, (Decimal, bool, Option<u32>)>>;

#[derive(sqlx::FromRow, Debug)]
struct SolutionRow {
    user_id: u32,
    problem_id: u32,
    best_test_score: Decimal,
    best_score: Decimal,
    has_ok: i64, // 1 if any solution has test_result = 0 (OK)
}

/// Compute classic standings (also used for otbor, olympic, cert contest types)
pub async fn compute_classic_standings(
    pool: &MySqlPool,
    contest: &Contest,
    params: &StandingsParams,
) -> AppResult<StandingsResult> {
    // Get problems in contest
    let problems: Vec<(i32, String, String)> = sqlx::query_as(
        "SELECT cp.problem_id, cp.short_name, COALESCE(p.title, '') as title \
         FROM labs_contest_problems cp \
         LEFT JOIN labs_problems p ON cp.problem_id = p.problem_id \
         WHERE cp.contest_id = ? \
         ORDER BY cp.short_name ASC",
    )
    .bind(contest.contest_id)
    .fetch_all(pool)
    .await?;

    // Get user filter for groups
    let group_users: Option<Vec<u32>> = if let Some(gid) = params.group_id {
        let users: Vec<(i32,)> =
            sqlx::query_as("SELECT user_id FROM labs_user_group_relationships WHERE group_id = ?")
                .bind(gid)
                .fetch_all(pool)
                .await?;
        Some(users.into_iter().map(|(uid,)| uid as u32).collect())
    } else {
        None
    };

    // Get best scores per user per problem
    let solutions: Vec<SolutionRow> = sqlx::query_as(
        "SELECT s.user_id, s.problem_id, \
         MAX(s.test_score) as best_test_score, \
         MAX(s.score) as best_score, \
         MAX(CASE WHEN s.test_result = 0 THEN 1 ELSE 0 END) as has_ok \
         FROM labs_solutions s \
         WHERE s.contest_id = ? AND s.test_result >= 0 \
         GROUP BY s.user_id, s.problem_id",
    )
    .bind(contest.contest_id)
    .fetch_all(pool)
    .await?;

    // Get the best solution_id per user per problem (the one with highest test_score)
    let best_solution_ids: HashMap<(u32, u32), u32> = {
        let rows: Vec<(u32, u32, u32)> = sqlx::query_as(
            "SELECT s.user_id, s.problem_id, s.solution_id \
             FROM labs_solutions s \
             INNER JOIN ( \
               SELECT user_id, problem_id, MAX(test_score) as max_score \
               FROM labs_solutions \
               WHERE contest_id = ? AND test_result >= 0 \
               GROUP BY user_id, problem_id \
             ) best ON s.user_id = best.user_id AND s.problem_id = best.problem_id AND s.test_score = best.max_score \
             WHERE s.contest_id = ? AND s.test_result >= 0 \
             GROUP BY s.user_id, s.problem_id"
        )
        .bind(contest.contest_id)
        .bind(contest.contest_id)
        .fetch_all(pool)
        .await?;
        rows.into_iter()
            .map(|(uid, pid, sid)| ((uid, pid), sid))
            .collect()
    };

    // Get problem max_scores from contest_problems for deciding which score to use
    let problem_max_scores: HashMap<i32, i32> = {
        let rows: Vec<(i32, i32)> = sqlx::query_as(
            "SELECT problem_id, max_score FROM labs_contest_problems WHERE contest_id = ?",
        )
        .bind(contest.contest_id)
        .fetch_all(pool)
        .await?;
        rows.into_iter().collect()
    };

    // Build per-user score map
    // user_id -> problem_id -> (score, is_solved, solution_id)
    let mut user_scores: UserScoreMap = HashMap::new();

    for sol in &solutions {
        // Filter by group if needed
        if let Some(ref gu) = group_users
            && !gu.contains(&sol.user_id)
        {
            continue;
        }

        let pid_i32 = sol.problem_id as i32;
        let score = if problem_max_scores.get(&pid_i32).copied().unwrap_or(0) > 0 {
            // Use best_score if problem has max_score
            if sol.best_score > sol.best_test_score {
                sol.best_score
            } else {
                sol.best_test_score
            }
        } else {
            sol.best_test_score
        };

        user_scores.entry(sol.user_id).or_default().insert(
            pid_i32,
            (
                score,
                sol.has_ok > 0,
                best_solution_ids
                    .get(&(sol.user_id, sol.problem_id))
                    .copied(),
            ),
        );
    }

    // Get user info
    let user_ids: Vec<u32> = user_scores.keys().cloned().collect();
    let mut user_info: HashMap<u32, (String, String)> = HashMap::new();

    if !user_ids.is_empty() {
        // Fetch in batches to avoid too many bind params
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

    // Also include registered users with no solutions
    let registered: Vec<(i32,)> =
        sqlx::query_as("SELECT user_id FROM labs_contest_users WHERE contest_id = ?")
            .bind(contest.contest_id)
            .fetch_all(pool)
            .await?;

    for (uid,) in &registered {
        let uid_u32 = *uid as u32;
        if let Some(ref gu) = group_users
            && !gu.contains(&uid_u32)
        {
            continue;
        }
        user_scores.entry(uid_u32).or_default();
        if let std::collections::hash_map::Entry::Vacant(e) = user_info.entry(uid_u32) {
            let info: Option<(String, String)> =
                sqlx::query_as("SELECT nickname, FIO FROM labs_users WHERE user_id = ?")
                    .bind(uid)
                    .fetch_optional(pool)
                    .await?;
            if let Some((nick, fio)) = info {
                e.insert((nick, fio));
            }
        }
    }

    // Build user rows
    let mut user_rows: Vec<UserRow> = Vec::new();

    for (uid, scores) in &user_scores {
        let (nickname, fio) = user_info
            .get(uid)
            .cloned()
            .unwrap_or_else(|| (format!("User {}", uid), String::new()));

        let mut problem_scores = Vec::new();
        let mut total = Decimal::ZERO;
        let mut solved = 0i32;

        for (pid, _short_name, _title) in &problems {
            let (score, is_solved, sol_id) =
                scores
                    .get(pid)
                    .cloned()
                    .unwrap_or((Decimal::ZERO, false, None));
            total += score;
            if is_solved {
                solved += 1;
            }

            problem_scores.push(ProblemScore {
                problem_id: *pid as u32,
                score: score.to_string(),
                attempts: 0,
                is_solved,
                time: 0,
                is_first_solve: false,
                solution_id: sol_id,
            });
        }

        user_rows.push(UserRow {
            place: 0,
            user_id: *uid,
            nickname,
            fio,
            scores: problem_scores,
            total_score: total.to_string(),
            total_solved: solved,
            penalty: 0,
        });
    }

    // Sort by total_score DESC, then alphabetical by nickname (matching PHP user_sort)
    user_rows.sort_by(|a, b| {
        let sa = Decimal::from_str_exact(&a.total_score).unwrap_or(Decimal::ZERO);
        let sb = Decimal::from_str_exact(&b.total_score).unwrap_or(Decimal::ZERO);
        match sb.cmp(&sa) {
            std::cmp::Ordering::Equal => a.nickname.to_lowercase().cmp(&b.nickname.to_lowercase()),
            other => other,
        }
    });

    // Assign places (tied users get same place — same score = same place)
    let mut place = 1;
    for i in 0..user_rows.len() {
        if i > 0 && user_rows[i].total_score != user_rows[i - 1].total_score {
            place = i as i32 + 1;
        }
        user_rows[i].place = place;
    }

    // Compute problem summary stats
    let mut problem_tried: HashMap<i32, i32> = HashMap::new();
    let mut problem_solved: HashMap<i32, i32> = HashMap::new();
    let mut problem_total_score: HashMap<i32, Decimal> = HashMap::new();
    let mut problem_score_count: HashMap<i32, i32> = HashMap::new();

    for scores in user_scores.values() {
        for (pid, (score, is_solved, _sol_id)) in scores {
            *problem_tried.entry(*pid).or_default() += 1;
            if *is_solved {
                *problem_solved.entry(*pid).or_default() += 1;
            }
            if *score > Decimal::ZERO {
                *problem_total_score.entry(*pid).or_default() += score;
                *problem_score_count.entry(*pid).or_default() += 1;
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
        .map(|(pid, _, _)| {
            let tried = *problem_tried.get(pid).unwrap_or(&0);
            let solved = *problem_solved.get(pid).unwrap_or(&0);
            let total = *problem_total_score.get(pid).unwrap_or(&Decimal::ZERO);
            let count = *problem_score_count.get(pid).unwrap_or(&0);
            let avg = if count > 0 {
                (total / Decimal::from(count)).to_string()
            } else {
                "0".to_string()
            };
            SummaryRow {
                problem_id: *pid as u32,
                tried,
                solved,
                avg_score: avg,
            }
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
