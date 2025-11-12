use thiserror::Error;
use actix_web::{http::StatusCode, HttpResponse, ResponseError};
use serde_json::json;

#[derive(Error, Debug)]
pub enum PasskeyError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    
    #[error("WebAuthn error: {0}")]
    WebAuthn(String),
    
    #[error("Invalid request: {0}")]
    InvalidRequest(String),
    
    #[error("Session not found or expired")]
    SessionNotFound,
    
    #[error("Credential not found")]
    CredentialNotFound,
    
    #[error("Verification failed: {0}")]
    VerificationFailed(String),
    
    #[error("Internal error: {0}")]
    Internal(String),
}

impl ResponseError for PasskeyError {
    fn error_response(&self) -> HttpResponse {
        let (status, error_type) = match self {
            PasskeyError::Database(_) => (StatusCode::INTERNAL_SERVER_ERROR, "database_error"),
            PasskeyError::WebAuthn(_) => (StatusCode::BAD_REQUEST, "webauthn_error"),
            PasskeyError::InvalidRequest(_) => (StatusCode::BAD_REQUEST, "invalid_request"),
            PasskeyError::SessionNotFound => (StatusCode::NOT_FOUND, "session_not_found"),
            PasskeyError::CredentialNotFound => (StatusCode::NOT_FOUND, "credential_not_found"),
            PasskeyError::VerificationFailed(_) => (StatusCode::UNAUTHORIZED, "verification_failed"),
            PasskeyError::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal_error"),
        };
        
        HttpResponse::build(status).json(json!({
            "error": error_type,
            "message": self.to_string(),
        }))
    }
    
    fn status_code(&self) -> StatusCode {
        match self {
            PasskeyError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
            PasskeyError::WebAuthn(_) => StatusCode::BAD_REQUEST,
            PasskeyError::InvalidRequest(_) => StatusCode::BAD_REQUEST,
            PasskeyError::SessionNotFound => StatusCode::NOT_FOUND,
            PasskeyError::CredentialNotFound => StatusCode::NOT_FOUND,
            PasskeyError::VerificationFailed(_) => StatusCode::UNAUTHORIZED,
            PasskeyError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}
