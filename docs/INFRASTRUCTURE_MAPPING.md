# JustTheTip Infrastructure Mapping

## Overview

This document provides a comprehensive mapping of all infrastructure components, domains, and their purposes in the JustTheTip ecosystem.

---

## 🌐 Domain & Deployment Map

### Production Domains

| Component | URL | Platform | Purpose |
|-----------|-----|----------|---------|
| **API Server** | `https://justthetip.vercel.app` | Vercel | All API endpoints, webhook handlers |
| **Frontend/Docs** | `https://jmenichole.github.io/Justthetip` | GitHub Pages | Landing pages, documentation |
| **Discord Bot** | N/A (WebSocket) | Railway | Discord bot process |
| **Magic Registration** | `https://justthetip.vercel.app/api/magic/register-magic.html` | Vercel | Magic wallet registration page |
| **Wallet Registration** | `https://justthetip.vercel.app/sign.html` | Vercel | Traditional wallet registration |
| **Landing Page** | `https://jmenichole.github.io/Justthetip/landing.html` | GitHub Pages | Main landing page |

### Local Development

| Component | URL | Purpose |
|-----------|-----|---------|
| API Server | `http://localhost:3000` | Local API testing |
| Frontend | `http://localhost:5500` | Local frontend development |

---

## 🔧 Component Architecture

### 1. Discord Bot (Railway)

**File**: `bot_smart_contract.js`

**Purpose**: Persistent Discord bot process with WebSocket connection

**Configuration**:
```javascript
// API URL for backend calls
const API_URL = process.env.API_BASE_URL || 'https://justthetip.vercel.app';
```

**Environment Variables**:
- `DISCORD_BOT_TOKEN` - Discord bot authentication
- `DISCORD_CLIENT_ID` - Discord application ID
- `API_BASE_URL` - Points to Vercel API (default: `https://justthetip.vercel.app`)
- `SOLANA_RPC_URL` - Solana blockchain RPC endpoint
- `FRONTEND_URL` - Points to GitHub Pages (default: `https://jmenichole.github.io/Justthetip`)

**Slash Commands Handled**:
- `/register-magic` - Links to Magic wallet registration
- `/register-wallet` - Links to traditional wallet registration
- `/tip` - Send SOL tips to users
- `/balance` - Check wallet balance
- `/help` - Show help information
- All other bot commands

---

### 2. API Server (Vercel)

**File**: `api/server.js`

**Purpose**: Express.js serverless API for all backend operations

**Base URL**: `https://justthetip.vercel.app`

**Routes**:

#### Magic Wallet Routes (`/api/magic/*`)
- **GET** `/api/magic/register-magic.html` - Magic registration page (injected with env vars)
- **POST** `/api/magic/register` - Complete Magic wallet registration
- **GET** `/api/magic/wallet/:discordId` - Get user's Magic wallet info
- **GET** `/api/magic/health` - Health check for Magic configuration

#### Stripe Crypto Onramp Routes (`/api/stripe/onramp/*`)
- **POST** `/api/stripe/onramp/session` - Create Stripe onramp session
- **GET** `/api/stripe/onramp/session/:id` - Get session status
- **POST** `/api/stripe/onramp/webhook` - Stripe webhook handler

#### Wallet Registration Routes (`/api/*`)
- **GET** `/sign.html` - Traditional wallet registration page
- **POST** `/api/verifyWallet` - Verify wallet signature
- **GET** `/api/tips` - Get tip history

#### Discord OAuth Routes (`/api/discord/*`)
- **POST** `/api/discord/token` - Exchange OAuth code for token

#### Admin Routes (`/api/admin/*`)
- Various admin endpoints (authentication required)

**Configuration**:
```javascript
const CONFIG = {
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || '1419742988128616479',
    DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI || 
        'https://jmenichole.github.io/Justthetip/landing.html',
    MAGIC_PUBLISHABLE_KEY: process.env.MAGIC_PUBLISHABLE_KEY,
    MAGIC_SECRET_KEY: process.env.MAGIC_SECRET_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    // ... other config
};
```

