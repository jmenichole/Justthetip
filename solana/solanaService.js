const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const { AnchorProvider, Program, web3 } = require('@project-serum/anchor');
const fs = require('fs');

// Solana configuration
const DEVNET_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('ACXw2hSqvuRMPJGJpnwvJvNkJnU3dL1jsyrJmfZYXnBN');

// Global connection and program instances
let connection;
let program;
let provider;

/**
 * Initialize Solana connection and program
 */
async function initializeSolana() {
    try {
        console.log('🔗 Connecting to Solana devnet...');
        connection = new Connection(DEVNET_URL, 'confirmed');
        
        // Load wallet keypair (for admin functions)
        const keypairPath = process.env.SOLANA_KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;
        const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
        const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
        
        // Create provider
        provider = new AnchorProvider(connection, { publicKey: wallet.publicKey }, { preflightCommitment: 'confirmed' });
        
        // Load program IDL (Interface Definition Language)
        const idl = {
            "version": "0.1.0",
            "name": "justthetip_program",
            "instructions": [
                {
                    "name": "initialize",
                    "accounts": [
                        { "name": "tipState", "isMut": true, "isSigner": false },
                        { "name": "admin", "isMut": true, "isSigner": true },
                        { "name": "systemProgram", "isMut": false, "isSigner": false }
                    ],
                    "args": [
                        { "name": "admin", "type": "publicKey" }
                    ]
                },
                {
                    "name": "createUser",
                    "accounts": [
                        { "name": "userState", "isMut": true, "isSigner": false },
                        { "name": "tipState", "isMut": true, "isSigner": false },
                        { "name": "user", "isMut": true, "isSigner": true },
                        { "name": "systemProgram", "isMut": false, "isSigner": false }
                    ],
                    "args": [
                        { "name": "discordId", "type": "string" }
                    ]
                },
                {
                    "name": "depositSol",
                    "accounts": [
                        { "name": "userState", "isMut": true, "isSigner": false },
                        { "name": "tipState", "isMut": true, "isSigner": false },
                        { "name": "depositor", "isMut": true, "isSigner": true },
                        { "name": "systemProgram", "isMut": false, "isSigner": false }
                    ],
                    "args": [
                        { "name": "amount", "type": "u64" }
                    ]
                },
                {
                    "name": "tipSol",
                    "accounts": [
                        { "name": "tipperState", "isMut": true, "isSigner": false },
                        { "name": "recipientState", "isMut": true, "isSigner": false },
                        { "name": "tipState", "isMut": false, "isSigner": false },
                        { "name": "tipper", "isMut": false, "isSigner": true }
                    ],
                    "args": [
                        { "name": "amount", "type": "u64" }
                    ]
                },
                {
                    "name": "withdrawSol",
                    "accounts": [
                        { "name": "userState", "isMut": true, "isSigner": false },
                        { "name": "tipState", "isMut": true, "isSigner": false },
                        { "name": "withdrawer", "isMut": true, "isSigner": true }
                    ],
                    "args": [
                        { "name": "amount", "type": "u64" }
                    ]
                }
            ],
            "accounts": [
                {
                    "name": "TipState",
                    "type": {
                        "kind": "struct",
                        "fields": [
                            { "name": "admin", "type": "publicKey" },
                            { "name": "totalUsers", "type": "u64" },
                            { "name": "totalVolume", "type": "u64" },
                            { "name": "feeRate", "type": "u16" },
                            { "name": "paused", "type": "bool" }
                        ]
                    }
                },
                {
                    "name": "UserState",
                    "type": {
                        "kind": "struct",
                        "fields": [
                            { "name": "discordId", "type": "string" },
                            { "name": "solBalance", "type": "u64" },
                            { "name": "usdcBalance", "type": "u64" },
                            { "name": "totalTipped", "type": "u64" },
                            { "name": "totalReceived", "type": "u64" },
                            { "name": "createdAt", "type": "i64" }
                        ]
                    }
                }
            ]
        };
        
        program = new Program(idl, PROGRAM_ID, provider);
        
        console.log('✅ Solana connection initialized');
        console.log(`📍 Program ID: ${PROGRAM_ID.toString()}`);
        console.log(`🔑 Wallet: ${wallet.publicKey.toString()}`);
        
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Solana:', error);
        return false;
    }
}

/**
 * Get program-derived address for tip state
 */
function getTipStatePDA() {
    const [tipStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('tip_state')],
        PROGRAM_ID
    );
    return tipStatePDA;
}

/**
 * Get program-derived address for user state
 */
function getUserStatePDA(discordId) {
    const [userStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_state'), Buffer.from(discordId)],
        PROGRAM_ID
    );
    return userStatePDA;
}

/**
 * Create a new user account on-chain
 */
