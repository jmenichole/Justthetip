/**
 * JustTheTip Backend API - NFT Verification System
 * Express server for Discord OAuth, NFT minting, and ticket management
 */

const express = require('express');
const cors = require('cors');
const { PublicKey } = require('@solana/web3.js');
const { MongoClient } = require('mongodb');
const adminRoutes = require('./adminRoutes');
const solanaDevTools = require('../src/utils/solanaDevTools');
const coinbaseClient = require('../src/utils/coinbaseClient');
const { verifySignature } = require('../src/utils/validation');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== CONFIGURATION =====
const CONFIG = {
    SOLANA_CLUSTER: process.env.SOLANA_CLUSTER || 'mainnet-beta',
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    SOLANA_DEVNET_RPC_URL: process.env.SOLANA_DEVNET_RPC_URL,
    MONGODB_URI: process.env.MONGODB_URI,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || '1419742988128616479',
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET, // Required
    DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI || 'https://jmenichole.github.io/Justthetip/landing.html',
    MINT_AUTHORITY_KEYPAIR: process.env.MINT_AUTHORITY_KEYPAIR, // Base58 private key
    VERIFIED_COLLECTION_ADDRESS: process.env.VERIFIED_COLLECTION_ADDRESS,
    NFT_STORAGE_API_KEY: process.env.NFT_STORAGE_API_KEY,
    COINBASE_COMMERCE_API_KEY: process.env.COINBASE_COMMERCE_API_KEY,
    COINBASE_COMMERCE_WEBHOOK_SECRET: process.env.COINBASE_COMMERCE_WEBHOOK_SECRET
};

// ===== MIDDLEWARE =====
app.use(cors({
    origin: [
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

// ===== DATABASE =====
let db;
let connection;
let metaplex;

async function initializeDatabase() {
    try {
        if (!CONFIG.MONGODB_URI) {
            console.warn('⚠️  No MongoDB URI - using in-memory storage');
            return;
        }

        const client = new MongoClient(CONFIG.MONGODB_URI);
        await client.connect();
        db = client.db('justthetip');
        
        // Create indexes
        await db.collection('verifications').createIndex({ discordId: 1 }, { unique: true });
        await db.collection('verifications').createIndex({ walletAddress: 1 });
        await db.collection('verifications').createIndex({ nftMintAddress: 1 });
        await db.collection('tickets').createIndex({ discordId: 1 });
        await db.collection('tickets').createIndex({ createdAt: -1 });
        
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
    }
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

// ===== API ENDPOINTS =====

// Health check
app.get('/api/health', (req, res) => {
    const devStatus = solanaDevTools.getStatus();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'disconnected',
        solana: connection ? 'connected' : 'disconnected',
        nftMinting: metaplex ? 'enabled' : 'disabled',
        solanaCluster: CONFIG.SOLANA_CLUSTER,
        coinbasePayments: {
            apiKeyConfigured: Boolean(CONFIG.COINBASE_COMMERCE_API_KEY),
            webhookConfigured: Boolean(CONFIG.COINBASE_COMMERCE_WEBHOOK_SECRET)
        },
        devTools: {
            defaultCluster: devStatus.defaultCluster,
            connections: devStatus.connections.length,
            mintAuthorities: devStatus.mintAuthorities.map((item) => item.publicKey)
        },
        // Debug fields (sanitized)
        hasMintKey: Boolean(CONFIG.MINT_AUTHORITY_KEYPAIR),
        mintKeyLength: CONFIG.MINT_AUTHORITY_KEYPAIR ? CONFIG.MINT_AUTHORITY_KEYPAIR.length : 0,
        metaplexInitialized: Boolean(metaplex),
        version: '2025-10-30T09:28Z'
    });
});

// Diagnostics (sanitized) - no secrets exposed
app.get('/api/diag', (req, res) => {
    try {
        const key = CONFIG.MINT_AUTHORITY_KEYPAIR || '';
        const preview = key ? `${key.substring(0, 8)}...${key.substring(key.length - 6)}` : null;
        let rpcHost = null;
        try {
            const url = new URL(CONFIG.SOLANA_RPC_URL);
            rpcHost = url.hostname;
        } catch (_) {
            rpcHost = CONFIG.SOLANA_RPC_URL;
        }

        res.json({
            status: 'ok',
            solanaRpcHost: rpcHost,
            hasMintKey: Boolean(key),
            mintKeyLength: key ? key.length : 0,
            mintKeyPreview: preview,
            metaplexInitialized: Boolean(metaplex),
            coinbaseConfigured: Boolean(CONFIG.COINBASE_COMMERCE_API_KEY),
            coinbaseWebhookConfigured: Boolean(CONFIG.COINBASE_COMMERCE_WEBHOOK_SECRET)
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

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
        if (db) {
            const existing = await db.collection('verifications').findOne({ discordId });
            if (existing) {
                return res.status(409).json({
                    error: 'User already verified',
                    nftMintAddress: existing.nftMintAddress
                });
            }
        }

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

            if (db) {
                await db.collection('verifications').insertOne(verificationData);
            }

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

        // Save verification to database
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

        // Save to database
        if (db) {
            await db.collection('tickets').insertOne(ticket);
        }

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
});

// ===== MOUNT ROUTES =====
// Admin dashboard routes
app.use('/api/admin', adminRoutes);

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
            console.log(`💾 Database: ${db ? 'Connected' : 'Not configured'}`);
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
}

module.exports = app;