**CORS Origins**:
```javascript
origin: [
    'https://jmenichole.github.io',
    'https://justthetip.vercel.app',
    'http://localhost:3000',
    'http://localhost:5500'
]
```

---

### 3. Frontend/Documentation (GitHub Pages)

**Base URL**: `https://jmenichole.github.io/Justthetip`

**Files Served**:
- `landing.html` - Main landing page (OAuth redirect target)
- `index.html` - Documentation index
- `/docs/*` - All documentation files

**Purpose**:
- Landing pages for users
- Discord OAuth redirect target
- Static documentation hosting

---

### 4. Magic Wallet Integration

**Registration Flow**:

1. User runs `/register-magic` in Discord
2. Bot generates secure token with user's Discord ID
3. Bot creates link: `https://justthetip.vercel.app/api/magic/register-magic.html?token={token}`
4. User clicks link → Vercel serves HTML with Magic SDK
5. Magic SDK authenticates user via Discord OAuth
6. Wallet created and registered via `POST /api/magic/register`

**Handler**: `src/commands/handlers/magicHandler.js`
```javascript
const API_URL = process.env.API_BASE_URL || 
    process.env.FRONTEND_URL || 
    'https://justthetip.vercel.app';

const registrationUrl = `${API_URL}/api/magic/register-magic.html?token=${token}`;
```

**Magic Route**: `api/routes/magicRoutes.js`
- Serves `register-magic.html` with injected environment variables
- Handles Magic wallet registration POST requests

---

### 5. Landing Page (GitHub Pages)

**URL**: `https://jmenichole.github.io/Justthetip/landing.html`

**Purpose**: 
- Discord OAuth redirect target
- User onboarding entry point
- Wallet verification flow

**Configuration**: Defined in Discord Developer Portal OAuth settings
```
DISCORD_REDIRECT_URI=https://jmenichole.github.io/Justthetip/landing.html
```

---

## 🔐 Environment Variables

### Critical Configuration

#### Discord Bot (Railway)
```bash
# Required
DISCORD_BOT_TOKEN=<bot-token>
DISCORD_CLIENT_ID=<client-id>
DISCORD_CLIENT_SECRET=<client-secret>

# API & Frontend URLs
API_BASE_URL=https://justthetip.vercel.app
FRONTEND_URL=https://jmenichole.github.io/Justthetip

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

#### API Server (Vercel)
```bash
# Discord OAuth
DISCORD_CLIENT_ID=<client-id>
DISCORD_CLIENT_SECRET=<client-secret>
DISCORD_REDIRECT_URI=https://jmenichole.github.io/Justthetip/landing.html

# Magic (from GitHub Secrets)
MAGIC_PUBLISHABLE_KEY=pk_live_...
MAGIC_SECRET_KEY=sk_live_...
MAGIC_SOLANA_NETWORK=mainnet-beta
MAGIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
REGISTRATION_TOKEN_SECRET=<random-secret>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

---

## 📊 Data Flow Diagrams

### Magic Wallet Registration Flow

```
┌─────────────────┐
│  Discord User   │
│  Types command  │
│ /register-magic │
└────────┬────────┘
         │
         v
┌────────────────────────────────────────┐
│     Discord Bot (Railway)              │
│  - Generates registration token        │
│  - Creates registration URL            │
│  - API_BASE_URL + /api/magic/...      │
└────────┬───────────────────────────────┘
         │
         v
┌────────────────────────────────────────┐
│  User clicks link in Discord          │
│  https://justthetip.vercel.app/       │
│  api/magic/register-magic.html?token= │
└────────┬───────────────────────────────┘
         │
         v
┌────────────────────────────────────────┐
│     API Server (Vercel)                │
│  - Serves register-magic.html          │
│  - Injects MAGIC_PUBLISHABLE_KEY       │
│  - Injects MAGIC_SOLANA_RPC_URL        │
└────────┬───────────────────────────────┘
         │
         v
┌────────────────────────────────────────┐
│     Browser (User)                     │
│  - Magic SDK initializes               │
│  - Authenticates via Discord OAuth     │
│  - Creates Solana wallet               │
└────────┬───────────────────────────────┘
         │
         v
┌────────────────────────────────────────┐
│     POST /api/magic/register           │
│  - Verifies Magic DID token            │
│  - Verifies registration token         │
│  - Stores wallet in database           │
└────────────────────────────────────────┘
```

