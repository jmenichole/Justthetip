/**
 * /claim-pending Command
 * 
 * Allows users to claim tips and airdrops that were sent to them
 * before they registered their wallet.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { escrowManager } = require('../db/escrowManager');
const { getWallet } = require('../db/database');
const { Connection, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim-pending')
        .setDescription('Claim tips and airdrops you received before registering your wallet'),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const userId = interaction.user.id;

            // Check if user has registered wallet
            const userWallet = await getWallet(userId);
            
            if (!userWallet) {
                return interaction.editReply({
                    content: '❌ You must register a wallet first using `/register <your-solana-address>`',
                    ephemeral: true
                });
            }

            // Get pending escrow
            const pending = await escrowManager.getPendingEscrow(userId);

            if (pending.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('📦 No Pending Claims')
                    .setDescription('You don\'t have any unclaimed tips or airdrops.')
                    .setFooter({ text: 'JustTheTip - Non-Custodial Tipping' });

                return interaction.editReply({ embeds: [embed] });
            }

            // Prepare claim summary
            const claimResult = await escrowManager.claimAllPending(userId, userWallet);

            if (!claimResult.success) {
                return interaction.editReply({
                    content: `❌ Error preparing claims: ${claimResult.error}`,
                    ephemeral: true
                });
            }

            // Build embed showing what will be claimed
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎁 Pending Claims Ready!')
                .setDescription(`You have **${claimResult.totalItems}** unclaimed ${claimResult.totalItems === 1 ? 'item' : 'items'} waiting for you!`)
                .setFooter({ text: 'JustTheTip - Non-Custodial Tipping' });

            // Add fields for each token
            for (const [token, data] of Object.entries(claimResult.claimsByToken)) {
                const itemCount = data.items.length;
                const totalAmount = data.totalAmount.toFixed(6);

                embed.addFields({
                    name: `${token}`,
                    value: `**${totalAmount}** ${token} from ${itemCount} ${itemCount === 1 ? 'transaction' : 'transactions'}`,
                    inline: true
                });
            }

            embed.addFields({
                name: '\n💡 How to Claim',
                value: 'Your pending funds will be automatically transferred when you use `/claim-all` or when you receive your next tip.\n\n' +
                       '⏰ **Expiration**: Unclaimed items expire after 30 days and are returned to the sender.'
            });

            // Show detailed list
            let detailsText = '**Pending Items:**\n';
            for (const item of pending.slice(0, 10)) { // Show max 10 items
                const amount = item.type === 'tip' ? item.amount : item.shareAmount;
                const type = item.type === 'tip' ? 'Tip' : 'Airdrop Claim';
                const date = new Date(item.createdAt).toLocaleDateString();
                detailsText += `• ${amount} ${item.token} - ${type} (${date})\n`;
            }

            if (pending.length > 10) {
                detailsText += `\n...and ${pending.length - 10} more`;
            }

            embed.addFields({
                name: '\n📋 Details',
                value: detailsText
            });

            await interaction.editReply({ embeds: [embed] });

            // Auto-claim functionality
            // Note: This would require actual Solana transaction execution
            // For now, just notify user
            await interaction.followUp({
                content: '✅ To complete the claim, use the `/claim-all` command. This will transfer all pending funds to your registered wallet.',
                ephemeral: true
            });

        } catch (error) {
            console.error('[ClaimPending] Error:', error);
            
            if (interaction.deferred) {
                return interaction.editReply({
                    content: '❌ An error occurred while checking your pending claims. Please try again later.',
                    ephemeral: true
                });
            } else {
                return interaction.reply({
                    content: '❌ An error occurred while checking your pending claims. Please try again later.',
                    ephemeral: true
                });
            }
        }
    }
};
