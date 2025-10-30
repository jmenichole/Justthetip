/**
 * Escrow Manager for JustTheTip
 * 
 * Handles pending tips and airdrops for users who haven't registered their wallet yet.
 * When a user receives a tip or airdrop claim before wallet registration,
 * funds are held in escrow until they complete wallet registration.
 */

const { getDb } = require('./database');

class EscrowManager {
    constructor() {
        this.db = null;
    }

    async initialize() {
        this.db = await getDb();
        await this.createIndexes();
    }

    async createIndexes() {
        if (!this.db) return;

        try {
            const escrowCollection = this.db.collection('escrow_pending');
            
            // Index for quick lookups by Discord user
            await escrowCollection.createIndex({ discordUserId: 1 });
            
            // Index for expiration cleanup
            await escrowCollection.createIndex({ expiresAt: 1 });
            
            // Index for status queries
            await escrowCollection.createIndex({ status: 1 });
            
            console.log('[EscrowManager] Indexes created successfully');
        } catch (error) {
            console.error('[EscrowManager] Error creating indexes:', error);
        }
    }

    /**
     * Add a pending tip to escrow
     * Called when someone tips a user who hasn't registered a wallet yet
     */
    async addPendingTip(data) {
        const {
            recipientDiscordId,
            senderDiscordId,
            amount,
            token,
            message,
            guildId,
            channelId
        } = data;

        if (!this.db) {
            console.log('[EscrowManager] Demo mode - would create pending tip:', data);
            return { success: true, demo: true, escrowId: 'demo-' + Date.now() };
        }

        try {
            const escrowEntry = {
                type: 'tip',
                recipientDiscordId,
                senderDiscordId,
                amount: parseFloat(amount),
                token: token.toUpperCase(),
                message: message || null,
                guildId,
                channelId,
                status: 'pending',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                claimedAt: null,
                transactionSignature: null
            };

            const result = await this.db.collection('escrow_pending').insertOne(escrowEntry);

            console.log(`[EscrowManager] Added pending tip to escrow: ${result.insertedId}`);

            return {
                success: true,
                escrowId: result.insertedId.toString(),
                expiresAt: escrowEntry.expiresAt
            };
        } catch (error) {
            console.error('[EscrowManager] Error adding pending tip:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Add a pending airdrop claim to escrow
     * Called when a user claims an airdrop but hasn't registered a wallet
     */
    async addPendingAirdropClaim(data) {
        const {
            recipientDiscordId,
            airdropId,
            shareAmount,
            token,
            creatorDiscordId
        } = data;

        if (!this.db) {
            console.log('[EscrowManager] Demo mode - would create pending airdrop claim:', data);
            return { success: true, demo: true, escrowId: 'demo-claim-' + Date.now() };
        }

        try {
            const escrowEntry = {
                type: 'airdrop_claim',
                recipientDiscordId,
                airdropId,
                creatorDiscordId,
                shareAmount: parseFloat(shareAmount),
                token: token.toUpperCase(),
                status: 'pending',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                claimedAt: null,
                transactionSignature: null
            };

            const result = await this.db.collection('escrow_pending').insertOne(escrowEntry);

            console.log(`[EscrowManager] Added pending airdrop claim to escrow: ${result.insertedId}`);

            return {
                success: true,
                escrowId: result.insertedId.toString(),
                expiresAt: escrowEntry.expiresAt
            };
        } catch (error) {
            console.error('[EscrowManager] Error adding pending airdrop claim:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all pending escrow items for a user
     */
    async getPendingEscrow(discordUserId) {
        if (!this.db) {
            console.log('[EscrowManager] Demo mode - no pending escrow');
            return [];
        }

        try {
            const pending = await this.db.collection('escrow_pending')
                .find({
                    recipientDiscordId: discordUserId,
                    status: 'pending',
                    expiresAt: { $gt: new Date() } // Not expired
                })
                .sort({ createdAt: 1 }) // Oldest first
                .toArray();

            return pending;
        } catch (error) {
            console.error('[EscrowManager] Error getting pending escrow:', error);
            return [];
        }
    }

    /**
     * Get total pending balance by token for a user
     */
    async getPendingBalance(discordUserId) {
        if (!this.db) {
            console.log('[EscrowManager] Demo mode - no pending balance');
            return {};
        }

        try {
            const pending = await this.getPendingEscrow(discordUserId);

            const balances = {};
            for (const item of pending) {
                const token = item.token;
                const amount = item.type === 'tip' ? item.amount : item.shareAmount;

                if (!balances[token]) {
                    balances[token] = 0;
                }
                balances[token] += amount;
            }

            return balances;
        } catch (error) {
            console.error('[EscrowManager] Error calculating pending balance:', error);
            return {};
        }
    }

    /**
     * Claim all pending escrow for a user (called after wallet registration)
     * Returns array of transactions to execute
     */
    async claimAllPending(discordUserId, walletAddress) {
        if (!this.db) {
            console.log('[EscrowManager] Demo mode - would claim pending escrow for', discordUserId);
            return { success: true, demo: true, claimed: [] };
        }

        try {
            const pending = await this.getPendingEscrow(discordUserId);

            if (pending.length === 0) {
                return {
                    success: true,
                    claimed: [],
                    message: 'No pending escrow to claim'
                };
            }

            // Group by token for batched transfers
            const byToken = {};
            for (const item of pending) {
                const token = item.token;
                const amount = item.type === 'tip' ? item.amount : item.shareAmount;

                if (!byToken[token]) {
                    byToken[token] = {
                        totalAmount: 0,
                        items: []
                    };
                }

                byToken[token].totalAmount += amount;
                byToken[token].items.push(item);
            }

            return {
                success: true,
                recipientWallet: walletAddress,
                claimsByToken: byToken,
                totalItems: pending.length,
                message: `${pending.length} pending ${pending.length === 1 ? 'item' : 'items'} ready to claim`
            };
        } catch (error) {
            console.error('[EscrowManager] Error claiming pending escrow:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Mark escrow items as claimed after successful transaction
     */
    async markAsClaimed(escrowIds, transactionSignature) {
        if (!this.db) {
            console.log('[EscrowManager] Demo mode - would mark as claimed:', escrowIds);
            return { success: true, demo: true };
        }

        try {
            const result = await this.db.collection('escrow_pending').updateMany(
                { _id: { $in: escrowIds.map(id => require('mongodb').ObjectId(id)) } },
                {
                    $set: {
                        status: 'claimed',
                        claimedAt: new Date(),
                        transactionSignature
                    }
                }
            );

            console.log(`[EscrowManager] Marked ${result.modifiedCount} items as claimed`);

            return {
                success: true,
                claimedCount: result.modifiedCount
            };
        } catch (error) {
            console.error('[EscrowManager] Error marking as claimed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clean up expired escrow entries
     * Should be run periodically (e.g., daily cron job)
     */
    async cleanupExpired() {
        if (!this.db) {
            console.log('[EscrowManager] Demo mode - would cleanup expired escrow');
            return { success: true, demo: true };
        }

        try {
            // Return expired items to original senders
            const expired = await this.db.collection('escrow_pending')
                .find({
                    status: 'pending',
                    expiresAt: { $lt: new Date() }
                })
                .toArray();

            if (expired.length === 0) {
                return {
                    success: true,
                    expiredCount: 0,
                    message: 'No expired escrow to clean up'
                };
            }

            // Mark as expired (don't delete - keep for records)
            const result = await this.db.collection('escrow_pending').updateMany(
                {
                    status: 'pending',
                    expiresAt: { $lt: new Date() }
                },
                {
                    $set: {
                        status: 'expired',
                        expiredAt: new Date()
                    }
                }
            );

            console.log(`[EscrowManager] Marked ${result.modifiedCount} expired escrow entries`);

            // Return items to be returned to senders
            return {
                success: true,
                expiredCount: result.modifiedCount,
                expiredItems: expired.map(item => ({
                    type: item.type,
                    senderDiscordId: item.senderDiscordId || item.creatorDiscordId,
                    amount: item.amount || item.shareAmount,
                    token: item.token,
                    recipientDiscordId: item.recipientDiscordId
                }))
            };
        } catch (error) {
            console.error('[EscrowManager] Error cleaning up expired escrow:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get statistics about escrow system
     */
    async getStatistics() {
        if (!this.db) {
            return {
                totalPending: 0,
                totalClaimed: 0,
                totalExpired: 0,
                byToken: {}
            };
        }

        try {
            const collection = this.db.collection('escrow_pending');

            const [pending, claimed, expired] = await Promise.all([
                collection.countDocuments({ status: 'pending' }),
                collection.countDocuments({ status: 'claimed' }),
                collection.countDocuments({ status: 'expired' })
            ]);

            // Aggregate by token
            const byToken = await collection.aggregate([
                { $match: { status: 'pending' } },
                {
                    $group: {
                        _id: '$token',
                        count: { $sum: 1 },
                        totalAmount: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$type', 'tip'] },
                                    '$amount',
                                    '$shareAmount'
                                ]
                            }
                        }
                    }
                }
            ]).toArray();

            const tokenStats = {};
            for (const stat of byToken) {
                tokenStats[stat._id] = {
                    count: stat.count,
                    totalAmount: stat.totalAmount
                };
            }

            return {
                totalPending: pending,
                totalClaimed: claimed,
                totalExpired: expired,
                byToken: tokenStats
            };
        } catch (error) {
            console.error('[EscrowManager] Error getting statistics:', error);
            return {
                totalPending: 0,
                totalClaimed: 0,
                totalExpired: 0,
                byToken: {},
                error: error.message
            };
        }
    }
}

// Singleton instance
const escrowManager = new EscrowManager();

module.exports = {
    escrowManager,
    initializeEscrow: async () => {
        await escrowManager.initialize();
        return escrowManager;
    }
};
