/**
 * JustTheTip - Wallet Helper Utilities
 * Helper functions for tip and airdrop commands to handle wallet creation
 */

const walletManager = require('../db/walletManager');

class WalletHelper {
    
    /**
     * Ensure user has wallet for receiving tip
     * Creates wallet if user doesn't have one
     * @param {string} userId - Discord user ID
     * @param {Object} userData - User context
     * @returns {Object} Wallet info and creation status
     */
    async ensureWalletForTip(userId, userData = {}) {
        try {
            // Check existing wallet first
            let wallet = walletManager.getUserWallet(userId);
            
            if (wallet) {
                return {
                    success: true,
                    wallet: wallet,
                    created: false,
                    message: `Using existing wallet: \`${wallet.wallet_address}\``
                };
            }
            
            // Create new wallet for tip recipient
            const result = await walletManager.createWalletForUser(userId, userData, 'tip');
            
            if (result.success) {
                return {
                    success: true,
                    wallet: result.wallet,
                    created: true,
                    message: `🆕 Created new wallet: \`${result.wallet.wallet_address}\`\n💡 *Auto-generated because you received a tip!*`
                };
            }
            
            throw new Error('Failed to create wallet');
            
        } catch (error) {
            console.error('Error ensuring wallet for tip:', error);
            return {
                success: false,
                error: error.message,
                message: '❌ Failed to create wallet for tip recipient'
            };
        }
    }
    
    /**
     * Ensure user has wallet for receiving airdrop
     * Creates wallet if user doesn't have one
     * @param {string} userId - Discord user ID
     * @param {Object} userData - User context
     * @returns {Object} Wallet info and creation status
     */
    async ensureWalletForAirdrop(userId, userData = {}) {
        try {
            let wallet = walletManager.getUserWallet(userId);
            
            if (wallet) {
                return {
                    success: true,
                    wallet: wallet,
                    created: false,
                    message: `Airdrop sent to: \`${wallet.wallet_address}\``
                };
            }
            
            // Create new wallet for airdrop recipient
            const result = await walletManager.createWalletForUser(userId, userData, 'airdrop');
            
            if (result.success) {
                return {
                    success: true,
                    wallet: result.wallet,
                    created: true,
                    message: `🎁 Created new wallet for airdrop: \`${result.wallet.wallet_address}\`\n💡 *Auto-generated to receive your airdrop!*`
                };
            }
            
            throw new Error('Failed to create wallet');
            
        } catch (error) {
            console.error('Error ensuring wallet for airdrop:', error);
            return {
                success: false,
                error: error.message,
                message: '❌ Failed to create wallet for airdrop recipient'
            };
        }
    }
    
    /**
     * Get user wallet with friendly formatting
     * @param {string} userId - Discord user ID
     * @returns {Object|null} Formatted wallet info
     */
    getUserWalletInfo(userId) {
        const wallet = walletManager.getUserWallet(userId);
        
        if (!wallet) {
            return null;
        }
        
        return {
            address: wallet.wallet_address,
            shortAddress: `${wallet.wallet_address.slice(0, 4)}...${wallet.wallet_address.slice(-4)}`,
            network: wallet.network || 'solana',
            createdAt: new Date(wallet.created_at).toLocaleDateString(),
            authMethod: wallet.auth_method
        };
    }
    
    /**
     * Format wallet creation message for Discord
     * @param {Object} walletResult - Result from ensureWallet functions
     * @param {string} recipientMention - Discord user mention
     * @returns {string} Formatted message
     */
    formatWalletMessage(walletResult, recipientMention) {
        if (!walletResult.success) {
            return walletResult.message;
        }
        
        const baseMessage = walletResult.message;
        
        if (walletResult.created) {
            return `${recipientMention}\n${baseMessage}\n\n🔐 Your wallet is secured and ready to use!\n📝 Use \`/wallet\` to view your wallet details.`;
        }
        
        return `${recipientMention}\n${baseMessage}`;
    }
    
    /**
     * Validate wallet address format
     * @param {string} address - Wallet address to validate
     * @returns {boolean} Is valid Solana address
     */
    isValidSolanaAddress(address) {
        // Basic Solana address validation (base58, 32-44 chars)
        const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
        return solanaRegex.test(address);
    }
}

module.exports = new WalletHelper();