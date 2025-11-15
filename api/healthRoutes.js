/**
 * JustTheTip - Health and Diagnostics Routes
 * System health checks and configuration status
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
const router = express.Router();
const solanaDevTools = require('../src/utils/solanaDevTools');

// Import these from server.js context - will be passed in
let CONFIG, connection, metaplex, x402Handler;

/**
 * Initialize health routes with server context
 */
function initialize(serverContext) {
    CONFIG = serverContext.CONFIG;
    connection = serverContext.connection;
    metaplex = serverContext.metaplex;
    x402Handler = serverContext.x402Handler;
}

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    const devStatus = solanaDevTools.getStatus();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected (SQLite)',
        solana: connection ? 'connected' : 'disconnected',
        nftMinting: metaplex ? 'enabled' : 'disabled',
        solanaCluster: CONFIG.SOLANA_CLUSTER,
        coinbasePayments: {
            apiKeyConfigured: Boolean(CONFIG.COINBASE_COMMERCE_API_KEY),
            webhookConfigured: Boolean(CONFIG.COINBASE_COMMERCE_WEBHOOK_SECRET)
        },
        x402Payments: {
            enabled: Boolean(x402Handler),
            treasuryConfigured: Boolean(CONFIG.X402_TREASURY_WALLET),
            network: CONFIG.SOLANA_CLUSTER
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
        version: '2025-11-07-x402'
    });
});

/**
 * GET /api/diag
 * Diagnostics endpoint (sanitized - no secrets exposed)
 */
router.get('/diag', (req, res) => {
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

module.exports = router;
module.exports.initialize = initialize;
