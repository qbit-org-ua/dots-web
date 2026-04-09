mod auth;
mod config;
mod error;
mod handlers;
mod models;
mod services;

use std::sync::Arc;

use axum::Router;
use sqlx::mysql::MySqlPoolOptions;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

use crate::auth::middleware::AppState;
use crate::config::Config;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    // Load .env
    dotenvy::dotenv().ok();

    // Load configuration
    let config = Config::from_env();
    tracing::info!("Starting DOTS backend on {}", config.listen_addr);

    // Create MySQL pool
    let pool = MySqlPoolOptions::new()
        .max_connections(20)
        .connect(&config.database_url)
        .await?;

    tracing::info!("Connected to database");

    // Build AppState
    let state = AppState {
        pool: pool.clone(),
        config: Arc::new(config.clone()),
    };

    // Spawn LLM generation background job
    services::llm_gen::spawn(pool.clone(), Arc::new(config.clone()));
    tracing::info!("LLM generation job started");

    // Build CORS layer
    let frontend_url = config.frontend_url.clone();
    let cors = CorsLayer::new()
        .allow_origin(
            frontend_url
                .parse::<axum::http::HeaderValue>()
                .unwrap_or_else(|_| "http://localhost:3000".parse().unwrap()),
        )
        .allow_methods(vec![
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers(vec![
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::header::COOKIE,
        ])
        .allow_credentials(true);

    // Build router
    let app = Router::new()
        // API v1 routes
        .nest("/api/v1/auth", handlers::auth::router())
        .nest("/api/v1/users", handlers::users::router())
        .nest("/api/v1/contests", handlers::contests::router())
        .nest("/api/v1/problems", handlers::problems::router())
        .nest("/api/v1/solutions", handlers::solutions::router())
        .nest("/api/v1/messages", handlers::messages::router())
        .nest("/api/v1/admin", handlers::admin::router())
        .route(
            "/api/v1/languages",
            axum::routing::get(|| async {
                axum::Json(serde_json::json!({
                    "languages": models::language::all_languages()
                }))
            }),
        )
        // Bot API
        .nest("/bot", handlers::bot::router())
        // Layers
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    // Listen
    let listener = tokio::net::TcpListener::bind(&config.listen_addr).await?;
    tracing::info!("Listening on {}", config.listen_addr);
    axum::serve(listener, app).await?;

    Ok(())
}
