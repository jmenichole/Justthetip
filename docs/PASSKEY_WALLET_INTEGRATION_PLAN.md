# Branded Wallet with Passkeys Integration Plan

**Feature Branch:** `claude/justhetip-kick-bot-integration-011CV1NoFUHu8RviMqLTKqQK`
**Created:** 2025-11-11
**Status:** Planning Phase
**Version:** 1.0.0

---

## 📋 Executive Summary

This document outlines the comprehensive plan for integrating **Passkey-based wallet authentication** into JustTheTip, providing users with a modern, passwordless, and secure way to manage their cryptocurrency wallets. This integration will support both Discord and Kick platforms while maintaining the non-custodial architecture.

### What are Passkeys?

**Passkeys** are a modern authentication standard based on **WebAuthn/FIDO2** that replace passwords with cryptographic key pairs. They offer:

- **Passwordless authentication:** No passwords to remember or manage
- **Biometric security:** Face ID, Touch ID, Windows Hello
- **Phishing-resistant:** Cannot be stolen or replayed
- **Cross-device sync:** iCloud Keychain, Google Password Manager
- **Platform native:** Built into iOS, Android, Windows, macOS

### Goals

1. **Passwordless Wallet Creation:** One-tap wallet creation using biometrics
2. **Enhanced Security:** Eliminate password-related vulnerabilities
3. **Improved UX:** Faster, simpler registration and authentication
4. **Cross-Platform Support:** Work on all modern devices and browsers
5. **Non-Custodial:** Maintain user control over private keys

---

## 🎯 Feature Overview

### Core Features

#### 1. Passkey Registration
- One-tap wallet creation with biometrics
- Platform authenticator support (Touch ID, Face ID, Windows Hello)
- Cross-platform roaming authenticators (YubiKey, security keys)
- Automatic passkey backup and sync
- Recovery mechanism

#### 2. Passkey Authentication
- Biometric sign-in
- Multi-device support
- Automatic reauthentication
- Session management
- Graceful fallback to existing methods

#### 3. Wallet Derivation
- Deterministic wallet generation from passkey
- Secure key derivation (HKDF, BIP32-like)
- Support for multiple wallets per passkey
- Account discovery mechanism

#### 4. User Experience
- Seamless onboarding flow
- Mobile-first design
- Browser compatibility checks
- Fallback to signature-based registration
- Clear security messaging

---

## 🏗️ Technical Architecture

### System Components

```
┌───────────────────────────────────────────────────────────────┐
│                  Passkey Wallet Integration                    │
└───────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
   ┌──────────▼──────────┐      ┌───────────▼───────────┐
   │  WebAuthn Frontend  │      │  Passkey Backend      │
   │                     │      │                       │
   │  - Registration UI  │◄────►│  - Challenge Gen     │
   │  - Authentication   │      │  - Verification      │
   │  - Browser Support  │      │  - Key Storage       │
   │  - Error Handling   │      │  - Session Mgmt      │
   └──────────┬──────────┘      └───────────┬───────────┘
              │                               │
              │        ┌──────────────────────┤
              │        │                      │
   ┌──────────▼────────▼─────┐  ┌───────────▼───────────┐
   │  Wallet Derivation       │  │  Database Layer       │
   │                          │  │                       │
   │  - Key Derivation (HKDF)│  │  - Passkeys Table     │
   │  - Solana Keypair Gen   │  │  - Challenge Store    │
   │  - PDA Mapping          │  │  - Session Store      │
   │  - Recovery Seeds       │  │  - Audit Logs         │
   └──────────┬───────────────┘  └───────────────────────┘
              │
   ┌──────────▼───────────┐
   │  Solana Integration  │
   │                      │
   │  - Existing SDK      │
   │  - Transaction Sign  │
   │  - Balance Check     │
   └──────────────────────┘
```

### Technology Stack

#### Frontend
- **@simplewebauthn/browser** - WebAuthn client library
- **React** - UI framework
- **Tailwind CSS** - Styling
- **@solana/wallet-adapter-react** - Wallet adapter integration

#### Backend
- **@simplewebauthn/server** - WebAuthn server library
- **@noble/hashes** - Cryptographic hashing (HKDF)
- **ed25519-hd-key** - Key derivation for Solana
- **@solana/web3.js** - Solana blockchain integration

