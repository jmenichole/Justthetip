/**
 * Secure Discord Bot Commands
 * Implements wallet connection, withdrawal approvals, and multi-sig
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { LAMPORTS_PER_SOL } = require('@solana/web3.js');

class SecureCommands {
  constructor(walletManager, withdrawalQueue, multiSigManager, database) {
    this.walletManager = walletManager;
    this.withdrawalQueue = withdrawalQueue;
    this.multiSig = multiSigManager;
    this.db = database;
  }

  // ============ USER WALLET CONNECTION COMMANDS ============

  /**
   * /connectwallet - Start wallet connection process
   */
  async connectWallet(interaction) {
    try {
      const userId = interaction.user.id;
      
      // Check if already connected
      const existing = await this.walletManager.getConnectedWallet(userId);
      if (existing) {
        return await interaction.reply({
          content: `✅ You already have a connected wallet: \`${existing.walletAddress}\`\nUse \`/disconnectwallet\` to remove it first.`,
          ephemeral: true
        });
      }

      // Generate challenge
      const { sessionId, challenge, expiresAt } = this.walletManager.generateChallenge(userId);
      
      const embed = new EmbedBuilder()
        .setColor('#9d4edd')
        .setTitle('🔗 Connect Your Solana Wallet')
        .setDescription('To connect your wallet, you need to sign a message proving ownership.')
        .addFields(
          { name: '📝 Step 1: Copy This Message', value: `\`\`\`${challenge}\`\`\`` },
          { name: '✍️ Step 2: Sign in Your Wallet', value: 'Use Phantom, Solflare, or any Solana wallet to sign this message' },
          { name: '📤 Step 3: Submit Signature', value: 'Use `/verifywallet <wallet_address> <signature>` to complete' },
          { name: '⏰ Expires', value: `<t:${Math.floor(expiresAt / 1000)}:R>`, inline: true },
          { name: '🔑 Session ID', value: `\`${sessionId}\``, inline: true }
        )
        .setFooter({ text: 'Your wallet stays in YOUR control - we never see your private keys!' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Error in connectwallet:', error);
      await interaction.reply({
        content: '❌ Failed to start wallet connection process.',
        ephemeral: true
      });
    }
  }

  /**
   * /verifywallet - Verify signature and complete connection
   */
  async verifyWallet(interaction, sessionId, walletAddress, signature) {
    try {
      const userId = interaction.user.id;

      await interaction.deferReply({ ephemeral: true });

      // Verify the signature
      const success = await this.walletManager.verifyAndConnect(sessionId, walletAddress, signature);

      if (success) {
        const embed = new EmbedBuilder()
          .setColor('#00ff88')
          .setTitle('✅ Wallet Connected Successfully!')
          .setDescription(`Your wallet \`${walletAddress}\` is now connected.`)
          .addFields(
            { name: '💰 Check Balance', value: 'Use `/balance` to see your on-chain balance' },
            { name: '💸 Send Tips', value: 'Use `/tip` to send SOL to other users' },
            { name: '🚀 Make Withdrawals', value: 'Use `/withdraw` to send funds to any address' }
          )
          .setFooter({ text: 'Your funds remain in YOUR wallet - fully non-custodial!' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Error in verifywallet:', error);
      await interaction.editReply({
        content: `❌ ${error.message}\n\nPlease try \`/connectwallet\` again.`
      });
    }
  }

  /**
   * /disconnectwallet - Remove connected wallet
   */
  async disconnectWallet(interaction) {
    try {
      const userId = interaction.user.id;
      
      const success = await this.walletManager.disconnect(userId);

      if (success) {
        await interaction.reply({
          content: '✅ Your wallet has been disconnected.',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '❌ No connected wallet found.',
          ephemeral: true
        });
      }

    } catch (error) {
      console.error('Error in disconnectwallet:', error);
      await interaction.reply({
        content: '❌ Failed to disconnect wallet.',
        ephemeral: true
      });
    }
  }

  // ============ WITHDRAWAL APPROVAL COMMANDS ============

  /**
   * /withdraw - Request a withdrawal (with approval system)
   */
  async requestWithdrawal(interaction, toAddress, amount, currency) {
    try {
      const userId = interaction.user.id;
      const username = interaction.user.username;

      await interaction.deferReply({ ephemeral: true });

      // Check if wallet is connected
      const wallet = await this.walletManager.getConnectedWallet(userId);
      if (!wallet) {
        return await interaction.editReply({
          content: '❌ Please connect your wallet first using `/connectwallet`'
        });
      }

      // Convert amount to lamports
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      // Request withdrawal
      const withdrawal = await this.withdrawalQueue.requestWithdrawal(
        userId,
        username,
        toAddress,
        lamports,
        currency
      );

      // Build response based on status
      const embed = new EmbedBuilder()
        .setTimestamp();

      if (withdrawal.status === 'AUTO_APPROVED' || withdrawal.status === 'COMPLETED') {
        embed
          .setColor('#00ff88')
          .setTitle('✅ Withdrawal Processed')
          .setDescription(`Your withdrawal of **${amount} ${currency}** has been automatically approved.`)
          .addFields(
            { name: '📍 To Address', value: `\`${toAddress}\``, inline: false },
            { name: '💳 Amount', value: `${amount} ${currency}`, inline: true },
            { name: '🔗 Transaction', value: withdrawal.txSignature ? `[View on Explorer](https://explorer.solana.com/tx/${withdrawal.txSignature})` : 'Processing...', inline: false }
          );
      } else {
        embed
          .setColor('#ff006e')
          .setTitle('⏳ Withdrawal Pending Approval')
          .setDescription(`Your withdrawal requires admin approval (amount exceeds auto-approval threshold).`)
          .addFields(
            { name: '📍 To Address', value: `\`${toAddress}\``, inline: false },
            { name: '💳 Amount', value: `${amount} ${currency}`, inline: true },
            { name: '🆔 Withdrawal ID', value: `\`${withdrawal.id}\``, inline: true },
            { name: '⏰ Expires', value: `<t:${Math.floor(withdrawal.expiresAt.getTime() / 1000)}:R>`, inline: true },
            { name: '📊 Status', value: 'Awaiting admin review', inline: false }
          )
          .setFooter({ text: 'You will be notified when your withdrawal is processed' });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in requestWithdrawal:', error);
      await interaction.editReply({
        content: `❌ Withdrawal request failed: ${error.message}`
      });
    }
  }

  /**
   * /pending - View pending withdrawals (admin only)
   */
  async viewPending(interaction) {
    try {
      // Check if admin
      if (!this.isAdmin(interaction.user.id)) {
        return await interaction.reply({
          content: '❌ This command is only available to administrators.',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const pending = await this.withdrawalQueue.getPendingWithdrawals();

      if (pending.length === 0) {
        return await interaction.editReply({
          content: '✅ No pending withdrawals.'
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#ff006e')
        .setTitle('⏳ Pending Withdrawals')
        .setDescription(`${pending.length} withdrawal(s) awaiting approval`)
        .setTimestamp();

      pending.forEach((w, index) => {
        embed.addFields({
          name: `${index + 1}. ${w.username} - ${w.amount / LAMPORTS_PER_SOL} ${w.currency}`,
          value: `🆔 \`${w.id}\`\n📍 \`${w.toAddress}\`\n⏰ Requested <t:${Math.floor(w.requestedAt.getTime() / 1000)}:R>`,
          inline: false
        });
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in viewPending:', error);
      await interaction.editReply({
        content: '❌ Failed to load pending withdrawals.'
      });
    }
  }

  /**
   * /approve - Approve a withdrawal (admin only)
   */
  async approveWithdrawal(interaction, withdrawalId) {
    try {
      // Check if admin
      if (!this.isAdmin(interaction.user.id)) {
        return await interaction.reply({
          content: '❌ This command is only available to administrators.',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const adminId = interaction.user.id;
      const result = await this.withdrawalQueue.approveWithdrawal(withdrawalId, adminId);

      const embed = new EmbedBuilder()
        .setColor('#00ff88')
        .setTitle('✅ Withdrawal Approved')
        .setDescription(`Withdrawal \`${withdrawalId}\` has been approved and processed.`)
        .addFields(
          { name: '👤 User', value: result.username, inline: true },
          { name: '💳 Amount', value: `${result.amount / LAMPORTS_PER_SOL} ${result.currency}`, inline: true },
          { name: '🔗 Transaction', value: result.txSignature ? `[View on Explorer](https://explorer.solana.com/tx/${result.txSignature})` : 'Processing...', inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in approveWithdrawal:', error);
      await interaction.editReply({
        content: `❌ Failed to approve withdrawal: ${error.message}`
      });
    }
  }

  /**
   * /reject - Reject a withdrawal (admin only)
   */
  async rejectWithdrawal(interaction, withdrawalId, reason) {
    try {
      // Check if admin
      if (!this.isAdmin(interaction.user.id)) {
        return await interaction.reply({
          content: '❌ This command is only available to administrators.',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const adminId = interaction.user.id;
      const result = await this.withdrawalQueue.rejectWithdrawal(withdrawalId, adminId, reason);

      const embed = new EmbedBuilder()
        .setColor('#ff4757')
        .setTitle('❌ Withdrawal Rejected')
        .setDescription(`Withdrawal \`${withdrawalId}\` has been rejected.`)
        .addFields(
          { name: '👤 User', value: result.username, inline: true },
          { name: '💳 Amount', value: `${result.amount / LAMPORTS_PER_SOL} ${result.currency}`, inline: true },
          { name: '📝 Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in rejectWithdrawal:', error);
      await interaction.editReply({
        content: `❌ Failed to reject withdrawal: ${error.message}`
      });
    }
  }

  // ============ MULTI-SIG COMMANDS ============

  /**
   * /multisig-create - Create multi-sig wallet (admin only)
   */
  async createMultiSig(interaction, signerAddresses, threshold) {
    try {
      if (!this.isAdmin(interaction.user.id)) {
        return await interaction.reply({
          content: '❌ This command is only available to administrators.',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      // Parse signer addresses (comma-separated)
      const signers = signerAddresses.split(',').map(s => s.trim());

      const multisig = await this.multiSig.createMultiSig(signers, threshold);

      const embed = new EmbedBuilder()
        .setColor('#42a5f5')
        .setTitle('✅ Multi-Sig Wallet Created')
        .setDescription(`Created ${threshold}-of-${signers.length} multi-signature wallet`)
        .addFields(
          { name: '🔑 Wallet Address', value: `\`${multisig.address}\``, inline: false },
          { name: '👥 Signers', value: signers.map((s, i) => `${i + 1}. \`${s}\``).join('\n'), inline: false },
          { name: '✅ Required Approvals', value: threshold.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in createMultiSig:', error);
      await interaction.editReply({
        content: `❌ Failed to create multi-sig: ${error.message}`
      });
    }
  }

  /**
   * /multisig-propose - Create transaction proposal (signer only)
   */
  async createProposal(interaction, multisigAddress, recipient, amount, currency) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      const transactionData = {
        recipient,
        amount: lamports,
        currency
      };

      const proposal = await this.multiSig.createProposal(
        multisigAddress,
        transactionData,
        userId
      );

      const embed = new EmbedBuilder()
        .setColor('#ff006e')
        .setTitle('📝 Multi-Sig Proposal Created')
        .setDescription('Transaction proposal requires additional signatures')
        .addFields(
          { name: '🆔 Proposal ID', value: `\`${proposal.id}\``, inline: false },
          { name: '📍 Recipient', value: `\`${recipient}\``, inline: false },
          { name: '💳 Amount', value: `${amount} ${currency}`, inline: true },
          { name: '✅ Approvals', value: `${proposal.approvals.length}/${proposal.requiredApprovals}`, inline: true },
          { name: '⏰ Expires', value: `<t:${Math.floor(proposal.expiresAt.getTime() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'Other signers can approve with /multisig-approve' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in createProposal:', error);
      await interaction.editReply({
        content: `❌ Failed to create proposal: ${error.message}`
      });
    }
  }

  /**
   * /multisig-approve - Approve proposal (signer only)
   */
  async approveProposal(interaction, proposalId, signerWallet) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      const proposal = await this.multiSig.approveProposal(proposalId, userId, signerWallet);

      const embed = new EmbedBuilder()
        .setColor(proposal.status === 'EXECUTED' ? '#00ff88' : '#ff006e')
        .setTitle(proposal.status === 'EXECUTED' ? '✅ Proposal Executed!' : '⏳ Proposal Approved')
        .setDescription(proposal.status === 'EXECUTED' ? 'Transaction has been executed on-chain' : 'Waiting for more approvals')
        .addFields(
          { name: '🆔 Proposal ID', value: `\`${proposalId}\``, inline: false },
          { name: '✅ Approvals', value: `${proposal.approvals.length}/${proposal.requiredApprovals}`, inline: true },
          { name: '📊 Status', value: proposal.status, inline: true }
        )
        .setTimestamp();

      if (proposal.txSignature) {
        embed.addFields({
          name: '🔗 Transaction',
          value: `[View on Explorer](https://explorer.solana.com/tx/${proposal.txSignature})`,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in approveProposal:', error);
      await interaction.editReply({
        content: `❌ Failed to approve proposal: ${error.message}`
      });
    }
  }

  // ============ HELPER METHODS ============

  /**
   * Check if user is admin
   */
  isAdmin(userId) {
    const admins = (process.env.ADMIN_USER_IDS || process.env.SUPER_ADMIN_USER_IDS || '').split(',');
    return admins.includes(userId);
  }

  /**
   * Register all slash commands
   */
  getCommands() {
    return [
      // User wallet connection
      new SlashCommandBuilder()
        .setName('connectwallet')
        .setDescription('Connect your Solana wallet for non-custodial transactions'),

      new SlashCommandBuilder()
        .setName('verifywallet')
        .setDescription('Verify your wallet signature to complete connection')
        .addStringOption(option =>
          option.setName('session')
            .setDescription('Session ID from /connectwallet')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('wallet')
            .setDescription('Your Solana wallet address')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('signature')
            .setDescription('Base58 encoded signature')
            .setRequired(true)),

      new SlashCommandBuilder()
        .setName('disconnectwallet')
        .setDescription('Disconnect your connected wallet'),

      // Withdrawal approval system
      new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Request a withdrawal (requires approval for large amounts)')
        .addStringOption(option =>
          option.setName('address')
            .setDescription('Destination wallet address')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('amount')
            .setDescription('Amount to withdraw')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('currency')
            .setDescription('Currency type')
            .setRequired(true)
            .addChoices(
              { name: 'SOL', value: 'SOL' },
              { name: 'USDC', value: 'USDC' }
            )),

      new SlashCommandBuilder()
        .setName('pending')
        .setDescription('View pending withdrawal requests (Admin only)'),

      new SlashCommandBuilder()
        .setName('approve')
        .setDescription('Approve a withdrawal request (Admin only)')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Withdrawal ID')
            .setRequired(true)),

      new SlashCommandBuilder()
        .setName('reject')
        .setDescription('Reject a withdrawal request (Admin only)')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Withdrawal ID')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for rejection')
            .setRequired(true)),

      // Multi-sig commands
      new SlashCommandBuilder()
        .setName('multisig-create')
        .setDescription('Create a multi-signature wallet (Admin only)')
        .addStringOption(option =>
          option.setName('signers')
            .setDescription('Comma-separated signer addresses')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('threshold')
            .setDescription('Number of required signatures')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10)),

      new SlashCommandBuilder()
        .setName('multisig-propose')
        .setDescription('Create a transaction proposal for multi-sig')
        .addStringOption(option =>
          option.setName('multisig')
            .setDescription('Multi-sig wallet address')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('recipient')
            .setDescription('Recipient address')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('amount')
            .setDescription('Amount to send')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('currency')
            .setDescription('Currency type')
            .setRequired(true)
            .addChoices(
              { name: 'SOL', value: 'SOL' },
              { name: 'USDC', value: 'USDC' }
            )),

      new SlashCommandBuilder()
        .setName('multisig-approve')
        .setDescription('Approve a multi-sig proposal')
        .addStringOption(option =>
          option.setName('proposal')
            .setDescription('Proposal ID')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('signer')
            .setDescription('Your signer wallet address')
            .setRequired(true))
    ];
  }
}

module.exports = SecureCommands;
