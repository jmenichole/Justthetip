-- JustTheTip PostgreSQL/Supabase Database Schema
-- ACID-compliant schema for real money operations
-- Compatible with Supabase and PostgreSQL 15+

-- ==========================================
-- CORE USER TABLES
-- ==========================================

-- Users table with proper constraints
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- Balances table with proper decimal handling for financial data
CREATE TABLE IF NOT EXISTS balances (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount NUMERIC(20, 8) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(user_id, currency)
);

-- Critical indexes for balances table
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON balances(user_id);
CREATE INDEX IF NOT EXISTS idx_balances_currency ON balances(currency);
CREATE INDEX IF NOT EXISTS idx_balances_user_currency ON balances(user_id, currency);

-- Transactions table for audit trail (ACID compliance requirement)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(50) NOT NULL,
    sender_id VARCHAR(255),
    recipient_id VARCHAR(255),
    amount NUMERIC(20, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (recipient_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Critical indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recipient ON transactions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- ==========================================
-- TIPS SYSTEM TABLES
-- ==========================================

-- Tips table for recording tip transactions (formerly MongoDB collection)
CREATE TABLE IF NOT EXISTS tips (
    id SERIAL PRIMARY KEY,
    sender VARCHAR(255) NOT NULL,
    receiver VARCHAR(255) NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    signature TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for tips table
CREATE INDEX IF NOT EXISTS idx_tips_sender ON tips(sender);
CREATE INDEX IF NOT EXISTS idx_tips_receiver ON tips(receiver);
CREATE INDEX IF NOT EXISTS idx_tips_created_at ON tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_signature ON tips(signature);

-- ==========================================
-- TRUST BADGES AND REPUTATION
-- ==========================================

-- Trust badges table (formerly MongoDB collection)
CREATE TABLE IF NOT EXISTS trust_badges (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(255) UNIQUE NOT NULL,
    wallet_address TEXT NOT NULL,
    mint_address TEXT NOT NULL,
    reputation_score INTEGER DEFAULT 0,
    discord_username VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for trust_badges table
CREATE INDEX IF NOT EXISTS idx_trust_badges_discord_id ON trust_badges(discord_id);
CREATE INDEX IF NOT EXISTS idx_trust_badges_wallet ON trust_badges(wallet_address);
CREATE INDEX IF NOT EXISTS idx_trust_badges_mint ON trust_badges(mint_address);

-- ==========================================
-- WALLET REGISTRATION SYSTEM
-- ==========================================

-- Wallet registrations table (enhanced from MongoDB collection)
CREATE TABLE IF NOT EXISTS wallet_registrations (
    id SERIAL PRIMARY KEY,
    discord_user_id VARCHAR(255) UNIQUE NOT NULL,
    discord_username VARCHAR(255),
    wallet_address TEXT NOT NULL,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nonce TEXT,
    message_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for wallet_registrations table
CREATE INDEX IF NOT EXISTS idx_wallet_reg_discord_user ON wallet_registrations(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_reg_wallet_addr ON wallet_registrations(wallet_address);

-- Registration nonces table (formerly MongoDB collection with TTL)
CREATE TABLE IF NOT EXISTS registration_nonces (
    id SERIAL PRIMARY KEY,
    nonce VARCHAR(255) UNIQUE NOT NULL,
    discord_user_id VARCHAR(255) NOT NULL,
    discord_username VARCHAR(255),
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for registration_nonces table
CREATE INDEX IF NOT EXISTS idx_reg_nonces_nonce ON registration_nonces(nonce);
CREATE INDEX IF NOT EXISTS idx_reg_nonces_created_at ON registration_nonces(created_at);
CREATE INDEX IF NOT EXISTS idx_reg_nonces_discord_user ON registration_nonces(discord_user_id);

-- ==========================================
-- VERIFICATION AND NFT SYSTEM
-- ==========================================

-- Verifications table (formerly MongoDB collection)
CREATE TABLE IF NOT EXISTS verifications (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(255) UNIQUE NOT NULL,
    discord_username VARCHAR(255),
    wallet_address TEXT NOT NULL,
    terms_version VARCHAR(50),
    timestamp VARCHAR(255),
    verified BOOLEAN DEFAULT TRUE,
    nft_mint_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for verifications table
CREATE INDEX IF NOT EXISTS idx_verifications_discord_id ON verifications(discord_id);
CREATE INDEX IF NOT EXISTS idx_verifications_wallet ON verifications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_verifications_nft_mint ON verifications(nft_mint_address);

-- ==========================================
-- SUPPORT TICKETS SYSTEM
-- ==========================================

-- Tickets table (formerly MongoDB collection)
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(255) NOT NULL,
    discord_username VARCHAR(255),
    subject TEXT,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(50) DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for tickets table
CREATE INDEX IF NOT EXISTS idx_tickets_discord_id ON tickets(discord_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- ==========================================
-- AIRDROPS SYSTEM
-- ==========================================

-- Airdrops table for managing airdrop campaigns
CREATE TABLE IF NOT EXISTS airdrops (
    id SERIAL PRIMARY KEY,
    airdrop_id VARCHAR(255) UNIQUE NOT NULL,
    creator_id VARCHAR(255) NOT NULL,
    creator_name VARCHAR(255),
    currency VARCHAR(10) NOT NULL,
    total_amount NUMERIC(20, 8) NOT NULL,
    amount_per_user NUMERIC(20, 8) NOT NULL,
    max_recipients INTEGER NOT NULL,
    claimed_count INTEGER DEFAULT 0,
    message TEXT,
    duration TEXT,
    expires_at BIGINT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    message_id VARCHAR(255),
    channel_id VARCHAR(255),
    guild_id VARCHAR(255),
    claimed_users TEXT[], -- Array of user IDs who claimed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for airdrops table
CREATE INDEX IF NOT EXISTS idx_airdrops_id ON airdrops(airdrop_id);
CREATE INDEX IF NOT EXISTS idx_airdrops_creator ON airdrops(creator_id);
CREATE INDEX IF NOT EXISTS idx_airdrops_expires_at ON airdrops(expires_at);
CREATE INDEX IF NOT EXISTS idx_airdrops_active ON airdrops(active);

-- Pending airdrops table for users who claim without wallet registration
CREATE TABLE IF NOT EXISTS pending_airdrops (
    id SERIAL PRIMARY KEY,
    airdrop_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    amount NUMERIC(20, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at BIGINT NOT NULL,
    credited BOOLEAN DEFAULT FALSE,
    UNIQUE(airdrop_id, user_id)
);

-- Indexes for pending_airdrops table
CREATE INDEX IF NOT EXISTS idx_pending_airdrops_user ON pending_airdrops(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_airdrops_airdrop ON pending_airdrops(airdrop_id);
CREATE INDEX IF NOT EXISTS idx_pending_airdrops_expires ON pending_airdrops(expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_airdrops_credited ON pending_airdrops(credited);

-- ==========================================
-- FUNCTIONS AND TRIGGERS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to clean up expired nonces (similar to MongoDB TTL index)
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS void AS $$
BEGIN
    DELETE FROM registration_nonces 
    WHERE created_at < NOW() - INTERVAL '10 minutes';
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_balances_updated_at BEFORE UPDATE ON balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trust_badges_updated_at BEFORE UPDATE ON trust_badges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE tips IS 'Records all tip transactions between users';
COMMENT ON TABLE trust_badges IS 'Stores NFT trust badges and reputation scores';
COMMENT ON TABLE wallet_registrations IS 'Tracks verified wallet registrations for Discord users';
COMMENT ON TABLE registration_nonces IS 'Temporary nonces for wallet verification (auto-cleanup after 10 minutes)';
COMMENT ON TABLE verifications IS 'Stores NFT verification data for Discord users';
COMMENT ON TABLE tickets IS 'Support ticket system for user issues';

-- ==========================================
-- MAINTENANCE NOTES
-- ==========================================
-- To manually run nonce cleanup: SELECT cleanup_expired_nonces();
-- Consider setting up a cron job or pg_cron extension for automatic cleanup:
-- SELECT cron.schedule('cleanup-nonces', '*/5 * * * *', 'SELECT cleanup_expired_nonces();');