#### Database
- **PostgreSQL** - Persistent storage
- **Redis** (optional) - Challenge/session caching

---

## 📡 WebAuthn/FIDO2 Implementation

### Registration Flow

#### 1. Frontend: Initiate Registration

```javascript
// src/passkey/passkeyRegistration.js (Frontend)
import { startRegistration } from '@simplewebauthn/browser';

async function registerPasskey(userId, username, platform) {
  try {
    // 1. Request registration options from server
    const optionsResponse = await fetch('/api/passkey/register/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username, platform })
    });

    const options = await optionsResponse.json();

    // 2. Trigger browser WebAuthn API
    const credential = await startRegistration(options);

    // 3. Send credential to server for verification
    const verificationResponse = await fetch('/api/passkey/register/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, credential })
    });

    const result = await verificationResponse.json();

    if (result.verified) {
      return {
        success: true,
        walletAddress: result.walletAddress,
        credentialId: result.credentialId
      };
    }

    throw new Error('Passkey registration failed');
  } catch (error) {
    console.error('Passkey registration error:', error);
    throw error;
  }
}
```

#### 2. Backend: Generate Registration Options

```javascript
// api/routes/passkeyRoutes.js (Backend)
const { generateRegistrationOptions } = require('@simplewebauthn/server');
const crypto = require('crypto');

app.post('/api/passkey/register/start', async (req, res) => {
  const { userId, username, platform } = req.body;

  // Validate inputs
  if (!userId || !username || !platform) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if user already has a passkey for this platform
  const existingPasskey = await db.getPasskey(userId, platform);
  if (existingPasskey) {
    return res.status(409).json({ error: 'Passkey already registered for this platform' });
  }

  // Generate registration options
  const options = await generateRegistrationOptions({
    rpName: process.env.PASSKEY_RP_NAME || 'JustTheTip',
    rpID: process.env.PASSKEY_RP_ID,
    userID: userId,
    userName: username,
    userDisplayName: username,

    // Attestation
    attestationType: 'none', // No attestation required

    // Authenticator selection
    authenticatorSelection: {
      // Prefer platform authenticators (Touch ID, Face ID, Windows Hello)
      authenticatorAttachment: 'platform',

      // Require resident key (passkey stored on device)
      residentKey: 'preferred',

      // Require user verification (biometric or PIN)
      userVerification: 'preferred'
    },

    // Supported algorithms (ES256, RS256)
    supportedAlgorithmIDs: [-7, -257],

    // Exclude existing credentials
    excludeCredentials: [],

    // Timeout (60 seconds)
    timeout: 60000
  });

  // Store challenge temporarily (expires in 5 minutes)
  await storeChallenge(userId, options.challenge, 300);

  res.json(options);
});
```

#### 3. Backend: Verify Registration

```javascript
const { verifyRegistrationResponse } = require('@simplewebauthn/server');
const { deriveWalletFromPasskey } = require('../utils/walletDerivation');

app.post('/api/passkey/register/finish', async (req, res) => {
  const { userId, credential } = req.body;

  try {
    // Retrieve stored challenge
    const challenge = await getChallenge(userId);
    if (!challenge) {
      return res.status(400).json({ error: 'Challenge not found or expired' });
    }

    // Verify registration response
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: process.env.FRONTEND_URL,
      expectedRPID: process.env.PASSKEY_RP_ID,
      requireUserVerification: true
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Verification failed', verified: false });
    }

    const { registrationInfo } = verification;

    // Derive Solana wallet from credential
    const wallet = await deriveWalletFromPasskey(
      registrationInfo.credentialPublicKey,
      userId
    );

    // Store passkey in database
    const passkey = await db.createPasskey({
      user_id: userId,
      platform: req.body.platform || 'discord',
      credential_id: Buffer.from(registrationInfo.credentialID).toString('base64'),
      public_key: Buffer.from(registrationInfo.credentialPublicKey).toString('base64'),
      counter: registrationInfo.counter,
      transports: credential.response.transports || [],
      aaguid: registrationInfo.aaguid,
      created_at: new Date()
    });

    // Store wallet mapping
    await db.updateUserWallet(userId, wallet.publicKey.toBase58());

    // Create session token
    const sessionToken = generateSessionToken(userId);

    res.json({
      verified: true,
      credentialId: passkey.credential_id,
      walletAddress: wallet.publicKey.toBase58(),
      sessionToken
    });
  } catch (error) {
    console.error('Passkey verification error:', error);
    res.status(500).json({ error: 'Verification failed', message: error.message });
  }
});
```

