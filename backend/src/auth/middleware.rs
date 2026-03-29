use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum_extra::extract::CookieJar;
use sqlx::MySqlPool;
use std::sync::Arc;

use crate::auth::access::{has_access, ACCESS_SYSTEM_ADMIN};
use crate::auth::session::read_session;
use crate::config::Config;
use crate::error::AppError;
use crate::models::User;

/// Shared application state
#[derive(Clone)]
pub struct AppState {
    pub pool: MySqlPool,
    pub config: Arc<Config>,
}

/// Optional user extractor - does not fail if no session
pub struct OptionalUser(pub Option<User>);

impl<S> FromRequestParts<S> for OptionalUser
where
    S: Send + Sync,
    AppState: FromRef<S>,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);
        let jar = CookieJar::from_headers(&parts.headers);

        let session_id = match jar.get("DSID") {
            Some(cookie) => cookie.value().to_string(),
            None => return Ok(OptionalUser(None)),
        };

        if session_id.is_empty() {
            return Ok(OptionalUser(None));
        }

        let session_result = read_session(&app_state.pool, &session_id).await?;
        let user_id = match session_result {
            Some((_, Some(uid))) => uid,
            _ => return Ok(OptionalUser(None)),
        };

        let user: Option<User> = sqlx::query_as(
            "SELECT user_id, email, nickname, access, messages, is_activated \
             FROM labs_users WHERE user_id = ?"
        )
        .bind(user_id)
        .fetch_optional(&app_state.pool)
        .await?;

        Ok(OptionalUser(user))
    }
}

/// Required auth extractor - returns 401 if no valid session
pub struct RequireAuth(pub User);

impl<S> FromRequestParts<S> for RequireAuth
where
    S: Send + Sync,
    AppState: FromRef<S>,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let OptionalUser(user) = OptionalUser::from_request_parts(parts, state).await?;
        match user {
            Some(u) => Ok(RequireAuth(u)),
            None => Err(AppError::LoginFailed),
        }
    }
}

/// Required admin extractor - returns 403 if not admin
pub struct RequireAdmin(pub User);

impl<S> FromRequestParts<S> for RequireAdmin
where
    S: Send + Sync,
    AppState: FromRef<S>,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let RequireAuth(user) = RequireAuth::from_request_parts(parts, state).await?;
        if !has_access(user.access, ACCESS_SYSTEM_ADMIN) {
            return Err(AppError::AccessDenied);
        }
        Ok(RequireAdmin(user))
    }
}

/// Helper trait for extracting AppState from any state type
pub trait FromRef<T> {
    fn from_ref(input: &T) -> Self;
}

impl FromRef<AppState> for AppState {
    fn from_ref(input: &AppState) -> Self {
        input.clone()
    }
}

/// Extract client IP from HeaderMap (convenience for handlers)
pub fn extract_ip_from_headers(headers: &axum::http::HeaderMap) -> u32 {
    if let Some(xff) = headers.get("x-forwarded-for") {
        if let Ok(xff_str) = xff.to_str() {
            if let Some(first_ip) = xff_str.split(',').next() {
                if let Ok(ip) = first_ip.trim().parse::<std::net::Ipv4Addr>() {
                    return ip_to_u32(ip);
                }
            }
        }
    }
    if let Some(xri) = headers.get("x-real-ip") {
        if let Ok(xri_str) = xri.to_str() {
            if let Ok(ip) = xri_str.trim().parse::<std::net::Ipv4Addr>() {
                return ip_to_u32(ip);
            }
        }
    }
    0
}

/// Extract client IP address from request headers/connection
pub fn extract_ip(parts: &Parts) -> u32 {
    // Try X-Forwarded-For first
    if let Some(xff) = parts.headers.get("x-forwarded-for") {
        if let Ok(xff_str) = xff.to_str() {
            if let Some(first_ip) = xff_str.split(',').next() {
                if let Ok(ip) = first_ip.trim().parse::<std::net::Ipv4Addr>() {
                    return ip_to_u32(ip);
                }
            }
        }
    }

    // Try X-Real-IP
    if let Some(xri) = parts.headers.get("x-real-ip") {
        if let Ok(xri_str) = xri.to_str() {
            if let Ok(ip) = xri_str.trim().parse::<std::net::Ipv4Addr>() {
                return ip_to_u32(ip);
            }
        }
    }

    0
}

fn ip_to_u32(ip: std::net::Ipv4Addr) -> u32 {
    u32::from(ip)
}
