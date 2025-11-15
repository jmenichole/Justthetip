-- Migration: Add Pre-Generated Wallets Support
-- Creates tables for Solana wallet pre-generation system

-- ==========================================
-- PRE-GENERATED WALLETS TABLE
-- ==========================================

-- Pre-generated wallets pool
CREATE TABLE IF NOT EXISTS pregen_wallets (
    id SERIAL PRIMARY KEY,
    wallet_id VARCHAR(255) UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    private_key_encrypted TEXT NOT NULL, -- Encrypted private key
    network VARCHAR(50) DEFAULT 'solana',
    status VARCHAR(50) DEFAULT 'available', -- available, reserved, claimed, expired
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    reserved_at BIGINT,
    claimed_at BIGINT,
    claimed_by VARCHAR(255), -- Discord user ID who claimed it
    auth_method VARCHAR(50), -- pregen, magic, walletconnect
    user_email VARCHAR(255),
    discord_username VARCHAR(255)
);

-- Critical indexes for pregen_wallets table
CREATE INDEX IF NOT EXISTS idx_pregen_wallets_status ON pregen_wallets(status);
CREATE INDEX IF NOT EXISTS idx_pregen_wallets_created_at ON pregen_wallets(created_at);
CREATE INDEX IF NOT EXISTS idx_pregen_wallets_expires_at ON pregen_wallets(expires_at);
CREATE INDEX IF NOT EXISTS idx_pregen_wallets_claimed_by ON pregen_wallets(claimed_by);
CREATE INDEX IF NOT EXISTS idx_pregen_wallets_wallet_id ON pregen_wallets(wallet_id);

-- ==========================================
-- WALLET POOL STATISTICS TABLE
-- ==========================================

-- Track wallet pool statistics over time
CREATE TABLE IF NOT EXISTS pregen_wallet_stats (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    available_count INTEGER DEFAULT 0,
    reserved_count INTEGER DEFAULT 0,
    claimed_count INTEGER DEFAULT 0,
    expired_count INTEGER DEFAULT 0,
    total_generated INTEGER DEFAULT 0,
    pool_health VARCHAR(50) DEFAULT 'unknown' -- healthy, low, critical, error
);

-- Index for stats table
CREATE INDEX IF NOT EXISTS idx_pregen_stats_timestamp ON pregen_wallet_stats(timestamp DESC);

-- ==========================================
-- UPDATE EXISTING TABLES
-- ==========================================

-- Add pre-generation support to existing wallet_registrations table
ALTER TABLE wallet_registrations 
ADD COLUMN IF NOT EXISTS pregen_wallet_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS auth_method VARCHAR(50) DEFAULT 'walletconnect',
ADD COLUMN IF NOT EXISTS registration_speed_ms INTEGER;

-- Add index for pregen wallet ID lookup
CREATE INDEX IF NOT EXISTS idx_wallet_reg_pregen_id ON wallet_registrations(pregen_wallet_id);

-- Add pre-generation support to existing users table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS pregen_wallet_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS wallet_generation_method VARCHAR(50) DEFAULT 'traditional';
        
        CREATE INDEX IF NOT EXISTS idx_users_pregen_wallet_id ON users(pregen_wallet_id);
    END IF;
END $$;

-- ==========================================
-- FUNCTIONS FOR WALLET POOL MANAGEMENT
-- ==========================================

-- Function to get available wallet count
CREATE OR REPLACE FUNCTION get_available_wallet_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM pregen_wallets WHERE status = 'available' AND expires_at > EXTRACT(epoch FROM NOW()) * 1000);
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired wallets
CREATE OR REPLACE FUNCTION cleanup_expired_pregen_wallets()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE pregen_wallets 
    SET status = 'expired' 
    WHERE status IN ('available', 'reserved') 
    AND expires_at < EXTRACT(epoch FROM NOW()) * 1000;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO pregen_wallet_stats (
        timestamp, 
        available_count, 
        reserved_count, 
        claimed_count, 
        expired_count,
        total_generated,
        pool_health
    ) 
    SELECT 
        EXTRACT(epoch FROM NOW()) * 1000,
        COUNT(*) FILTER (WHERE status = 'available'),
        COUNT(*) FILTER (WHERE status = 'reserved'),
        COUNT(*) FILTER (WHERE status = 'claimed'),
        COUNT(*) FILTER (WHERE status = 'expired'),
        COUNT(*),
        CASE 
            WHEN COUNT(*) FILTER (WHERE status = 'available') >= 20 THEN 'healthy'
            WHEN COUNT(*) FILTER (WHERE status = 'available') >= 10 THEN 'low'
            ELSE 'critical'
        END
    FROM pregen_wallets;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get pool statistics
CREATE OR REPLACE FUNCTION get_pregen_wallet_stats()
RETURNS TABLE(
    available INTEGER,
    reserved INTEGER,
    claimed INTEGER,
    expired INTEGER,
    total INTEGER,
    health_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'available')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'reserved')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'claimed')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'expired')::INTEGER,
        COUNT(*)::INTEGER,
        CASE 
            WHEN COUNT(*) FILTER (WHERE status = 'available') >= 20 THEN 'healthy'
            WHEN COUNT(*) FILTER (WHERE status = 'available') >= 10 THEN 'low'
            ELSE 'critical'
        END
    FROM pregen_wallets;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE pregen_wallets IS 'Pre-generated Solana wallets pool for instant user registration';
COMMENT ON TABLE pregen_wallet_stats IS 'Historical statistics and health monitoring for wallet pool';

COMMENT ON COLUMN pregen_wallets.wallet_id IS 'Unique identifier for the pre-generated wallet';
COMMENT ON COLUMN pregen_wallets.private_key_encrypted IS 'Encrypted private key (decrypted only when claimed)';
COMMENT ON COLUMN pregen_wallets.status IS 'Wallet status: available, reserved, claimed, expired';
COMMENT ON COLUMN pregen_wallets.claimed_by IS 'Discord user ID who claimed this wallet';

-- ==========================================
-- INITIAL DATA AND MAINTENANCE
-- ==========================================

-- Insert initial stats record
INSERT INTO pregen_wallet_stats (
    timestamp, 
    available_count, 
    reserved_count, 
    claimed_count, 
    expired_count,
    total_generated,
    pool_health
) VALUES (
    EXTRACT(epoch FROM NOW()) * 1000,
    0, 0, 0, 0, 0, 'empty'
) ON CONFLICT DO NOTHING;

-- ==========================================
-- MAINTENANCE NOTES
-- ==========================================
-- To manually run cleanup: SELECT cleanup_expired_pregen_wallets();
-- To check pool stats: SELECT * FROM get_pregen_wallet_stats();
-- To get available count: SELECT get_available_wallet_count();

-- Consider setting up a cron job for automatic cleanup:
-- SELECT cron.schedule('cleanup-pregen-wallets', '0 */4 * * *', 'SELECT cleanup_expired_pregen_wallets();');