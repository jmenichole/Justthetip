#!/bin/bash

# JustTheTip Passkey Wallet Setup Script
# Author: 4eckd
# Description: Setup passkey-based wallet infrastructure

set -e

echo "🔐 JustTheTip Passkey Wallet Setup"
echo "=================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js: $(node -v)${NC}"

# Install passkey dependencies
echo ""
echo "📦 Installing passkey dependencies..."

npm install --save \
    @simplewebauthn/server \
    @simplewebauthn/browser \
    @github/webauthn-json \
    uuid

npm install --save-dev \
    @types/webauthn

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Create directory structure
echo ""
echo "📁 Creating wallet directory structure..."

mkdir -p wallet/{components,hooks,services,utils}
mkdir -p wallet/components/{registration,authentication,dashboard}
mkdir -p api/wallet
mkdir -p api/wallet/routes

echo -e "${GREEN}✓ Directories created${NC}"

# Create passkey service
echo ""
echo "📝 Creating passkey service files..."

cat > wallet/services/passkeyService.js << 'EOF'
/**
 * Passkey Service for JustTheTip Wallet
 * Author: 4eckd
 */

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const { Keypair } = require('@solana/web3.js');

class PasskeyService {
  constructor(config) {
    this.rpName = config.rpName || 'JustTheTip Wallet';
    this.rpID = config.rpID || 'justthetip.app';
    this.origin = config.origin || 'https://justthetip.app';
    this.timeout = config.timeout || 300000; // 5 minutes
  }

  /**
   * Generate registration options for new passkey
   */
  async generateRegistrationOptions(userId, username) {
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: userId,
      userName: username,
      timeout: this.timeout,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: true,
        userVerification: 'required'
      },
      supportedAlgorithmIDs: [-7, -257] // ES256, RS256
    });

    return options;
  }

  /**
   * Verify registration response and derive Solana wallet
   */
  async verifyRegistration(attestation, expectedChallenge) {
    const verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID
    });

    if (!verification.verified) {
      throw new Error('Passkey verification failed');
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    // Derive Solana keypair from credential ID
    const seed = Buffer.from(credentialID).slice(0, 32);
    const keypair = Keypair.fromSeed(seed);
    const walletAddress = keypair.publicKey.toString();

    return {
      credentialID,
      credentialPublicKey,
      counter,
      walletAddress
    };
  }

  /**
   * Generate authentication options
   */
  async generateAuthenticationOptions(allowCredentials = []) {
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      timeout: this.timeout,
      allowCredentials,
      userVerification: 'required'
    });

    return options;
  }

  /**
   * Verify authentication response
   */
  async verifyAuthentication(authentication, expectedChallenge, authenticator) {
    const verification = await verifyAuthenticationResponse({
      response: authentication,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      authenticator: {
        credentialID: Buffer.from(authenticator.credentialID, 'base64'),
        credentialPublicKey: Buffer.from(authenticator.credentialPublicKey, 'base64'),
        counter: authenticator.counter
      }
    });

    return verification;
  }

  /**
   * Derive Solana keypair from credential ID
   */
  deriveKeypair(credentialID) {
    const seed = Buffer.from(credentialID, 'base64').slice(0, 32);
    return Keypair.fromSeed(seed);
  }
}

module.exports = PasskeyService;
EOF

echo -e "${GREEN}✓ Created wallet/services/passkeyService.js${NC}"

# Create API routes
cat > api/wallet/passkeyRoutes.js << 'EOF'
/**
 * Passkey API Routes
 * Author: 4eckd
 */

const express = require('express');
const router = express.Router();
const PasskeyService = require('../../wallet/services/passkeyService');
const { v4: uuidv4 } = require('uuid');

const passkeyService = new PasskeyService({
  rpName: process.env.PASSKEY_RP_NAME || 'JustTheTip Wallet',
  rpID: process.env.PASSKEY_RP_ID || 'justthetip.app',
  origin: process.env.PASSKEY_ORIGIN || 'https://justthetip.app'
});

// In-memory challenge storage (use Redis in production)
const challenges = new Map();

/**
 * POST /api/wallet/passkey/register/begin
 * Start passkey registration
 */
