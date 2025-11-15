/**
 * Migration script: Clean up pre-generation system and setup on-demand wallets
 * Run this once to migrate from the old pre-gen system
 */

const walletManager = require('../db/walletManager');
const sqlite = require('../db/db.js');

async function migrateToOnDemandSystem() {
    console.log('🔄 Starting migration to on-demand wallet system...');
    
    try {
        // 1. Initialize new wallet tables
        console.log('📋 Initializing new wallet tables...');
        walletManager.initializeWalletTables();
        
        // 2. Check if old pregen tables exist and migrate claimed wallets
        console.log('🔍 Checking for existing pre-generated wallets...');
        
        try {
            const checkPregenTable = sqlite.db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='pregen_wallets'
            `);
            
            const pregenExists = checkPregenTable.get();
            
            if (pregenExists) {
                console.log('📦 Found pre-generated wallets table, migrating claimed wallets...');
                
                // Get all claimed wallets from old system
                const getClaimedWallets = sqlite.db.prepare(`
                    SELECT * FROM pregen_wallets 
                    WHERE status = 'claimed' AND claimed_by IS NOT NULL
                `);
                
                const claimedWallets = getClaimedWallets.all();
                console.log(`Found ${claimedWallets.length} claimed wallets to migrate`);
                
                // Migrate each claimed wallet to new system
                let migrated = 0;
                for (const wallet of claimedWallets) {
                    try {
                        const insertWallet = sqlite.db.prepare(`
                            INSERT OR IGNORE INTO user_wallets (
                                user_id, wallet_address, wallet_id, private_key_encrypted,
                                network, auth_method, created_at, created_trigger,
                                discord_username, user_email
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);
                        
                        insertWallet.run(
                            wallet.claimed_by,
                            wallet.public_key,
                            wallet.wallet_id,
                            wallet.private_key_encrypted,
                            wallet.network || 'solana',
                            'migrated-pregen',
                            wallet.claimed_at || wallet.created_at,
                            'migration',
                            wallet.discord_username,
                            wallet.user_email
                        );
                        
                        migrated++;
                    } catch (error) {
                        console.warn(`Failed to migrate wallet ${wallet.wallet_id}:`, error.message);
                    }
                }
                
                console.log(`✅ Successfully migrated ${migrated} claimed wallets`);
            } else {
                console.log('ℹ️ No pre-generated wallets table found, starting fresh');
            }
            
        } catch (error) {
            console.log('ℹ️ No existing pre-gen data to migrate');
        }
        
        // 3. Show final statistics
        const stats = walletManager.getWalletStats();
        console.log('\n📊 Final wallet statistics:');
        console.log(`   Total wallets: ${stats.total}`);
        console.log(`   Migrated wallets: ${stats.total}`);
        
        console.log('\n✅ Migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Update your tip/airdrop commands to use walletHelper.ensureWalletForTip()');
        console.log('   2. Test the new on-demand wallet creation');
        console.log('   3. Set WALLET_ENCRYPTION_KEY environment variable in production');
        console.log('   4. Remove old pregenWalletDb.js file');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateToOnDemandSystem().then(() => {
        console.log('Migration script completed');
        process.exit(0);
    }).catch(error => {
        console.error('Migration script failed:', error);
        process.exit(1);
    });
}

module.exports = { migrateToOnDemandSystem };