### Traditional Wallet Registration Flow

```
┌─────────────────┐
│  Discord User   │
│  Types command  │
│ /register-wallet│
└────────┬────────┘
         │
         v
┌────────────────────────────────────────┐
│     Discord Bot (Railway)              │
│  - Creates registration URL            │
│  - API_BASE_URL + /sign.html          │
└────────┬───────────────────────────────┘
         │
         v
┌────────────────────────────────────────┐
│  User clicks link in Discord          │
│  https://justthetip.vercel.app/       │
│  sign.html?discordId=...              │
└────────┬───────────────────────────────┘
         │
         v
┌────────────────────────────────────────┐
│     API Server (Vercel)                │
│  - Serves sign.html                    │
│  - Loads wallet adapter                │
└────────┬───────────────────────────────┘
         │
         v
┌────────────────────────────────────────┐
│     Browser (User)                     │
│  - Connects Phantom/Solflare wallet    │
│  - Signs verification message          │
│  - Submits to /api/verifyWallet       │
└────────────────────────────────────────┘
```

---

## 🔍 Verification & Testing

### Check API Server Health
```bash
curl https://justthetip.vercel.app/api/health
```

### Check Magic Configuration
```bash
curl https://justthetip.vercel.app/api/magic/health
```

Expected response:
```json
{
  "status": "ok",
  "magic_configured": true,
  "timestamp": "2025-11-16T22:48:16.051Z"
}
```

### Test Discord Bot Connection
In Discord, run:
```
/help
```

Should show available commands.

### Test Magic Registration
In Discord, run:
```
/register-magic
```

Should generate a clickable link to Magic registration page.

---

## ⚠️ Important Notes

### Deprecated Domains
❌ **DO NOT USE**: `api.mischief-manager.com` (outdated)

✅ **USE**: `https://justthetip.vercel.app` for all API calls

### Domain Ownership
- **Vercel**: Owned by project, managed via Vercel dashboard
- **GitHub Pages**: Owned by repository owner (jmenichole)
- **Railway**: Managed separately, bot deployment only

### SSL/HTTPS
All production domains use HTTPS:
- Vercel provides automatic SSL
- GitHub Pages provides automatic SSL
- Railway provides automatic SSL

### CORS Configuration
API server allows requests from:
- `https://jmenichole.github.io`
- `https://justthetip.vercel.app`
- `http://localhost:3000` (development)
- `http://localhost:5500` (development)

---

## 📝 Maintenance Checklist

When updating infrastructure:

- [ ] Update `API_BASE_URL` in bot code if API domain changes
- [ ] Update `FRONTEND_URL` if landing page domain changes
- [ ] Update CORS origins in `api/server.js`
- [ ] Update Discord OAuth redirect URI in Discord Developer Portal
- [ ] Update Magic OAuth redirect URI in Magic dashboard
- [ ] Update documentation with new URLs
- [ ] Test all registration flows after changes

---

## 🆘 Troubleshooting

### "404 Not Found" when clicking registration link
- Check `API_BASE_URL` in bot environment variables
- Should be: `https://justthetip.vercel.app`
- NOT: `https://api.mischief-manager.com`

### "CORS Error" in browser console
- Check CORS origins in `api/server.js`
- Ensure origin matches the domain serving the page

### "Invalid redirect URI" from Discord OAuth
- Check `DISCORD_REDIRECT_URI` matches Discord Developer Portal
- Should be: `https://jmenichole.github.io/Justthetip/landing.html`

### "Magic publishable key not configured"
- Check Vercel environment variables
- Ensure `MAGIC_PUBLISHABLE_KEY` is set
- Check GitHub secrets sync to Vercel

---

**Last Updated**: 2025-11-16  
**Version**: 1.0  
**Maintainer**: GitHub Copilot Workspace