async function createUser(discordId, userWallet) {
    try {
        const userStatePDA = getUserStatePDA(discordId);
        const tipStatePDA = getTipStatePDA();
        
        const tx = await program.methods
            .createUser(discordId)
            .accounts({
                userState: userStatePDA,
                tipState: tipStatePDA,
                user: userWallet,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
        
        console.log(`✅ User created on-chain: ${discordId}`);
        console.log(`🔗 Transaction: ${tx}`);
        
        return {
            success: true,
            transaction: tx,
            userStatePDA: userStatePDA.toString()
        };
    } catch (error) {
        console.error(`❌ Failed to create user ${discordId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Get user's on-chain balance
 */
async function getUserBalance(discordId) {
    try {
        const userStatePDA = getUserStatePDA(discordId);
        const userAccount = await program.account.userState.fetch(userStatePDA);
        
        return {
            success: true,
            balance: {
                sol: userAccount.solBalance.toString(),
                usdc: userAccount.usdcBalance.toString(),
                totalTipped: userAccount.totalTipped.toString(),
                totalReceived: userAccount.totalReceived.toString()
            }
        };
    } catch (error) {
        console.error(`❌ Failed to get balance for ${discordId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Deposit SOL to user's account
 */
async function depositSol(discordId, amount, userWallet) {
    try {
        const userStatePDA = getUserStatePDA(discordId);
        const tipStatePDA = getTipStatePDA();
        
        // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
        const lamports = Math.floor(amount * 1e9);
        
        const tx = await program.methods
            .depositSol(new web3.BN(lamports))
            .accounts({
                userState: userStatePDA,
                tipState: tipStatePDA,
                depositor: userWallet,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
        
        console.log(`✅ Deposited ${amount} SOL for user ${discordId}`);
        console.log(`🔗 Transaction: ${tx}`);
        
        return {
            success: true,
            transaction: tx,
            amount: amount,
            lamports: lamports
        };
    } catch (error) {
        console.error(`❌ Failed to deposit SOL for ${discordId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Tip SOL between users
 */
async function tipSol(fromDiscordId, toDiscordId, amount, tipperWallet) {
    try {
        const tipperStatePDA = getUserStatePDA(fromDiscordId);
        const recipientStatePDA = getUserStatePDA(toDiscordId);
        const tipStatePDA = getTipStatePDA();
        
        // Convert SOL to lamports
        const lamports = Math.floor(amount * 1e9);
        
        const tx = await program.methods
            .tipSol(new web3.BN(lamports))
            .accounts({
                tipperState: tipperStatePDA,
                recipientState: recipientStatePDA,
                tipState: tipStatePDA,
                tipper: tipperWallet,
            })
            .rpc();
        
        console.log(`✅ Tipped ${amount} SOL from ${fromDiscordId} to ${toDiscordId}`);
        console.log(`🔗 Transaction: ${tx}`);
        
        return {
            success: true,
            transaction: tx,
            amount: amount,
            from: fromDiscordId,
            to: toDiscordId
        };
    } catch (error) {
        console.error(`❌ Failed to tip SOL:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Withdraw SOL from user's account
 */
async function withdrawSol(discordId, amount, userWallet) {
    try {
        const userStatePDA = getUserStatePDA(discordId);
        const tipStatePDA = getTipStatePDA();
        
        // Convert SOL to lamports
        const lamports = Math.floor(amount * 1e9);
        
        const tx = await program.methods
            .withdrawSol(new web3.BN(lamports))
            .accounts({
                userState: userStatePDA,
                tipState: tipStatePDA,
                withdrawer: userWallet,
            })
            .rpc();
        
        console.log(`✅ Withdrew ${amount} SOL for user ${discordId}`);
        console.log(`🔗 Transaction: ${tx}`);
        
        return {
            success: true,
            transaction: tx,
            amount: amount,
            lamports: lamports
        };
    } catch (error) {
        console.error(`❌ Failed to withdraw SOL for ${discordId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Get program statistics
 */
async function getProgramStats() {
    try {
        const tipStatePDA = getTipStatePDA();
        const tipAccount = await program.account.tipState.fetch(tipStatePDA);
        
        return {
            success: true,
            stats: {
                admin: tipAccount.admin.toString(),
                totalUsers: tipAccount.totalUsers.toString(),
                totalVolume: tipAccount.totalVolume.toString(),
                feeRate: tipAccount.feeRate,
                paused: tipAccount.paused
            }
        };
    } catch (error) {
        console.error('❌ Failed to get program stats:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate a wallet address for a Discord user (deterministic)
 */
function generateUserWallet(discordId) {
    // In production, you'd want proper key derivation
    // For demo, we'll create a simple keypair
    const seed = Buffer.from(`justthetip_${discordId}`).slice(0, 32);
    const keypair = Keypair.fromSeed(seed);
    
    return {
        publicKey: keypair.publicKey.toString(),
        secretKey: Array.from(keypair.secretKey)
    };
}

/**
 * Convert lamports to SOL
 */
function lamportsToSol(lamports) {
    return lamports / 1e9;
}

/**
 * Convert SOL to lamports
 */
function solToLamports(sol) {
    return Math.floor(sol * 1e9);
}

module.exports = {
    initializeSolana,
    createUser,
    getUserBalance,
    depositSol,
    tipSol,
    withdrawSol,
    getProgramStats,
    generateUserWallet,
    lamportsToSol,
    solToLamports,
    getTipStatePDA,
    getUserStatePDA,
    PROGRAM_ID
};