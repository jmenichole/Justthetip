# Passkey (WebAuthn) Authentication for JustTheTip

## Overview

JustTheTip now supports passkey-based wallet authentication using the WebAuthn protocol. This allows users to register and verify wallet ownership using biometric authentication (fingerprint, Face ID) or hardware security keys, providing an additional secure method alongside traditional wallet signatures.

## What are Passkeys?

Passkeys are a modern, phishing-resistant authentication method that uses public-key cryptography. They provide:

- **Security**: Cryptographically secure, resistant to phishing
- **Convenience**: Use biometrics or hardware keys instead of managing seed phrases
- **Privacy**: Your biometric data never leaves your device
- **Standardization**: Based on the WebAuthn/FIDO2 standards

## Architecture

The passkey authentication system consists of:

1. **Rust Backend** (`rust-backend/`): Handles WebAuthn ceremonies and credential storage
2. **SQLite Database**: Stores passkey credentials mapped to Discord user IDs
3. **Node.js API**: Proxies requests between the bot and Rust backend
4. **Frontend**: Web interface for passkey registration and verification

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Discord   │────▶│   Node.js    │────▶│  Rust Backend   │
│     Bot     │     │     API      │     │   (WebAuthn)    │
└─────────────┘     └──────────────┘     └─────────────────┘
                            │                      │
                            ▼                      ▼
                    ┌──────────────────────────────┐
                    │   SQLite Database            │
                    │   - passkey_credentials      │
                    │   - passkey_sessions         │
                    └──────────────────────────────┘
