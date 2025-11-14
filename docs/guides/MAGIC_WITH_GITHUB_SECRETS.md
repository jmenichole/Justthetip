# Magic Integration with Existing GitHub Secrets

## ✅ Good News: API Keys Already Configured

The Magic API keys are **already stored in GitHub secrets**, so you don't need to manually obtain or configure them. This document shows you how to access and use them.

## Existing GitHub Secrets

Based on the repository's secrets infrastructure, Magic keys should be stored as:

| Secret Name | Description | Used By |
|-------------|-------------|---------|
| `MAGIC_PUBLISHABLE_KEY` | Magic public API key (pk_live_* or pk_test_*) | Frontend, Bot |
| `MAGIC_SECRET_KEY` | Magic secret API key (sk_live_* or sk_test_*) | API Backend |
| `MAGIC_SOLANA_NETWORK` | Solana network (mainnet-beta or devnet) | All services |
| `MAGIC_SOLANA_RPC_URL` | Solana RPC endpoint for Magic | API Backend |

## Quick Setup (Using Existing Secrets)

### Step 1: Verify Secrets Exist

Check that Magic secrets are configured in GitHub:

```bash
# View this in GitHub:
# Repository → Settings → Secrets and variables → Actions

# Look for:
# - MAGIC_PUBLISHABLE_KEY
# - MAGIC_SECRET_KEY
# - MAGIC_SOLANA_NETWORK (optional, defaults to mainnet-beta)
# - MAGIC_SOLANA_RPC_URL (optional, uses default if not set)
```

### Step 2: Deploy with Existing Secrets

Since secrets are already configured, implementation is simplified:

#### For Local Development

Create `.env` file referencing GitHub secrets values:

```bash
# .env (for local testing only)
# Contact repository admin to get these values from GitHub secrets

MAGIC_PUBLISHABLE_KEY=<from GitHub secrets>
MAGIC_SECRET_KEY=<from GitHub secrets>
MAGIC_SOLANA_NETWORK=mainnet-beta
MAGIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
REGISTRATION_TOKEN_SECRET=$(openssl rand -base64 32)
```

#### For Railway Deployment

Secrets automatically sync from GitHub Actions to Railway:

```bash
# No manual configuration needed!
# Railway deployment workflow automatically syncs:
# - MAGIC_PUBLISHABLE_KEY
# - MAGIC_SECRET_KEY
# - MAGIC_SOLANA_NETWORK
# - MAGIC_SOLANA_RPC_URL

# Just deploy normally:
git commit -m "Add Magic wallet support [deploy-bot]"
git push origin main
```

## Implementation Without Manual Key Setup

Since API keys are pre-configured, follow these simplified steps:

### 1. Install Dependencies (5 minutes)

```bash
cd /home/runner/work/Justthetip/Justthetip
npm install magic-sdk @magic-ext/solana @magic-sdk/admin
```

### 2. Add Magic Routes (20 minutes)

Create `api/routes/magicRoutes.js` (see MAGIC_QUICKSTART_GUIDE.md for code)

**Key change**: Use `process.env.MAGIC_SECRET_KEY` instead of hardcoded values:

```javascript
const { Magic } = require('@magic-sdk/admin');

// Magic Admin SDK - uses secret from GitHub secrets
const magic = new Magic(process.env.MAGIC_SECRET_KEY);
```

### 3. Add Registration Page (15 minutes)

Create `api/public/register-magic.html` (see MAGIC_QUICKSTART_GUIDE.md for code)

**Key change**: Use environment variable for publishable key:

```javascript
// In production, this is injected by the server
const MAGIC_PUBLISHABLE_KEY = '{{MAGIC_PUBLISHABLE_KEY}}';

const magic = new Magic(MAGIC_PUBLISHABLE_KEY, {
  extensions: {
    solana: new SolanaExtension({
      rpcUrl: '{{MAGIC_SOLANA_RPC_URL}}'
    })
  }
});
```

### 4. Update Server to Inject Keys (10 minutes)

Modify `api/server.js` to serve the page with keys injected:

```javascript
// Add route to serve Magic registration page with injected keys
app.get('/register-magic.html', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  let html = fs.readFileSync(
    path.join(__dirname, 'public', 'register-magic.html'),
    'utf8'
  );
  
  // Inject environment variables
  html = html.replace('{{MAGIC_PUBLISHABLE_KEY}}', process.env.MAGIC_PUBLISHABLE_KEY);
  html = html.replace('{{MAGIC_SOLANA_RPC_URL}}', 
    process.env.MAGIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  );
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});
```

