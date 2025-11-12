# JustTheTip Passkey Backend (Rust)

High-performance WebAuthn/passkey authentication backend for JustTheTip Discord bot.

## Overview

This Rust-based backend service provides passkey (WebAuthn) authentication endpoints for secure, phishing-resistant wallet verification. It complements the existing Node.js backend by handling the cryptographic ceremonies required for passkey registration and authentication.

## Features

- **WebAuthn Support**: Full implementation of WebAuthn Level 2 specification
- **Passkey Management**: Register, verify, and manage passkeys for Discord users
- **SQLite Integration**: Shared database with Node.js backend for seamless integration
- **Session Management**: Secure challenge/response handling with automatic expiration
- **CORS Enabled**: Ready for cross-origin requests from web frontends
- **Production Ready**: Built with Actix-web for high performance and low latency

## Quick Start

### Prerequisites

- Rust 1.70+ and Cargo
- SQLite (bundled with rusqlite)

### Build and Run

```bash
# Development
cargo run

# Production
cargo build --release
./target/release/justthetip-passkey-backend
```

The service will start on `http://localhost:3001` by default.

## Configuration

Set environment variables:

```bash
# Server configuration
export RUST_BACKEND_PORT=3001
export RUST_BACKEND_HOST=127.0.0.1

# Database
export DB_PATH=../db/justthetip.db

# WebAuthn configuration
export WEBAUTHN_ORIGIN=https://yourdomain.com

# Logging
export RUST_LOG=info  # Options: error, warn, info, debug, trace
```

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and version information.

### Passkey Registration

**Start Registration**
```
POST /api/passkey/register/start
Content-Type: application/json

{
  "discord_id": "123456789",
  "discord_username": "username#1234"
}
```

**Finish Registration**
```
POST /api/passkey/register/finish
Content-Type: application/json

{
  "session_id": "uuid-string",
  "discord_id": "123456789",
  "credential": {...}  // WebAuthn PublicKeyCredential
}
```

### Passkey Verification

**Start Verification**
```
POST /api/passkey/verify/start
Content-Type: application/json

{
  "discord_id": "123456789",
  "wallet_address": "SolanaAddress...",  // optional
  "currency": "SOL"  // optional
}
```

**Finish Verification**
```
POST /api/passkey/verify/finish
Content-Type: application/json

{
  "session_id": "uuid-string",
  "discord_id": "123456789",
  "credential": {...}  // WebAuthn AuthenticatorAssertionResponse
}
```

### User Information

**Get User Passkey**
```
GET /api/passkey/user/{discord_id}
```
Returns passkey metadata for a Discord user (if registered).

## Project Structure

```
rust-backend/
├── Cargo.toml           # Dependencies and project configuration
├── src/
│   ├── main.rs          # Application entry point, HTTP server
│   ├── models.rs        # Data structures and types
│   ├── handlers.rs      # HTTP request handlers
│   ├── db.rs            # SQLite database operations
│   ├── webauthn.rs      # WebAuthn state management
│   └── errors.rs        # Error types and HTTP responses
└── README.md            # This file
```

## Dependencies

Key dependencies:

- **actix-web** 4.4 - Async HTTP framework
- **webauthn-rs** 0.5 - WebAuthn protocol implementation
- **rusqlite** 0.31 - SQLite database interface
- **serde/serde_json** - Serialization
- **tokio** - Async runtime
- **uuid** - Session ID generation
- **bs58** - Base58 encoding for Solana compatibility

## Database Schema

The backend creates and maintains these tables:

### passkey_credentials
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
```sql
CREATE TABLE passkey_sessions (
    session_id TEXT PRIMARY KEY,
    discord_id TEXT NOT NULL,
    challenge BLOB NOT NULL,
    session_type TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    message_to_sign TEXT
);
```

## Security Features

1. **Challenge-Response**: Secure challenge generation with automatic expiration
2. **Signature Counter**: Prevents credential replay attacks
3. **Origin Validation**: Credentials bound to specific domain
4. **Session Expiration**: Registration (10 min), Verification (5 min)
5. **HTTPS Required**: WebAuthn requires secure context in production

