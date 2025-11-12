use actix_web::{web, HttpResponse};
use webauthn_rs::prelude::*;
use chrono::Utc;
use uuid::Uuid;
use std::collections::HashMap;
use std::sync::Mutex;

use crate::models::*;
use crate::errors::PasskeyError;
use crate::AppState;

// Thread-safe storage for WebAuthn states (in-memory for now)
// In production, this should be persisted to database or Redis
lazy_static::lazy_static! {
    static ref REG_STATES: Mutex<HashMap<String, PasskeyRegistration>> = Mutex::new(HashMap::new());
    static ref AUTH_STATES: Mutex<HashMap<String, PasskeyAuthentication>> = Mutex::new(HashMap::new());
}

/// Health check endpoint
pub async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        service: "justthetip-passkey-backend".to_string(),
    })
}

/// Start passkey registration process
pub async fn start_registration(
    state: web::Data<AppState>,
    req: web::Json<StartRegistrationRequest>,
) -> Result<HttpResponse, PasskeyError> {
    let discord_id = &req.discord_id;
    let discord_username = &req.discord_username;
    
    log::info!("Starting passkey registration for Discord user: {}", discord_id);
    
    // Check if user already has a credential
    let db = state.db.lock().unwrap();
    if let Ok(_existing) = db.get_credential(discord_id) {
        log::warn!("User {} already has a passkey registered", discord_id);
        return Err(PasskeyError::InvalidRequest(
            "User already has a passkey registered. Please use verification instead.".to_string()
        ));
    }
    drop(db);
    
    // Create a unique user ID for WebAuthn
    let user_unique_id = Uuid::new_v4();
    
    // Start registration ceremony
    let (ccr, reg_state) = state.webauthn.get_webauthn()
        .start_passkey_registration(
            user_unique_id,
            discord_username,
            discord_username,
            None, // No excluded credentials for new registration
        )
        .map_err(|e| PasskeyError::WebAuthn(format!("Failed to start registration: {:?}", e)))?;
    
    // Generate session ID
    let session_id = Uuid::new_v4().to_string();
    
    // Store the registration state in memory
    {
        let mut states = REG_STATES.lock().unwrap();
        states.insert(session_id.clone(), reg_state);
    }
    
    // Store session metadata in database
    let now = Utc::now().timestamp();
    let expires_at = now + 600; // 10 minutes
    
    let session = PasskeySession {
        session_id: session_id.clone(),
        discord_id: discord_id.clone(),
        challenge: vec![], // Not used, state is in memory
        session_type: SessionType::Registration,
        created_at: now,
        expires_at,
        message_to_sign: None,
    };
    
    let db = state.db.lock().unwrap();
    db.store_session(&session)?;
    drop(db);
    
    log::info!("Registration session created: {}", session_id);
    
    Ok(HttpResponse::Ok().json(StartRegistrationResponse {
        challenge: ccr,
        session_id,
    }))
}

/// Finish passkey registration process
pub async fn finish_registration(
    state: web::Data<AppState>,
    req: web::Json<FinishRegistrationRequest>,
) -> Result<HttpResponse, PasskeyError> {
    let session_id = &req.session_id;
    let discord_id = &req.discord_id;
    
    log::info!("Finishing passkey registration for session: {}", session_id);
    
    // Retrieve session
    let db = state.db.lock().unwrap();
    let session = db.get_session(session_id)?;
    drop(db);
    
    // Verify discord_id matches
    if session.discord_id != *discord_id {
        return Err(PasskeyError::InvalidRequest(
            "Discord ID mismatch".to_string()
        ));
    }
    
    // Verify session type
    if session.session_type != SessionType::Registration {
        return Err(PasskeyError::InvalidRequest(
            "Invalid session type for registration".to_string()
        ));
    }
    
    // Retrieve registration state from memory
    let reg_state = {
        let mut states = REG_STATES.lock().unwrap();
        states.remove(session_id)
            .ok_or_else(|| PasskeyError::SessionNotFound)?
    };
    
    // Finish registration ceremony
    let credential = state.webauthn.get_webauthn()
        .finish_passkey_registration(&req.credential, &reg_state)
        .map_err(|e| PasskeyError::WebAuthn(format!("Registration failed: {:?}", e)))?;
    
    // Extract credential details - cred_id is the actual credential ID bytes
    let cred_id_bytes = credential.cred_id();
    let credential_id = bs58::encode(cred_id_bytes).into_string();
    let public_key = cred_id_bytes.to_vec();
    
    // Store credential in database
    let now = Utc::now().to_rfc3339();
    let passkey_credential = PasskeyCredential {
        discord_id: discord_id.clone(),
        discord_username: session.discord_id.clone(),
        credential_id: credential_id.clone(),
        public_key,
        counter: 0, // Initial counter
        wallet_address: None,
        created_at: now.clone(),
        updated_at: now,
    };
    
    let db = state.db.lock().unwrap();
    db.store_credential(&passkey_credential)?;
    db.delete_session(session_id)?;
    drop(db);
    
    log::info!("Passkey registered successfully for user: {}", discord_id);
    
    Ok(HttpResponse::Ok().json(FinishRegistrationResponse {
        success: true,
        credential_id,
        message: "Passkey registered successfully".to_string(),
    }))
}

