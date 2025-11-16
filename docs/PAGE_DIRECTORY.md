# JustTheTip - Page Directory

## Overview

This document lists all accessible pages in the JustTheTip ecosystem with their correct URLs and purposes.

---

## 🌐 Production Pages

### API Server Pages (Vercel - https://justthetip.vercel.app)

#### Wallet Registration & Management

1. **Traditional Wallet Registration**
   - **URL**: `https://justthetip.vercel.app/sign.html`
   - **Purpose**: Register Solana wallet using Phantom, Solflare, or other wallet adapters
   - **Usage**: Bot generates link via `/register-wallet` command
   - **Features**: 
     - WalletConnect support for mobile wallets
     - Signature verification
     - Discord ID linking

2. **Magic Wallet Registration**
   - **URL**: `https://justthetip.vercel.app/api/magic/register-magic.html`
   - **Purpose**: Create Solana wallet using Magic (email/Discord authentication)
   - **Usage**: Bot generates link via `/register-magic` command
   - **Features**:
     - Email-based authentication
     - Discord OAuth integration
     - No wallet app required
     - Enterprise-grade security

3. **Buy Crypto (Stripe Onramp)**
   - **URL**: `https://justthetip.vercel.app/buy-crypto.html`
   - **Purpose**: Purchase SOL using credit card, bank transfer, Apple Pay, Google Pay
   - **Features**:
     - Stripe Crypto Onramp integration
     - Multiple payment methods
     - Direct to wallet delivery
     - KYC compliant

#### Static Files
- **Logo**: `https://justthetip.vercel.app/logo.png`
- **Wallet Scripts**: Various `.js` files for wallet connectivity

---

### Documentation Pages (GitHub Pages - https://jmenichole.github.io/Justthetip)

#### Main Pages

1. **Landing Page**
   - **URL**: `https://jmenichole.github.io/Justthetip/landing.html`
   - **Purpose**: Main landing page and Discord OAuth redirect target
   - **Features**:
     - User onboarding
     - Discord OAuth callback handling
     - Wallet verification flow

2. **Documentation Home**
   - **URL**: `https://jmenichole.github.io/Justthetip/index.html`
   - **Purpose**: Documentation index and navigation
   - **Features**:
     - Links to all guides
     - Project overview
     - Quick start information

3. **Support Page**
   - **URL**: `https://jmenichole.github.io/Justthetip/support.html`
   - **Purpose**: User support and troubleshooting
   - **Features**:
     - FAQ section
     - Contact information
     - Ticket submission

4. **Terms of Service**
   - **URL**: `https://jmenichole.github.io/Justthetip/terms.html`
   - **Purpose**: Legal terms and conditions

5. **Privacy Policy**
   - **URL**: `https://jmenichole.github.io/Justthetip/privacy.html`
   - **Purpose**: Privacy policy and data handling

6. **Investor Information**
   - **URL**: `https://jmenichole.github.io/Justthetip/investor.html`
   - **Purpose**: Information for potential investors

7. **Wallet Registration (Docs Copy)**
   - **URL**: `https://jmenichole.github.io/Justthetip/sign.html`
   - **Purpose**: Backup wallet registration page (primary is on Vercel)
   - **Note**: Use Vercel version for production

---

## 🔗 API Endpoints

### Magic Wallet API

1. **Magic Health Check**
   - **URL**: `https://justthetip.vercel.app/api/magic/health`
   - **Method**: GET
   - **Purpose**: Verify Magic configuration status
   - **Response**:
     ```json
     {
       "status": "ok",
       "magic_configured": true,
       "timestamp": "2025-11-16T22:52:00.000Z"
     }
     ```

2. **Magic Registration**
   - **URL**: `https://justthetip.vercel.app/api/magic/register`
   - **Method**: POST
   - **Purpose**: Complete Magic wallet registration
   - **Body**: 
     ```json
     {
       "didToken": "...",
       "registrationToken": "..."
     }
     ```

3. **Magic Wallet Lookup**
   - **URL**: `https://justthetip.vercel.app/api/magic/wallet/:discordId`
   - **Method**: GET
   - **Purpose**: Get user's Magic wallet information

### Stripe Onramp API

1. **Stripe Onramp Session**
   - **URL**: `https://justthetip.vercel.app/api/stripe/onramp/session`
   - **Method**: POST
   - **Purpose**: Create Stripe onramp session for buying crypto

2. **Stripe Onramp Session Status**
   - **URL**: `https://justthetip.vercel.app/api/stripe/onramp/session/:id`
   - **Method**: GET
   - **Purpose**: Get session status

3. **Stripe Webhook**
   - **URL**: `https://justthetip.vercel.app/api/stripe/onramp/webhook`
   - **Method**: POST
   - **Purpose**: Handle Stripe webhook events

4. **Stripe Configuration**
   - **URL**: `https://justthetip.vercel.app/api/stripe/onramp/config`
   - **Method**: GET
   - **Purpose**: Get Stripe publishable key

### Wallet Registration API

1. **Verify Wallet**
   - **URL**: `https://justthetip.vercel.app/api/verifyWallet`
   - **Method**: POST
   - **Purpose**: Verify wallet signature and register wallet