router.post('/register/begin', async (req, res) => {
  try {
    const { userId, username } = req.body;

    if (!userId || !username) {
      return res.status(400).json({ error: 'userId and username required' });
    }

    const options = await passkeyService.generateRegistrationOptions(userId, username);

    // Store challenge
    challenges.set(userId, {
      challenge: options.challenge,
      type: 'registration',
      expiresAt: Date.now() + 300000 // 5 minutes
    });

    res.json(options);
  } catch (error) {
    console.error('Registration begin error:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

/**
 * POST /api/wallet/passkey/register/complete
 * Complete passkey registration
 */
router.post('/register/complete', async (req, res) => {
  try {
    const { userId, attestation } = req.body;

    // Retrieve challenge
    const challengeData = challenges.get(userId);
    if (!challengeData || challengeData.type !== 'registration') {
      return res.status(400).json({ error: 'Invalid or expired challenge' });
    }

    if (Date.now() > challengeData.expiresAt) {
      challenges.delete(userId);
      return res.status(400).json({ error: 'Challenge expired' });
    }

    // Verify registration
    const result = await passkeyService.verifyRegistration(
      attestation,
      challengeData.challenge
    );

    // Clear challenge
    challenges.delete(userId);

    // TODO: Store credential in database
    // await db.storePasskeyCredential({ userId, ...result });

    res.json({
      verified: true,
      solanaAddress: result.walletAddress
    });
  } catch (error) {
    console.error('Registration complete error:', error);
    res.status(500).json({ error: 'Registration verification failed' });
  }
});

/**
 * POST /api/wallet/passkey/auth/begin
 * Start authentication
 */
router.post('/auth/begin', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // TODO: Fetch user's credentials from database
    const allowCredentials = []; // Array of { id, type, transports }

    const options = await passkeyService.generateAuthenticationOptions(allowCredentials);

    // Store challenge
    challenges.set(userId, {
      challenge: options.challenge,
      type: 'authentication',
      expiresAt: Date.now() + 300000
    });

    res.json(options);
  } catch (error) {
    console.error('Auth begin error:', error);
    res.status(500).json({ error: 'Failed to generate auth options' });
  }
});

/**
 * POST /api/wallet/passkey/sign
 * Sign transaction with passkey
 */
router.post('/sign', async (req, res) => {
  try {
    const { userId, authentication, transaction } = req.body;

    // Retrieve challenge
    const challengeData = challenges.get(userId);
    if (!challengeData || challengeData.type !== 'authentication') {
      return res.status(400).json({ error: 'Invalid or expired challenge' });
    }

    // TODO: Fetch user's credential from database
    const authenticator = {
      credentialID: 'placeholder',
      credentialPublicKey: 'placeholder',
      counter: 0
    };

    // Verify authentication
    const verification = await passkeyService.verifyAuthentication(
      authentication,
      challengeData.challenge,
      authenticator
    );

    if (!verification.verified) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Clear challenge
    challenges.delete(userId);

    // TODO: Sign and submit transaction
    // const keypair = passkeyService.deriveKeypair(authenticator.credentialID);
    // const signature = await signAndSendTransaction(transaction, keypair);

    res.json({
      success: true,
      signature: 'placeholder_signature'
    });
  } catch (error) {
    console.error('Sign error:', error);
    res.status(500).json({ error: 'Transaction signing failed' });
  }
});

module.exports = router;
EOF

echo -e "${GREEN}✓ Created api/wallet/passkeyRoutes.js${NC}"

# Create frontend registration component
cat > wallet/components/registration/PasskeyRegistration.jsx << 'EOF'
/**
 * Passkey Registration Component
 * Author: 4eckd
 */

import React, { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';

export function PasskeyRegistration({ userId, username, onSuccess }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const handleRegister = async () => {
    setStatus('registering');
    setError(null);

    try {
      // 1. Get registration options from server
      const optionsResponse = await fetch('/api/wallet/passkey/register/begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username })
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to get registration options');
      }

      const options = await optionsResponse.json();

      // 2. Trigger passkey creation
      const attestation = await startRegistration(options);

      // 3. Send attestation to server
      const verificationResponse = await fetch('/api/wallet/passkey/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, attestation })
      });

      if (!verificationResponse.ok) {
        throw new Error('Registration verification failed');
      }

      const result = await verificationResponse.json();

      setStatus('success');
      onSuccess(result);
    } catch (err) {
      setStatus('error');
      setError(err.message);
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="passkey-registration">
      <h2>Create Your JustTheTip Wallet</h2>
      <p>Use your device biometric authentication for secure access.</p>

      {status === 'idle' && (
        <button onClick={handleRegister} className="btn-primary">
          🔐 Create Wallet
        </button>
      )}

      {status === 'registering' && (
        <div className="loading">Creating wallet...</div>
      )}

      {status === 'success' && (
        <div className="success">✅ Wallet created successfully!</div>
      )}

      {status === 'error' && (
        <div className="error">❌ {error}</div>
      )}
    </div>
  );
}
EOF

echo -e "${GREEN}✓ Created wallet/components/registration/PasskeyRegistration.jsx${NC}"

# Add to .env.example
echo ""
echo "📝 Adding passkey variables to .env.example..."

if [ -f ".env.example" ]; then
    cat >> .env.example << 'EOF'

# Passkey Wallet Configuration
PASSKEY_RP_NAME=JustTheTip Wallet
PASSKEY_RP_ID=justthetip.app
PASSKEY_ORIGIN=https://justthetip.app
WEBAUTHN_TIMEOUT=300000
PASSKEY_CHALLENGE_EXPIRY=300
EOF
    echo -e "${GREEN}✓ Updated .env.example${NC}"
fi

echo ""
echo "✅ Passkey wallet setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with passkey configuration"
echo "2. Implement database storage for credentials"
echo "3. Deploy to HTTPS-enabled server (required for WebAuthn)"
echo "4. Test registration in supported browser (Chrome, Safari, Edge)"
echo ""
echo -e "${GREEN}🔐 Your passkey wallet is ready!${NC}"