### Authentication Flow

#### 1. Frontend: Initiate Authentication

```javascript
// src/passkey/passkeyAuthentication.js (Frontend)
import { startAuthentication } from '@simplewebauthn/browser';

async function authenticateWithPasskey(userId, platform) {
  try {
    // 1. Request authentication options from server
    const optionsResponse = await fetch('/api/passkey/authenticate/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, platform })
    });

    const options = await optionsResponse.json();

    // 2. Trigger browser WebAuthn API
    const credential = await startAuthentication(options);

    // 3. Send credential to server for verification
    const verificationResponse = await fetch('/api/passkey/authenticate/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, credential })
    });

    const result = await verificationResponse.json();

    if (result.verified) {
      return {
        success: true,
        sessionToken: result.sessionToken,
        walletAddress: result.walletAddress
      };
    }

    throw new Error('Authentication failed');
  } catch (error) {
    console.error('Passkey authentication error:', error);
    throw error;
  }
}
```

#### 2. Backend: Generate Authentication Options

```javascript
const { generateAuthenticationOptions } = require('@simplewebauthn/server');

app.post('/api/passkey/authenticate/start', async (req, res) => {
  const { userId, platform } = req.body;

  try {
    // Get user's passkeys
    const passkeys = await db.getPasskeys(userId, platform);

    if (!passkeys || passkeys.length === 0) {
      return res.status(404).json({ error: 'No passkeys registered' });
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: process.env.PASSKEY_RP_ID,

      // Allow only user's registered credentials
      allowCredentials: passkeys.map(pk => ({
        id: Buffer.from(pk.credential_id, 'base64'),
        type: 'public-key',
        transports: pk.transports
      })),

      // Require user verification
      userVerification: 'preferred',

      // Timeout (60 seconds)
      timeout: 60000
    });

    // Store challenge temporarily
    await storeChallenge(userId, options.challenge, 300);

    res.json(options);
  } catch (error) {
    console.error('Authentication options error:', error);
    res.status(500).json({ error: 'Failed to generate options' });
  }
});
```

#### 3. Backend: Verify Authentication

```javascript
const { verifyAuthenticationResponse } = require('@simplewebauthn/server');

app.post('/api/passkey/authenticate/finish', async (req, res) => {
  const { userId, credential } = req.body;

  try {
    // Retrieve stored challenge
    const challenge = await getChallenge(userId);
    if (!challenge) {
      return res.status(400).json({ error: 'Challenge not found or expired' });
    }

    // Get passkey from database
    const credentialId = Buffer.from(credential.id, 'base64url').toString('base64');
    const passkey = await db.getPasskeyByCredentialId(credentialId);

    if (!passkey || passkey.user_id !== userId) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    // Verify authentication response
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: process.env.FRONTEND_URL,
      expectedRPID: process.env.PASSKEY_RP_ID,
      authenticator: {
        credentialID: Buffer.from(passkey.credential_id, 'base64'),
        credentialPublicKey: Buffer.from(passkey.public_key, 'base64'),
        counter: passkey.counter
      },
      requireUserVerification: true
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Verification failed', verified: false });
    }

    // Update counter (prevents replay attacks)
    await db.updatePasskeyCounter(
      passkey.id,
      verification.authenticationInfo.newCounter
    );

    // Update last used timestamp
    await db.updatePasskeyLastUsed(passkey.id, new Date());

    // Get user's wallet address
    const user = await db.getUser(userId);

    // Create session token
    const sessionToken = generateSessionToken(userId);

    res.json({
      verified: true,
      sessionToken,
      walletAddress: user.wallet_address
    });
  } catch (error) {
    console.error('Authentication verification error:', error);
    res.status(500).json({ error: 'Verification failed', message: error.message });
  }
});
```

---

## 🔑 Wallet Derivation from Passkey