### Discord OAuth API

1. **Token Exchange**
   - **URL**: `https://justthetip.vercel.app/api/discord/token`
   - **Method**: POST
   - **Purpose**: Exchange Discord OAuth code for token

### Tips & History API

1. **Tips History**
   - **URL**: `https://justthetip.vercel.app/api/tips`
   - **Method**: GET
   - **Purpose**: Get tip transaction history

### Health & Status API

1. **Health Check**
   - **URL**: `https://justthetip.vercel.app/api/health`
   - **Method**: GET
   - **Purpose**: Check API server health

---

## 📱 Discord Bot Commands & Page Links

### Commands That Generate Page Links

1. **`/register-magic`**
   - Generates: `https://justthetip.vercel.app/api/magic/register-magic.html?token=...`
   - Creates Magic wallet registration link
   - Token is time-limited (10 minutes)

2. **`/register-wallet`**
   - Generates: `https://justthetip.vercel.app/sign.html?discordId=...`
   - Creates traditional wallet registration link

3. **`/buy-crypto` (if implemented)**
   - Would link to: `https://justthetip.vercel.app/buy-crypto.html`
   - For Stripe onramp purchases

---

## 🧪 Local Development Pages

For local testing (when running `npm start`):

1. **API Server**: `http://localhost:3000`
   - `/sign.html` - Wallet registration
   - `/buy-crypto.html` - Buy crypto page
   - `/api/magic/register-magic.html` - Magic registration

2. **Frontend**: `http://localhost:5500` (or development server)
   - Pages from `docs/` directory

---

## 📋 Page Access Matrix

| Page | Production URL | GitHub Pages | Purpose | Access |
|------|---------------|--------------|---------|---------|
| Magic Registration | `justthetip.vercel.app/api/magic/register-magic.html` | ❌ | Create Magic wallet | Bot link |
| Traditional Registration | `justthetip.vercel.app/sign.html` | ✅ Backup | Register wallet | Bot link |
| Buy Crypto | `justthetip.vercel.app/buy-crypto.html` | ❌ | Purchase SOL | Direct/Bot |
| Landing Page | N/A | `jmenichole.github.io/Justthetip/landing.html` | OAuth redirect | Discord |
| Documentation | N/A | `jmenichole.github.io/Justthetip/index.html` | Docs index | Public |
| Support | N/A | `jmenichole.github.io/Justthetip/support.html` | Help & FAQ | Public |
| Terms | N/A | `jmenichole.github.io/Justthetip/terms.html` | Legal | Public |
| Privacy | N/A | `jmenichole.github.io/Justthetip/privacy.html` | Privacy | Public |
| Investor | N/A | `jmenichole.github.io/Justthetip/investor.html` | Investor info | Public |

---

## 🔍 Page Verification

### Check if pages are accessible:

```bash
# API Server Pages (Vercel)
curl -I https://justthetip.vercel.app/sign.html
curl -I https://justthetip.vercel.app/buy-crypto.html
curl -I https://justthetip.vercel.app/api/magic/register-magic.html

# GitHub Pages
curl -I https://jmenichole.github.io/Justthetip/landing.html
curl -I https://jmenichole.github.io/Justthetip/index.html
curl -I https://jmenichole.github.io/Justthetip/support.html
curl -I https://jmenichole.github.io/Justthetip/terms.html
curl -I https://jmenichole.github.io/Justthetip/privacy.html

# API Endpoints
curl https://justthetip.vercel.app/api/magic/health
curl https://justthetip.vercel.app/api/health
```

Expected response: `200 OK` for pages, JSON for API endpoints

---

## 📝 Notes

### Page Hosting

- **Vercel Pages**: Served from `api/public/` directory via Express static middleware
- **GitHub Pages**: Served from `docs/` directory via GitHub Pages
- **API Routes**: Served from `api/server.js` Express routes

### Special Routes

1. **Magic Registration Page**: 
   - Has special route in `api/server.js` (line 1004)
   - Injects `MAGIC_PUBLISHABLE_KEY` at runtime
   - Cannot be served as pure static file

2. **Static Files**:
   - Most files in `api/public/` are served statically
   - WalletConnect modal assets in `api/public/.well-known/`

### Deprecated Files

- `docs/landing_NEW.html` - Not in use (backup/testing file)

---

## 🆘 Troubleshooting

### Page Not Found (404)

1. **Check domain**: Vercel vs GitHub Pages
   - Vercel: `justthetip.vercel.app`
   - GitHub Pages: `jmenichole.github.io/Justthetip`

2. **Check file location**:
   - API pages: `api/public/`
   - Documentation pages: `docs/`

3. **Check routing**:
   - Vercel: `vercel.json` routes configuration
   - Express: Static file middleware and custom routes

### Page Loads But Features Don't Work

1. **Check environment variables** in Vercel dashboard
2. **Check browser console** for JavaScript errors
3. **Verify API endpoints** are accessible
4. **Check CORS settings** in `api/server.js`

---

**Last Updated**: 2025-11-16  
**Version**: 1.0  
**Maintainer**: GitHub Copilot Workspace
