/**
 * Example: How to integrate on-demand wallet creation into tip commands
 * Replace your existing tip command logic with this pattern
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const walletHelper = require('../utils/walletHelper');
// Your existing imports...

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tip')
        .setDescription('Tip another user with SOL')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to tip')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount to tip in SOL')
                .setRequired(true)
                .setMinValue(0.001)),

    async execute(interaction) {
        try {
            const recipient = interaction.options.getUser('user');
            const amount = interaction.options.getNumber('amount');
            const tipper = interaction.user;

            // Prevent self-tipping
            if (recipient.id === tipper.id) {
                return interaction.reply({
                    content: '❌ You cannot tip yourself!',
                    ephemeral: true
                });
            }

            // Prevent tipping bots
            if (recipient.bot) {
                return interaction.reply({
                    content: '❌ You cannot tip bots!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            // 1. Check if tipper has wallet and sufficient balance
            const tipperWallet = walletHelper.getUserWalletInfo(tipper.id);
            if (!tipperWallet) {
                return interaction.editReply({
                    content: '❌ You need to create a wallet first! Use `/wallet create`'
                });
            }

            // Check balance (implement your balance checking logic)
            const balance = await checkWalletBalance(tipperWallet.address);
            if (balance < amount) {
                return interaction.editReply({
                    content: `❌ Insufficient balance! You have ${balance} SOL, need ${amount} SOL`
                });
            }

            // 2. Ensure recipient has wallet (create if needed)
            const recipientData = {
                username: recipient.username,
                discriminator: recipient.discriminator
            };

            const walletResult = await walletHelper.ensureWalletForTip(recipient.id, recipientData);

            if (!walletResult.success) {
                return interaction.editReply({
                    content: walletResult.message
                });
            }

            // 3. Process the tip transaction
            const transactionResult = await processTipTransaction({
                from: tipperWallet.address,
                to: walletResult.wallet.wallet_address,
                amount: amount,
                tipperUserId: tipper.id
            });

            if (!transactionResult.success) {
                return interaction.editReply({
                    content: `❌ Transaction failed: ${transactionResult.error}`
                });
            }

            // 4. Create success embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('💰 Tip Sent Successfully!')
                .addFields(
                    { name: '👤 From', value: `${tipper}`, inline: true },
                    { name: '👤 To', value: `${recipient}`, inline: true },
                    { name: '💰 Amount', value: `${amount} SOL`, inline: true },
                    { name: '🔗 Transaction', value: `[View on Solscan](https://solscan.io/tx/${transactionResult.signature})` }
                )
                .setTimestamp();

            // Add wallet creation notice if new wallet was created
            if (walletResult.created) {
                embed.addFields({
                    name: '🆕 New Wallet Created',
                    value: `${recipient} didn't have a wallet, so we created one automatically!\nWallet: \`${walletResult.wallet.wallet_address}\``
                });
            }

            await interaction.editReply({
                embeds: [embed]
            });

            // Send DM to recipient if wallet was created
            if (walletResult.created) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('🎉 You received a tip!')
                        .setDescription(`You received ${amount} SOL from ${tipper.username}!`)
                        .addFields(
                            { name: '🆕 Your New Wallet', value: `\`${walletResult.wallet.wallet_address}\`` },
                            { name: '🔐 Security', value: 'Your wallet is encrypted and secure. Use `/wallet` commands to manage it.' },
                            { name: '💡 Next Steps', value: '• Use `/wallet balance` to check your balance\n• Use `/wallet send` to send SOL to others\n• Use `/wallet export` to get your private key (be careful!)' }
                        )
                        .setTimestamp();

                    await recipient.send({ embeds: [dmEmbed] });
                } catch (dmError) {
                    console.log('Could not send DM to recipient:', dmError.message);
                }
            }

        } catch (error) {
            console.error('Error in tip command:', error);
            
            const errorMessage = interaction.deferred ? 
                { content: '❌ An error occurred while processing the tip.' } :
                { content: '❌ An error occurred while processing the tip.', ephemeral: true };
                
            if (interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
};

/**
 * Example balance checking function
 * Replace with your actual Solana balance checking logic
 */
async function checkWalletBalance(walletAddress) {
    // Your Solana RPC call to get balance
    // Return balance in SOL
    return 0.5; // placeholder
}

/**
 * Example transaction processing function
 * Replace with your actual Solana transaction logic
 */
async function processTipTransaction({ from, to, amount, tipperUserId }) {
    try {
        // Your transaction logic here
        // 1. Get tipper's private key
        // 2. Create and sign transaction
        // 3. Send transaction
        // 4. Wait for confirmation
        
        return {
            success: true,
            signature: 'example_transaction_signature_hash'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}