### Key Derivation Strategy

```javascript
// src/utils/walletDerivation.js
const { hkdf } = require('@noble/hashes/hkdf');
const { sha256 } = require('@noble/hashes/sha256');
const { Keypair } = require('@solana/web3.js');
const { derivePath } = require('ed25519-hd-key');
const nacl = require('tweetnacl');

/**
 * Derives a deterministic Solana wallet from a passkey credential
 *
 * Uses HKDF (HMAC-based Key Derivation Function) to derive a seed
 * from the credential public key, then uses BIP32-like derivation
 * to generate the final Solana keypair.
 *
 * @param {Uint8Array} credentialPublicKey - Raw credential public key
 * @param {string} userId - User identifier for additional entropy
 * @param {number} accountIndex - Account index for multi-wallet support
 * @returns {Keypair} Solana keypair
 */
async function deriveWalletFromPasskey(
  credentialPublicKey,
  userId,
  accountIndex = 0
) {
  // Convert inputs to buffers
  const credentialBuffer = Buffer.from(credentialPublicKey);
  const userIdBuffer = Buffer.from(userId, 'utf8');

  // Step 1: Use HKDF to derive a master seed
  // Input Key Material (IKM): credential public key
  // Salt: user ID (adds entropy and prevents rainbow tables)
  // Info: Application-specific context
  const masterSeed = hkdf(
    sha256,
    credentialBuffer, // IKM
    userIdBuffer, // salt
    Buffer.from('JustTheTip-Passkey-v1', 'utf8'), // info
    64 // output length (64 bytes)
  );

  // Step 2: Derive account-specific seed using BIP32-like path
  // Path: m/44'/501'/<accountIndex>'/0'
  // 44' = BIP44 purpose
  // 501' = Solana coin type
  // accountIndex' = account number
  // 0' = change (external chain)
  const derivationPath = `m/44'/501'/${accountIndex}'/0'`;
  const { key: accountSeed } = derivePath(
    derivationPath,
    Buffer.from(masterSeed).toString('hex')
  );

  // Step 3: Generate Ed25519 keypair from derived seed
  // Take first 32 bytes as seed for nacl
  const seedBytes = accountSeed.slice(0, 32);

  // Generate keypair using nacl (same as Solana's Keypair.fromSeed)
  const keypairNacl = nacl.sign.keyPair.fromSeed(seedBytes);

  // Convert to Solana Keypair
  const secretKey = new Uint8Array(64);
  secretKey.set(keypairNacl.secretKey);
  const keypair = Keypair.fromSecretKey(secretKey);

  return keypair;
}

/**
 * Derives multiple wallets from a single passkey
 * Useful for users who want separate wallets for different purposes
 *
 * @param {Uint8Array} credentialPublicKey
 * @param {string} userId
 * @param {number} count - Number of wallets to derive
 * @returns {Array<{index: number, keypair: Keypair, address: string}>}
 */
async function deriveMultipleWallets(credentialPublicKey, userId, count = 3) {
  const wallets = [];

  for (let i = 0; i < count; i++) {
    const keypair = await deriveWalletFromPasskey(credentialPublicKey, userId, i);
    wallets.push({
      index: i,
      keypair,
      address: keypair.publicKey.toBase58()
    });
  }

  return wallets;
}

/**
 * Verifies that a wallet was derived from a specific passkey
 * Useful for recovery and verification processes
 *
 * @param {Uint8Array} credentialPublicKey
 * @param {string} userId
 * @param {string} expectedAddress - Base58 encoded public key
 * @param {number} maxAccountIndex - Maximum account index to check
 * @returns {Promise<{match: boolean, accountIndex?: number}>}
 */
async function verifyWalletDerivation(
  credentialPublicKey,
  userId,
  expectedAddress,
  maxAccountIndex = 10
) {
  for (let i = 0; i < maxAccountIndex; i++) {
    const keypair = await deriveWalletFromPasskey(credentialPublicKey, userId, i);
    if (keypair.publicKey.toBase58() === expectedAddress) {
      return { match: true, accountIndex: i };
    }
  }

  return { match: false };
}

module.exports = {
  deriveWalletFromPasskey,
  deriveMultipleWallets,
  verifyWalletDerivation
};
```

