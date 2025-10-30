# Escrow System Integration Guide

## Overview

The escrow system handles scenarios where users receive tips or claim airdrops **before** they've registered their Solana wallet. Instead of losing these funds, they're held in MongoDB escrow and automatically claimed when the user registers.

## Architecture

```
User receives tip/airdrop
        ↓
Is wallet registered?
        ├─ YES → Transfer immediately
        └─ NO  → Add to escrow_pending collection
                      ↓
                 User registers wallet
                      ↓
                 Auto-claim all pending
                      ↓
                 Batch transfer to user
```

## Database Schema

### `escrow_pending` Collection

```javascript
{
    _id: ObjectId,
    type: 'tip' | 'airdrop_claim',
    recipientDiscordId: String,
    
    // For tips
    senderDiscordId: String,
    amount: Number,
    message: String,
    guildId: String,
    channelId: String,
    
    // For airdrop claims
    airdropId: String,
    creatorDiscordId: String,
    shareAmount: Number,
    
    // Common fields
    token: String,              // 'SOL', 'USDC', etc.
    status: 'pending' | 'claimed' | 'expired',
    createdAt: Date,
    expiresAt: Date,           // 30 days from creation
    claimedAt: Date | null,
    transactionSignature: String | null
}
```

## Integration Points

### 1. Tip Command (`/tip`)

```javascript
// In commands/tip.js or wherever tips are processed

const { escrowManager } = require('../db/escrowManager');
const { getWallet } = require('../db/database');

// When processing a tip
const recipientWallet = await getWallet(recipientUserId);

if (!recipientWallet) {
    // Recipient hasn't registered - add to escrow
    const escrowResult = await escrowManager.addPendingTip({
        recipientDiscordId: recipientUserId,
        senderDiscordId: interaction.user.id,
        amount: tipAmount,
        token: 'SOL', // or whatever token
        message: tipMessage,
        guildId: interaction.guildId,
        channelId: interaction.channelId
    });
    
    if (escrowResult.success) {
        return interaction.reply({
            content: `💸 Tip sent! **${recipientUser.tag}** hasn't registered their wallet yet.\n` +
                     `✅ Your tip of **${tipAmount} ${token}** has been held in escrow.\n` +
                     `They have **30 days** to register and claim it with \`/register\`.`
        });
    }
} else {
    // Normal tip processing - transfer immediately
    // ... existing tip logic
}
```

### 2. Airdrop Claim Command (`/claim`)

```javascript
// In airdrop claim logic

const { escrowManager } = require('../db/escrowManager');
const { getWallet } = require('../db/database');

// When user claims their airdrop share
const claimerWallet = await getWallet(interaction.user.id);

if (!claimerWallet) {
    // User hasn't registered - add to escrow
    const escrowResult = await escrowManager.addPendingAirdropClaim({
        recipientDiscordId: interaction.user.id,
        airdropId: airdrop.id,
        shareAmount: airdrop.shareAmount,
        token: airdrop.token,
        creatorDiscordId: airdrop.creatorId
    });
    
    if (escrowResult.success) {
        return interaction.reply({
            content: `🎁 Airdrop claim recorded!\n` +
                     `Your share of **${airdrop.shareAmount} ${airdrop.token}** is waiting for you.\n` +
                     `Register your wallet with \`/register <address>\` to claim it!`,
            ephemeral: true
        });
    }
}
```

### 3. Register Command (`/register`)

```javascript
// In commands/register.js

const { escrowManager } = require('../db/escrowManager');
const { registerWallet } = require('../db/database');

// After successful wallet registration
await registerWallet(userId, 'SOL', walletAddress);

// Check for pending escrow
const pendingBalance = await escrowManager.getPendingBalance(userId);

if (Object.keys(pendingBalance).length > 0) {
    let balanceText = '';
    for (const [token, amount] of Object.entries(pendingBalance)) {
        balanceText += `**${amount.toFixed(6)} ${token}**\n`;
    }
    
    await interaction.followUp({
        content: `🎉 Great news! You have unclaimed funds waiting:\n\n` +
                 balanceText +
                 `\nUse \`/claim-pending\` to view details and claim them!`,
        ephemeral: true
    });
}
```

### 4. Bot Startup (Initialize Escrow)

```javascript
// In bot_smart_contract.js or main bot file