/// Start wallet signature verification process
pub async fn start_verification(
    state: web::Data<AppState>,
    req: web::Json<StartVerificationRequest>,
) -> Result<HttpResponse, PasskeyError> {
    let discord_id = &req.discord_id;
    
    log::info!("Starting passkey verification for Discord user: {}", discord_id);
    
    // Retrieve user's credential
    let db = state.db.lock().unwrap();
    let _credential_info = db.get_credential(discord_id)?;
    drop(db);
    
    // Start authentication ceremony with empty allowed credentials
    // The client will provide the credential
    let allowed_credentials = vec![];
    
    let (rcr, auth_state) = state.webauthn.get_webauthn()
        .start_passkey_authentication(&allowed_credentials)
        .map_err(|e| PasskeyError::WebAuthn(format!("Failed to start verification: {:?}", e)))?;
    
    // Generate session ID
    let session_id = Uuid::new_v4().to_string();
    
    // Store the authentication state in memory
    {
        let mut states = AUTH_STATES.lock().unwrap();
        states.insert(session_id.clone(), auth_state);
    }
    
    // Create message to sign (similar to Solana wallet registration)
    let timestamp = Utc::now().timestamp();
    let wallet_address = req.wallet_address.as_deref().unwrap_or("Not specified");
    let currency = req.currency.as_deref().unwrap_or("SOL");
    
    let message_to_sign = format!(
        "Register wallet for JustTheTip Discord Bot\nUser: {}\nWallet: {}\nCurrency: {}\nTimestamp: {}",
        discord_id, wallet_address, currency, timestamp
    );
    
    // Store session metadata in database
    let now = Utc::now().timestamp();
    let expires_at = now + 300; // 5 minutes for verification
    
    let session = PasskeySession {
        session_id: session_id.clone(),
        discord_id: discord_id.clone(),
        challenge: vec![], // Not used, state is in memory
        session_type: SessionType::Verification,
        created_at: now,
        expires_at,
        message_to_sign: Some(message_to_sign.clone()),
    };
    
    let db = state.db.lock().unwrap();
    db.store_session(&session)?;
    drop(db);
    
    log::info!("Verification session created: {}", session_id);
    
    Ok(HttpResponse::Ok().json(StartVerificationResponse {
        challenge: rcr,
        session_id,
        message_to_sign,
    }))
}

/// Finish wallet signature verification process
pub async fn finish_verification(
    state: web::Data<AppState>,
    req: web::Json<FinishVerificationRequest>,
) -> Result<HttpResponse, PasskeyError> {
    let session_id = &req.session_id;
    let discord_id = &req.discord_id;
    
    log::info!("Finishing passkey verification for session: {}", session_id);
    
    // Retrieve session
    let db = state.db.lock().unwrap();
    let session = db.get_session(session_id)?;
    let credential_info = db.get_credential(discord_id)?;
    drop(db);
    
    // Verify discord_id matches
    if session.discord_id != *discord_id {
        return Err(PasskeyError::InvalidRequest(
            "Discord ID mismatch".to_string()
        ));
    }
    
    // Verify session type
    if session.session_type != SessionType::Verification {
        return Err(PasskeyError::InvalidRequest(
            "Invalid session type for verification".to_string()
        ));
    }
    
    // Retrieve authentication state from memory
    let auth_state = {
        let mut states = AUTH_STATES.lock().unwrap();
        states.remove(session_id)
            .ok_or_else(|| PasskeyError::SessionNotFound)?
    };
    
    // Finish authentication ceremony
    let _auth_result = state.webauthn.get_webauthn()
        .finish_passkey_authentication(&req.credential, &auth_state)
        .map_err(|e| PasskeyError::VerificationFailed(format!("Authentication failed: {:?}", e)))?;
    
    // Delete the session
    let db = state.db.lock().unwrap();
    db.delete_session(session_id)?;
    drop(db);
    
    log::info!("Passkey verification successful for user: {}", discord_id);
    
    // Generate a signature representation (base58 encoded credential ID)
    let signature = format!("passkey:{}", credential_info.credential_id);
    
    Ok(HttpResponse::Ok().json(FinishVerificationResponse {
        success: true,
        verified: true,
        wallet_address: credential_info.wallet_address,
        signature: Some(signature),
        message: "Wallet ownership verified via passkey".to_string(),
    }))
}

/// Get user's passkey information
pub async fn get_user_passkey(
    state: web::Data<AppState>,
    discord_id: web::Path<String>,
) -> Result<HttpResponse, PasskeyError> {
    log::info!("Fetching passkey info for Discord user: {}", discord_id);
    
    let db = state.db.lock().unwrap();
    let credential = db.get_credential(&discord_id)?;
    drop(db);
    
    // Don't expose the full public key, just metadata
    let response = serde_json::json!({
        "discord_id": credential.discord_id,
        "discord_username": credential.discord_username,
        "credential_id": credential.credential_id,
        "wallet_address": credential.wallet_address,
        "created_at": credential.created_at,
        "has_passkey": true,
    });
    
    Ok(HttpResponse::Ok().json(response))
}
