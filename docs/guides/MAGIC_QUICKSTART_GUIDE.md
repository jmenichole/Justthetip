# Magic Embedded Wallets - Quick Start Guide

## Overview

This guide shows you how to quickly integrate **Magic's Embedded Wallets** into JustTheTip using the `make-magic` CLI tool. Magic provides a white-label wallet solution that works across web, mobile (iOS/Android), Flutter, and React Native applications with passwordless authentication.

## Why Use Magic?

**Problem**: Current wallet registration requires users to:
- Install a wallet app (Phantom, Solflare)
- Understand blockchain concepts
- Manually sign messages
- Deal with seed phrases and private keys

**Solution with Magic**:
- ✅ Email/SMS login (familiar UX)
- ✅ Automatic wallet creation
- ✅ No wallet app needed
- ✅ Cross-platform (works everywhere)
- ✅ Social login support (Google, GitHub, Discord)

## Quick Start with `make-magic`

### Option 1: Separate Magic Frontend (Recommended for Testing)

This approach creates a standalone Next.js app for testing Magic integration before integrating it into your main app.

#### Step 1: Run `make-magic` CLI

```bash
# In a temporary directory outside your main repo
cd /tmp
npx make-magic

# Follow the prompts:
# 1. Project name: justthetip-magic-wallet
# 2. Setup type: Custom Setup
# 3. Blockchain: Solana
# 4. Authentication: Email OTP
# 5. API Key: (get from Magic Dashboard)
```

#### Step 2: Test the Generated App

```bash
cd justthetip-magic-wallet
npm run dev

# Open http://localhost:3000
# Test login with your email
# Verify wallet creation
```

#### Step 3: Extract Integration Code

Once verified, extract the relevant Magic code:

```bash
# Copy Magic configuration
cp src/utils/magic.ts /home/runner/work/Justthetip/Justthetip/src/utils/

# Copy authentication components
cp -r src/components/magic /home/runner/work/Justthetip/Justthetip/src/components/

# Copy hooks
cp src/hooks/useMagic.ts /home/runner/work/Justthetip/Justthetip/src/hooks/
```

### Option 2: Integrate into Existing Project

Add Magic directly to your JustTheTip project.

#### Step 1: Install Dependencies

```bash
cd /home/runner/work/Justthetip/Justthetip

# Install Magic SDK for Solana
npm install magic-sdk @magic-ext/solana @magic-sdk/admin

# Install required peer dependencies
npm install @solana/web3.js bs58
```

#### Step 2: Get Magic API Keys

1. Go to https://dashboard.magic.link
2. Sign up or log in
3. Create a new project (name it "JustTheTip")
4. Copy your **Publishable API Key** (starts with `pk_live_` or `pk_test_`)
5. Copy your **Secret API Key** (starts with `sk_live_` or `sk_test_`)

#### Step 3: Configure Environment Variables

Add to `.env` file:

```bash
# Magic Configuration
MAGIC_PUBLISHABLE_KEY=pk_live_...    # From Magic Dashboard
MAGIC_SECRET_KEY=sk_live_...         # For backend operations

# Magic Network (mainnet-beta or devnet)
MAGIC_SOLANA_NETWORK=mainnet-beta

# Magic RPC URL (optional, uses default if not set)
MAGIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Implementation Guide

### Backend Setup

Create Magic authentication routes:

```bash
# Create the routes file
touch /home/runner/work/Justthetip/Justthetip/api/routes/magicRoutes.js
```

Add the following content to `api/routes/magicRoutes.js`:

```javascript
const express = require('express');
const { Magic } = require('@magic-sdk/admin');
const router = express.Router();

// Initialize Magic Admin SDK
const magic = new Magic(process.env.MAGIC_SECRET_KEY);

/**
 * POST /api/magic/register
 * Register a user's Magic wallet with their Discord account
 */
