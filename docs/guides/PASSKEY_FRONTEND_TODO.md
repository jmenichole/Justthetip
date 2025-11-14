# Passkey Frontend Implementation TODO

**Status:** Backend Complete ✅ | Frontend Pending ⏳ | Integration Needed ⚠️

This document outlines exactly what needs to be implemented to complete passkey authentication for JustTheTip.

---

## Summary

**What's Done:**
- ✅ Rust backend service (WebAuthn API)
- ✅ SQLite database schema (passkey_credentials, passkey_sessions)
- ✅ Backend API endpoints (6 endpoints)
- ✅ Documentation (comprehensive guides)

**What's Needed:**
- ⏳ Frontend WebAuthn integration
- ⏳ Node.js API proxy configuration
- ⏳ Discord bot passkey option
- ⏳ Testing and deployment

---

## Part 1: Node.js API Proxy (30 minutes)

### File: `api/server.js`

**What to add:** HTTP proxy to route `/api/passkey/*` requests to Rust backend

**Step 1: Install dependency**
```bash
npm install http-proxy-middleware
```

**Step 2: Add to `api/server.js` (after other middleware)**
```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxy passkey requests to Rust backend
app.use('/api/passkey', createProxyMiddleware({
  target: process.env.RUST_BACKEND_URL || 'http://localhost:3001',
  changeOrigin: true,
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(502).json({ 
      error: 'Passkey service unavailable',
      details: 'Please ensure Rust backend is running on port 3001'
    });
  }
}));
```

**Step 3: Add environment variable to `.env`**
```bash
RUST_BACKEND_URL=http://localhost:3001
WEBAUTHN_ORIGIN=https://yourdomain.com  # Your actual domain
```

**Why needed:** The frontend will call `/api/passkey/*` endpoints, which need to be routed to the Rust backend on port 3001.

---

## Part 2: Frontend WebAuthn Integration (2-3 hours)

### File: `api/public/sign.html` (or wherever your registration page is)

**Current state:** Wallet registration page exists with Solana wallet options

**What to add:** Passkey registration UI and WebAuthn browser API calls

### Step 1: Add Passkey Button to UI

Add this button alongside existing wallet options:

```html
<!-- Add after wallet selection buttons -->
<div class="passkey-section">
  <h3>Or Register with Passkey</h3>
  <p class="help-text">
    Use fingerprint, Face ID, or security key for secure registration
  </p>
  <button id="passkeyRegisterBtn" class="btn-passkey">
    🔐 Register with Passkey
  </button>
  <div id="passkeyStatus" class="status-message"></div>
</div>
```

### Step 2: Add CSS Styling

```css
.passkey-section {
  margin-top: 2rem;
  padding: 1.5rem;
  border: 2px solid #667eea;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
}

.btn-passkey {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: bold;
  color: white;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-passkey:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-passkey:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-message {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 14px;
}

.status-message.success {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid #10b981;
  color: #10b981;
}

.status-message.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  color: #ef4444;
}

.status-message.info {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid #3b82f6;
  color: #3b82f6;
}
```

### Step 3: Add WebAuthn JavaScript

Add this JavaScript to your registration page:

