# Magic Embedded Wallets - Production Deployment Guide

## Overview

This guide explains how Magic API keys are configured and deployed in production for the JustTheTip bot.

## ✅ Current Status

Magic API keys are **already configured** in GitHub Actions secrets and are **automatically deployed** to Railway. You do not need to manually configure these keys in production.

### Configured GitHub Secrets

The following secrets are already set up in the GitHub repository:

- ✅ `MAGIC_PUBLISHABLE_KEY` - Public key for frontend SDK
- ✅ `MAGIC_SECRET_KEY` - Secret key for backend API
- ✅ `MAGIC_SOLANA_NETWORK` - Network configuration (mainnet-beta/devnet)
- ✅ `MAGIC_SOLANA_RPC_URL` - RPC endpoint URL

### Automatic Deployment

When code is pushed to the main branch:
1. GitHub Actions workflow runs
2. Secrets are automatically synced to Railway environment variables
3. Railway deploys the updated code with injected secrets
4. Magic registration becomes available via `/register-magic` command

## 🔍 Verifying Production Configuration

### Check if Magic is Configured

You can verify Magic is properly configured by checking the health endpoint:

```bash
curl https://api.mischief-manager.com/api/magic/health
```

Expected response:
```json
{
  "status": "ok",
  "magic_configured": true,
  "timestamp": "2025-11-16T22:33:48.932Z"
}
```

If `magic_configured` is `false`, the environment variables are not set correctly in Railway.

### Test Magic Registration

1. In Discord, run the command:
   ```
   /register-magic
   ```

2. You should see a registration link. If you get an error about "Magic publishable key not configured", check the Railway environment variables.

## 🚨 Troubleshooting

### Error: "Magic publishable key not configured"

This error occurs when `MAGIC_PUBLISHABLE_KEY` is not set in the Railway environment.

**Cause**: GitHub secrets are not syncing to Railway properly.

**Solution**:

1. Verify secrets are set in GitHub:
   - Go to: https://github.com/jmenichole/Justthetip/settings/secrets/actions
   - Check that all Magic secrets are listed

2. Manually add to Railway (if needed):
   - Go to: Railway dashboard > Your project > Variables
   - Add the missing environment variables
   - Click "Deploy" to restart the service

3. Check GitHub Actions workflow:
   - Go to: https://github.com/jmenichole/Justthetip/actions
   - Check the latest workflow run for any errors
   - Look for "Sync secrets to Railway" step

### Error: "Invalid Magic authentication"

This error occurs when the `MAGIC_SECRET_KEY` doesn't match the `MAGIC_PUBLISHABLE_KEY`.

**Cause**: Mismatched keys (using test key in one place and live key in another).

**Solution**:

1. Verify both keys are from the same Magic project:
   - Go to: https://dashboard.magic.link
   - Check your project's API keys
   - Ensure both publishable and secret keys match (both test or both live)

2. Update GitHub secrets if needed:
   - Go to: https://github.com/jmenichole/Justthetip/settings/secrets/actions
   - Update `MAGIC_PUBLISHABLE_KEY` and `MAGIC_SECRET_KEY` to matching pair

### Error: "REGISTRATION_TOKEN_SECRET not set"

This error occurs when the registration token secret is missing.

**Solution**:

1. Generate a secure random secret:
   ```bash
   openssl rand -base64 32
   ```

2. Add to GitHub secrets:
   - Go to: https://github.com/jmenichole/Justthetip/settings/secrets/actions
   - Create new secret: `REGISTRATION_TOKEN_SECRET`
   - Paste the generated value

3. Add to Railway:
   - Go to: Railway dashboard > Your project > Variables
   - Add `REGISTRATION_TOKEN_SECRET` with the same value
   - Deploy

## 🔐 Security Best Practices

### Never Commit Secrets

❌ **DO NOT** commit real API keys to the repository:
```bash
# Bad - DO NOT DO THIS
MAGIC_SECRET_KEY=sk_live_ABC123...
```

✅ **DO** use placeholder values in `.env.example`:
```bash
# Good
# MAGIC_SECRET_KEY=sk_test_your_test_key_for_local_dev
```

### Rotating Keys

If you need to rotate Magic API keys:

1. Generate new keys in Magic dashboard:
   - Go to: https://dashboard.magic.link
   - Navigate to: Your project > API Keys
   - Click "Regenerate" for the key you want to rotate

2. Update GitHub secrets:
   - Go to: https://github.com/jmenichole/Justthetip/settings/secrets/actions
   - Click on the secret to update
   - Enter the new value

3. Update Railway:
   - Go to: Railway dashboard > Your project > Variables
   - Update the corresponding variable
   - Deploy

4. Test the deployment:
   - Run `/register-magic` command in Discord
   - Verify users can successfully register

## 📊 Monitoring

### Check Magic Usage

1. Go to: https://dashboard.magic.link
2. Navigate to: Your project > Analytics
3. Monitor:
   - Monthly Active Users (MAU)
   - Login success rate
   - Error rates
   - Geographic distribution

### Alert Thresholds

- **MAU approaching limit**: If approaching 1,000 users (free tier limit), consider upgrading
- **High error rate**: If error rate > 5%, investigate immediately
- **Authentication failures**: Check for expired or invalid keys

## 🆘 Support

### Magic Support

- Documentation: https://magic.link/docs
- Support email: support@magic.link
- Discord: https://discord.gg/magic

### Internal Support

- Check documentation: `/docs/guides/MAGIC_QUICKSTART_GUIDE.md`
- Review integration: `MAGIC_INTEGRATION_COMPLETE.md`
- API health check: https://api.mischief-manager.com/api/magic/health

## 📝 Important Limitations

### Fiat On-Ramp Limitation

⚠️ **IMPORTANT**: Magic's built-in fiat on-ramp (buy crypto with credit card/ACH) is **ONLY supported on Ethereum and Polygon networks**, NOT on Solana.

**What this means**:
- ✅ Users CAN create and use Solana wallets with Magic
- ✅ Users CAN authenticate with email/OTP
- ✅ Users CAN sign transactions with their Magic wallet
- ❌ Users CANNOT buy crypto directly through Magic's widget on Solana

**Alternative for Solana Fiat On-Ramp**:
- Use **Stripe Crypto Onramp** instead (already integrated)
- Stripe supports Solana and provides similar functionality
- Configuration: See Stripe section in `.env.example`

### Network Support

Magic embedded wallets work on Solana for:
- ✅ Wallet creation
- ✅ Authentication
- ✅ Transaction signing
- ✅ Balance checking
- ❌ Fiat on-ramp (Ethereum/Polygon only)

## ✅ Deployment Checklist

Before deploying Magic to production:

- [x] Magic API keys configured in GitHub secrets
- [x] GitHub Actions workflow syncs secrets to Railway
- [x] `.env.example` updated with Magic configuration
- [x] Documentation created (this file)
- [x] Health check endpoint verified
- [ ] Test registration with real Discord account
- [ ] Monitor error logs for first 24 hours
- [ ] Check Magic dashboard for usage statistics
- [ ] Verify `/register-magic` command works in production
- [ ] Document any issues encountered

## 🎉 Success Criteria

Magic is successfully deployed when:

1. ✅ Health check returns `magic_configured: true`
2. ✅ `/register-magic` command generates valid registration links
3. ✅ Users can complete email authentication
4. ✅ Solana wallets are created successfully
5. ✅ Users can sign transactions with Magic wallets
6. ✅ Error rate is < 1% over 24 hours
7. ✅ No environment variable errors in logs

---

**Status**: Production Ready  
**Last Updated**: 2025-11-16  
**Version**: 1.0