---

## 🎨 User Interface Design

### Registration Flow

```jsx
// src/components/PasskeyRegistration.jsx
import React, { useState } from 'react';
import { registerPasskey } from '../passkey/passkeyRegistration';

function PasskeyRegistration({ userId, username, platform, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRegister = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check browser support
      if (!window.PublicKeyCredential) {
        throw new Error('Passkeys are not supported in this browser');
      }

      // Check platform authenticator availability
      const available = await window.PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable();

      if (!available) {
        throw new Error(
          'Platform authenticator not available. ' +
          'Please use a device with Touch ID, Face ID, or Windows Hello.'
        );
      }

      // Register passkey
      const result = await registerPasskey(userId, username, platform);

      onSuccess(result);
    } catch (err) {
      console.error('Passkey registration error:', err);
      setError(err.message);
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="passkey-registration">
      <div className="header">
        <h2>🔐 Register with Passkey</h2>
        <p>
          Create your wallet instantly using your device's biometric authentication.
          No passwords needed!
        </p>
      </div>

      <div className="benefits">
        <div className="benefit">
          <span className="icon">👤</span>
          <div>
            <h4>Biometric Security</h4>
            <p>Use Touch ID, Face ID, or Windows Hello</p>
          </div>
        </div>
        <div className="benefit">
          <span className="icon">🚀</span>
          <div>
            <h4>Instant Setup</h4>
            <p>Wallet created in seconds, no forms to fill</p>
          </div>
        </div>
        <div className="benefit">
          <span className="icon">🔒</span>
          <div>
            <h4>Ultra Secure</h4>
            <p>Phishing-resistant, hardware-backed keys</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <span className="icon">❌</span>
          <div>
            <h4>Registration Failed</h4>
            <p>{error}</p>
          </div>
        </div>
      )}

      <button
        onClick={handleRegister}
        disabled={loading}
        className="register-button"
      >
        {loading ? (
          <>
            <span className="spinner"></span>
            Registering...
          </>
        ) : (
          <>
            <span className="icon">🔐</span>
            Register with Passkey
          </>
        )}
      </button>

      <div className="fallback">
        <p>
          Having trouble? <a href="/register/wallet">Use traditional wallet registration</a>
        </p>
      </div>

      <div className="info-box">
        <h4>💡 How it works</h4>
        <ol>
          <li>Click "Register with Passkey"</li>
          <li>Authenticate with your biometric (Face ID, Touch ID, etc.)</li>
          <li>Your wallet is instantly created and secured</li>
          <li>Start tipping immediately!</li>
        </ol>
      </div>
    </div>
  );
}

export default PasskeyRegistration;
```

### Authentication Flow

```jsx
// src/components/PasskeyAuthentication.jsx
import React, { useState } from 'react';
import { authenticateWithPasskey } from '../passkey/passkeyAuthentication';

function PasskeyAuthentication({ userId, platform, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuthenticate = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await authenticateWithPasskey(userId, platform);
      onSuccess(result);
    } catch (err) {
      console.error('Passkey authentication error:', err);
      setError(err.message);
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="passkey-authentication">
      <div className="header">
        <h2>👋 Welcome Back!</h2>
        <p>Sign in securely with your passkey</p>
      </div>

      {error && (
        <div className="error-box">
          <span className="icon">❌</span>
          <p>{error}</p>
        </div>
      )}

      <button
        onClick={handleAuthenticate}
        disabled={loading}
        className="authenticate-button"
      >
        {loading ? (
          <>
            <span className="spinner"></span>
            Authenticating...
          </>
        ) : (
          <>
            <span className="icon">🔐</span>
            Sign in with Passkey
          </>
        )}
      </button>

      <div className="security-note">
        <span className="icon">🔒</span>
        <p>
          Your authentication is secured by your device's biometric system.
          Your private keys never leave your device.
        </p>
      </div>
    </div>
  );
}

export default PasskeyAuthentication;
```

---

## 🔒 Security Considerations

### 1. Key Derivation Security

- **HKDF with strong salt:** User ID provides unique salt per user
- **Application context:** "JustTheTip-Passkey-v1" prevents cross-application attacks
- **BIP32-like derivation:** Industry-standard hierarchical deterministic wallet generation
- **Seed isolation:** Each account index generates independent keys

