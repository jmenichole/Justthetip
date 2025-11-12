use serde::{Deserialize, Serialize};
use webauthn_rs_proto::{
    CreationChallengeResponse, RegisterPublicKeyCredential,
    RequestChallengeResponse, PublicKeyCredential,
};

/// Request to start passkey registration for a Discord user
#[derive(Debug, Deserialize, Serialize)]
pub struct StartRegistrationRequest {
    pub discord_id: String,
    pub discord_username: String,
}

/// Response containing WebAuthn challenge for registration
#[derive(Debug, Deserialize, Serialize)]
pub struct StartRegistrationResponse {
    pub challenge: CreationChallengeResponse,
    pub session_id: String,
}

/// Request to complete passkey registration
#[derive(Debug, Deserialize, Serialize)]
pub struct FinishRegistrationRequest {
    pub session_id: String,
    pub discord_id: String,
    pub credential: RegisterPublicKeyCredential,
}

/// Response after successful registration
#[derive(Debug, Deserialize, Serialize)]
pub struct FinishRegistrationResponse {
    pub success: bool,
    pub credential_id: String,
    pub message: String,
}

/// Request to start wallet signature verification
#[derive(Debug, Deserialize, Serialize)]
pub struct StartVerificationRequest {
    pub discord_id: String,
    pub wallet_address: Option<String>,
    pub currency: Option<String>,
}

/// Response containing WebAuthn challenge for verification
#[derive(Debug, Deserialize, Serialize)]
pub struct StartVerificationResponse {
    pub challenge: RequestChallengeResponse,
    pub session_id: String,
    pub message_to_sign: String,
}

/// Request to complete signature verification
#[derive(Debug, Deserialize, Serialize)]
pub struct FinishVerificationRequest {
    pub session_id: String,
    pub discord_id: String,
    pub credential: PublicKeyCredential,
}

/// Response after successful verification
#[derive(Debug, Deserialize, Serialize)]
pub struct FinishVerificationResponse {
    pub success: bool,
    pub verified: bool,
    pub wallet_address: Option<String>,
    pub signature: Option<String>,
    pub message: String,
}

/// Stored passkey credential information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasskeyCredential {
    pub discord_id: String,
    pub discord_username: String,
    pub credential_id: String,
    pub public_key: Vec<u8>,
    pub counter: u32,
    pub wallet_address: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Active registration/verification session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasskeySession {
    pub session_id: String,
    pub discord_id: String,
    pub challenge: Vec<u8>,
    pub session_type: SessionType,
    pub created_at: i64,
    pub expires_at: i64,
    pub message_to_sign: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SessionType {
    Registration,
    Verification,
}

impl SessionType {
    pub fn as_str(&self) -> &str {
        match self {
            SessionType::Registration => "registration",
            SessionType::Verification => "verification",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "registration" => Some(SessionType::Registration),
            "verification" => Some(SessionType::Verification),
            _ => None,
        }
    }
}

/// Health check response
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub service: String,
}