```javascript
// Passkey Registration Handler
class PasskeyRegistration {
  constructor() {
    this.discordId = this.getUrlParam('user');
    this.discordUsername = this.getUrlParam('username');
    this.nonce = this.getUrlParam('nonce');
    this.registerBtn = document.getElementById('passkeyRegisterBtn');
    this.statusDiv = document.getElementById('passkeyStatus');
    
    this.init();
  }

  init() {
    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      this.showStatus('❌ Passkeys not supported on this browser', 'error');
      this.registerBtn.disabled = true;
      return;
    }

    this.registerBtn.addEventListener('click', () => this.register());
  }

  getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  showStatus(message, type = 'info') {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `status-message ${type}`;
    this.statusDiv.style.display = 'block';
  }

  async register() {
    if (!this.discordId || !this.discordUsername) {
      this.showStatus('❌ Missing Discord user information', 'error');
      return;
    }

    this.registerBtn.disabled = true;
    this.showStatus('🔄 Starting passkey registration...', 'info');

    try {
      // Step 1: Start registration ceremony
      const startResponse = await fetch('/api/passkey/register/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_id: this.discordId,
          discord_username: this.discordUsername
        })
      });

      if (!startResponse.ok) {
        throw new Error('Failed to start registration');
      }

      const { challenge, session_id } = await startResponse.json();
      
      this.showStatus('👆 Please authenticate with your device...', 'info');

      // Step 2: Create credential using WebAuthn
      // Convert base64url to ArrayBuffer for WebAuthn
      challenge.publicKey.challenge = this.base64urlToBuffer(
        challenge.publicKey.challenge
      );
      challenge.publicKey.user.id = this.base64urlToBuffer(
        challenge.publicKey.user.id
      );

      const credential = await navigator.credentials.create(challenge);

      if (!credential) {
        throw new Error('Passkey creation cancelled');
      }

      this.showStatus('🔄 Verifying passkey...', 'info');

      // Step 3: Finish registration
      const finishResponse = await fetch('/api/passkey/register/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session_id,
          discord_id: this.discordId,
          credential: {
            id: credential.id,
            rawId: this.bufferToBase64url(credential.rawId),
            response: {
              attestationObject: this.bufferToBase64url(
                credential.response.attestationObject
              ),
              clientDataJSON: this.bufferToBase64url(
                credential.response.clientDataJSON
              )
            },
            type: credential.type
          }
        })
      });

      if (!finishResponse.ok) {
        const error = await finishResponse.json();
        throw new Error(error.error || 'Registration failed');
      }

      const result = await finishResponse.json();

      this.showStatus(
        `✅ Passkey registered successfully! You can now close this page.`,
        'success'
      );

      // Optional: Auto-close after 3 seconds
      setTimeout(() => window.close(), 3000);

    } catch (error) {
      console.error('Passkey registration error:', error);
      this.showStatus(
        `❌ Registration failed: ${error.message}`,
        'error'
      );
      this.registerBtn.disabled = false;
    }
  }

  // Utility functions for WebAuthn buffer conversions
  base64urlToBuffer(base64url) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  bufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

// Initialize passkey registration when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if passkey method is requested
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('method') === 'passkey') {
    new PasskeyRegistration();
  } else {
    // Initialize regular wallet registration
    // ... existing wallet code ...
  }
});
```

---

## Part 3: Discord Bot Integration (1 hour)

### File: `bot_smart_contract.js`

**Update the `/register-wallet` command to offer passkey option**

### Current code (around line 220):
```javascript
} else if (commandName === 'register-wallet') {
  const userId = interaction.user.id;
  const username = interaction.user.username;
  
  // Generate a unique nonce (UUID v4)
  const nonce = crypto.randomUUID();
  
  // Create registration URL with user info and nonce
  const registrationUrl = `${FRONTEND_URL}/sign.html?user=${encodeURIComponent(userId)}&username=${encodeURIComponent(username)}&nonce=${encodeURIComponent(nonce)}`;
```