### 2. Passkey Security

- **User verification required:** Biometric or PIN authentication mandatory
- **Platform authenticators preferred:** Hardware-backed security (Secure Enclave, TPM)
- **Resident keys:** Passkeys stored on device, not server
- **Counter validation:** Prevents replay attacks
- **Origin validation:** Prevents phishing attacks

### 3. Challenge Security

- **Cryptographic randomness:** Challenges generated with crypto.randomBytes()
- **Time-limited:** 5-minute expiration
- **Single-use:** Challenges invalidated after use
- **Secure storage:** Redis or encrypted database

### 4. Session Management

- **Short-lived tokens:** 1-hour session tokens
- **Refresh mechanism:** Seamless reauthentication
- **Secure cookies:** HttpOnly, Secure, SameSite=Strict
- **Token rotation:** New token on each refresh

### 5. Recovery Mechanism

- **Multiple passkeys:** Users can register multiple devices
- **Email recovery:** Fallback to email-based recovery
- **Social recovery:** Recovery through trusted contacts (future)
- **Backup codes:** One-time use backup codes (future)

---

## 📱 Browser Compatibility

### Supported Platforms

| Platform | Browser | Passkey Support | Biometric Options |
|----------|---------|-----------------|-------------------|
| **iOS 16+** | Safari | ✅ Full | Face ID, Touch ID |
| **iOS 16+** | Chrome | ✅ Full | Face ID, Touch ID |
| **Android 9+** | Chrome | ✅ Full | Fingerprint, Face Unlock |
| **macOS** | Safari 16+ | ✅ Full | Touch ID, Face ID |
| **macOS** | Chrome | ✅ Full | Touch ID |
| **Windows 10+** | Chrome | ✅ Full | Windows Hello |
| **Windows 10+** | Edge | ✅ Full | Windows Hello |
| **Linux** | Chrome | ⚠️ Partial | Security Keys only |

### Fallback Strategy

```javascript
// src/utils/passkeySupport.js

async function checkPasskeySupport() {
  const support = {
    webauthn: false,
    platformAuthenticator: false,
    conditionalMediation: false
  };

  // Check WebAuthn support
  if (window.PublicKeyCredential) {
    support.webauthn = true;

    // Check platform authenticator
    try {
      support.platformAuthenticator = await window.PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      console.error('Platform authenticator check failed:', error);
    }

    // Check conditional mediation (autofill)
    if (window.PublicKeyCredential.isConditionalMediationAvailable) {
      try {
        support.conditionalMediation = await window.PublicKeyCredential
          .isConditionalMediationAvailable();
      } catch (error) {
        console.error('Conditional mediation check failed:', error);
      }
    }
  }

  return support;
}

async function getRecommendedRegistrationMethod() {
  const support = await checkPasskeySupport();

  if (support.platformAuthenticator) {
    return {
      method: 'passkey',
      message: 'Use your device\'s biometric authentication for instant setup'
    };
  }

  if (support.webauthn) {
    return {
      method: 'security-key',
      message: 'Use a security key (YubiKey, etc.) for enhanced security'
    };
  }

  return {
    method: 'wallet-signature',
    message: 'Use traditional wallet signature for registration'
  };
}

module.exports = {
  checkPasskeySupport,
  getRecommendedRegistrationMethod
};
```

---

## 🧪 Testing Strategy

### Unit Tests

