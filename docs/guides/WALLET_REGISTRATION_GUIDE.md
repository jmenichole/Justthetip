# Wallet Registration Guide

## Overview

JustTheTip now features a streamlined, non-custodial wallet registration system using cryptographic signature verification. This guide explains how to register your Solana wallet securely.

## Features

- **Mobile Support**: Works on both desktop and mobile devices
- **One-Click Registration** (Desktop): No manual signature copying required
- **Mobile Wallet Flow**: Step-by-step guidance for mobile wallet apps
- **Non-Custodial**: Your private keys never leave your wallet
- **Secure**: Uses ed25519 signature verification
- **Time-Limited**: Registration links expire after 10 minutes
- **Rate-Limited**: Protection against abuse (5 attempts per 15 minutes)

## Supported Wallets

### Desktop

#### Browser Extensions (Quick & Easy)
- **Phantom Wallet** (recommended)
- **Solflare Wallet**

#### Universal Connection (No Extension Required)
- **WalletConnect** - Use any mobile Solana wallet
  - Connect by scanning QR code or manual entry
  - Works with Phantom, Solflare, Trust Wallet, and more
  - Perfect if you don't want to install browser extensions

### Mobile (Wallet Apps)
- **Phantom Wallet** (iOS & Android)
- **Solflare Wallet** (iOS & Android)
- **Trust Wallet** (iOS & Android)
- Any Solana-compatible mobile wallet with message signing

> 📱 **Using Discord on mobile?** See our [Mobile Wallet Registration Guide](docs/MOBILE_WALLET_GUIDE.md) for detailed instructions.
> 
> 🖥️ **Desktop user without extensions?** WalletConnect allows you to use your mobile wallet with your desktop browser!

## How to Register Your Wallet

### Step 1: Start Registration

In Discord, use the `/registerwallet` command. The bot will provide you with a secure registration link.

### Step 2: Connect Your Wallet

Click the registration link to open the wallet signing page.

**For Desktop Users with Browser Extensions:**
If you have Phantom or Solflare browser extensions installed, you'll see quick-connect buttons. Click your preferred wallet button, and it will automatically prompt you to sign.

**For Desktop Users without Extensions:**
Don't have a browser extension? No problem! Click the **"Connect with WalletConnect"** button. This allows you to:
- Use your mobile wallet with your desktop browser
- Follow step-by-step instructions to enter your wallet address
- Sign the message on your phone and submit the signature on desktop

**For Mobile Users:**
The page will detect your mobile device and show appropriate options:
- If you have a wallet app installed, you can use quick-connect
- Otherwise, use the WalletConnect flow to register manually

> 📱 For detailed mobile instructions, see our [Mobile Wallet Registration Guide](docs/MOBILE_WALLET_GUIDE.md).

### Step 3: Sign the Verification Message

Your wallet will prompt you to sign a message. This message contains:
- App name: "JustTheTip"
- Your Discord username and ID
- Timestamp
- Unique nonce
- Purpose statement

### Step 4: Confirmation

Once signed, the signature is automatically verified and your wallet is registered. You can close the page and return to Discord.

## Security Features

### Non-Custodial Design
- Your private keys remain in your wallet at all times
- The bot never asks for or stores your seed phrase or private keys
- Only the signature (proof of ownership) is transmitted

### Signature Verification
- Uses ed25519 cryptographic signature verification
- Ensures only the wallet owner can register
- Prevents unauthorized access

### Time-Based Expiration
- Registration links expire after 10 minutes
- Prevents replay attacks
- Nonces are single-use only

### Rate Limiting
- Maximum 5 registration attempts per 15 minutes per IP
- Protects against brute force attacks
- Prevents spam and abuse

### Input Validation
- All inputs are validated for type and format
- Discord IDs must be numeric strings
- Nonces must be valid UUID v4 format
- Prevents injection attacks

## Technical Details

### Message Structure

The message you sign contains the following JSON structure:

```json
{
  "app": "JustTheTip",
  "discord_user": "YourUsername",
  "discord_id": "123456789012345678",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "nonce": "550e8400-e29b-41d4-a716-446655440000",
  "purpose": "Register this wallet for deposits & withdrawals"
}
```