### Updated code with passkey option:
```javascript
} else if (commandName === 'register-wallet') {
  const userId = interaction.user.id;
  const username = interaction.user.username;
  
  // Generate a unique nonce (UUID v4)
  const nonce = crypto.randomUUID();
  
  // Create registration URLs
  const walletUrl = `${FRONTEND_URL}/sign.html?user=${encodeURIComponent(userId)}&username=${encodeURIComponent(username)}&nonce=${encodeURIComponent(nonce)}`;
  const passkeyUrl = `${FRONTEND_URL}/sign.html?user=${encodeURIComponent(userId)}&username=${encodeURIComponent(username)}&nonce=${encodeURIComponent(nonce)}&method=passkey`;
  
  const embed = new EmbedBuilder()
    .setTitle('🔐 Register Your Wallet')
    .setDescription(
      `Choose your preferred registration method:\n\n` +
      `**Option 1: Solana Wallet** (Phantom, Solflare, etc.)\n` +
      `• Connect your existing wallet\n` +
      `• Sign a message to prove ownership\n\n` +
      `**Option 2: Passkey** (Fingerprint, Face ID, Security Key)\n` +
      `• Use biometric authentication\n` +
      `• No seed phrase to manage\n` +
      `• Works on any device\n\n` +
      `**🔒 Security:**\n` +
      `• Your private keys never leave your device\n` +
      `• Links expire in 10 minutes\n` +
      `• Only you can complete registration`
    )
    .setColor(0x667eea)
    .setFooter({ text: 'JustTheTip - Non-Custodial Registration' })
    .setTimestamp();
    
  // Create buttons for both options
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('🔐 Solana Wallet')
        .setStyle(ButtonStyle.Link)
        .setURL(walletUrl),
      new ButtonBuilder()
        .setLabel('🔑 Passkey')
        .setStyle(ButtonStyle.Link)
        .setURL(passkeyUrl)
    );
    
  await interaction.reply({ 
    embeds: [embed], 
    components: [row],
    ephemeral: true 
  });
  
  console.log(`📝 Registration options generated for user ${username} (${userId})`);
```

---

## Part 4: Environment Configuration (10 minutes)

### File: `.env`

Add these variables:

```bash
# Passkey Backend Configuration
RUST_BACKEND_URL=http://localhost:3001
RUST_BACKEND_PORT=3001
RUST_BACKEND_HOST=127.0.0.1

# WebAuthn Configuration
WEBAUTHN_ORIGIN=https://yourdomain.com  # MUST match your actual domain
# For local testing: http://localhost:3000

# Database (should already exist)
DB_PATH=./db/justthetip.db
```

### File: `.env.example`

Update to include:

```bash
# Add to existing .env.example
RUST_BACKEND_URL=http://localhost:3001
WEBAUTHN_ORIGIN=https://yourdomain.com
```

---

## Part 5: Testing (1-2 hours)

### Local Testing Setup

**Step 1: Start Rust Backend**
```bash
cd rust-backend
cargo run
# Should see: "Server running at http://127.0.0.1:3001"
```

**Step 2: Start Node.js Backend**
```bash
npm start
# Should see proxy logs when hitting /api/passkey/* endpoints
```

**Step 3: Start Discord Bot**
```bash
node bot_smart_contract.js
```

### Manual Testing Flow

1. **Test Backend Health**
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"healthy","version":"0.1.0"}
   ```

2. **Test Proxy**
   ```bash
   curl http://localhost:3000/api/passkey/health
   # Should proxy to Rust backend and return same response
   ```

3. **Test Registration Start**
   ```bash
   curl -X POST http://localhost:3000/api/passkey/register/start \
     -H "Content-Type: application/json" \
     -d '{"discord_id":"123","discord_username":"test#1234"}'
   # Should return challenge and session_id
   ```

4. **Test Discord Bot**
   - Run `/register-wallet` command
   - Should see two buttons: "Solana Wallet" and "Passkey"
   - Click "Passkey" button
   - Should open sign.html?method=passkey
   - Passkey registration UI should appear

5. **Test WebAuthn Flow**
   - Click "Register with Passkey" button
   - Browser should prompt for biometric/security key
   - After authentication, should show success message
   - Check database: `sqlite3 db/justthetip.db "SELECT * FROM passkey_credentials;"`

### Device Testing

Test on multiple devices to ensure compatibility:

- ✅ Chrome/Edge (Windows with Windows Hello)
- ✅ Safari (macOS with Touch ID)
- ✅ Safari (iOS with Face ID)
- ✅ Chrome (Android with fingerprint)
- ✅ Hardware security keys (YubiKey, etc.)

---

## Part 6: Production Deployment (varies)

### Prerequisites

1. **HTTPS Required**
   - WebAuthn ONLY works over HTTPS (except localhost)
   - SSL certificate must be valid
   - Update `WEBAUTHN_ORIGIN` to `https://yourdomain.com`

