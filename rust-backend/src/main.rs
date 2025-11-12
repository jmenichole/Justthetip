use actix_web::{web, App, HttpServer, middleware};
use actix_cors::Cors;
use std::sync::Mutex;

mod models;
mod handlers;
mod db;
mod webauthn;
mod errors;

use db::Database;
use webauthn::WebAuthnState;

pub struct AppState {
    db: Mutex<Database>,
    webauthn: WebAuthnState,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logger
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    
    // Load environment variables
    dotenv::dotenv().ok();
    
    let port = std::env::var("RUST_BACKEND_PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse::<u16>()
        .expect("Invalid RUST_BACKEND_PORT");
    
    let host = std::env::var("RUST_BACKEND_HOST")
        .unwrap_or_else(|_| "127.0.0.1".to_string());
    
    // Initialize database
    let db_path = std::env::var("DB_PATH")
        .unwrap_or_else(|_| "db/justthetip.db".to_string());
    
    let database = Database::new(&db_path)
        .expect("Failed to initialize database");
    
    // Initialize WebAuthn
    let rp_origin = std::env::var("WEBAUTHN_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());
    
    let webauthn_state = WebAuthnState::new(&rp_origin)
        .expect("Failed to initialize WebAuthn");
    
    log::info!("Starting JustTheTip Passkey Backend on {}:{}", host, port);
    log::info!("WebAuthn RP Origin: {}", rp_origin);
    log::info!("Database path: {}", db_path);
    
    // Create app state
    let app_state = web::Data::new(AppState {
        db: Mutex::new(database),
        webauthn: webauthn_state,
    });
    
    // Start HTTP server
    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);
        
        App::new()
            .app_data(app_state.clone())
            .wrap(middleware::Logger::default())
            .wrap(cors)
            .route("/health", web::get().to(handlers::health_check))
            .route("/api/passkey/register/start", web::post().to(handlers::start_registration))
            .route("/api/passkey/register/finish", web::post().to(handlers::finish_registration))
            .route("/api/passkey/verify/start", web::post().to(handlers::start_verification))
            .route("/api/passkey/verify/finish", web::post().to(handlers::finish_verification))
            .route("/api/passkey/user/{discord_id}", web::get().to(handlers::get_user_passkey))
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
