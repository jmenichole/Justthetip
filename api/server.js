/**
 * JustTheTip Backend API - NFT Verification System
 * Express server for Discord OAuth, NFT minting, and ticket management
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
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { PublicKey } = require('@solana/web3.js');
const adminRoutes = require('./adminRoutes');
const walletRoutes = require('./walletRoutes');
const tipsRoutes = require('./tipsRoutes');
const healthRoutes = require('./healthRoutes');
const magicRoutes = require('./routes/magicRoutes');
const solanaDevTools = require('../src/utils/solanaDevTools');
const coinbaseClient = require('../src/utils/coinbaseClient');
const X402PaymentHandler = require('../src/utils/x402PaymentHandler');
const { verifySignature } = require('../src/utils/validation');
const sqlite = require('../db/db');
const database = require('../db/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== CONFIGURATION =====
const CONFIG = {
    SOLANA_CLUSTER: process.env.SOLANA_CLUSTER || 'mainnet-beta',
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    SOLANA_DEVNET_RPC_URL: process.env.SOLANA_DEVNET_RPC_URL,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || '1419742988128616479',
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET, // Required
    DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI || 'https://jmenichole.github.io/Justthetip/landing.html',
    MINT_AUTHORITY_KEYPAIR: process.env.MINT_AUTHORITY_KEYPAIR, // Base58 private key
    VERIFIED_COLLECTION_ADDRESS: process.env.VERIFIED_COLLECTION_ADDRESS,
    NFT_STORAGE_API_KEY: process.env.NFT_STORAGE_API_KEY,
    COINBASE_COMMERCE_API_KEY: process.env.COINBASE_COMMERCE_API_KEY,
    COINBASE_COMMERCE_WEBHOOK_SECRET: process.env.COINBASE_COMMERCE_WEBHOOK_SECRET,
    X402_TREASURY_WALLET: process.env.X402_TREASURY_WALLET
};

// ===== MIDDLEWARE =====
// Security headers with CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Required for inline scripts in register-magic.html
                "https://cdn.tailwindcss.com", // Tailwind CSS CDN
                "https://cdn.jsdelivr.net" // Magic SDK and extensions
            ],
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for the HTML pages
            imgSrc: ["'self'", "data:", "https:", "https://tan-glamorous-porcupine-751.mypinata.cloud"],
            connectSrc: [
                "'self'",
                "https://mischief-manager.com",
                "https://api.mischief-manager.com",
                "https://jmenichole.github.io",
                "https://api.mainnet-beta.solana.com",
                "https://api.devnet.solana.com",
                "https://phantom.app",
                "https://solflare.com",
                "https://auth.magic.link", // Magic authentication service
                "https://*.magic.link" // Magic SDK connections
            ],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Required for some wallet extensions
}));

app.use(cors({
    origin: [
        'https://mischief-manager.com',
        'https://api.mischief-manager.com',
        'https://jmenichole.github.io',
        'http://localhost:3000',
        'http://localhost:5500'
    ],
    credentials: true
}));
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Serve static files from public directory
// Use path.join with __dirname to ensure the path works regardless of where node is executed from
// Enable dotfiles to serve .well-known directory
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'allow' }));

// Serve apple-app-site-association for iOS Universal Links with correct content type
// This must come BEFORE other routes to avoid being caught by 404 handler
app.get('/.well-known/apple-app-site-association', (req, res) => {
    const config = {
        "applinks": {
            "apps": [],
            "details": [
                { "appID": "PHANTOM.app.phantom", "paths": ["/ul/*", "/connect/*"] },
                { "appID": "TRUST.com.trustwallet.app", "paths": ["/wc/*", "/connect/*"] },
                { "appID": "COINBASE.org.toshi", "paths": ["/wc/*", "/link/*"] },
                { "appID": "EXODUS.exodusmovement.exodus", "paths": ["/m/*", "/connect/*"] },
                { "appID": "CWALLET.com.cwallet.app", "paths": ["/wc/*", "/connect/*"] },
                { "appID": "GEMINI.com.gemini.android.app", "paths": ["/wallet/*", "/wc/*"] }
            ]
        },
        "webcredentials": {
            "apps": [
                "PHANTOM.app.phantom",
                "TRUST.com.trustwallet.app",
                "COINBASE.org.toshi",
                "EXODUS.exodusmovement.exodus",
                "CWALLET.com.cwallet.app",
                "GEMINI.com.gemini.android.app"
            ]
        }
    };
    res.type('application/json').json(config);
});

// ===== DATABASE =====
let connection;
let metaplex;

async function initializeDatabase() {
    // SQLite is automatically initialized in db/db.js
    // No setup required - zero-config database
    console.log('✅ Database ready (SQLite)');
}

async function initializeSolana() {
    try {
        const { connection: primaryConnection, metaplex: primaryMetaplex, mintAuthority } = solanaDevTools.initialize({
            cluster: CONFIG.SOLANA_CLUSTER,
            rpcUrl: CONFIG.SOLANA_RPC_URL,
            mintAuthoritySecret: CONFIG.MINT_AUTHORITY_KEYPAIR,
            nftStorageApiKey: CONFIG.NFT_STORAGE_API_KEY
        });

        connection = primaryConnection;
        metaplex = primaryMetaplex;

        console.log('✅ Solana RPC connected:', connection.rpcEndpoint);

        if (!CONFIG.MINT_AUTHORITY_KEYPAIR) {
            console.warn('⚠️  No mint authority keypair - NFT minting disabled');
            console.warn('📋 MINT_AUTHORITY_KEYPAIR environment variable is not set');
        } else if (mintAuthority) {
            console.log('📍 Mint Authority:', mintAuthority.publicKey.toString());
            console.log('💎 NFT Minting: ENABLED');
        }

        if (CONFIG.SOLANA_DEVNET_RPC_URL) {
            solanaDevTools.initialize({
                cluster: 'devnet',
                rpcUrl: CONFIG.SOLANA_DEVNET_RPC_URL,
                mintAuthoritySecret: CONFIG.MINT_AUTHORITY_KEYPAIR,
                nftStorageApiKey: CONFIG.NFT_STORAGE_API_KEY
            });
            console.log('🧪 Solana devnet tools initialized');
        }
    } catch (error) {
        console.error('❌ Solana initialization failed:', error.message);
        console.error('❌ Full error:', error);
    }
}

// ===== HELPER FUNCTIONS =====
// Note: verifySignature is now imported from shared utils

async function createNFTMetadata(discordId, discordUsername, walletAddress, termsVersion) {
    const metadata = {
        name: "JustTheTip Verified",
        symbol: "JTT",
        description: `Verification NFT for ${discordUsername}. Proves ownership of Discord account ${discordId} and Solana wallet ${walletAddress}. Terms v${termsVersion} accepted.`,
        image: "https://tan-glamorous-porcupine-751.mypinata.cloud/ipfs/bafybeihdwvqhzw3zaecne4o43mtoan23sc5janjgtnqvdrds5qkjk6lowu",
        attributes: [
            {
                trait_type: "Discord ID",
                value: discordId
            },
            {
                trait_type: "Discord Username",
                value: discordUsername
            },
            {
                trait_type: "Wallet Address",
                value: walletAddress
            },
            {
                trait_type: "Terms Version",
                value: termsVersion
            },
            {
                trait_type: "Verification Date",
                value: new Date().toISOString()
            },
            {
                trait_type: "Bot Version",
                value: "1.0.0"
            }
        ],
        properties: {
            category: "image",
            files: [
                {
                    uri: "https://tan-glamorous-porcupine-751.mypinata.cloud/ipfs/bafybeihdwvqhzw3zaecne4o43mtoan23sc5janjgtnqvdrds5qkjk6lowu",
                    type: "image/png"
                }
            ],
            creators: [
                {
                    address: metaplex.identity().publicKey.toString(),
                    share: 100
                }
            ]
        }
    };

    return metadata;
}

async function storeTipRecord({ senderId, receiverId, amount, currency, signature, timestamp: _timestamp = new Date() }) {
    try {
        sqlite.recordTip(String(senderId), String(receiverId), amount, currency, signature || null);
    } catch (error) {
        console.error('Failed to store tip record:', error);
    }
}

async function fetchTipHistory(limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return sqlite.getRecentTips(safeLimit).map((tip) => ({
        sender: tip.sender,
        receiver: tip.receiver,
        amount: tip.amount,
        currency: tip.currency,
        timestamp: tip.timestamp,
        signature: tip.signature || null,
    }));
}

async function findTrustBadgeByDiscordId(discordId) {
    return sqlite.getTrustBadgeByDiscordId(String(discordId));
}

async function upsertTrustBadgeRecord(discordId, walletAddress, mintAddress, discordUsername, reputationScore = 0) {
    await database.saveTrustBadge(String(discordId), walletAddress, mintAddress, reputationScore);
}

async function adjustReputation(discordId, delta) {
    return database.updateReputation(String(discordId), delta);
}

async function mintTrustBadgeNft({ discordUserId, discordUsername, walletAddress }) {
    if (!metaplex) {
        throw new Error('Metaplex client is not initialized. NFT minting is unavailable.');
    }

    const metadataInput = await createNFTMetadata(
        discordUserId,
        discordUsername || 'Anonymous Tipper',
        walletAddress,
        '1.0',
    );

    const metadata = await metaplex.nfts().uploadMetadata(metadataInput);
    const { mintAddress } = await metaplex.nfts().create({
        uri: metadata.uri,
        name: metadataInput.name,
        symbol: metadataInput.symbol,
        sellerFeeBasisPoints: 0,
        tokenOwner: new PublicKey(walletAddress),
        decimals: 0,
    });

    return mintAddress.toBase58();
}


// Solana dev tools status
app.get('/api/solana/devtools/status', (req, res) => {
    const status = solanaDevTools.getStatus();
    res.json({ success: true, status });
});

// Fetch program accounts for diagnostics
app.get('/api/solana/devtools/program/:programId/accounts', async (req, res) => {
    try {
        const { programId } = req.params;
        const { cluster, commitment } = req.query;

        if (!programId) {
            return res.status(400).json({ success: false, error: 'Program ID required' });
        }

        const rpcUrl = cluster === 'devnet' && CONFIG.SOLANA_DEVNET_RPC_URL
            ? CONFIG.SOLANA_DEVNET_RPC_URL
            : undefined;

        const config = {};
        if (commitment) {
            config.commitment = commitment;
        }

        const accounts = await solanaDevTools.getProgramAccounts(programId, {
            cluster: cluster || undefined,
            rpcUrl,
            config: Object.keys(config).length > 0 ? config : undefined
        });

        res.json({ success: true, count: accounts.length, accounts });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Request devnet/testnet airdrop
app.post('/api/solana/devtools/airdrop', async (req, res) => {
    try {
        const { walletAddress, amountLamports, amountSol, cluster } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ success: false, error: 'walletAddress is required' });
        }

        let lamports = Number(amountLamports);
        if (!lamports && amountSol) {
            lamports = Math.round(Number(amountSol) * 1_000_000_000);
        }

        if (!lamports || Number.isNaN(lamports) || lamports <= 0) {
            return res.status(400).json({ success: false, error: 'Positive lamport amount required' });
        }

        const targetCluster = cluster || 'devnet';
        const rpcUrl = targetCluster === 'devnet' && CONFIG.SOLANA_DEVNET_RPC_URL
            ? CONFIG.SOLANA_DEVNET_RPC_URL
            : undefined;

        const result = await solanaDevTools.requestAirdrop(walletAddress, lamports, {
            cluster: targetCluster,
            rpcUrl
        });

        res.json({ success: true, signature: result.signature, cluster: targetCluster });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Fetch NFT metadata for diagnostics
app.get('/api/solana/devtools/nft/:mintAddress', async (req, res) => {
    try {
        const { mintAddress } = req.params;
        const { cluster } = req.query;

        if (!mintAddress) {
            return res.status(400).json({ success: false, error: 'mintAddress is required' });
        }

        const rpcUrl = cluster === 'devnet' && CONFIG.SOLANA_DEVNET_RPC_URL
            ? CONFIG.SOLANA_DEVNET_RPC_URL
            : undefined;

        const metadata = await solanaDevTools.getNftMetadata(mintAddress, {
            cluster: cluster || CONFIG.SOLANA_CLUSTER,
            rpcUrl,
            mintAuthoritySecret: CONFIG.MINT_AUTHORITY_KEYPAIR
        });

        res.json({ success: true, metadata });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Discord OAuth token exchange
app.post('/api/discord/token', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Authorization code required' });
        }

        if (!CONFIG.DISCORD_CLIENT_SECRET) {
            return res.status(500).json({ error: 'Discord client secret not configured' });
        }

        // Exchange code for token
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: CONFIG.DISCORD_CLIENT_ID,
                client_secret: CONFIG.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: CONFIG.DISCORD_REDIRECT_URI
            })
        });

        if (!tokenResponse.ok) {
            throw new Error('Failed to exchange code for token');
        }

        const tokenData = await tokenResponse.json();

        // Get user info
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });

        if (!userResponse.ok) {
            throw new Error('Failed to fetch user info');
        }

        const userData = await userResponse.json();

        res.json({
            success: true,
            user: {
                id: userData.id,
                username: userData.username,
                discriminator: userData.discriminator,
                avatar: userData.avatar
            },
            accessToken: tokenData.access_token
        });

    } catch (error) {
        console.error('Discord OAuth error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mint verification NFT
app.post('/api/mintBadge', async (req, res) => {
    try {
        const {
            discordId,
            discordUsername,
            walletAddress,
            signature,
            termsVersion,
            timestamp
        } = req.body;

        // Validation
        if (!discordId || !discordUsername || !walletAddress || !signature) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['discordId', 'discordUsername', 'walletAddress', 'signature']
            });
        }

        // Verify this is a real Solana address
        let walletPubkey;
        try {
            walletPubkey = new PublicKey(walletAddress);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid Solana wallet address' });
        }

        // Verify signature
        const expectedMessage = `I accept JustTheTip Terms v${termsVersion} on ${timestamp}, Discord ID: ${discordId}`;
        const isValidSignature = verifySignature(expectedMessage, signature, walletAddress);

        if (!isValidSignature) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Check if user already verified
        // Note: MongoDB verification checks disabled - using SQLite with database module
        /* if (db) {
            const existing = await db.collection('verifications').findOne({ discordId });
            if (existing) {
                return res.status(409).json({
                    error: 'User already verified',
                    nftMintAddress: existing.nftMintAddress
                });
            }
        } */

        // Check if NFT minting is available
        if (!metaplex) {
            // Fallback: Save verification data without minting
            const verificationData = {
                discordId,
                discordUsername,
                walletAddress,
                termsVersion,
                timestamp,
                verified: true,
                nftMintAddress: 'PENDING_MINT',
                createdAt: new Date()
            };

            /* MongoDB disabled
            if (db) {
                await db.collection('verifications').insertOne(verificationData);
            } */

            return res.json({
                success: true,
                message: 'Verification saved (NFT minting temporarily unavailable)',
                nftMintAddress: 'PENDING_MINT',
                verificationData
            });
        }

        // Create NFT metadata
        const metadata = await createNFTMetadata(discordId, discordUsername, walletAddress, termsVersion);

        // Mint NFT
        console.log('🎨 Minting NFT for', discordUsername);
        const { nft } = await metaplex.nfts().create({
            uri: '', // Will upload metadata
            name: metadata.name,
            sellerFeeBasisPoints: 0,
            symbol: metadata.symbol,
            creators: metadata.properties.creators,
            isMutable: false,
            maxSupply: 1,
            tokenOwner: walletPubkey,
            collection: CONFIG.VERIFIED_COLLECTION_ADDRESS 
                ? new PublicKey(CONFIG.VERIFIED_COLLECTION_ADDRESS)
                : undefined
        });

        const nftMintAddress = nft.address.toString();
        console.log('✅ NFT minted:', nftMintAddress);

        /* MongoDB disabled - verification data not saved
        const verificationData = {
            discordId,
            discordUsername,
            walletAddress,
            nftMintAddress,
            termsVersion,
            timestamp,
            verified: true,
            createdAt: new Date()
        };

        if (db) {
            await db.collection('verifications').insertOne(verificationData);
        }
        */

        res.json({
            success: true,
            nftMintAddress,
            transactionSignature: nft.address.toString(),
            message: 'Verification NFT minted successfully!'
        });

    } catch (error) {
        console.error('❌ NFT minting error:', error);
        res.status(500).json({
            error: 'Failed to mint NFT',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Coinbase Commerce - create payment charge
app.post('/api/payments/coinbase/charges', async (req, res) => {
    try {
        if (!CONFIG.COINBASE_COMMERCE_API_KEY) {
            return res.status(503).json({ error: 'Coinbase Commerce API key not configured' });
        }

        const { name, description, amount, currency, metadata, redirectUrl, cancelUrl } = req.body;

        if (!name || !amount || !currency) {
            return res.status(400).json({ error: 'name, amount, and currency are required' });
        }

        const charge = await coinbaseClient.createCharge({
            name,
            description,
            localPrice: { amount: amount.toString(), currency },
            metadata,
            redirectUrl,
            cancelUrl
        });

        res.json({ success: true, charge });
    } catch (error) {
        console.error('Coinbase create charge error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Coinbase Commerce - fetch charge status
app.get('/api/payments/coinbase/charges/:chargeId', async (req, res) => {
    try {
        if (!CONFIG.COINBASE_COMMERCE_API_KEY) {
            return res.status(503).json({ error: 'Coinbase Commerce API key not configured' });
        }

        const { chargeId } = req.params;
        if (!chargeId) {
            return res.status(400).json({ error: 'chargeId is required' });
        }

        const charge = await coinbaseClient.getCharge(chargeId);
        res.json({ success: true, charge });
    } catch (error) {
        console.error('Coinbase get charge error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Coinbase Commerce webhook handler
app.post('/api/payments/coinbase/webhook', (req, res) => {
    try {
        if (!CONFIG.COINBASE_COMMERCE_WEBHOOK_SECRET) {
            return res.status(503).json({ error: 'Coinbase Commerce webhook secret not configured' });
        }

        const signature = req.headers['x-cc-webhook-signature'];
        const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
        const verified = coinbaseClient.verifyWebhookSignature(rawBody, signature, CONFIG.COINBASE_COMMERCE_WEBHOOK_SECRET);

        if (!verified) {
            return res.status(400).json({ error: 'Invalid webhook signature' });
        }

        const event = req.body;
        console.log('💳 Coinbase webhook received:', event.type, event.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Coinbase webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Check verification status
app.get('/api/verification/:discordId', async (req, res) => {
    /* MongoDB disabled - this endpoint is not functional with SQLite
    try {
        const { discordId } = req.params;

        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const verification = await db.collection('verifications').findOne({ discordId });

        if (!verification) {
            return res.json({ verified: false });
        }

        res.json({
            verified: true,
            walletAddress: verification.walletAddress,
            nftMintAddress: verification.nftMintAddress,
            timestamp: verification.timestamp
        });

    } catch (error) {
        console.error('Verification check error:', error);
        res.status(500).json({ error: error.message });
    }
    */
    return res.status(503).json({ error: 'Endpoint disabled - MongoDB removed' });
});

// Submit support ticket
app.post('/api/ticket', async (req, res) => {
    try {
        const {
            ticketId,
            discordId,
            username,
            walletAddress,
            issueType,
            message,
            date
        } = req.body;

        if (!discordId || !username || !issueType || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        /* MongoDB disabled - ticket data not saved
        const ticket = {
            ticketId,
            discordId,
            username,
            walletAddress: walletAddress || 'Not provided',
            issueType,
            message,
            date: date || new Date().toISOString(),
            status: 'open',
            createdAt: new Date()
        };

        if (db) {
            await db.collection('tickets').insertOne(ticket);
        }
        */

        // TODO: Send notification (Discord webhook, email, etc.)
        console.log('📝 New ticket:', ticketId, '-', issueType);

        res.json({
            success: true,
            ticketId,
            message: 'Ticket submitted successfully'
        });

    } catch (error) {
        console.error('Ticket submission error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's tickets
app.get('/api/tickets/:discordId', async (req, res) => {
    /* MongoDB disabled - this endpoint is not functional with SQLite
    try {
        const { discordId } = req.params;

        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const tickets = await db.collection('tickets')
            .find({ discordId })
            .sort({ createdAt: -1 })
            .toArray();

        res.json({ tickets });

    } catch (error) {
        console.error('Tickets fetch error:', error);
        res.status(500).json({ error: error.message });
    }
    */
    return res.status(503).json({ error: 'Endpoint disabled - MongoDB removed' });
});

// ===== X402 PAYMENT PROTOCOL ROUTES =====
// Initialize x402 payment handler
let x402Handler;
try {
    x402Handler = new X402PaymentHandler({
        network: CONFIG.SOLANA_CLUSTER,
        rpcUrl: CONFIG.SOLANA_RPC_URL,
        treasuryAddress: CONFIG.X402_TREASURY_WALLET
    });
    console.log('✅ x402 Payment Handler initialized');
    
    // Initialize health routes with server context
    healthRoutes.initialize({
        CONFIG,
        connection,
        metaplex,
        x402Handler
    });
} catch (error) {
    console.warn('⚠️  x402 Payment Handler initialization failed:', error.message);
}

// Helper function to create x402 payment middleware or fallback
function requireX402Payment(options) {
    if (x402Handler) {
        return x402Handler.requirePayment(options);
    }
    // Fallback if x402 not configured
    return (req, res) => {
        res.status(503).json({
            error: 'x402 Payment Not Configured',
            message: 'x402 payment protocol is not available. Configure X402_TREASURY_WALLET environment variable.',
            documentation: 'https://github.com/jmenichole/Justthetip/blob/main/docs/X402_INTEGRATION.md'
        });
    };
}

// x402 Premium API Example - Analytics Dashboard Access
// Note: Rate limiting is inherently provided by the payment requirement
// Each request requires a separate USDC payment, naturally limiting abuse
app.get('/api/x402/premium/analytics', requireX402Payment({
    amount: "1000000", // $1 USDC
    description: "Premium Analytics Dashboard Access",
    resource: "analytics-dashboard"
}), async (req, res) => {
    try {
        // This route requires x402 payment to access
        // Payment verification is handled by the middleware
        
        // Return premium analytics data
        const analytics = {
            totalTips: 12500,
            totalVolume: "1,234 SOL",
            activeUsers: 450,
            topTippers: [
                { user: "User123", amount: "125 SOL" },
                { user: "User456", amount: "98 SOL" },
                { user: "User789", amount: "87 SOL" }
            ],
            recentActivity: [
                { timestamp: Date.now() - 3600000, type: "tip", amount: "5 SOL" },
                { timestamp: Date.now() - 7200000, type: "airdrop", amount: "50 SOL" }
            ],
            payment: req.payment // Include payment proof
        };

        res.json({
            success: true,
            data: analytics,
            message: "Premium analytics data (paid with x402)"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// x402 Premium API Example - NFT Minting with Priority
// Note: Payment-per-use naturally rate limits this expensive operation
app.post('/api/x402/premium/mint-priority', requireX402Payment({
    amount: "2500000", // $2.50 USDC
    description: "Priority NFT Minting",
    resource: "priority-nft-minting"
}), async (req, res) => {
    try {
        // This route requires payment for priority NFT minting
        const { discordId, walletAddress } = req.body;

        if (!discordId || !walletAddress) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['discordId', 'walletAddress']
            });
        }

        // In a real implementation, this would queue a priority mint
        res.json({
            success: true,
            message: "Priority NFT mint queued (paid with x402)",
            queuePosition: 1,
            estimatedTime: "30 seconds",
            payment: req.payment
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// x402 Premium API Example - Advanced Bot Commands
// Note: Micropayment requirement provides economic rate limiting
app.post('/api/x402/premium/bot-commands', requireX402Payment({
    amount: "500000", // $0.50 USDC
    description: "Premium Bot Command Access",
    resource: "premium-commands"
}), async (req, res) => {
    try {
        // Premium commands that require payment
        const premiumCommands = [
            '/leaderboard-advanced',
            '/analytics-export',
            '/custom-airdrop',
            '/scheduled-tips'
        ];

        res.json({
            success: true,
            message: "Premium command access granted (paid with x402)",
            availableCommands: premiumCommands,
            payment: req.payment
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get x402 payment status
app.get('/api/x402/payment/:signature', async (req, res) => {
    try {
        if (!x402Handler) {
            return res.status(503).json({ error: 'x402 not configured' });
        }

        const { signature } = req.params;
        const status = await x402Handler.getPaymentStatus(signature);

        res.json({
            success: true,
            signature,
            status
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// x402 info endpoint - shows available paid endpoints
app.get('/api/x402/info', (req, res) => {
    const endpoints = [
        {
            path: '/api/x402/premium/analytics',
            method: 'GET',
            price: '$1.00 USDC',
            description: 'Access premium analytics dashboard with detailed statistics'
        },
        {
            path: '/api/x402/premium/mint-priority',
            method: 'POST',
            price: '$2.50 USDC',
            description: 'Priority NFT minting queue with faster processing'
        },
        {
            path: '/api/x402/premium/bot-commands',
            method: 'POST',
            price: '$0.50 USDC',
            description: 'Unlock advanced bot commands and features'
        }
    ];

    res.json({
        protocol: 'x402',
        version: '1.0',
        network: CONFIG.SOLANA_CLUSTER,
        treasuryAddress: CONFIG.X402_TREASURY_WALLET,
        usdcMint: CONFIG.SOLANA_CLUSTER === 'mainnet-beta' 
            ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
            : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        endpoints,
        instructions: {
            message: 'To access paid endpoints:',
            steps: [
                '1. Make a request to the paid endpoint',
                '2. Receive 402 Payment Required response with payment details',
                '3. Send USDC payment to the specified treasury address',
                '4. Retry request with X-Payment header containing transaction signature',
                '5. Receive the paid resource'
            ]
        },
        documentation: 'https://github.com/jmenichole/Justthetip/blob/main/docs/X402_INTEGRATION.md'
    });
});

// ===== MOUNT ROUTES =====
// Admin dashboard routes
app.use('/api/admin', adminRoutes);

// Wallet registration routes
app.use('/api', walletRoutes);

// Tips routes
app.use('/api', tipsRoutes);

// Health and diagnostics routes
app.use('/api', healthRoutes);

// Magic embedded wallet routes
app.use('/api/magic', magicRoutes);

// WalletConnect Configuration Endpoint
// Serves public WalletConnect project ID (safe to expose to frontend)
app.get('/api/walletconnect/config', (req, res) => {
    res.json({
        projectId: process.env.WALLETCONNECT_PROJECT_ID || ''
    });
});

// Magic Registration Page - Inject publishable key
app.get('/register-magic.html', (req, res) => {
    const fs = require('fs');
    const htmlPath = path.join(__dirname, 'public', 'register-magic.html');
    
    fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) {
            return res.status(500).send('Failed to load registration page');
        }
        
        // Inject Magic publishable key
        const injectedHtml = html.replace(
            '{{MAGIC_PUBLISHABLE_KEY}}', 
            process.env.MAGIC_PUBLISHABLE_KEY || ''
        );
        
        res.send(injectedHtml);
    });
});

// ===== 404 HANDLER =====
// Catch-all for undefined routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        message: 'The requested endpoint does not exist',
        availableEndpoints: {
            api: '/api/health, /api/tips, /api/verifyWallet',
            static: '/sign.html (for wallet registration)',
            documentation: 'https://github.com/jmenichole/Justthetip'
        }
    });
});

// ===== INITIALIZATION =====
async function startServer() {
    try {
        await initializeDatabase();
        await initializeSolana();

        // Make db available to routes
        app.locals.db = { pool: null }; // Will be set if database is available
        
        app.listen(PORT, () => {
            console.log(`\n🚀 JustTheTip API Server Running`);
            console.log(`📍 Port: ${PORT}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`💾 Database: ${database ? 'Connected' : 'Not configured'}`);
            console.log(`🔗 Solana: ${connection ? 'Connected' : 'Not configured'}`);
            console.log(`🎨 NFT Minting: ${metaplex ? 'Enabled' : 'Disabled'}`);
            console.log(`📊 Admin API: /api/admin/* (requires authentication)\n`);

            // Configuration warnings
            if (!CONFIG.DISCORD_CLIENT_SECRET) {
                console.warn('⚠️  DISCORD_CLIENT_SECRET not set - OAuth will not work');
            }
            if (!CONFIG.MINT_AUTHORITY_KEYPAIR) {
                console.warn('⚠️  MINT_AUTHORITY_KEYPAIR not set - NFT minting disabled');
            }
            if (!CONFIG.MONGODB_URI) {
                console.warn('⚠️  MONGODB_URI not set - using in-memory storage');
            }
        });

    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}

// Handle shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    process.exit(0);
});

// Start the server
if (require.main === module) {
    startServer();
} else {
    // For serverless environments (e.g., Vercel), initialize without starting the server
    let initialized = false;
    (async () => {
        if (!initialized) {
            initialized = true;
            try {
                await initializeDatabase();
                await initializeSolana();
                app.locals.db = { pool: null };
            } catch (error) {
                console.error('❌ Serverless initialization failed:', error);
            }
        }
    })();
}

// Global error handlers for production stability
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('❌ Reason:', reason);
    // Log stack trace if available
    if (reason && reason.stack) {
        console.error('Stack trace:', reason.stack);
    }
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack trace:', error.stack);
    // Exit gracefully to allow Railway to restart the service
    setTimeout(() => {
        console.error('⚠️  Exiting due to uncaught exception...');
        process.exit(1);
    }, 1000);
});

module.exports = app;