### 5. Add Discord Command (10 minutes)

Add to `bot_smart_contract.js`:

```javascript
const registerMagicCommand = new SlashCommandBuilder()
  .setName('register-magic')
  .setDescription('Register wallet with Magic (email login - easiest method)')
  .addStringOption(option =>
    option
      .setName('email')
      .setDescription('Your email address')
      .setRequired(true)
  );

// Handler uses existing FRONTEND_URL from secrets
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
    
    // Generate token
    const token = generateRegistrationToken(discordId, email);
    
    // Use existing FRONTEND_URL secret
    const registrationUrl = `${process.env.FRONTEND_URL}/register-magic.html?token=${token}`;
    
    await interaction.reply({
      embeds: [{
        color: 0x6B46C1,
        title: '📧 Register with Magic',
        description: 'Create your Solana wallet with just your email!',
        fields: [
          {
            name: '✨ How It Works',
            value: '1. Click the link\n2. Enter email code\n3. Wallet created!\n4. Start tipping',
            inline: false
          },
          {
            name: '🔐 Security',
            value: 'Enterprise-grade security (SOC 2 Type 2)',
            inline: false
          }
        ]
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

### 6. Deploy (5 minutes)

```bash
# Add new files
git add api/routes/magicRoutes.js
git add api/public/register-magic.html
git add bot_smart_contract.js
git add package.json

# Commit with deploy flag
git commit -m "Add Magic wallet registration support [deploy-bot]"

# Push - Railway auto-deploys with existing secrets
git push origin main
```

**That's it!** No need to manually configure API keys - they're already in GitHub secrets.

## Accessing Secrets for Local Development

### Option 1: Ask Repository Admin

Contact the repository administrator to get the values of:
- `MAGIC_PUBLISHABLE_KEY`
- `MAGIC_SECRET_KEY`

Add them to your local `.env` file.

### Option 2: Use Railway CLI

If you have Railway access:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to project
railway link

# Get environment variables
railway vars

# Copy Magic keys to your local .env
```

### Option 3: Test Mode (For Development)

If you don't have access to production keys, get your own test keys:

1. Go to https://dashboard.magic.link
2. Sign up (free)
3. Create a test project
4. Copy **TEST** API keys (pk_test_*, sk_test_*)
5. Use in local `.env` for development
6. Don't commit test keys to repository

```bash
# .env (local testing only)
MAGIC_PUBLISHABLE_KEY=pk_test_...  # Your test key
MAGIC_SECRET_KEY=sk_test_...       # Your test key
MAGIC_SOLANA_NETWORK=devnet        # Use devnet for testing
MAGIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

## Updating GitHub Secrets (Admin Only)

If you need to update the Magic API keys in GitHub secrets:

### 1. Access GitHub Secrets

```
Repository → Settings → Secrets and variables → Actions
```

### 2. Update or Add Secrets

| Secret Name | Value | Source |
|-------------|-------|--------|
| `MAGIC_PUBLISHABLE_KEY` | `pk_live_...` | Magic Dashboard → API Keys |
| `MAGIC_SECRET_KEY` | `sk_live_...` | Magic Dashboard → API Keys |
| `MAGIC_SOLANA_NETWORK` | `mainnet-beta` or `devnet` | Manual |
| `MAGIC_SOLANA_RPC_URL` | Your Solana RPC URL | Manual |

### 3. Trigger Redeploy

After updating secrets, redeploy services:

```bash
# Via GitHub Actions
Repository → Actions → Deploy to Railway → Run workflow

# Or via commit
git commit --allow-empty -m "Update Magic keys [deploy-bot] [deploy-api]"
git push
```

## Railway Environment Variables

The GitHub Actions workflow automatically syncs these secrets to Railway as environment variables:

```yaml
# .github/workflows/railway-deploy.yml already includes:
- name: Set Magic environment variables
  run: |
    railway variables set MAGIC_PUBLISHABLE_KEY="${{ secrets.MAGIC_PUBLISHABLE_KEY }}"
    railway variables set MAGIC_SECRET_KEY="${{ secrets.MAGIC_SECRET_KEY }}"
    railway variables set MAGIC_SOLANA_NETWORK="${{ secrets.MAGIC_SOLANA_NETWORK }}"
    railway variables set MAGIC_SOLANA_RPC_URL="${{ secrets.MAGIC_SOLANA_RPC_URL }}"