### Verification Process

1. **Nonce Generation**: A unique UUID is generated for each registration attempt
2. **Message Creation**: The message is constructed with user info and nonce
3. **Wallet Signing**: User signs the message with their wallet
4. **Signature Transmission**: Signature is sent to backend (base64 encoded)
5. **Verification**: Backend verifies signature using tweetnacl and @solana/web3.js
6. **Storage**: Upon success, wallet address is stored with Discord ID
7. **Nonce Invalidation**: Nonce is marked as used to prevent reuse

### Database Storage

Registered wallets are stored in MongoDB with the following schema:

```javascript
{
  discordUserId: String,       // Discord user ID
  discordUsername: String,     // Discord username
  walletAddress: String,       // Solana wallet public key
  verifiedAt: String,          // ISO 8601 timestamp
  nonce: String,               // UUID used for registration
  messageData: Object          // Original signed message data
}
```

### API Endpoints

#### POST /api/registerwallet/verify
Verifies wallet signature and registers the wallet.

**Request Body:**
```json
{
  "message": "JSON string",
  "publicKey": "Solana public key",
  "signature": "Base64 signature",
  "discordUserId": "Discord user ID",
  "discordUsername": "Discord username",
  "nonce": "UUID nonce"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Wallet registered successfully",
  "walletAddress": "7Tg5...uE3"
}
```

#### GET /api/registerwallet/status/:discordUserId
Check if a Discord user has a registered wallet.

**Response:**
```json
{
  "success": true,
  "registered": true,
  "walletAddress": "7Tg5...uE3",
  "verifiedAt": "2024-01-01T12:00:00.000Z"
}
```

## Troubleshooting

### "Invalid nonce format"
Your registration link may have been corrupted. Request a new link using `/registerwallet`.

### "Nonce already used"
This link has already been used. Request a new link using `/registerwallet`.

### "Registration link expired"
Links expire after 10 minutes. Request a new link using `/registerwallet`.

### "Wallet already registered to another user"
This wallet is already registered to a different Discord account. Each wallet can only be registered to one Discord user.

### "Too many registration attempts"
You've exceeded the rate limit (5 attempts per 15 minutes). Please wait and try again later.

### "Signature verification failed"
The signature could not be verified. Make sure:
- You're using the same wallet address in the URL
- You're signing the correct message
- Your wallet supports `signMessage()`

## FAQ

**Q: Can I register multiple wallets?**
A: Currently, each Discord account can register one wallet. Re-registering will update your wallet address.

**Q: Can I unregister my wallet?**
A: Re-register with a different wallet to update your registration. Contact an administrator for complete removal.

**Q: Is my wallet information private?**
A: Your wallet address is stored for deposit/withdrawal functionality. Your private keys are never accessed or stored.

**Q: What if I lose access to my wallet?**
A: You can re-register with a new wallet at any time using `/registerwallet`.

**Q: Can someone else register my wallet?**
A: No. Registration requires signing a message with your wallet's private key, which only you should have access to.

## For Developers

### Environment Variables

```bash
# API base URL for registration links
API_BASE_URL=http://localhost:3000

# MongoDB connection (required for persistent nonce storage)
MONGODB_URI=mongodb://localhost:27017/justthetip
```

### Dependencies

- `@solana/web3.js` - Solana blockchain interaction
- `tweetnacl` - Ed25519 signature verification
- `bs58` - Base58 encoding (for Solana addresses)
- `express-rate-limit` - Rate limiting middleware

### Testing

To test the wallet registration flow:

1. Start the API server: `npm start`
2. Start the Discord bot: `npm run start:bot`
3. Use `/registerwallet` in Discord
4. Click the registration link
5. Connect your wallet and sign the message

## Security Considerations

### Best Practices
- Always verify the URL before connecting your wallet
- Never share your private keys or seed phrase
- Use hardware wallets for additional security
- Keep your wallet software updated

### Reporting Security Issues
If you discover a security vulnerability, please report it to the bot administrators immediately.

## Support

For help with wallet registration:
- Use `/help register` in Discord
- Contact server administrators
- Check the main documentation at [GitHub](https://github.com/jmenichole/Justthetip)
