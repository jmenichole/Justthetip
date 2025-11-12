# Register Wallet with Signature Verification

## Overview

The `/registerwallet` command now requires cryptographic signature verification to prove wallet ownership. This ensures that only users who control the private keys of their Solana wallet can register it with the bot.

## Command Usage

```
/registerwallet <currency> <address> <signature>
```

### Parameters

- **currency** (required): Currency type (SOL or USDC)
- **address** (required): Your Solana wallet address (base58 encoded, 32-44 characters)
- **signature** (required): Base58 encoded signature proving wallet ownership

## How It Works

### Step 1: User Provides Wallet Address
The user provides their Solana wallet address and the currency they want to register for (SOL or USDC).

### Step 2: Sign the Message
The user needs to sign a specific message with their wallet. The message format is:
```
Register wallet for JustTheTip Discord Bot
User: <discord_user_id>
Wallet: <wallet_address>
Currency: <currency>
Timestamp: <timestamp>
```

### Step 3: Submit Signature
The user submits the base58 encoded signature along with the wallet address to the bot.

### Step 4: Verification
The bot:
1. Validates the Solana address format (base58, 32-44 characters)
2. Recreates the expected message
3. Verifies the signature using Ed25519 cryptography
4. Checks that the signature was created by the private key of the provided wallet address

### Step 5: Registration
If verification succeeds, the wallet is registered with a "Verified" status, confirming ownership.

## Security Features

### Cryptographic Verification
- Uses Ed25519 signature verification via `tweetnacl` library
- Requires proof of private key ownership
- Prevents unauthorized wallet registration

### Message Uniqueness
- Each message includes the user's Discord ID
- Includes timestamp to prevent replay attacks
- Message format is standardized and consistent

### Validation
- Solana address format validation using regex
- Base58 encoding verification
- Length checks (32-44 characters)

## Implementation Details

### Dependencies
```javascript
const { PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
const nacl = require('tweetnacl');
```

### Validation Function
```javascript
function isValidSolanaAddress(address) {
  if (!address || typeof address !== 'string') return false;
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}
```

### Signature Verification Process
```javascript
// Create the message that should have been signed
const message = `Register wallet for JustTheTip Discord Bot\nUser: ${userId}\nWallet: ${address}\nCurrency: ${currency}\nTimestamp: ${timestamp}`;

// Verify the signature
const publicKey = new PublicKey(address);
const messageBytes = new TextEncoder().encode(message);
const signatureBytes = bs58.decode(signature);

const isValid = nacl.sign.detached.verify(
  messageBytes,
  signatureBytes,
  publicKey.toBytes()
);
```

## User Experience

### Success Response
When registration succeeds, users see:
- ✅ Wallet Registered & Verified Successfully
- Currency type
- Truncated wallet address (first 8 and last 8 characters)
- Verified status
- Security confirmation: "Signature verified - wallet ownership confirmed"

### Error Responses

#### Invalid Address
```
❌ Invalid Solana wallet address. Please provide a valid base58 encoded address.
```

#### Invalid Signature
```
❌ Invalid signature. Please sign the message with your wallet and provide the correct signature.

How to get the signature:
1. Use your Solana wallet (Phantom, Solflare, etc.)
2. Sign the message provided by the bot
3. Copy the base58 encoded signature
4. Use it in the command
```

#### General Error
```
❌ Error verifying wallet signature. Please ensure:
• Your wallet address is correct
• Your signature is in base58 format
• The signature matches the wallet address

Error: <specific_error_message>
```

## How to Get a Signature (For Users)

### Using Phantom Wallet
1. Open Phantom wallet
2. Click on Settings → Developer
3. Enable "Sign Message"
4. Use the message provided by the bot
5. Copy the resulting base58 signature

### Using Solflare Wallet
1. Open Solflare wallet
2. Navigate to the signing feature
3. Paste the message from the bot
4. Sign the message
5. Copy the base58 encoded signature

### Using Command Line (solana-keygen)
```bash
# Create a message file
echo "Register wallet for JustTheTip Discord Bot
User: YOUR_DISCORD_ID
Wallet: YOUR_WALLET_ADDRESS
Currency: SOL
Timestamp: TIMESTAMP" > message.txt

# Sign the message (if you have the keypair)
solana-keygen sign-message message.txt --keypair your-keypair.json

# Use the output signature in the Discord command
```

## Benefits

1. **Security**: Proves wallet ownership without exposing private keys
2. **Non-custodial**: Users maintain full control of their wallets
3. **Fraud Prevention**: Prevents users from registering wallets they don't own
4. **Trust**: Builds confidence in the platform's security measures
5. **Compliance**: Meets security best practices for cryptocurrency applications

## Migration from Previous Version

The previous version only required a wallet address without verification. Users who registered before this update should re-register with signature verification to upgrade their accounts to "Verified" status.

## Future Enhancements

1. **Session-based Signing**: Generate a unique session ID for each registration attempt
2. **Time-limited Challenges**: Add expiration to registration messages
3. **Multi-signature Support**: Allow registration of multi-sig wallets
4. **Hardware Wallet Support**: Add instructions for Ledger/Trezor users
5. **QR Code Generation**: Generate QR codes for easier mobile wallet signing
6. **Passkey Authentication**: Use WebAuthn/FIDO2 for biometric wallet verification (see [PASSKEY_AUTHENTICATION.md](./PASSKEY_AUTHENTICATION.md))

## Alternative: Passkey Authentication

JustTheTip now supports passkey-based wallet authentication as an alternative to traditional wallet signatures. This method allows users to verify wallet ownership using:

- **Biometric authentication** (Touch ID, Face ID, Windows Hello)
- **Hardware security keys** (YubiKey, Titan Keys)
- **Platform authenticators** (built-in device security)

### Benefits of Passkeys

- **Phishing-resistant**: Cannot be stolen or phished
- **Convenient**: Use fingerprint or face recognition
- **No seed phrases**: Device-based security without memorizing keys
- **Standards-based**: Built on WebAuthn/FIDO2 protocols

### How to Use Passkeys

1. Run `/register-wallet` command and select "Passkey" option
2. Follow the registration link sent to your DMs
3. Choose "Register with Passkey" on the web interface
4. Authenticate with your device (fingerprint, Face ID, etc.)
5. Your passkey is now registered and linked to your Discord account

For detailed information about passkey authentication, including:
- Registration and verification flows
- Supported devices and browsers
- Security considerations
- API documentation
- Troubleshooting

See the complete guide: **[PASSKEY_AUTHENTICATION.md](./PASSKEY_AUTHENTICATION.md)**

### Fallback to Traditional Methods

If your device doesn't support passkeys, you can still use:
- Phantom Wallet signatures (Ed25519)
- Solflare Wallet signatures (Ed25519)  
- Ledger/Trezor hardware wallets
- Command-line signing with `solana-keygen`

All methods provide equivalent security and proof of wallet ownership.
