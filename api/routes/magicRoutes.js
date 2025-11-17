const express = require('express');
const { Magic } = require('@magic-sdk/admin');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Rate limiter for registration endpoint to prevent abuse
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 registration attempts per windowMs
  message: { 
    error: 'Too many registration attempts from this IP, please try again after 15 minutes.',
    retry_after: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Initialize Magic Admin SDK with secret from GitHub secrets
const magic = new Magic(process.env.MAGIC_SECRET_KEY);

// Utility function to generate registration token (Discord-based)
function generateRegistrationToken(discordId, discordUsername) {
  const payload = {
    discordId,
    discordUsername,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex')
  };
  
  const secret = process.env.REGISTRATION_TOKEN_SECRET || 'default-secret-change-me';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  
  return Buffer.from(JSON.stringify({
    ...payload,
    signature: hmac.digest('hex')
  })).toString('base64url');
}

// Utility function to verify registration token
function verifyRegistrationToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString());
    const { signature, ...data } = payload;
    
    // Check if token is expired (24 hours)
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      return { valid: false, error: 'Token expired' };
    }
    
    // Verify signature
    const secret = process.env.REGISTRATION_TOKEN_SECRET || 'default-secret-change-me';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(data));
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' };
    }
    
    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: 'Invalid token format' };
  }
}

// Route: Serve Magic registration page with injected environment variables
router.get('/register-magic.html', (req, res) => {
  try {
    const htmlPath = path.join(__dirname, '../public/register-magic.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Inject environment variables by replacing the empty string literals
    html = html.replace(
      "const MAGIC_PUBLISHABLE_KEY = '';",
      `const MAGIC_PUBLISHABLE_KEY = '${process.env.MAGIC_PUBLISHABLE_KEY || ''}';`
    );
    html = html.replace(
      "const MAGIC_SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';",
      `const MAGIC_SOLANA_RPC_URL = '${process.env.MAGIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'}';`
    );
    html = html.replace(
      "const MAGIC_SOLANA_NETWORK = 'mainnet-beta';",
      `const MAGIC_SOLANA_NETWORK = '${process.env.MAGIC_SOLANA_NETWORK || 'mainnet-beta'}';`
    );
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error serving Magic registration page:', error);
    res.status(500).json({ error: 'Failed to load registration page' });
  }
});

// Route: Verify Magic DID token and complete registration
router.post('/register', registrationLimiter, async (req, res) => {
  try {
    const { didToken, registrationToken } = req.body;
    
    if (!didToken || !registrationToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify registration token
    const tokenVerification = verifyRegistrationToken(registrationToken);
    if (!tokenVerification.valid) {
      return res.status(400).json({ error: tokenVerification.error });
    }
    
    const { discordId, discordUsername } = tokenVerification.data;
    
    // Verify Magic DID token
    const magicUserMetadata = await magic.users.getMetadataByToken(didToken);
    
    if (!magicUserMetadata) {
      return res.status(400).json({ error: 'Invalid Magic authentication' });
    }
    
    // Verify the email matches the Discord-based pattern
    const expectedEmail = `${discordId}@discord.justthetip.bot`;
    if (magicUserMetadata.email !== expectedEmail) {
      return res.status(400).json({ error: 'Discord authentication mismatch' });
    }
    
    // Get Solana wallet address from Magic
    const walletInfo = await magic.solana.getWallet({ userMetadata: magicUserMetadata });
    const walletAddress = walletInfo.address;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Failed to retrieve wallet address' });
    }
    
    // TODO: Store user registration in database
    // This should integrate with your existing user database schema
    console.log('Magic wallet registration:', {
      discordId,
      discordUsername,
      walletAddress,
      magicUserId: magicUserMetadata.issuer,
      authMethod: 'magic'
    });
    
    res.json({
      success: true,
      message: 'Wallet registered successfully!',
      walletAddress,
      discordUsername
    });
    
  } catch (error) {
    console.error('Magic registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      details: error.message 
    });
  }
});

// Route: Get Magic wallet info for existing user
router.get('/wallet/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    
    // TODO: Query database for Magic user by Discord ID
    // This should integrate with your existing user database
    
    res.json({
      success: true,
      message: 'Feature coming soon - database integration needed'
    });
    
  } catch (error) {
    console.error('Magic wallet lookup error:', error);
    res.status(500).json({ error: 'Wallet lookup failed' });
  }
});

// Route: Health check
router.get('/health', (req, res) => {
  const hasPublishableKey = !!(process.env.MAGIC_PUBLISHABLE_KEY);
  const hasSecretKey = !!(process.env.MAGIC_SECRET_KEY);
  const hasRegistrationTokenSecret = !!(process.env.REGISTRATION_TOKEN_SECRET);
  const hasSolanaNetwork = !!(process.env.MAGIC_SOLANA_NETWORK);
  const hasSolanaRpcUrl = !!(process.env.MAGIC_SOLANA_RPC_URL);
  
  const hasRequiredEnvVars = hasPublishableKey && hasSecretKey;
  const isFullyConfigured = hasRequiredEnvVars && hasRegistrationTokenSecret;
  
  res.json({
    status: 'ok',
    magic_configured: hasRequiredEnvVars,
    fully_configured: isFullyConfigured,
    configuration: {
      publishable_key: hasPublishableKey,
      secret_key: hasSecretKey,
      registration_token_secret: hasRegistrationTokenSecret,
      solana_network: hasSolanaNetwork,
      solana_rpc_url: hasSolanaRpcUrl
    },
    deployment: {
      recommended_url: 'https://justthetip.vercel.app',
      frontend_url: 'https://jmenichole.github.io/Justthetip',
      deprecated_urls: [
        'api.mischief-manager.com (no longer maintained)'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;