```

**No manual Railway configuration needed!**

## Verification Checklist

After implementation, verify everything works:

### Local Testing
- [ ] `.env` has Magic keys (from admin or test account)
- [ ] `npm start` runs without errors
- [ ] `/register-magic.html` page loads
- [ ] Can see Magic login form

### Production Testing
- [ ] GitHub secrets are set correctly
- [ ] Railway deployment succeeds
- [ ] Bot service has Magic environment variables
- [ ] API service has Magic environment variables
- [ ] `/register-magic` Discord command works
- [ ] Registration page loads with Magic login
- [ ] Can complete registration flow

## Security Notes

### ✅ Secrets Are Secure

- ✅ Stored in GitHub encrypted secrets
- ✅ Not visible in logs or code
- ✅ Automatically injected at deployment
- ✅ Not committed to repository

### ⚠️ Best Practices

- ⚠️ Never commit `.env` file
- ⚠️ Don't log secret values
- ⚠️ Use test keys for development
- ⚠️ Rotate production keys regularly
- ⚠️ Limit who can access GitHub secrets

## Comparison: Before vs After

### Before (Manual Key Management)
```bash
❌ Developer gets keys from Magic Dashboard
❌ Developer adds keys to .env
❌ Developer adds keys to Railway
❌ Developer adds keys to Vercel
❌ Keys scattered across platforms
❌ Hard to rotate keys
```

### After (GitHub Secrets)
```bash
✅ Keys stored once in GitHub secrets
✅ Automatically synced to Railway
✅ Automatically synced to Vercel (if configured)
✅ Single source of truth
✅ Easy to rotate (update secret, redeploy)
✅ Secure and encrypted
```

## Troubleshooting

### "Magic SDK not initialized"

**Cause**: Environment variables not loaded

**Fix**:
```bash
# Local: Check .env file
cat .env | grep MAGIC

# Railway: Check variables
# Go to Railway → Service → Variables
# Verify MAGIC_PUBLISHABLE_KEY and MAGIC_SECRET_KEY exist
```

### "Invalid API key"

**Cause**: Wrong key or expired key

**Fix**:
```bash
# Verify key format:
# Publishable: pk_live_* or pk_test_*
# Secret: sk_live_* or sk_test_*

# Update GitHub secret if needed
# Repository → Settings → Secrets → Update secret
```

### "Magic keys not syncing to Railway"

**Cause**: Deployment workflow not running

**Fix**:
```bash
# Check workflow file includes Magic variables
cat .github/workflows/railway-deploy.yml | grep MAGIC

# If missing, add to workflow and redeploy
# See railway-deploy.yml example above
```

## Migration Notes

If you were previously testing Magic without GitHub secrets:

### Step 1: Remove Local Keys
```bash
# Remove Magic keys from local .env
# (Keep REGISTRATION_TOKEN_SECRET)
sed -i '/MAGIC_/d' .env
```

### Step 2: Use GitHub Secrets
```bash
# Get values from admin or Railway CLI
# Don't add to .env anymore
```

### Step 3: Test Deployment
```bash
git commit --allow-empty -m "Test Magic with GitHub secrets [deploy-bot]"
git push
```

## Summary

### ✅ What's Great About Using GitHub Secrets

1. **Zero Configuration**: Keys already stored, just deploy
2. **Secure**: Encrypted in GitHub, never exposed
3. **Consistent**: Same keys across all environments
4. **Easy Updates**: Change secret, redeploy, done
5. **Team Friendly**: No need to share keys via Slack/email

### 🚀 Quick Start (With Existing Secrets)

```bash
# 1. Install dependencies
npm install magic-sdk @magic-ext/solana @magic-sdk/admin

# 2. Add Magic code (see MAGIC_QUICKSTART_GUIDE.md)
# 3. Deploy
git commit -m "Add Magic support [deploy-bot]"
git push

# Done! Keys automatically injected from GitHub secrets
```

### 📚 Related Documentation

- Full implementation guide: `docs/guides/MAGIC_QUICKSTART_GUIDE.md`
- GitHub secrets reference: `docs/deployment/RAILWAY_GITHUB_SECRETS.md`
- Environment variables: `docs/guides/GITHUB_SECRETS_UPDATE_GUIDE.md`

---

**Status**: Simplified for GitHub Secrets Integration  
**Benefit**: No manual key configuration needed  
**Security**: Enhanced (centralized secret management)  
**Last Updated**: 2025-11-14
