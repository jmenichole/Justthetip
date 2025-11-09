/**
 * NFT Verification Helper for JustTheTip Bot
 * Checks if users own verified NFT before allowing commands
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

const { Connection, PublicKey } = require('@solana/web3.js');
const { Metaplex } = require('@metaplex-foundation/js');

class VerificationChecker {
    constructor(rpcUrl, collectionAddress, database) {
        this.connection = new Connection(rpcUrl || process.env.SOLANA_RPC_URL, 'confirmed');
        this.metaplex = Metaplex.make(this.connection);
        this.collectionAddress = collectionAddress;
        this.db = database;
        
        // Cache to avoid excessive RPC calls
        this.cache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Check if a Discord user is verified
     * @param {string} discordId - Discord user ID
     * @returns {Promise<{verified: boolean, walletAddress?: string, nftAddress?: string}>}
     */
    async isUserVerified(discordId) {
        try {
            // Check cache first
            const cached = this.cache.get(discordId);
            if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
                return cached.data;
            }

            // 1. Lookup user in database
            if (!this.db || !this.db.db) {
                console.warn('Database not available for verification check');
                return { verified: false, message: 'Verification system unavailable' };
            }

            const verification = await this.db.db.collection('verifications').findOne({ discordId });
            
            if (!verification) {
                return {
                    verified: false,
                    message: 'Not verified. Please visit https://jmenichole.github.io/Justthetip/landing.html to verify'
                };
            }

            // 2. Check if NFT still exists and is owned by user
            try {
                const walletPubkey = new PublicKey(verification.walletAddress);
                const nftMintPubkey = new PublicKey(verification.nftMintAddress);

                // Get NFT metadata
                const nft = await this.metaplex.nfts().findByMint({ mintAddress: nftMintPubkey });
                
                // Verify ownership
                if (!nft.ownerAddress.equals(walletPubkey)) {
                    return {
                        verified: false,
                        message: 'Verification NFT no longer owned by registered wallet'
                    };
                }

                // Optional: Check if NFT is from verified collection
                if (this.collectionAddress) {
                    const collectionPubkey = new PublicKey(this.collectionAddress);
                    if (!nft.collection || !nft.collection.address.equals(collectionPubkey)) {
                        return {
                            verified: false,
                            message: 'NFT not from verified collection'
                        };
                    }
                }

                const result = {
                    verified: true,
                    walletAddress: verification.walletAddress,
                    nftAddress: verification.nftMintAddress,
                    username: verification.discordUsername
                };

                // Cache the result
                this.cache.set(discordId, {
                    data: result,
                    timestamp: Date.now()
                });

                return result;

            } catch (nftError) {
                console.error('NFT check error:', nftError);
                
                // Fallback: Allow if database says verified but can't check NFT
                // This prevents RPC issues from blocking legitimate users
                return {
                    verified: true,
                    walletAddress: verification.walletAddress,
                    nftAddress: verification.nftMintAddress,
                    warning: 'NFT ownership check failed, using database record'
                };
            }

        } catch (error) {
            console.error('Verification check error:', error);
            return {
                verified: false,
                message: 'Error checking verification status'
            };
        }
    }

    /**
     * Check if a wallet owns a verified NFT
     * @param {string} walletAddress - Solana wallet address
     * @returns {Promise<{verified: boolean, discordId?: string}>}
     */
    async isWalletVerified(walletAddress) {
        try {
            if (!this.db || !this.db.db) {
                return { verified: false };
            }

            const verification = await this.db.db.collection('verifications').findOne({ walletAddress });
            
            if (!verification) {
                return { verified: false };
            }

            return {
                verified: true,
                discordId: verification.discordId,
                nftAddress: verification.nftMintAddress
            };

        } catch (error) {
            console.error('Wallet verification check error:', error);
            return { verified: false };
        }
    }

    /**
     * Get verification stats for a user
     * @param {string} discordId - Discord user ID
     * @returns {Promise<object>}
     */
    async getVerificationStats(discordId) {
        try {
            if (!this.db || !this.db.db) {
                return null;
            }

            const verification = await this.db.db.collection('verifications').findOne({ discordId });
            
            if (!verification) {
                return null;
            }

            return {
                discordId: verification.discordId,
                discordUsername: verification.discordUsername,
                walletAddress: verification.walletAddress,
                nftMintAddress: verification.nftMintAddress,
                verifiedAt: verification.createdAt,
                termsVersion: verification.termsVersion
            };

        } catch (error) {
            console.error('Stats fetch error:', error);
            return null;
        }
    }

    /**
     * Invalidate cache for a user (call after verification changes)
     * @param {string} discordId - Discord user ID
     */
    invalidateCache(discordId) {
        this.cache.delete(discordId);
    }

    /**
     * Clear entire cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Middleware for Discord bot commands
     * Returns a function that can be used to check verification before command execution
     */
    requireVerification() {
        return async (interaction) => {
            const verification = await this.isUserVerified(interaction.user.id);
            
            if (!verification.verified) {
                await interaction.reply({
                    content: `⚠️ **Verification Required**\n\n${verification.message || 'You must verify your account before using this command.'}\n\n🔗 Get verified at: https://jmenichole.github.io/Justthetip/landing.html`,
                    ephemeral: true
                });
                return false;
            }

            return true;
        };
    }
}

module.exports = VerificationChecker;
