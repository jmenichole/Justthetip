-- Kick Integration Database Schema Migration
-- Version: 003
-- Created: 2025-11-11
-- Description: Adds tables for Kick bot integration, passkey authentication, and related features

-- ============================================================================
-- KICK USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS kick_users (
    id SERIAL PRIMARY KEY,
    kick_user_id VARCHAR(255) UNIQUE NOT NULL,
    kick_username VARCHAR(255) NOT NULL,
    discord_user_id VARCHAR(255), -- Optional link to Discord account
    wallet_address VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_kick_users_kick_user_id ON kick_users(kick_user_id);
CREATE INDEX IF NOT EXISTS idx_kick_users_wallet_address ON kick_users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_kick_users_discord_user_id ON kick_users(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_kick_users_kick_username ON kick_users(kick_username);

-- ============================================================================
-- KICK CHANNELS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS kick_channels (
    id SERIAL PRIMARY KEY,
    channel_id VARCHAR(255) UNIQUE NOT NULL,
    channel_slug VARCHAR(255) UNIQUE NOT NULL,
    channel_name VARCHAR(255) NOT NULL,
    streamer_kick_user_id VARCHAR(255) REFERENCES kick_users(kick_user_id) ON DELETE CASCADE,
    bot_enabled BOOLEAN DEFAULT true,
    minimum_tip_amount NUMERIC(20, 8) DEFAULT 0.001,
    tip_notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_kick_channels_channel_id ON kick_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_kick_channels_channel_slug ON kick_channels(channel_slug);
CREATE INDEX IF NOT EXISTS idx_kick_channels_streamer_id ON kick_channels(streamer_kick_user_id);

-- ============================================================================
-- KICK TIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS kick_tips (
    id SERIAL PRIMARY KEY,
    sender_kick_user_id VARCHAR(255) NOT NULL REFERENCES kick_users(kick_user_id) ON DELETE CASCADE,
    recipient_kick_user_id VARCHAR(255) NOT NULL REFERENCES kick_users(kick_user_id) ON DELETE CASCADE,
    channel_id VARCHAR(255) REFERENCES kick_channels(channel_id) ON DELETE SET NULL,
    amount NUMERIC(20, 8) NOT NULL,
    token VARCHAR(10) NOT NULL DEFAULT 'SOL',
    signature VARCHAR(255), -- Solana transaction signature
    message TEXT,
    status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'pending', 'failed', 'refunded'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_kick_tips_sender_id ON kick_tips(sender_kick_user_id);
CREATE INDEX IF NOT EXISTS idx_kick_tips_recipient_id ON kick_tips(recipient_kick_user_id);
CREATE INDEX IF NOT EXISTS idx_kick_tips_channel_id ON kick_tips(channel_id);
CREATE INDEX IF NOT EXISTS idx_kick_tips_created_at ON kick_tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kick_tips_signature ON kick_tips(signature);
CREATE INDEX IF NOT EXISTS idx_kick_tips_status ON kick_tips(status);

-- ============================================================================
-- KICK PENDING TIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS kick_pending_tips (
    id SERIAL PRIMARY KEY,
    sender_kick_user_id VARCHAR(255) NOT NULL REFERENCES kick_users(kick_user_id) ON DELETE CASCADE,
    recipient_username VARCHAR(255) NOT NULL, -- Username, not ID (user not registered yet)
    channel_id VARCHAR(255) REFERENCES kick_channels(channel_id) ON DELETE SET NULL,
    amount NUMERIC(20, 8) NOT NULL,
    token VARCHAR(10) NOT NULL DEFAULT 'SOL',
    message TEXT,
    notified BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_pending_amount CHECK (amount > 0)
);

-- Index for pending tip queries
CREATE INDEX IF NOT EXISTS idx_kick_pending_tips_recipient_username ON kick_pending_tips(recipient_username);
CREATE INDEX IF NOT EXISTS idx_kick_pending_tips_sender_id ON kick_pending_tips(sender_kick_user_id);
CREATE INDEX IF NOT EXISTS idx_kick_pending_tips_expires_at ON kick_pending_tips(expires_at);

-- ============================================================================
-- PASSKEYS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS passkeys (
    id SERIAL PRIMARY KEY,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    user_id VARCHAR(255) NOT NULL, -- Can be Discord or Kick user ID
    platform VARCHAR(50) NOT NULL, -- 'discord' or 'kick'
    counter BIGINT DEFAULT 0,
    transports TEXT[], -- ['usb', 'nfc', 'ble', 'internal']
    aaguid TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Index for fast credential lookups
CREATE INDEX IF NOT EXISTS idx_passkeys_credential_id ON passkeys(credential_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_user_id_platform ON passkeys(user_id, platform);

-- ============================================================================
-- KICK OAUTH TOKENS TABLE (ENCRYPTED)
-- ============================================================================
CREATE TABLE IF NOT EXISTS kick_oauth_tokens (
    id SERIAL PRIMARY KEY,
    kick_user_id VARCHAR(255) UNIQUE NOT NULL REFERENCES kick_users(kick_user_id) ON DELETE CASCADE,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP,
    scope TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_kick_oauth_tokens_kick_user_id ON kick_oauth_tokens(kick_user_id);
CREATE INDEX IF NOT EXISTS idx_kick_oauth_tokens_expires_at ON kick_oauth_tokens(expires_at);

-- ============================================================================
-- KICK REGISTRATION TOKENS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS kick_registration_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    kick_user_id VARCHAR(255) NOT NULL,
    kick_username VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_kick_registration_tokens_token ON kick_registration_tokens(token);
CREATE INDEX IF NOT EXISTS idx_kick_registration_tokens_expires_at ON kick_registration_tokens(expires_at);

-- ============================================================================
-- KICK LEADERBOARD VIEW
-- ============================================================================
CREATE OR REPLACE VIEW kick_channel_leaderboard AS
SELECT
    kt.channel_id,
    ku.kick_username,
    ku.kick_user_id,
    COUNT(kt.id) as tip_count,
    SUM(kt.amount) as total_tipped,
    AVG(kt.amount) as avg_tip_amount,
    MAX(kt.created_at) as last_tip_at
FROM kick_tips kt
JOIN kick_users ku ON kt.sender_kick_user_id = ku.kick_user_id
WHERE kt.status = 'completed'
GROUP BY kt.channel_id, ku.kick_username, ku.kick_user_id
ORDER BY total_tipped DESC;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for kick_users
DROP TRIGGER IF EXISTS update_kick_users_updated_at ON kick_users;
CREATE TRIGGER update_kick_users_updated_at
    BEFORE UPDATE ON kick_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for kick_channels
DROP TRIGGER IF EXISTS update_kick_channels_updated_at ON kick_channels;
CREATE TRIGGER update_kick_channels_updated_at
    BEFORE UPDATE ON kick_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for kick_oauth_tokens
DROP TRIGGER IF EXISTS update_kick_oauth_tokens_updated_at ON kick_oauth_tokens;
CREATE TRIGGER update_kick_oauth_tokens_updated_at
    BEFORE UPDATE ON kick_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Function to clean up expired pending tips
CREATE OR REPLACE FUNCTION cleanup_expired_kick_pending_tips()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM kick_pending_tips
    WHERE expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired registration tokens
CREATE OR REPLACE FUNCTION cleanup_expired_kick_registration_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM kick_registration_tokens
    WHERE expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE kick_users IS 'Kick platform users registered with JustTheTip';
COMMENT ON TABLE kick_channels IS 'Kick channels where the bot is enabled';
COMMENT ON TABLE kick_tips IS 'Completed cryptocurrency tips on Kick';
COMMENT ON TABLE kick_pending_tips IS 'Tips queued for unregistered users (24-hour expiry)';
COMMENT ON TABLE passkeys IS 'WebAuthn/FIDO2 passkeys for passwordless authentication';
COMMENT ON TABLE kick_oauth_tokens IS 'Encrypted OAuth 2.1 tokens for Kick API access';
COMMENT ON TABLE kick_registration_tokens IS 'Temporary tokens for wallet registration links';

-- ============================================================================
-- GRANT PERMISSIONS (if using specific database user)
-- ============================================================================

-- Uncomment if you have a specific database user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO justthetip_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO justthetip_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration
DO $$
BEGIN
    RAISE NOTICE 'Kick Integration Migration 003 completed successfully';
END $$;
