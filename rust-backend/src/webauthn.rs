use webauthn_rs::prelude::*;
use crate::errors::PasskeyError;

pub struct WebAuthnState {
    webauthn: Webauthn,
}

impl WebAuthnState {
    pub fn new(rp_origin: &str) -> Result<Self, PasskeyError> {
        // Parse the origin to extract domain
        let url = url::Url::parse(rp_origin)
            .map_err(|e| PasskeyError::WebAuthn(format!("Invalid RP origin: {}", e)))?;
        
        let rp_id = url.host_str()
            .ok_or_else(|| PasskeyError::WebAuthn("No host in RP origin".to_string()))?
            .to_string();
        
        let rp_origin_url = Url::parse(rp_origin)
            .map_err(|e| PasskeyError::WebAuthn(format!("Invalid RP origin URL: {}", e)))?;
        
        let builder = WebauthnBuilder::new(&rp_id, &rp_origin_url)
            .map_err(|e| PasskeyError::WebAuthn(format!("Failed to create WebAuthn builder: {:?}", e)))?;
        
        let webauthn = builder
            .rp_name("JustTheTip Passkey Auth")
            .build()
            .map_err(|e| PasskeyError::WebAuthn(format!("Failed to build WebAuthn: {:?}", e)))?;
        
        Ok(WebAuthnState { webauthn })
    }
    
    pub fn get_webauthn(&self) -> &Webauthn {
        &self.webauthn
    }
}
