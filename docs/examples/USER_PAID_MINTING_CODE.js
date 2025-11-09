/**
 * User-Paid Minting Implementation
 * Add these functions to api/server.js
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * 
 * This file is part of JustTheTip.
 * 
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * See LICENSE file in the project root for full license information.
 * 
 * SPDX-License-Identifier: MIT
 * 
 * This software may not be sold commercially without permission.
 */

// ===== ADD THIS TO CONFIG SECTION =====
const CONFIG = {
    // ... existing config ...
    NFT_MINT_FEE_SOL: parseFloat(process.env.NFT_MINT_FEE_SOL || '0.02'),
    NFT_MINT_FEE_ENABLED: process.env.NFT_MINT_FEE_ENABLED === 'true',
};

// ===== ADD THIS HELPER FUNCTION =====
/**
 * Verifies that a user has paid the required minting fee
 * @param {string} walletAddress - User's Solana wallet address
 * @param {number} requiredAmount - Required payment amount in SOL
 * @returns {Promise<{verified: boolean, signature?: string, amount?: number, error?: string}>}
 */
async function verifyPayment(walletAddress, requiredAmount) {
    try {
        const feeWallet = new PublicKey(process.env.FEE_PAYMENT_SOL_ADDRESS);
        
        // Get recent transactions to fee wallet (last 100)
        const signatures = await connection.getSignaturesForAddress(
            feeWallet,
            { limit: 100 }
        );
        
        // Only check transactions from last 10 minutes
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        
        for (const sigInfo of signatures) {
            // Skip old transactions
            if (sigInfo.blockTime * 1000 < tenMinutesAgo) {
                console.log('⏰ Checked transactions up to 10 minutes ago');
                break;
            }
            
            // Get full transaction details
            const tx = await connection.getParsedTransaction(
                sigInfo.signature,
                { maxSupportedTransactionVersion: 0 }
            );
            
            if (!tx || !tx.transaction) continue;
            
            // Check each instruction in the transaction
            const instructions = tx.transaction.message.instructions;
            
            for (const ix of instructions) {
                // Look for system program transfers
                if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
                    const info = ix.parsed.info;
                    
                    // Check if transfer is from user to fee wallet with correct amount
                    if (
                        info.source === walletAddress &&
                        info.destination === feeWallet.toString() &&
                        info.lamports >= requiredAmount * 1e9
                    ) {
                        const paidAmount = info.lamports / 1e9;
                        console.log(`✅ Payment verified: ${paidAmount} SOL from ${walletAddress}`);
                        
                        return {
                            verified: true,
                            signature: sigInfo.signature,
                            amount: paidAmount,
                            timestamp: sigInfo.blockTime
                        };
                    }
                }
            }
        }
        
        console.log(`❌ No valid payment found from ${walletAddress}`);
        return { verified: false };
        
    } catch (error) {
        console.error('Payment verification error:', error);
        return { 
            verified: false, 
            error: error.message 
        };
    }
}

// ===== REPLACE THE /api/mintBadge ENDPOINT WITH THIS =====
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
                    nftMintAddress: existing.nftMintAddress,
                    message: 'You have already minted your verification NFT'
                });
            }
        }

        // ===== NEW: PAYMENT VERIFICATION =====
        if (CONFIG.NFT_MINT_FEE_ENABLED) {
            const requiredFee = CONFIG.NFT_MINT_FEE_SOL;
            
            console.log(`💰 Checking payment from ${walletAddress}...`);
            const payment = await verifyPayment(walletAddress, requiredFee);
            
            if (!payment.verified) {
                return res.status(402).json({
                    error: 'Payment required',
                    message: `Please send ${requiredFee} SOL to mint your verification NFT`,
                    details: {
                        requiredAmount: requiredFee,
                        paymentAddress: process.env.FEE_PAYMENT_SOL_ADDRESS,
                        breakdown: {
                            mintCost: 0.01,
                            serviceFee: requiredFee - 0.01,
                            total: requiredFee
                        }
                    }
                });
            }
            
            console.log('✅ Payment verified:', payment.signature);
            
            // Store payment info in verification data
            req.paymentInfo = {
                signature: payment.signature,
                amount: payment.amount,
                timestamp: payment.timestamp
            };
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
                paymentInfo: req.paymentInfo || null,
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
            paymentInfo: req.paymentInfo || null,
            createdAt: new Date()
        };

        if (db) {
            await db.collection('verifications').insertOne(verificationData);
        }

        res.json({
            success: true,
            nftMintAddress,
            transactionSignature: nft.address.toString(),
            message: 'Verification NFT minted successfully!',
            paymentReceived: req.paymentInfo?.amount || 0
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

// ===== ADD NEW ENDPOINT: Check Payment Status =====
app.get('/api/checkPayment/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        
        if (!CONFIG.NFT_MINT_FEE_ENABLED) {
            return res.json({
                required: false,
                message: 'Payment not required - minting is free'
            });
        }
        
        const payment = await verifyPayment(walletAddress, CONFIG.NFT_MINT_FEE_SOL);
        
        res.json({
            required: true,
            verified: payment.verified,
            amount: CONFIG.NFT_MINT_FEE_SOL,
            paymentAddress: process.env.FEE_PAYMENT_SOL_ADDRESS,
            paymentDetails: payment.verified ? {
                signature: payment.signature,
                amount: payment.amount,
                timestamp: payment.timestamp
            } : null
        });
        
    } catch (error) {
        console.error('Payment check error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ADD TO HEALTH ENDPOINT =====
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'disconnected',
        solana: connection ? 'connected' : 'disconnected',
        nftMinting: metaplex ? 'enabled' : 'disabled',
        paymentRequired: CONFIG.NFT_MINT_FEE_ENABLED,
        mintFee: CONFIG.NFT_MINT_FEE_ENABLED ? `${CONFIG.NFT_MINT_FEE_SOL} SOL` : 'FREE'
    });
});
