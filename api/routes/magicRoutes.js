/**
 * JustTheTip - Magic Link Routes
 * Handles Magic wallet integration and authentication
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 * 
 * This file is part of JustTheTip.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * See LICENSE file in the project root for full license information.
 */

const express = require('express');
const { Magic } = require('@magic-sdk/admin');
const { SolanaExtension } = require('@magic-ext/solana');
const database = require('../../db/database');
const crypto = require('crypto');

const router = express.Router();

// Initialize Magic Admin SDK with secret from environment
const magic = new Magic(process.env.MAGIC_SECRET_KEY, {
    extensions: [new SolanaExtension()]
});

/**
 * POST /api/magic/auth
 * Authenticate user with Magic DID token and create/update user record
 */
router.post('/auth', async (req, res) => {
    try {
        const { didToken } = req.body;

        if (!didToken) {
            return res.status(400).json({ error: 'DID token required' });
        }

        // Validate the DID token with Magic
        const metadata = await magic.users.getMetadataByToken(didToken);
        
        if (!metadata || !metadata.issuer) {
            return res.status(401).json({ error: 'Invalid DID token' });
        }

        const { email, publicAddress, issuer } = metadata;

        // Check if user exists
        const user = database.getUserByEmail(email);

        if (user) {
            // Update existing user
            database.updateUser(user.discord_id, {
                magic_issuer: issuer,
                wallet_address: publicAddress,
                auth_method: 'magic',
                email: email,
                last_login: new Date().toISOString()
            });
        } else {
            // Create registration token for Discord linking
            const registrationToken = crypto.randomBytes(32).toString('hex');
            const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

            // Store pending registration
            const pendingUser = {
                email,
                wallet_address: publicAddress,
                magic_issuer: issuer,
                registration_token: registrationToken,
                token_expiry: tokenExpiry.toISOString(),
                auth_method: 'magic'
            };

            database.storePendingMagicRegistration(pendingUser);

            return res.json({
                success: true,
                walletAddress: publicAddress,
                email: email,
                registrationToken: registrationToken,
                requiresDiscordLink: true,
                message: 'Magic wallet created successfully. Please link your Discord account.'
            });
        }

        return res.json({
            success: true,
            walletAddress: publicAddress,
            email: email,
            user: {
                discord_id: user.discord_id,
                username: user.username
            }
        });

    } catch (error) {
        console.error('Magic auth error:', error);
        return res.status(500).json({ 
            error: 'Authentication failed',
            details: error.message 
        });
    }
});

/**
 * POST /api/magic/link-discord
 * Link Magic wallet to Discord account using registration token
 */
router.post('/link-discord', async (req, res) => {
    try {
        const { registrationToken, discordId, username } = req.body;

        if (!registrationToken || !discordId) {
            return res.status(400).json({ error: 'Registration token and Discord ID required' });
        }

        // Get pending registration
        const pendingUser = database.getPendingMagicRegistration(registrationToken);

        if (!pendingUser) {
            return res.status(404).json({ error: 'Invalid or expired registration token' });
        }

        // Check if token is expired
        if (new Date(pendingUser.token_expiry) < new Date()) {
            database.deletePendingMagicRegistration(registrationToken);
            return res.status(410).json({ error: 'Registration token expired' });
        }

        // Check if Discord account already has a wallet
        const existingUser = database.getUserByDiscordId(discordId);
        if (existingUser && existingUser.wallet_address) {
            return res.status(409).json({ 
                error: 'Discord account already has a registered wallet',
                walletAddress: existingUser.wallet_address
            });
        }

        // Create or update user
        if (existingUser) {
            database.updateUser(discordId, {
                wallet_address: pendingUser.wallet_address,
                magic_issuer: pendingUser.magic_issuer,
                email: pendingUser.email,
                auth_method: 'magic',
                verified: true,
                verification_date: new Date().toISOString()
            });
        } else {
            database.createUser({
                discord_id: discordId,
                username: username,
                wallet_address: pendingUser.wallet_address,
                magic_issuer: pendingUser.magic_issuer,
                email: pendingUser.email,
                auth_method: 'magic',
                verified: true,
                verification_date: new Date().toISOString()
            });
        }

        // Clean up pending registration
        database.deletePendingMagicRegistration(registrationToken);

        return res.json({
            success: true,
            message: 'Discord account linked successfully',
            walletAddress: pendingUser.wallet_address,
            email: pendingUser.email
        });

    } catch (error) {
        console.error('Discord link error:', error);
        return res.status(500).json({ 
            error: 'Failed to link Discord account',
            details: error.message 
        });
    }
});

/**
 * GET /api/magic/user/:issuer
 * Get user information by Magic issuer ID
 */
router.get('/user/:issuer', async (req, res) => {
    try {
        const { issuer } = req.params;

        const user = database.getUserByMagicIssuer(issuer);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            success: true,
            user: {
                discord_id: user.discord_id,
                username: user.username,
                wallet_address: user.wallet_address,
                email: user.email,
                verified: user.verified,
                auth_method: user.auth_method
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({ 
            error: 'Failed to get user information',
            details: error.message 
        });
    }
});

/**
 * POST /api/magic/logout
 * Logout user (invalidate Magic session)
 */
router.post('/logout', async (req, res) => {
    try {
        const { issuer } = req.body;

        if (!issuer) {
            return res.status(400).json({ error: 'Issuer required' });
        }

        // Logout from Magic
        await magic.users.logoutByIssuer(issuer);

        return res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ 
            error: 'Failed to logout',
            details: error.message 
        });
    }
});

module.exports = router;
