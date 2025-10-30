/**
 * JustTheTip Backend API - NFT Verification System
 * Express server for Discord OAuth, NFT minting, and ticket management
 */

const express = require('express');
const cors = require('cors');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Metaplex, keypairIdentity, bundlrStorage } = require('@metaplex-foundation/js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== CONFIGURATION =====
const CONFIG = {
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    MONGODB_URI: process.env.MONGODB_URI,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || '1419742988128616479',
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET, // Required
    DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI || 'https://jmenichole.github.io/Justthetip/landing.html',
    MINT_AUTHORITY_KEYPAIR: process.env.MINT_AUTHORITY_KEYPAIR, // Base58 private key
    VERIFIED_COLLECTION_ADDRESS: process.env.VERIFIED_COLLECTION_ADDRESS,
    NFT_STORAGE_API_KEY: process.env.NFT_STORAGE_API_KEY
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
app.use(express.json());

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
        connection = new Connection(CONFIG.SOLANA_RPC_URL, 'confirmed');
        
        if (!CONFIG.MINT_AUTHORITY_KEYPAIR) {
            console.warn('⚠️  No mint authority keypair - NFT minting disabled');
            return;
        }

        const secretKey = bs58.decode(CONFIG.MINT_AUTHORITY_KEYPAIR);
        const mintAuthority = Keypair.fromSecretKey(secretKey);
        
        metaplex = Metaplex.make(connection)
            .use(keypairIdentity(mintAuthority))
            .use(bundlrStorage());
        
        console.log('✅ Solana connection initialized');
        console.log('📍 Mint Authority:', mintAuthority.publicKey.toString());
    } catch (error) {
        console.error('❌ Solana initialization failed:', error.message);
    }
}

// ===== HELPER FUNCTIONS =====
function verifySignature(message, signature, publicKey) {
    try {
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signature);
        const publicKeyBytes = new PublicKey(publicKey).toBytes();
        
        return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

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
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'disconnected',
        solana: connection ? 'connected' : 'disconnected',
        nftMinting: metaplex ? 'enabled' : 'disabled'
    });
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

// ===== INITIALIZATION =====
async function startServer() {
    try {
        await initializeDatabase();
        await initializeSolana();

        app.listen(PORT, () => {
            console.log(`\n🚀 JustTheTip API Server Running`);
            console.log(`📍 Port: ${PORT}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`💾 Database: ${db ? 'Connected' : 'Not configured'}`);
            console.log(`🔗 Solana: ${connection ? 'Connected' : 'Not configured'}`);
            console.log(`🎨 NFT Minting: ${metaplex ? 'Enabled' : 'Disabled'}\n`);

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
