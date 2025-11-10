# Universal Wallet Registration Guide

## Overview

JustTheTip now supports wallet registration for **all users** - whether you're on mobile, desktop, or don't have browser extensions installed! You can securely register your Solana wallet using any mobile wallet app.

## Who Should Use This Guide?

✅ **Mobile users** accessing Discord on phones or tablets  
✅ **Desktop users without browser extensions** (Phantom/Solflare)  
✅ **Users who prefer mobile wallets** over browser extensions  
✅ **Anyone wanting a universal solution** that works everywhere  

## Why Use WalletConnect / Manual Registration?

- **No browser extension required** - Use the wallet you already have on your phone
- **Works on any device** - Desktop, laptop, tablet, or mobile
- **Universal compatibility** - Works with any Solana wallet that supports message signing
- **More secure for some users** - Keep your wallet on a separate device from your computer

## Supported Mobile Wallets

- **Phantom Wallet** (iOS & Android) - Recommended
- **Solflare Wallet** (iOS & Android)
- **Trust Wallet** (iOS & Android)
- **Any Solana-compatible mobile wallet**

## Registration Process

### Step 1: Request Registration Link

1. Open Discord on your mobile device
2. In any server where JustTheTip bot is present, type:
   ```
   /register-wallet
   ```
3. The bot will send you an ephemeral message with a registration link
4. Click the link to open the registration page

### Step 2: Install a Wallet App (if you don't have one)

If you don't already have a Solana wallet app:

1. **Phantom Wallet** (Recommended)
   - iOS: [Download from App Store](https://apps.apple.com/app/phantom-solana-wallet/id1598432977)
   - Android: [Download from Play Store](https://play.google.com/store/apps/details?id=app.phantom)

2. **Solflare Wallet**
   - iOS: [Download from App Store](https://apps.apple.com/app/solflare/id1580902717)
   - Android: [Download from Play Store](https://play.google.com/store/apps/details?id=com.solflare.mobile)

3. Create a new wallet or import an existing one
4. **IMPORTANT**: Save your recovery phrase securely!

### Step 3: Get Your Wallet Address

1. Open your wallet app
2. On the main screen, you'll see your wallet address
3. Tap the address to copy it to clipboard
   - It looks like: `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`
   - It's usually 32-44 characters long

### Step 4: Connect on Registration Page

1. On the registration page, click **"📱 Connect Mobile Wallet"**
2. Read the instructions that appear
3. Click **"Enter Wallet Details"**
4. Paste your wallet address when prompted
5. Click OK

### Step 5: Sign the Message

1. The page will display a message that needs to be signed
2. Click **"📋 Copy Message to Clipboard"** to copy the message
3. Open your wallet app
4. Look for a "Sign Message" feature (location varies by wallet):
   - **Phantom**: Tap menu → Settings → Advanced → Sign Message
   - **Solflare**: Tap menu → Sign Message
   - **Other wallets**: Check settings or advanced features
5. Paste the message into the wallet's sign message field
6. Confirm and sign the message in your wallet
7. Your wallet will generate a signature - copy it

### Step 6: Submit Signature

1. Return to the registration page
2. Click **"✍️ Submit Signature"**
3. Paste the signature when prompted
4. Click OK

### Step 7: Confirmation

If everything is correct:
- You'll see a success message: "✅ Wallet registered successfully!"
- Your wallet is now linked to your Discord account
- You can close the page and return to Discord

## Troubleshooting

### "Invalid signature format" Error

**Problem**: The signature format wasn't recognized.

**Solutions**:
- Make sure you signed the EXACT message shown (copy-paste to avoid typos)
- Ensure you copied the complete signature (no spaces or line breaks)
- Try signing the message again in your wallet app

### "Registration link expired" Error

**Problem**: The registration link is only valid for 10 minutes.

**Solution**: 
- Go back to Discord
- Run `/register-wallet` again to get a new link
- Complete the process within 10 minutes

### "Wallet already registered" Error

**Problem**: This wallet is already linked to a Discord account.

**Solutions**:
- If it's your wallet: You're all set! No need to register again
- If it's not your wallet: Use a different wallet address
- If you need to change the linked Discord account: Contact an admin

### Can't Find "Sign Message" in Wallet App

**Problem**: Different wallet apps have this feature in different places.

**Solutions**:
- Check the app's settings or advanced features
- Look for "Developer" or "Advanced" sections
- If your wallet doesn't support message signing:
  - Use a different wallet that does (Phantom and Solflare both support it)
  - Or use a desktop computer with browser extensions

### Message Doesn't Fit in Wallet's Sign Field

**Problem**: The message is too long for some wallet apps.

**Solution**:
- Try using Phantom or Solflare (they handle longer messages)
- Or use a desktop computer for registration

## Desktop vs Mobile vs WalletConnect

### Desktop with Browser Extension
- ✅ Automatic signing process
- ✅ Fastest and easiest method
- ✅ No manual copying/pasting
- ❌ Requires browser extension installed
- ❌ Limited to Phantom and Solflare

### Desktop with WalletConnect (No Extension)
- ✅ No browser extension needed
- ✅ Use your mobile wallet with desktop browser
- ✅ Secure (keys stay on mobile device)
- ✅ Works with any Solana wallet
- ⚠️ Requires manual entry process
- ⚠️ Need mobile phone nearby

### Mobile with Wallet App
- ✅ Works with any mobile wallet app
- ✅ No browser extension needed
- ✅ Accessible anywhere via phone
- ✅ Same device for Discord and wallet
- ⚠️ Requires manual copy/paste steps

## Security Notes

🔒 **Your Private Keys Stay Safe**
- The bot NEVER sees your private keys
- Your wallet app keeps keys secure on your device
- Only signatures are shared (proof of ownership)

🔒 **Non-Custodial**
- You maintain full control of your funds
- The bot cannot access or move your assets
- Registration only proves wallet ownership

🔒 **Time-Limited Links**
- Registration links expire after 10 minutes
- Prevents unauthorized access
- Request a new link if expired

🔒 **One Wallet, One Account**
- Each wallet can only be linked to one Discord account
- Prevents abuse and maintains security
- Contact admins if you need to change accounts

## Need Help?

If you're still having trouble:

1. **Check the FAQ** in Discord
2. **Ask in the support channel**
3. **Contact a server admin**
4. **Report bugs** on our GitHub repository

## Technical Details

For developers interested in the implementation:

- **Signature Format**: Supports both base58 and base64 encoded signatures
- **Message Structure**: JSON format with app name, Discord ID, timestamp, and nonce
- **Verification**: Uses Ed25519 signature verification with Solana public keys
- **Backend**: Node.js with TweetNaCl for cryptographic verification
- **Transport**: HTTPS with proper CORS and security headers

---

## Quick Reference

| Step | Action | Where |
|------|--------|-------|
| 1 | `/register-wallet` | Discord |
| 2 | Click registration link | Discord message |
| 3 | Tap "Connect Mobile Wallet" | Registration page |
| 4 | Tap "Enter Wallet Details" | Registration page |
| 5 | Copy wallet address | Wallet app |
| 6 | Paste wallet address | Registration page |
| 7 | Copy message to sign | Registration page |
| 8 | Sign message | Wallet app |
| 9 | Copy signature | Wallet app |
| 10 | Submit signature | Registration page |
| 11 | Confirm success | Registration page |

**Estimated Time**: 2-3 minutes (if you already have a wallet)

**Expiration**: Links expire after 10 minutes

**Support**: Available in Discord support channel