router.post('/register', async (req, res) => {
  try {
    const { discordId, email, walletAddress } = req.body;
    
    // Get DID token from authorization header
    const didToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!didToken) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided'
      });
    }
    
    // Validate token with Magic
    magic.token.validate(didToken);
    const metadata = await magic.users.getMetadataByToken(didToken);
    
    // Verify email and wallet match
    if (metadata.email !== email || metadata.publicAddress !== walletAddress) {
      return res.status(403).json({
        success: false,
        error: 'Credentials mismatch'
      });
    }
    
    // Register user in database
    await db.registerWallet({
      discord_id: discordId,
      wallet_address: walletAddress,
      email: email,
      auth_method: 'magic',
      magic_issuer: metadata.issuer,
      created_at: new Date()
    });
    
    res.json({
      success: true,
      wallet: walletAddress
    });
    
  } catch (error) {
    console.error('Magic registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/magic/verify
 * Verify a Magic DID token
 */
router.post('/verify', async (req, res) => {
  try {
    const didToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!didToken) {
      return res.status(401).json({ success: false, error: 'No token' });
    }
    
    magic.token.validate(didToken);
    const metadata = await magic.users.getMetadataByToken(didToken);
    
    res.json({
      success: true,
      metadata: {
        email: metadata.email,
        publicAddress: metadata.publicAddress,
        issuer: metadata.issuer
      }
    });
    
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

module.exports = router;
```

### Frontend Setup

Create a Magic registration page:

```bash
# Create the HTML page
touch /home/runner/work/Justthetip/Justthetip/api/public/register-magic.html
```

Add the following HTML to `api/public/register-magic.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Magic Wallet Registration - JustTheTip</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }

    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }

    .benefits {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .benefit {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }

    .benefit:last-child {
      margin-bottom: 0;
    }

    .benefit-icon {
      font-size: 24px;
      margin-right: 12px;
    }

    .benefit-text {
      flex: 1;
    }

    .benefit-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }

    .benefit-desc {
      font-size: 13px;
      color: #666;
    }

    #magic-container {
      margin-bottom: 20px;
    }

    .status {
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
      display: none;
    }

    .status.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .status.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .status.info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }

    .loading {
      text-align: center;
      padding: 20px;
    }

    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 10px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #666;
    }

    .secure-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 20px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 6px;
      font-size: 12px;
      color: #666;
    }

    .secure-badge::before {
      content: "🔒";
      margin-right: 8px;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📧 Register with Magic</h1>
    <p class="subtitle">Create your Solana wallet instantly with just your email</p>

    <div class="benefits">
      <div class="benefit">
        <div class="benefit-icon">⚡</div>
        <div class="benefit-text">
          <div class="benefit-title">Instant Setup</div>
          <div class="benefit-desc">Wallet created in seconds</div>
        </div>
      </div>
      <div class="benefit">
        <div class="benefit-icon">🔐</div>
        <div class="benefit-text">
          <div class="benefit-title">Secure</div>
          <div class="benefit-desc">Enterprise-grade security</div>
        </div>
      </div>
      <div class="benefit">
        <div class="benefit-icon">📱</div>
        <div class="benefit-text">
          <div class="benefit-title">Cross-Platform</div>
          <div class="benefit-desc">Access from any device</div>
        </div>
      </div>
    </div>

    <div id="magic-container">
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading Magic authentication...</p>
      </div>
    </div>

    <div id="status" class="status"></div>

    <div class="secure-badge">
      Your private keys are secured by Magic's enterprise infrastructure
    </div>

    <div class="footer">
      <p>Powered by Magic • SOC 2 Type 2 Certified</p>
    </div>
  </div>

  <script type="module">
    import { Magic } from 'https://cdn.jsdelivr.net/npm/magic-sdk@latest/dist/magic.esm.js';
    import { SolanaExtension } from 'https://cdn.jsdelivr.net/npm/@magic-ext/solana@latest/dist/extension.esm.js';

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      showStatus('error', 'Invalid registration link. Please request a new one from Discord.');
      return;
    }

    // Decode token to get Discord ID and email
    let discordId, email;
    try {
      const [payloadB64, signature] = token.split('.');
      const payload = JSON.parse(atob(payloadB64));
      
      if (payload.expires < Date.now()) {
        showStatus('error', 'Registration link has expired. Please request a new one.');
        return;
      }
      
      discordId = payload.discordId;
      email = payload.email;
    } catch (error) {
      showStatus('error', 'Invalid token format.');
      return;
    }

    // Initialize Magic
    const magic = new Magic('YOUR_PUBLISHABLE_KEY', {
      extensions: {
        solana: new SolanaExtension({
          rpcUrl: 'https://api.mainnet-beta.solana.com'
        })
      }
    });

    async function register() {
      try {
        showStatus('info', 'Check your email for the login code...');

        // Login with Magic
        await magic.auth.loginWithEmailOTP({ email });

        showStatus('info', 'Creating your Solana wallet...');

        // Get wallet address
        const publicKey = await magic.solana.getAccount();

        showStatus('info', 'Registering with JustTheTip...');

        // Get DID token for backend verification
        const didToken = await magic.user.getIdToken();

        // Register with backend
        const response = await fetch('/api/magic/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${didToken}`
          },
          body: JSON.stringify({
            discordId,
            email,
            walletAddress: publicKey
          })
        });

        const result = await response.json();

        if (result.success) {
          showStatus('success', `✅ Success! Wallet registered: ${publicKey.substring(0, 8)}...${publicKey.substring(publicKey.length - 6)}`);
          setTimeout(() => {
            window.close();
          }, 3000);
        } else {
          showStatus('error', result.error || 'Registration failed');
        }

      } catch (error) {
        console.error('Registration error:', error);
        showStatus('error', error.message || 'Registration failed');
      }
    }

    function showStatus(type, message) {
      const statusEl = document.getElementById('status');
      statusEl.className = `status ${type}`;
      statusEl.textContent = message;
      statusEl.style.display = 'block';
    }

    // Start registration automatically
    document.getElementById('magic-container').innerHTML = '<div class="loading"><div class="spinner"></div><p>Starting authentication...</p></div>';
    register();
  </script>
