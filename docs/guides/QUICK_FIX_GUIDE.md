# ⚡ Quick Reference: Fix & Deploy Checklist

**Pass Rate:** 87% → Need 13% more to reach 100%  
**Time Required:** ~1 hour  
**Last Test:** 80/92 passed, 12 failed

---

## 🔴 CRITICAL FIXES (Must Do Now)

### 1. Add to .env (30 mins)

```bash
# Get Discord Client Secret
# Go to: https://discord.com/developers/applications/1419742988128616479/oauth2
# Copy secret and add:
DISCORD_CLIENT_SECRET=paste_here

# Generate mint keypair
solana-keygen new --outfile security/mint-authority.json --no-bip39-passphrase
node -e "const fs=require('fs');const kp=JSON.parse(fs.readFileSync('security/mint-authority.json'));console.log('MINT_AUTHORITY_KEYPAIR='+JSON.stringify(Array.from(kp)));" >> .env

# Fund the mint wallet with 0.5-1 SOL (get pubkey first):
solana-keygen pubkey security/mint-authority.json

# Add API URL
echo "API_BASE_URL=http://localhost:5500" >> .env

# Create collection then add:
echo "VERIFIED_COLLECTION_ADDRESS=TODO_after_creating_collection" >> .env
```

### 2. Fix utils/verificationChecker.js exports (5 mins)

**Change the bottom of the file from:**
```javascript
module.exports = VerificationChecker;
```

**To:**
```javascript
module.exports = {
  isUserVerified: VerificationChecker.isUserVerified.bind(VerificationChecker),
  isWalletVerified: VerificationChecker.isWalletVerified.bind(VerificationChecker),
  requireVerification: VerificationChecker.requireVerification.bind(VerificationChecker),
  VerificationChecker
};
```

### 3. Add to docs/landing-app.js (15 mins)

**Add these two functions:**

```javascript
// Discord token exchange
async function exchangeDiscordCode(code) {
  const response = await fetch(`${CONFIG.API_BASE_URL}/api/discord/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri: CONFIG.DISCORD_REDIRECT_URI })
  });
  if (!response.ok) throw new Error('Token exchange failed');
  const data = await response.json();
  return data.user;
}

// Verification status check
async function checkVerificationStatus(discordId) {
  const response = await fetch(`${CONFIG.API_BASE_URL}/api/verification/${discordId}`);
  if (!response.ok) return false;
  const data = await response.json();
  return data.verified;
}
```

**Update handleDiscordCallback to use exchangeDiscordCode:**
```javascript
async function handleDiscordCallback() {
  const code = new URLSearchParams(window.location.search).get('code');
  if (code) {
    const discordUser = await exchangeDiscordCode(code);
    AppState.discordUser = discordUser;
    // ... rest of function
  }
}
```

---

## ✅ Test After Fixes

```bash
node docs/testing/.env.mock-test.js
```

**Expected:** 92/92 tests passed (100%)

---

## 🚀 Deploy After 100% Pass

```bash
# 1. Test backend locally
node api/server.js
curl http://localhost:5500/api/health

# 2. Deploy backend (Railway/Render)
railway up  # or render deploy

# 3. Update landing-app.js CONFIG.API_BASE_URL with production URL

# 4. Activate new landing page
mv docs/landing.html docs/landing_OLD.html
mv docs/landing_NEW.html docs/landing.html

# 5. Commit and push
git add .
git commit -m "Fix: Complete NFT verification system configuration"
git push origin main

# 6. Test production flow at:
# https://jmenichole.github.io/Justthetip/landing.html
```

---

## 📄 Documentation

- **This File:** `docs/testing/.env.mock-test-results.md` (detailed action plan)
- **Validation Report:** `docs/testing/.env.validation-report.md` (config guide)
- **Mock Test:** `docs/testing/.env.mock-test.js` (run to validate)
- **Setup Guide:** `COMPLETE_SETUP_GUIDE.md` (full instructions)

---

## 🆘 Quick Troubleshooting

**"ENV variables missing"** → Add them to .env (see section 1)  
**"Function not exported"** → Fix verificationChecker.js (see section 2)  
**"API call missing"** → Add functions to landing-app.js (see section 3)  
**"Insufficient funds"** → Send SOL to mint authority wallet  
**"Collection not found"** → Create collection with Metaplex Sugar CLI

---

**Status:** Ready to fix → Test → Deploy  
**Current:** 87% complete  
**Target:** 100% complete  
**ETA:** 1 hour
