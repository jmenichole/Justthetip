use rusqlite::{Connection, params, Result};
use crate::models::{PasskeyCredential, PasskeySession, SessionType};
use crate::errors::PasskeyError;
use chrono::Utc;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Database { conn };
        db.init_schema()?;
        Ok(db)
    }
    
    fn init_schema(&self) -> Result<()> {
        // Create passkey_credentials table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS passkey_credentials (
                discord_id TEXT PRIMARY KEY,
                discord_username TEXT NOT NULL,
                credential_id TEXT NOT NULL UNIQUE,
                public_key BLOB NOT NULL,
                counter INTEGER NOT NULL DEFAULT 0,
                wallet_address TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;
        
        // Create passkey_sessions table for challenge storage
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS passkey_sessions (
                session_id TEXT PRIMARY KEY,
                discord_id TEXT NOT NULL,
                challenge BLOB NOT NULL,
                session_type TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                message_to_sign TEXT
            )",
            [],
        )?;
        
        // Create indexes
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_credential_id ON passkey_credentials(credential_id)",
            [],
        )?;
        
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_session_expires ON passkey_sessions(expires_at)",
            [],
        )?;
        
        log::info!("Passkey database schema initialized");
        Ok(())
    }
    
    // === Credential Operations ===
    
    pub fn store_credential(&self, credential: &PasskeyCredential) -> Result<(), PasskeyError> {
        self.conn.execute(
            "INSERT OR REPLACE INTO passkey_credentials 
             (discord_id, discord_username, credential_id, public_key, counter, wallet_address, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                credential.discord_id,
                credential.discord_username,
                credential.credential_id,
                credential.public_key,
                credential.counter,
                credential.wallet_address,
                credential.created_at,
                credential.updated_at,
            ],
        )?;
        Ok(())
    }
    
    pub fn get_credential(&self, discord_id: &str) -> Result<PasskeyCredential, PasskeyError> {
        let mut stmt = self.conn.prepare(
            "SELECT discord_id, discord_username, credential_id, public_key, counter, wallet_address, created_at, updated_at
             FROM passkey_credentials WHERE discord_id = ?1"
        )?;
        
        let credential = stmt.query_row([discord_id], |row| {
            Ok(PasskeyCredential {
                discord_id: row.get(0)?,
                discord_username: row.get(1)?,
                credential_id: row.get(2)?,
                public_key: row.get(3)?,
                counter: row.get(4)?,
                wallet_address: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        }).map_err(|_| PasskeyError::CredentialNotFound)?;
        
        Ok(credential)
    }
    
    pub fn get_credential_by_id(&self, credential_id: &str) -> Result<PasskeyCredential, PasskeyError> {
        let mut stmt = self.conn.prepare(
            "SELECT discord_id, discord_username, credential_id, public_key, counter, wallet_address, created_at, updated_at
             FROM passkey_credentials WHERE credential_id = ?1"
        )?;
        
        let credential = stmt.query_row([credential_id], |row| {
            Ok(PasskeyCredential {
                discord_id: row.get(0)?,
                discord_username: row.get(1)?,
                credential_id: row.get(2)?,
                public_key: row.get(3)?,
                counter: row.get(4)?,
                wallet_address: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        }).map_err(|_| PasskeyError::CredentialNotFound)?;
        
        Ok(credential)
    }
    
    pub fn update_counter(&self, credential_id: &str, counter: u32) -> Result<(), PasskeyError> {
        let updated_at = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE passkey_credentials SET counter = ?1, updated_at = ?2 WHERE credential_id = ?3",
            params![counter, updated_at, credential_id],
        )?;
        Ok(())
    }
    
    pub fn update_wallet_address(&self, discord_id: &str, wallet_address: &str) -> Result<(), PasskeyError> {
        let updated_at = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE passkey_credentials SET wallet_address = ?1, updated_at = ?2 WHERE discord_id = ?3",
            params![wallet_address, updated_at, discord_id],
        )?;
        Ok(())
    }
    
    // === Session Operations ===
    
    pub fn store_session(&self, session: &PasskeySession) -> Result<(), PasskeyError> {
        self.conn.execute(
            "INSERT OR REPLACE INTO passkey_sessions 
             (session_id, discord_id, challenge, session_type, created_at, expires_at, message_to_sign)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                session.session_id,
                session.discord_id,
                session.challenge,
                session.session_type.as_str(),
                session.created_at,
                session.expires_at,
                session.message_to_sign,
            ],
        )?;
        Ok(())
    }
    
    pub fn get_session(&self, session_id: &str) -> Result<PasskeySession, PasskeyError> {
        let mut stmt = self.conn.prepare(
            "SELECT session_id, discord_id, challenge, session_type, created_at, expires_at, message_to_sign
             FROM passkey_sessions WHERE session_id = ?1"
        )?;
        
        let session = stmt.query_row([session_id], |row| {
            let session_type_str: String = row.get(3)?;
            let session_type = SessionType::from_str(&session_type_str)
                .unwrap_or(SessionType::Registration);
            
            Ok(PasskeySession {
                session_id: row.get(0)?,
                discord_id: row.get(1)?,
                challenge: row.get(2)?,
                session_type,
                created_at: row.get(4)?,
                expires_at: row.get(5)?,
                message_to_sign: row.get(6)?,
            })
        }).map_err(|_| PasskeyError::SessionNotFound)?;
        
        // Check if session is expired
        let now = Utc::now().timestamp();
        if session.expires_at < now {
            self.delete_session(session_id)?;
            return Err(PasskeyError::SessionNotFound);
        }
        
        Ok(session)
    }
    
    pub fn delete_session(&self, session_id: &str) -> Result<(), PasskeyError> {
        self.conn.execute(
            "DELETE FROM passkey_sessions WHERE session_id = ?1",
            [session_id],
        )?;
        Ok(())
    }
    
    pub fn cleanup_expired_sessions(&self) -> Result<usize, PasskeyError> {
        let now = Utc::now().timestamp();
        let count = self.conn.execute(
            "DELETE FROM passkey_sessions WHERE expires_at < ?1",
            [now],
        )?;
        Ok(count)
    }
}