</body>
</html>
```

### Discord Bot Integration

Add a new slash command to `bot_smart_contract.js`:

```javascript
// Add to command definitions
const { SlashCommandBuilder } = require('discord.js');

const registerMagicCommand = new SlashCommandBuilder()
  .setName('register-magic')
  .setDescription('Register your wallet with Magic (easiest method - just email!)')
  .addStringOption(option =>
    option
      .setName('email')
      .setDescription('Your email address')
      .setRequired(true)
  );

// Add to command handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'register-magic') {
    const email = interaction.options.getString('email');
    const discordId = interaction.user.id;
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return interaction.reply({
        content: '❌ Invalid email format',
        ephemeral: true
      });
    }
    
    // Generate secure token
    const crypto = require('crypto');
    const payload = JSON.stringify({
      discordId,
      email,
      expires: Date.now() + 600000 // 10 minutes
    });
    
    const signature = crypto
      .createHmac('sha256', process.env.REGISTRATION_TOKEN_SECRET)
      .update(payload)
      .digest('base64url');
    
    const token = Buffer.from(payload).toString('base64url') + '.' + signature;
    const registrationUrl = `${process.env.FRONTEND_URL}/register-magic.html?token=${token}`;
    
    await interaction.reply({
      embeds: [{
        color: 0x6B46C1,
        title: '📧 Magic Wallet Registration',
        description: 'The easiest way to get started with JustTheTip!',
        fields: [
          {
            name: '✨ What is Magic?',
            value: 'Magic lets you create a Solana wallet using just your email - no wallet app needed!',
            inline: false
          },
          {
            name: '🎯 How It Works',
            value: '1. Click the link below\n2. Check your email for a code\n3. Enter the code\n4. Your wallet is created!\n5. Start tipping immediately',
            inline: false
          },
          {
            name: '🔐 Security',
            value: 'Magic uses enterprise-grade security (SOC 2 Type 2). Your wallet is non-custodial and protected.',
            inline: false
          }
        ],
        footer: {
          text: 'Link expires in 10 minutes'
        }
      }],
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 5,
          label: '📧 Register with Magic',
          url: registrationUrl
        }]
      }],
      ephemeral: true
    });
  }
});
```

## Testing Locally

### 1. Set Up Test Environment

```bash
# Use devnet for testing
cat >> .env << EOF

# Magic Test Configuration
MAGIC_PUBLISHABLE_KEY=pk_test_...
MAGIC_SECRET_KEY=sk_test_...
MAGIC_SOLANA_NETWORK=devnet
MAGIC_SOLANA_RPC_URL=https://api.devnet.solana.com
REGISTRATION_TOKEN_SECRET=$(openssl rand -base64 32)
EOF
```

### 2. Update API Server

Add Magic routes to `api/server.js`:

```javascript
const magicRoutes = require('./routes/magicRoutes');
app.use('/api/magic', magicRoutes);
```

### 3. Start Services

```bash
# Terminal 1: Start API server
npm start

