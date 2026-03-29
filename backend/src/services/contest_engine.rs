use serde::Serialize;

use crate::models::{Contest, ContestData};

#[derive(Debug, Clone, Serialize)]
pub enum ContestStatus {
    Wait,
    Going,
    Finished,
    GoingFrozen,
    FinishedFrozen,
}

#[derive(Debug, Clone, Serialize)]
pub struct ContestPage {
    pub name: String,
    pub title: String,
    pub status: PageStatus,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum PageStatus {
    Available,
    Locked,
    Hidden,
}

/// Compute the current status of a contest based on timing
pub fn compute_status(contest: &Contest) -> ContestStatus {
    let now = chrono::Utc::now().timestamp();
    let data = ContestData::parse(&contest.data);

    let duration = data.duration_time.unwrap_or(0);
    let frozen_time = data.frozen_time.unwrap_or(0);

    if contest.start_time == 0 || duration == 0 {
        // No timing set - always going if start_time > 0, otherwise wait
        if contest.start_time > 0 && contest.start_time <= now {
            return ContestStatus::Going;
        }
        return ContestStatus::Wait;
    }

    let end_time = contest.start_time + duration;

    if now < contest.start_time {
        return ContestStatus::Wait;
    }

    if now >= end_time {
        // Contest has ended
        if frozen_time > 0 && !data.allow_unfreeze.unwrap_or(false) {
            return ContestStatus::FinishedFrozen;
        }
        return ContestStatus::Finished;
    }

    // Contest is ongoing
    if frozen_time > 0 {
        let freeze_start = end_time - frozen_time;
        if now >= freeze_start {
            return ContestStatus::GoingFrozen;
        }
    }

    ContestStatus::Going
}

/// Compute available pages for a contest based on status and user registration
pub fn compute_pages(
    contest: &Contest,
    status: &ContestStatus,
    user_registered: bool,
) -> Vec<ContestPage> {
    let is_acm = contest.contest_type == "acm";

    let mut pages = Vec::new();

    // Info page - always available
    pages.push(ContestPage {
        name: "info".to_string(),
        title: "Info".to_string(),
        status: PageStatus::Available,
    });

    // Users page
    pages.push(ContestPage {
        name: "users".to_string(),
        title: "Participants".to_string(),
        status: PageStatus::Available,
    });

    match status {
        ContestStatus::Wait => {
            // During wait, most pages are locked
            pages.push(ContestPage {
                name: "problems".to_string(),
                title: "Problems".to_string(),
                status: PageStatus::Locked,
            });
            pages.push(ContestPage {
                name: "upload".to_string(),
                title: "Submit".to_string(),
                status: PageStatus::Locked,
            });
            pages.push(ContestPage {
                name: "solutions".to_string(),
                title: "Solutions".to_string(),
                status: PageStatus::Locked,
            });
            pages.push(ContestPage {
                name: "standings".to_string(),
                title: "Standings".to_string(),
                status: PageStatus::Locked,
            });
        }
        ContestStatus::Going | ContestStatus::GoingFrozen => {
            if user_registered {
                pages.push(ContestPage {
                    name: "problems".to_string(),
                    title: "Problems".to_string(),
                    status: PageStatus::Available,
                });
                pages.push(ContestPage {
                    name: "upload".to_string(),
                    title: "Submit".to_string(),
                    status: PageStatus::Available,
                });
                pages.push(ContestPage {
                    name: "solutions".to_string(),
                    title: "Solutions".to_string(),
                    status: PageStatus::Available,
                });
            } else {
                pages.push(ContestPage {
                    name: "problems".to_string(),
                    title: "Problems".to_string(),
                    status: PageStatus::Locked,
                });
                pages.push(ContestPage {
                    name: "upload".to_string(),
                    title: "Submit".to_string(),
                    status: PageStatus::Locked,
                });
                pages.push(ContestPage {
                    name: "solutions".to_string(),
                    title: "Solutions".to_string(),
                    status: PageStatus::Locked,
                });
            }

            // Standings during going
            pages.push(ContestPage {
                name: "standings".to_string(),
                title: "Standings".to_string(),
                status: if is_acm && matches!(status, ContestStatus::GoingFrozen) {
                    PageStatus::Available // Available but frozen data
                } else {
                    PageStatus::Available
                },
            });
        }
        ContestStatus::Finished | ContestStatus::FinishedFrozen => {
            // After contest, upload is locked, everything else available
            pages.push(ContestPage {
                name: "problems".to_string(),
                title: "Problems".to_string(),
                status: PageStatus::Available,
            });
            pages.push(ContestPage {
                name: "upload".to_string(),
                title: "Submit".to_string(),
                status: PageStatus::Locked,
            });
            pages.push(ContestPage {
                name: "solutions".to_string(),
                title: "Solutions".to_string(),
                status: PageStatus::Available,
            });
            pages.push(ContestPage {
                name: "standings".to_string(),
                title: "Standings".to_string(),
                status: PageStatus::Available,
            });
        }
    }

    pages
}