```

## Registration Flow

### 1. User Initiates Registration

User runs `/register-wallet` command in Discord, which generates a unique registration link:
```
https://yourdomain.com/sign.html?user=USER_ID&username=USERNAME&nonce=NONCE&method=passkey
```

### 2. Start Registration Ceremony

Frontend calls:
```
POST /api/passkey/register/start
{
  "discord_id": "123456789",
  "discord_username": "user#1234"
}
```

Backend response:
```json
{
  "challenge": {...},  // WebAuthn creation options
  "session_id": "uuid-v4-string"
}
```

### 3. User Creates Passkey

The browser/device prompts the user to:
- Use fingerprint/Face ID
- Insert and activate security key
- Use PIN on platform authenticator

### 4. Finish Registration

Frontend sends the credential to:
```
POST /api/passkey/register/finish
{
  "session_id": "uuid-v4-string",
  "discord_id": "123456789",
  "credential": {...}  // WebAuthn registration response
}
```

Backend response:
```json
{
  "success": true,
  "credential_id": "base58-encoded-credential-id",
  "message": "Passkey registered successfully"
}
```

The credential is now stored and associated with the Discord user.

## Verification Flow

### 1. Start Verification

When a user needs to verify wallet ownership:

```
POST /api/passkey/verify/start
{
  "discord_id": "123456789",
  "wallet_address": "SolanaWalletAddress...",
  "currency": "SOL"
}
```

Response:
```json
{
  "challenge": {...},  // WebAuthn authentication options
  "session_id": "uuid-v4-string",
  "message_to_sign": "Register wallet for JustTheTip Discord Bot\nUser: 123456789\nWallet: SolanaAddress...\nCurrency: SOL\nTimestamp: 1234567890"
}
```

### 2. User Authenticates

Browser prompts for biometric/security key authentication.

### 3. Finish Verification

```
POST /api/passkey/verify/finish
{
  "session_id": "uuid-v4-string",
  "discord_id": "123456789",
  "credential": {...}  // WebAuthn authentication response
}
```

Response:
```json
{
  "success": true,
  "verified": true,
  "wallet_address": "SolanaWalletAddress...",
  "signature": "passkey:credential-id",
  "message": "Wallet ownership verified via passkey"
}
```

## Database Schema

### passkey_credentials

Stores registered passkey credentials:

```sql
CREATE TABLE passkey_credentials (
    discord_id TEXT PRIMARY KEY,
    discord_username TEXT NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key BLOB NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    wallet_address TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### passkey_sessions

Stores temporary session data for registration/verification:

```sql
CREATE TABLE passkey_sessions (
    session_id TEXT PRIMARY KEY,
    discord_id TEXT NOT NULL,
    challenge BLOB NOT NULL,
    session_type TEXT NOT NULL,  -- 'registration' or 'verification'
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    message_to_sign TEXT
);
```

## Running the Rust Backend

### Development

```bash
cd rust-backend
cargo run
```

The backend will start on `http://localhost:3001` by default.

### Production

```bash
cd rust-backend
cargo build --release
./target/release/justthetip-passkey-backend
```

### Environment Variables

```bash
# Port for Rust backend
RUST_BACKEND_PORT=3001

# Host to bind to
RUST_BACKEND_HOST=127.0.0.1

# Database path (shared with Node.js)
DB_PATH=db/justthetip.db

# WebAuthn Relying Party origin
WEBAUTHN_ORIGIN=https://yourdomain.com
```

## API Endpoints

### Health Check

```
GET /health
```

Returns service status.

### Register - Start

```
POST /api/passkey/register/start
Content-Type: application/json

{
  "discord_id": "string",
  "discord_username": "string"
}
```

### Register - Finish

```
POST /api/passkey/register/finish
Content-Type: application/json

{
  "session_id": "string",
  "discord_id": "string",
  "credential": {...}
}
```

### Verify - Start

```
POST /api/passkey/verify/start
Content-Type: application/json

{
  "discord_id": "string",
  "wallet_address": "string (optional)",
  "currency": "string (optional)"
}
```

### Verify - Finish

```
POST /api/passkey/verify/finish
Content-Type: application/json

{
  "session_id": "string",
  "discord_id": "string",
  "credential": {...}
}
```

### Get User Passkey

```
GET /api/passkey/user/{discord_id}
```

Returns passkey metadata for a user.

## Device Requirements

### Supported Authenticators

**Platform Authenticators** (Built-in):
- Windows Hello (Windows 10+)
- Touch ID / Face ID (macOS, iOS)
- Android Biometric Authentication
- Chrome OS PIN/Fingerprint

**Cross-Platform Authenticators** (External):
- YubiKey 5 Series
- Google Titan Security Keys
- Feitian ePass FIDO2 Keys
- Any FIDO2-compliant security key

### Browser Compatibility

- Chrome/Edge 67+
- Firefox 60+
- Safari 13+
- Opera 54+

### Ed25519 Support

Not all passkey devices support Ed25519 signatures directly. The current implementation uses WebAuthn's standard ECDSA P-256 signatures. For Solana-specific Ed25519 signing, users should use:

1. **Phantom Wallet** - Full Ed25519 support
2. **Solflare Wallet** - Full Ed25519 support
3. **Ledger Hardware Wallet** - Ed25519 support for Solana

## Security Considerations

1. **Challenge Expiration**: Registration challenges expire after 10 minutes, verification challenges after 5 minutes
2. **Session Storage**: WebAuthn states are stored in-memory (production should use Redis)
3. **HTTPS Required**: WebAuthn requires HTTPS in production
4. **Counter Verification**: Signature counter prevents credential reuse attacks
5. **Origin Validation**: Credentials are bound to the domain origin

## Fallback Methods

If a user's device doesn't support passkeys:

1. **Phantom/Solflare Wallet**: Traditional Ed25519 wallet signature
2. **Hardware Wallet**: Sign with Ledger/Trezor
3. **CLI Tools**: Use `solana-keygen` for command-line signing

See [REGISTERWALLET_SIGNATURE_VERIFICATION.md](./REGISTERWALLET_SIGNATURE_VERIFICATION.md) for details on alternative methods.

## Troubleshooting

### "Passkey not supported"
- Check browser compatibility
- Ensure HTTPS is enabled
- Verify device has biometric/PIN enabled

### "Registration failed"
- Session may have expired (10 min limit)
- Try using a different authenticator
- Check browser console for WebAuthn errors

### "Verification failed"
- Ensure you're using the same device/authenticator
- Credential may be deleted from device
- Re-register your passkey

## Future Enhancements

1. **Multi-Device Support**: Allow multiple passkeys per user
2. **Backup Codes**: Generate backup authentication codes
3. **Device Management**: UI to view and revoke passkeys
4. **Attestation**: Verify authenticator models for enhanced security
5. **Conditional UI**: Show passkey option only on supported browsers
6. **Cross-Device Authentication**: Use QR codes for mobile-to-desktop auth

## Development Notes

### Testing Locally

For local development without HTTPS:

1. Chrome: `chrome://flags/#enable-web-authentication-testing-api`
2. Firefox: Works on `localhost` without flags
3. Safari: Requires proper certificate

### Debugging

Enable Rust backend logging:
```bash
RUST_LOG=debug cargo run
```

Check WebAuthn errors in browser console for detailed failure information.

## References

- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [FIDO2 Project](https://fidoalliance.org/fido2/)
- [webauthn-rs Documentation](https://docs.rs/webauthn-rs/)
- [Passkeys.dev](https://passkeys.dev/)
