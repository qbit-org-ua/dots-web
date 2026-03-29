use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("not found")]
    NotFound,
    #[error("access denied")]
    AccessDenied,
    #[error("{0}")]
    BadRequest(String),
    #[error("login failed")]
    LoginFailed,
    #[error("invalid email")]
    InvalidEmail,
    #[error("invalid nickname")]
    InvalidNickname,
    #[error("email already exists")]
    EmailExists,
    #[error("nickname already exists")]
    NicknameExists,
    #[error("user not found")]
    UserNotFound,
    #[error("contest not found")]
    ContestNotFound,
    #[error("problem not found")]
    ProblemNotFound,
    #[error("solution not found")]
    SolutionNotFound,
    #[error("message not found")]
    MessageNotFound,
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("internal error: {0}")]
    Internal(#[from] anyhow::Error),
}

impl AppError {
    fn code(&self) -> &'static str {
        match self {
            AppError::NotFound => "NOT_FOUND",
            AppError::AccessDenied => "ACCESS_DENIED",
            AppError::BadRequest(_) => "BAD_REQUEST",
            AppError::LoginFailed => "LOGIN_FAILED",
            AppError::InvalidEmail => "INVALID_EMAIL",
            AppError::InvalidNickname => "INVALID_NICKNAME",
            AppError::EmailExists => "EMAIL_EXISTS",
            AppError::NicknameExists => "NICKNAME_EXISTS",
            AppError::UserNotFound => "USER_NOT_FOUND",
            AppError::ContestNotFound => "CONTEST_NOT_FOUND",
            AppError::ProblemNotFound => "PROBLEM_NOT_FOUND",
            AppError::SolutionNotFound => "SOLUTION_NOT_FOUND",
            AppError::MessageNotFound => "MESSAGE_NOT_FOUND",
            AppError::Database(_) => "DATABASE_ERROR",
            AppError::Internal(_) => "INTERNAL_ERROR",
        }
    }

    fn status(&self) -> StatusCode {
        match self {
            AppError::NotFound
            | AppError::UserNotFound
            | AppError::ContestNotFound
            | AppError::ProblemNotFound
            | AppError::SolutionNotFound
            | AppError::MessageNotFound => StatusCode::NOT_FOUND,
            AppError::AccessDenied => StatusCode::FORBIDDEN,
            AppError::LoginFailed => StatusCode::UNAUTHORIZED,
            AppError::BadRequest(_)
            | AppError::InvalidEmail
            | AppError::InvalidNickname => StatusCode::BAD_REQUEST,
            AppError::EmailExists | AppError::NicknameExists => StatusCode::CONFLICT,
            AppError::Database(_) | AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status();
        let body = json!({
            "error": {
                "code": self.code(),
                "message": self.to_string(),
            }
        });
        (status, axum::Json(body)).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