## Development

### Running Tests

```bash
cargo test
```

### Code Formatting

```bash
cargo fmt
```

### Linting

```bash
cargo clippy
```

### Logging

Enable debug logging for development:

```bash
RUST_LOG=debug cargo run
```

Log levels:
- `error`: Only errors
- `warn`: Warnings and errors
- `info`: General information (default)
- `debug`: Detailed debugging
- `trace`: Very verbose

## Integration with Node.js

The Rust backend is designed to work alongside the existing Node.js backend:

1. **Shared Database**: Both backends use the same SQLite database file
2. **Independent Services**: Run on separate ports (Node.js: 3000, Rust: 3001)
3. **Proxied Requests**: Node.js can proxy passkey requests to Rust backend
4. **Complementary**: Rust handles WebAuthn, Node.js handles Discord/Solana logic

### Example Proxy Configuration (Node.js)

```javascript
app.use('/api/passkey', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
}));
```

## Production Deployment

### Docker

Create a `Dockerfile`:

```dockerfile
FROM rust:1.70 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libsqlite3-0 ca-certificates
COPY --from=builder /app/target/release/justthetip-passkey-backend /usr/local/bin/
CMD ["justthetip-passkey-backend"]
```

Build and run:
```bash
docker build -t justthetip-passkey-backend .
docker run -p 3001:3001 \
  -e WEBAUTHN_ORIGIN=https://yourdomain.com \
  -e DB_PATH=/data/justthetip.db \
  -v $(pwd)/db:/data \
  justthetip-passkey-backend
```

### Systemd Service

Create `/etc/systemd/system/justthetip-passkey.service`:

```ini
[Unit]
Description=JustTheTip Passkey Backend
After=network.target

[Service]
Type=simple
User=justthetip
WorkingDirectory=/opt/justthetip/rust-backend
Environment="RUST_BACKEND_PORT=3001"
Environment="WEBAUTHN_ORIGIN=https://yourdomain.com"
Environment="DB_PATH=/opt/justthetip/db/justthetip.db"
ExecStart=/opt/justthetip/rust-backend/target/release/justthetip-passkey-backend
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable justthetip-passkey
sudo systemctl start justthetip-passkey
```

## Performance

Expected performance characteristics:

- **Latency**: < 10ms for most operations (excluding WebAuthn ceremony)
- **Throughput**: > 1000 requests/second on modest hardware
- **Memory**: ~10-20 MB baseline
- **Concurrent Connections**: Limited by OS (typically 1000+)

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3001
lsof -i :3001

# Kill the process or use a different port
export RUST_BACKEND_PORT=3002
```

### Database Locked
If SQLite reports database is locked:
- Ensure WAL mode is enabled (automatically done)
- Check file permissions
- Verify no other process has exclusive lock

### WebAuthn Errors
Common issues:
- **Invalid origin**: Check `WEBAUTHN_ORIGIN` matches actual domain
- **HTTPS required**: WebAuthn needs HTTPS in production
- **Incompatible authenticator**: Not all devices support all credential types

### Logging Not Working
```bash
# Force logging output
RUST_LOG=info cargo run 2>&1 | tee app.log
```

## Contributing

When contributing to the Rust backend:

1. Follow Rust style guidelines (`cargo fmt`)
2. Pass all clippy lints (`cargo clippy`)
3. Add tests for new features
4. Update documentation
5. Ensure backward compatibility with existing Node.js backend

## License

Same license as the main JustTheTip project (see LICENSE in root directory).

## Support

For issues or questions:
- Check the main documentation: [PASSKEY_AUTHENTICATION.md](../PASSKEY_AUTHENTICATION.md)
- Review API examples in the main project
- Open an issue on the GitHub repository

## Roadmap

Future enhancements:

- [ ] Redis-based session storage (replace in-memory)
- [ ] Credential attestation verification
- [ ] Multi-credential support per user
- [ ] Device management API
- [ ] Metrics and observability (Prometheus)
- [ ] Rate limiting per user/IP
- [ ] Backup and recovery mechanisms
