/**
 * Wallet Registration Routes
 * Handles wallet verification and registration for Discord users
 */

const express = require('express');
const router = express.Router();
const { PublicKey } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const database = require('../db/database');
const sqlite = require('../db/db');
const { walletRegistrationLimiter } = require('./middleware/rateLimiting');

// In-memory nonce storage (for registration flow)
const registrationNoncesMemory = new Map();

// Cleanup expired nonces every 5 minutes
setInterval(() => {
    const now = Date.now();
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    for (const [nonce, data] of registrationNoncesMemory.entries()) {
        if (now - data.createdAt > FIFTEEN_MINUTES) {
            registrationNoncesMemory.delete(nonce);
        }
    }
}, 5 * 60 * 1000);

/**
 * Check and store nonce to prevent replay attacks
 */
async function checkAndStoreNonce(nonce, discordUserId, _discordUsername) {
    const data = registrationNoncesMemory.get(nonce);
    
    if (!data) {
        return { valid: false, used: false };
    }
    
    if (data.used) {
        return { valid: false, used: true };
    }
    
    if (data.discordUserId !== discordUserId) {
        return { valid: false, used: false };
    }
    
    const now = Date.now();
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    
    if (now - data.createdAt > FIFTEEN_MINUTES) {
        registrationNoncesMemory.delete(nonce);
        return { valid: false, used: false };
    }
    
    data.used = true;
    registrationNoncesMemory.set(nonce, data);
    
    return { valid: true, used: false };
}

/**
 * POST /api/registerwallet/verify
 * Verify wallet signature and register wallet for Discord user
 */
router.post('/registerwallet/verify', walletRegistrationLimiter, async (req, res) => {
    try {
        const {
            message,
            publicKey,
            signature,
            discordUserId,
            discordUsername,
            nonce
        } = req.body;

        // Validate required fields
        if (!message || !publicKey || !signature || !discordUserId || !nonce) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        // Validate field types to prevent injection
        if (typeof message !== 'string' || typeof publicKey !== 'string' ||
            typeof signature !== 'string' || typeof discordUserId !== 'string' ||
            typeof nonce !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Invalid field types'
            });
        }
        
        // Validate Discord user ID format (should be numeric string)
        if (!/^\d+$/.test(discordUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Discord user ID format'
            });
        }
        
        // Validate nonce format (UUID v4)
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid nonce format'
            });
        }

        // Check and store nonce
        const nonceCheck = await checkAndStoreNonce(nonce, discordUserId, discordUsername);
        if (!nonceCheck.valid) {
            if (nonceCheck.used) {
                return res.status(400).json({
                    success: false,
                    error: 'Nonce already used. Please request a new registration link.'
                });
            }
            return res.status(400).json({
                success: false,
                error: 'Invalid nonce. Please request a new registration link.'
            });
        }

        // Parse and validate the message
        let messageData;
        try {
            messageData = JSON.parse(message);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid message format'
            });
        }

        // Verify message timestamp (not older than 10 minutes)
        const messageTime = new Date(messageData.timestamp).getTime();
        const now = Date.now();
        const TEN_MINUTES = 10 * 60 * 1000;
        
        if (now - messageTime > TEN_MINUTES) {
            return res.status(400).json({
                success: false,
                error: 'Registration link expired. Please request a new one.'
            });
        }

        // Verify the signature
        try {
            const messageBytes = new TextEncoder().encode(message);
            let signatureBytes;
            
            // Try to decode signature - support both base64 and base58 formats
            try {
                // First try base64 (standard format)
                signatureBytes = Buffer.from(signature, 'base64');
                
                // Validate the decoded signature length (should be 64 bytes for ed25519)
                if (signatureBytes.length !== 64) {
                    throw new Error('Invalid base64 signature length');
                }
            } catch (base64Error) {
                // If base64 fails, try base58 (common in Solana wallets)
                try {
                    signatureBytes = bs58.decode(signature);
                
                    if (signatureBytes.length !== 64) {
                        throw new Error('Invalid base58 signature length');
                    }
                } catch (base58Error) {
                    console.error('Signature decode error:', { base64Error, base58Error });
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid signature format. Please provide signature in base64 or base58 format.'
                    });
                }
            }
            
            const publicKeyBytes = new PublicKey(publicKey).toBytes();
            
            const isValid = nacl.sign.detached.verify(
                messageBytes,
                signatureBytes,
                publicKeyBytes
            );

            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid signature'
                });
            }
        } catch (error) {
            console.error('Signature verification error:', error);
            return res.status(401).json({
                success: false,
                error: 'Signature verification failed'
            });
        }

        // Check if wallet already registered to a different user
        const existingWallet = sqlite.getUserWallet(discordUserId);
        if (existingWallet && existingWallet !== String(publicKey)) {
            // Different wallet for same user - update it
            console.log(`Updating wallet for user ${discordUserId}: ${existingWallet} -> ${publicKey}`);
        }

        // Store wallet registration in SQLite
        const registration = {
            discordUserId: String(discordUserId),
            discordUsername: String(discordUsername || 'Unknown'),
            walletAddress: String(publicKey),
            verifiedAt: new Date().toISOString(),
            nonce: String(nonce),
            messageData
        };

        // Save to SQLite database
        await database.saveUserWallet(String(discordUserId), String(publicKey));
        console.log(`✅ Wallet registered: ${discordUserId} -> ${publicKey}`);
        
        res.json({
            success: true,
            message: 'Wallet registered successfully',
            walletAddress: publicKey
        });

    } catch (error) {
        console.error('Wallet registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /api/registerwallet/status/:discordUserId
 * Get wallet registration status for a Discord user
 */
router.get('/registerwallet/status/:discordUserId', walletRegistrationLimiter, async (req, res) => {
    try {
        const { discordUserId } = req.params;
        
        // Validate Discord user ID format
        if (!/^\d+$/.test(discordUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Discord user ID format'
            });
        }

        const walletAddress = await database.getUserWallet(String(discordUserId));

        if (!walletAddress) {
            return res.json({
                success: true,
                registered: false
            });
        }

        res.json({
            success: true,
            registered: true,
            walletAddress: walletAddress
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Export router and nonce storage for use in server.js
module.exports = router;
module.exports.registrationNoncesMemory = registrationNoncesMemory;