const { initializeEscrow } = require('./db/escrowManager');

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    // Initialize escrow manager
    await initializeEscrow();
    console.log('Escrow manager initialized');
    
    // ... rest of startup code
});
```

## New Commands

### `/claim-pending`
Shows user all their pending tips and airdrops. Already created in `commands/claim-pending.js`.

Usage:
```
/claim-pending
```

### `/escrow-stats` (Admin Only)

```javascript
// Create commands/escrow-stats.js for admins

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { escrowManager } = require('../db/escrowManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('escrow-stats')
        .setDescription('[Admin] View escrow system statistics')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const stats = await escrowManager.getStatistics();

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📊 Escrow System Statistics')
            .addFields(
                { name: '⏳ Pending', value: stats.totalPending.toString(), inline: true },
                { name: '✅ Claimed', value: stats.totalClaimed.toString(), inline: true },
                { name: '⌛ Expired', value: stats.totalExpired.toString(), inline: true }
            );

        if (Object.keys(stats.byToken).length > 0) {
            let tokenText = '';
            for (const [token, data] of Object.entries(stats.byToken)) {
                tokenText += `${token}: ${data.count} items (${data.totalAmount.toFixed(6)} total)\n`;
            }
            embed.addFields({ name: 'By Token', value: tokenText });
        }

        await interaction.editReply({ embeds: [embed] });
    }
};
```

## Cron Job for Expiration Cleanup

Add this to your bot or use PM2 ecosystem config:

```javascript
// Add to bot startup

const cron = require('node-cron');

// Run cleanup daily at 2 AM
cron.schedule('0 2 * * *', async () => {
    console.log('[Cron] Running escrow cleanup...');
    const result = await escrowManager.cleanupExpired();
    
    if (result.success && result.expiredCount > 0) {
        console.log(`[Cron] Cleaned up ${result.expiredCount} expired escrow items`);
        
        // Optional: Notify senders that their tips expired and were returned
        // This would require returning funds to sender wallets
    }
});
```

## Testing Checklist

### Test Scenario 1: Tip to Unregistered User
1. User A has wallet registered
2. User B does NOT have wallet registered
3. User A tips User B with `/tip @UserB 0.1 sol`
4. Verify: Tip goes to escrow, User B notified
5. User B registers with `/register <address>`
6. User B runs `/claim-pending`
7. Verify: 0.1 SOL shows in pending
8. Implement claim execution
9. Verify: 0.1 SOL transferred to User B's wallet

### Test Scenario 2: Airdrop Claim Before Registration
1. User A creates airdrop with `/airdrop`
2. User B (unregistered) claims with `/claim`
3. Verify: Claim recorded in escrow
4. User B registers wallet
5. User B runs `/claim-pending`
6. Verify: Airdrop share shows in pending

### Test Scenario 3: Multiple Pending Items
1. User has 3 tips and 2 airdrop claims pending
2. User registers wallet
3. Run `/claim-pending`
4. Verify: All 5 items shown, grouped by token
5. Verify: Correct total amounts calculated

### Test Scenario 4: Expiration
1. Manually set `expiresAt` to past date in database
2. Run cleanup: `escrowManager.cleanupExpired()`
3. Verify: Items marked as expired
4. Verify: Items no longer show in `/claim-pending`

## Environment Variables

No new environment variables needed! Escrow uses the existing MongoDB connection.

## Performance Considerations

### Indexes
The escrow manager creates these indexes on startup:
- `discordUserId` - Fast user lookups
- `expiresAt` - Fast expiration cleanup
- `status` - Fast status filtering

### Batching
When claiming, items are grouped by token for efficient batch transfers:
```javascript
// Instead of 5 separate transactions:
// 0.1 SOL, 0.2 SOL, 0.3 SOL, 0.1 USDC, 0.2 USDC

// Do 2 batch transactions:
// 0.6 SOL (combined)
// 0.3 USDC (combined)
```

## Security Considerations

1. **30-Day Expiration**: Prevents indefinite escrow
2. **Status Tracking**: Prevents double-claiming
3. **Transaction Signatures**: Verify on-chain completion
4. **Admin Stats**: Monitor for abuse patterns

## Migration Plan

If you have existing users who received tips before this system:

1. No action needed - system only affects future tips
2. Optionally announce the new feature in your Discord
3. Users who previously "lost" tips can't retroactively claim them
4. Going forward, all tips to unregistered users are protected

## Questions?

- Check escrow balance: `/claim-pending`
- Check system stats: `/escrow-stats` (admin only)
- View logs: `grep '\[EscrowManager\]' justthetip.log`

---

**Status**: Escrow system ready to integrate
**Files Created**:
- `db/escrowManager.js` - Core escrow logic
- `commands/claim-pending.js` - User-facing claim command
- `ESCROW_INTEGRATION_GUIDE.md` - This document