# Terminal 2: Start Discord bot
npm run start:bot

# Terminal 3: Test Magic registration page
python3 -m http.server 8000 --directory api/public
# Visit http://localhost:8000/register-magic.html?token=test
```

### 4. Test Flow

1. In Discord, run `/register-magic` with your email
2. Click the registration link
3. Check your email for the Magic code
4. Enter the code
5. Verify wallet creation
6. Check database for new user record

## Production Deployment

### 1. Get Production API Keys

1. Go to https://dashboard.magic.link
2. Create a production project
3. Copy production API keys (pk_live_* and sk_live_*)

### 2. Configure Railway/Vercel

Add environment variables to your hosting platform:

```bash
MAGIC_PUBLISHABLE_KEY=pk_live_...
MAGIC_SECRET_KEY=sk_live_...
MAGIC_SOLANA_NETWORK=mainnet-beta
MAGIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
REGISTRATION_TOKEN_SECRET=<secure-random-string>
```

### 3. Update Frontend URL

Ensure `register-magic.html` uses the correct API key:

```javascript
// Replace placeholder in production build
const MAGIC_KEY = process.env.MAGIC_PUBLISHABLE_KEY || 'pk_live_...';

const magic = new Magic(MAGIC_KEY, {
  extensions: {
    solana: new SolanaExtension({
      rpcUrl: process.env.MAGIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    })
  }
});
```

### 4. Deploy

```bash
# Push to GitHub
git add .
git commit -m "Add Magic Embedded Wallet support"
git push

# Railway will auto-deploy
# Or manually deploy with:
railway up
```

## Usage Examples

### For Users

**Step 1**: In Discord, type:
```
/register-magic email:your@email.com
```

**Step 2**: Click the registration button

**Step 3**: Check email and enter the code

**Step 4**: Done! Start tipping with `/tip @user amount`

### For Developers

**Check if user is using Magic**:
```javascript
const user = await db.getUserByDiscordId(discordId);
if (user.auth_method === 'magic') {
  // User registered via Magic
  console.log('Magic wallet:', user.wallet_address);
}
```

**Verify Magic session**:
```javascript
const didToken = req.headers.authorization?.replace('Bearer ', '');
const metadata = await magic.users.getMetadataByToken(didToken);
```

## Cost Comparison

### Magic Costs
- **Free**: Up to 1,000 Monthly Active Users (MAU)
- **$199/month**: Up to 10,000 MAU
- **Custom**: 10,000+ MAU

### Current System Costs
- **Free**: Just transaction fees (~$0.00025 per tx)

### Recommendation
Start with Magic's free tier for testing. For 1,000+ users, evaluate if the improved UX justifies the cost vs current system.

## Troubleshooting

### "Magic SDK not loaded"
- Check internet connection
- Verify CDN links are accessible
- Try local npm installation instead of CDN

### "Invalid token"
- Token expired (10 min limit)
- Request new registration link
- Check REGISTRATION_TOKEN_SECRET is set

### "Email not received"
- Check spam folder
- Verify email address
- Try different email provider
- Check Magic Dashboard for delivery status

### "Wallet already registered"
- Wallet is already linked to another Discord account
- Use different email
- Contact admin to unlink previous registration

## Next Steps

1. **Test with small user group**: Invite 10-20 users to test Magic registration
2. **Collect feedback**: Survey users on experience vs current method
3. **Monitor metrics**: Track completion rates, time to register, support tickets
4. **Optimize**: Based on feedback, improve UX and messaging
5. **Scale**: Gradually roll out to larger audience

## Resources

- **Magic Documentation**: https://magic.link/docs
- **Solana Integration**: https://magic.link/docs/blockchains/solana
- **Magic Dashboard**: https://dashboard.magic.link
- **Support**: support@magic.link or Discord

---

**Status**: Ready for Implementation  
**Estimated Setup Time**: 2-4 hours  
**Last Updated**: 2025-11-14
