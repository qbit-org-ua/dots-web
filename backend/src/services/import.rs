use rust_decimal::Decimal;
use sqlx::MySqlPool;
use std::str::FromStr;

use crate::error::AppResult;
use crate::services::file_storage;

/// Parse a result file and import test results into the database.
/// Returns true if import succeeded.
pub async fn import_solution(
    pool: &MySqlPool,
    solution_id: u32,
    upload_dir: &str,
) -> AppResult<bool> {
    let path = file_storage::results_fullname(upload_dir, solution_id);
    let content = match tokio::fs::read_to_string(&path).await {
        Ok(c) => c,
        Err(_) => return Ok(false),
    };

    // Get solution info
    let solution: Option<(u32, u32, String)> = sqlx::query_as(
        "SELECT problem_id, user_id, check_type FROM labs_solutions WHERE solution_id = ?",
    )
    .bind(solution_id)
    .fetch_optional(pool)
    .await?;

    let (problem_id, _user_id, _check_type) = match solution {
        Some(s) => s,
        None => return Ok(false),
    };

    // Parse result file
    let parse_result = parse_result_file(&content);

    // Delete existing test results
    sqlx::query("DELETE FROM labs_tests WHERE solution_id = ?")
        .bind(solution_id)
        .execute(pool)
        .await?;

    // Insert new test results
    if !parse_result.tests.is_empty() {
        for test in &parse_result.tests {
            sqlx::query(
                "INSERT INTO labs_tests (solution_id, test_no, test_result, test_score, test_time, test_mem) \
                 VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(solution_id)
            .bind(test.test_no)
            .bind(test.result)
            .bind(test.score)
            .bind(test.time_ms)
            .bind(test.memory_kb)
            .execute(pool)
            .await?;
        }
    }

    // Load problem config for group-based scoring if available
    let group_scores = load_problem_groups(upload_dir, problem_id).await;

    // Calculate aggregate results
    let (test_result, test_score, is_passed) =
        if parse_result.compile_error_only || parse_result.tests.is_empty() {
            (0, Decimal::ZERO, 0i8)
        } else {
            calculate_aggregates(&parse_result.tests, &group_scores)
        };

    // Update solution
    sqlx::query(
        "UPDATE labs_solutions SET test_result = ?, test_score = ?, is_passed = ?, \
         compile_error = ? WHERE solution_id = ?",
    )
    .bind(test_result)
    .bind(test_score)
    .bind(is_passed)
    .bind(&parse_result.compile_error)
    .bind(solution_id)
    .execute(pool)
    .await?;

    Ok(true)
}

#[derive(Debug)]
struct ParsedResult {
    tests: Vec<TestEntry>,
    compile_error: String,
    compile_error_only: bool,
}

#[derive(Debug)]
struct TestEntry {
    test_no: i32,
    result: i32,
    score: Decimal,
    time_ms: i32,
    memory_kb: i32,
}

fn parse_result_file(content: &str) -> ParsedResult {
    let mut tests = Vec::new();
    let mut compile_error = String::new();
    let mut in_compile_error = false;
    let mut compile_error_only = false;

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // "--" separator indicates compile error follows
        if line == "--" {
            in_compile_error = true;
            if tests.is_empty() {
                compile_error_only = true;
            }
            continue;
        }

        if in_compile_error {
            if !compile_error.is_empty() {
                compile_error.push('\n');
            }
            compile_error.push_str(line);
            continue;
        }

        // Parse test line: test_no result_code score time mem
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let test_no = parts[0].parse::<i32>().unwrap_or(0);
            let result = parts[1].parse::<i32>().unwrap_or(0);
            let score = if parts.len() > 2 {
                Decimal::from_str(parts[2]).unwrap_or(Decimal::ZERO)
            } else {
                Decimal::ZERO
            };
            let time_ms = if parts.len() > 3 {
                parts[3].parse::<i32>().unwrap_or(0)
            } else {
                0
            };
            let memory_kb = if parts.len() > 4 {
                parts[4].parse::<i32>().unwrap_or(0)
            } else {
                0
            };

            tests.push(TestEntry {
                test_no,
                result,
                score,
                time_ms,
                memory_kb,
            });
        }
    }

    ParsedResult {
        tests,
        compile_error,
        compile_error_only,
    }
}

/// Group configuration for scoring
#[derive(Debug)]
struct GroupConfig {
    groups: Vec<Vec<i32>>, // groups of test numbers
    scores: Vec<Decimal>,  // score per group
}

async fn load_problem_groups(upload_dir: &str, problem_id: u32) -> Option<GroupConfig> {
    let config_path = file_storage::problem_config_path(upload_dir, problem_id);
    let content = tokio::fs::read_to_string(&config_path).await.ok()?;

    let mut groups = Vec::new();
    let mut scores = Vec::new();

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        // Format: score test1 test2 test3 ...
        // or: score test1-test3
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }

        let score = Decimal::from_str(parts[0]).ok()?;
        let mut test_nos = Vec::new();

        for part in &parts[1..] {
            if part.contains('-') {
                let range: Vec<&str> = part.split('-').collect();
                if range.len() == 2 {
                    let start = range[0].parse::<i32>().ok()?;
                    let end = range[1].parse::<i32>().ok()?;
                    for i in start..=end {
                        test_nos.push(i);
                    }
                }
            } else {
                test_nos.push(part.parse::<i32>().ok()?);
            }
        }

        groups.push(test_nos);
        scores.push(score);
    }

    if groups.is_empty() {
        None
    } else {
        Some(GroupConfig { groups, scores })
    }
}

/// Calculate aggregate test_result, test_score, and is_passed
fn calculate_aggregates(
    tests: &[TestEntry],
    group_config: &Option<GroupConfig>,
) -> (i32, Decimal, i8) {
    if tests.is_empty() {
        return (0, Decimal::ZERO, 0);
    }

    // test_result = number of tests passed (result == 1)
    let passed_count = tests.iter().filter(|t| t.result == 1).count() as i32;
    let total_count = tests.len() as i32;

    if let Some(config) = group_config {
        // Group-based scoring: a group scores only if ALL tests in it pass
        let mut total_score = Decimal::ZERO;
        for (group, score) in config.groups.iter().zip(config.scores.iter()) {
            let all_passed = group.iter().all(|test_no| {
                tests
                    .iter()
                    .find(|t| t.test_no == *test_no)
                    .map(|t| t.result == 1)
                    .unwrap_or(false)
            });
            if all_passed {
                total_score += score;
            }
        }

        let is_passed = if passed_count == total_count {
            1i8
        } else {
            0i8
        };
        return (passed_count, total_score, is_passed);
    }

    // Simple scoring: test_score = sum of individual scores, or percentage
    let total_score: Decimal = tests.iter().map(|t| t.score).sum();

    let is_passed = if passed_count == total_count {
        1i8
    } else {
        0i8
    };

    (passed_count, total_score, is_passed)
}