2. **Rust Backend Deployment**

   **Option A: Run alongside Node.js**
   ```bash
   # Build release binary
   cd rust-backend
   cargo build --release
   
   # Run in background
   nohup ./target/release/justthetip-passkey-backend &
   ```

   **Option B: Systemd service**
   ```ini
   # /etc/systemd/system/justthetip-passkey.service
   [Unit]
   Description=JustTheTip Passkey Backend
   After=network.target

   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/path/to/rust-backend
   Environment="RUST_BACKEND_PORT=3001"
   Environment="DB_PATH=/path/to/db/justthetip.db"
   Environment="WEBAUTHN_ORIGIN=https://yourdomain.com"
   ExecStart=/path/to/rust-backend/target/release/justthetip-passkey-backend
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

   **Option C: Docker**
   ```dockerfile
   # Dockerfile for Rust backend
   FROM rust:1.70 as builder
   WORKDIR /app
   COPY rust-backend/Cargo.toml rust-backend/Cargo.lock ./
   COPY rust-backend/src ./src
   RUN cargo build --release

   FROM debian:bookworm-slim
   RUN apt-get update && apt-get install -y libsqlite3-0 && rm -rf /var/lib/apt/lists/*
   COPY --from=builder /app/target/release/justthetip-passkey-backend /usr/local/bin/
   EXPOSE 3001
   CMD ["justthetip-passkey-backend"]
   ```

3. **Update Production Environment Variables**
   - Set `WEBAUTHN_ORIGIN` to your HTTPS domain
   - Ensure `RUST_BACKEND_URL` points to correct port
   - Set proper `DB_PATH` for shared database access

---

## Troubleshooting

### Common Issues

**1. "Passkeys not supported on this browser"**
- WebAuthn requires modern browsers (Chrome 67+, Safari 13+, Firefox 60+)
- Check: `window.PublicKeyCredential` exists in console

**2. "NotAllowedError: User cancelled"**
- User clicked cancel on biometric prompt
- Normal behavior, let user try again

**3. "SecurityError: Origin does not match"**
- `WEBAUTHN_ORIGIN` doesn't match actual domain
- Must be exact match including protocol (https://)

**4. "502 Bad Gateway" on /api/passkey/*"**
- Rust backend not running
- Check: `curl http://localhost:3001/health`
- Verify proxy configuration in api/server.js

**5. "Database locked"**
- Both Node.js and Rust accessing same DB
- Ensure SQLite is configured for concurrent access
- Consider connection pooling

**6. Registration fails with "Invalid session"**
- Session expired (10 min timeout)
- User needs to restart registration process
- Check session_id is being passed correctly

---

## File Checklist

Before testing, ensure you've modified:

- [ ] `api/server.js` - Add proxy middleware
- [ ] `api/public/sign.html` - Add passkey UI and WebAuthn code
- [ ] `bot_smart_contract.js` - Update `/register-wallet` command
- [ ] `.env` - Add Rust backend and WebAuthn variables
- [ ] `.env.example` - Document new variables

---

## Time Estimate

**Total Implementation Time: 4-6 hours**

- Node.js proxy: 30 min
- Frontend HTML/CSS: 1 hour
- Frontend JavaScript: 2 hours
- Bot integration: 1 hour
- Testing: 1-2 hours

**Plus deployment setup (if needed)**

---

## Next Steps

1. **Start with proxy** - Easiest part, gets backend connected
2. **Add frontend UI** - Visual elements first
3. **Implement WebAuthn** - Core functionality
4. **Update bot** - Add passkey option to `/register-wallet`
5. **Test locally** - Verify everything works
6. **Deploy** - Production configuration

---

## Support

If you encounter issues:

1. Check Rust backend logs: `RUST_LOG=debug cargo run`
2. Check Node.js proxy logs
3. Check browser console for WebAuthn errors
4. Review `/api/passkey/user/{discord_id}` to verify credentials stored

---

**Status after implementation:**
- ✅ Backend (Rust)
- ✅ Database schema
- ✅ API endpoints
- ✅ Documentation
- ✅ Frontend integration
- ✅ Bot integration
- ✅ Testing complete
- 🚀 Ready for production!