```javascript
// tests/passkey/walletDerivation.test.js
const { deriveWalletFromPasskey, verifyWalletDerivation } = require('../../src/utils/walletDerivation');

describe('Wallet Derivation', () => {
  const mockCredentialPublicKey = Buffer.from('mock-public-key-data');
  const mockUserId = 'user-12345';

  test('should derive deterministic wallet from passkey', async () => {
    const wallet1 = await deriveWalletFromPasskey(mockCredentialPublicKey, mockUserId);
    const wallet2 = await deriveWalletFromPasskey(mockCredentialPublicKey, mockUserId);

    // Same inputs should produce same wallet
    expect(wallet1.publicKey.toBase58()).toBe(wallet2.publicKey.toBase58());
  });

  test('should derive different wallets for different account indices', async () => {
    const wallet0 = await deriveWalletFromPasskey(mockCredentialPublicKey, mockUserId, 0);
    const wallet1 = await deriveWalletFromPasskey(mockCredentialPublicKey, mockUserId, 1);

    // Different account indices should produce different wallets
    expect(wallet0.publicKey.toBase58()).not.toBe(wallet1.publicKey.toBase58());
  });

  test('should verify wallet derivation', async () => {
    const wallet = await deriveWalletFromPasskey(mockCredentialPublicKey, mockUserId, 0);
    const result = await verifyWalletDerivation(
      mockCredentialPublicKey,
      mockUserId,
      wallet.publicKey.toBase58(),
      5
    );

    expect(result.match).toBe(true);
    expect(result.accountIndex).toBe(0);
  });
});
```

### Integration Tests

```javascript
// tests/passkey/registration.integration.test.js
const request = require('supertest');
const app = require('../../api/server');

describe('Passkey Registration Flow', () => {
  test('should start registration and return options', async () => {
    const response = await request(app)
      .post('/api/passkey/register/start')
      .send({
        userId: 'test-user-123',
        username: 'testuser',
        platform: 'discord'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('challenge');
    expect(response.body).toHaveProperty('rp');
    expect(response.body.rp.name).toBe('JustTheTip');
  });

  test('should reject registration without required fields', async () => {
    const response = await request(app)
      .post('/api/passkey/register/start')
      .send({ userId: 'test-user-123' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing required fields');
  });
});
```

---

## 📈 Performance Considerations

### Key Derivation Performance

- **HKDF computation:** ~1-2ms per derivation
- **BIP32 derivation:** ~5-10ms per derivation
- **Total wallet generation:** ~10-15ms
- **Caching strategy:** Cache derived wallets for active sessions

### WebAuthn Performance

- **Challenge generation:** ~1ms
- **Biometric prompt:** User-dependent (1-5 seconds)
- **Verification:** ~10-20ms
- **Total registration:** ~2-10 seconds (mostly user interaction)

### Database Performance

- **Passkey lookup:** Indexed on credential_id (~1ms)
- **Challenge storage:** Redis preferred (~1ms)
- **Session storage:** Redis preferred (~1ms)

---

## 📝 Environment Variables

```bash
# Passkey Configuration
PASSKEY_RP_NAME="JustTheTip"
PASSKEY_RP_ID=yourapp.com
PASSKEY_ORIGIN=https://yourapp.com

# Token Encryption
TOKEN_ENCRYPTION_KEY=your_32_byte_encryption_key

# Challenge Storage (optional, falls back to database)
REDIS_URL=redis://localhost:6379
CHALLENGE_TTL_SECONDS=300

# Session Configuration
SESSION_TOKEN_SECRET=your_session_secret
SESSION_TOKEN_EXPIRY=3600
```

---

## 📅 Implementation Timeline

### Week 1: Backend Implementation
- [ ] Database schema for passkeys
- [ ] WebAuthn server integration
- [ ] Challenge generation/validation
- [ ] Registration endpoints
- [ ] Authentication endpoints

### Week 2: Wallet Derivation
- [ ] HKDF implementation
- [ ] BIP32-like derivation
- [ ] Multi-wallet support
- [ ] Verification mechanism
- [ ] Unit tests

### Week 3: Frontend Implementation
- [ ] Registration UI component
- [ ] Authentication UI component
- [ ] Browser compatibility checks
- [ ] Error handling
- [ ] Loading states

### Week 4: Integration & Testing
- [ ] Discord bot integration
- [ ] Kick bot integration
- [ ] End-to-end testing
- [ ] Browser compatibility testing
- [ ] Security audit

---

## 🤝 Contributing

See `CONTRIBUTING.md` for contribution guidelines.

---

## 📚 References

- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [FIDO2 Overview](https://fidoalliance.org/fido2/)
- [SimpleWebAuthn Library](https://simplewebauthn.dev/)
- [HKDF (RFC 5869)](https://tools.ietf.org/html/rfc5869)
- [BIP32: Hierarchical Deterministic Wallets](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [BIP44: Multi-Account Hierarchy](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-11
**Maintainer:** Claude Code
