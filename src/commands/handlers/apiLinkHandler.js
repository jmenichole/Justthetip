/**
 * JustTheTip - API Linking Handler
 * Discord commands for managing API integrations
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const APILinkingService = require('../../services/apiLinkingService');

/**
 * Handle /api-link command
 * Allows bot developers to create API credentials for integrating JustTheTip
 */
async function handleAPILink(interaction, database) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'create':
      return await handleCreateAPILink(interaction, database);
    case 'revoke':
      return await handleRevokeAPILink(interaction, database);
    case 'status':
      return await handleAPILinkStatus(interaction, database);
    case 'usage':
      return await handleAPIUsage(interaction, database);
    default:
      await interaction.reply({
        content: '❌ Unknown subcommand',
        ephemeral: true
      });
  }
}

/**
 * Create new API credentials
 */
async function handleCreateAPILink(interaction, database) {
  try {
    const botId = interaction.options.getString('bot_id');
    const botName = interaction.options.getString('bot_name');
    const tier = interaction.options.getString('tier') || 'developer';

    // Verify user has premium subscription
    const userPremium = await database.getUserPremiumStatus(interaction.user.id);
    
    // Check if user has the required tier
    const requiredTiers = {
      developer: ['premium_monthly', 'pro_monthly'],
      business: ['pro_monthly'],
      enterprise: ['pro_monthly'] // Enterprise requires manual approval
    };

    if (!userPremium || !requiredTiers[tier].includes(userPremium.tier)) {
      const upgradeEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('🔒 Premium Feature Required')
        .setDescription('API Linking is a premium feature for bot developers.')
        .addFields(
          { 
            name: '**Developer Tier** ($4.99/month)', 
            value: '• 60 req/min, 10K req/day\n• Basic endpoints\n• Webhook support\n• Email support',
            inline: false
          },
          { 
            name: '**Business Tier** ($9.99/month)', 
            value: '• 300 req/min, 100K req/day\n• Bulk operations\n• Analytics\n• Priority support',
            inline: false
          },
          { 
            name: '**Enterprise Tier** (Custom pricing)', 
            value: '• 1K req/min, 1M req/day\n• White-label options\n• Dedicated support\n• Custom integrations',
            inline: false
          }
        )
        .setFooter({ text: 'Upgrade at https://justthetip.bot/api-pricing' });

      return await interaction.reply({ embeds: [upgradeEmbed], ephemeral: true });
    }

    // Enterprise tier requires manual approval
    if (tier === 'enterprise') {
      const pendingEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔔 Enterprise Tier - Approval Required')
        .setDescription('Your Enterprise tier request has been submitted for review.')
        .addFields(
          { name: 'Bot Name', value: botName, inline: true },
          { name: 'Bot ID', value: botId, inline: true },
          { name: 'Estimated Response Time', value: '24-48 hours', inline: false }
        )
        .setFooter({ text: 'We\'ll contact you at your registered email' });

      // Store pending request
      await database.storePendingEnterpriseRequest({
        user_id: interaction.user.id,
        bot_id: botId,
        bot_name: botName,
        tier: tier
      });

      return await interaction.reply({ embeds: [pendingEmbed], ephemeral: true });
    }

    // Generate API credentials
    const apiService = new APILinkingService(database);
    const credentials = await apiService.generateAPICredentials(
      interaction.user.id,
      botId,
      botName,
      tier
    );

    // Create ephemeral embed with credentials (ONLY user sees this)
    const credentialsEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ API Credentials Generated')
      .setDescription('🔒 **IMPORTANT**: Save these credentials securely. They will NOT be shown again!')
      .addFields(
        { 
          name: '🔑 API Key', 
          value: `\`\`\`${credentials.api_key}\`\`\``,
          inline: false
        },
        { 
          name: '🔐 API Secret', 
          value: `\`\`\`${credentials.api_secret}\`\`\``,
          inline: false
        },
        { 
          name: '🪝 Webhook Secret', 
          value: `\`\`\`${credentials.webhook_secret}\`\`\``,
          inline: false
        },
        { 
          name: 'Tier', 
          value: tier.toUpperCase(),
          inline: true
        },
        { 
          name: 'Rate Limits', 
          value: `${credentials.rate_limits.requests_per_minute} req/min`,
          inline: true
        },
        { 
          name: 'Documentation', 
          value: `[API Docs](${credentials.documentation_url})`,
          inline: true
        }
      )
      .setFooter({ text: 'Store these in your bot\'s environment variables' });

    await interaction.reply({ embeds: [credentialsEmbed], ephemeral: true });

  } catch (error) {
    console.error('Error creating API link:', error);
    await interaction.reply({
      content: '❌ Failed to create API credentials. Please try again.',
      ephemeral: true
    });
  }
}

/**
 * Revoke existing API credentials
 */
async function handleRevokeAPILink(interaction, database) {
  try {
    const apiKey = interaction.options.getString('api_key');

    const apiService = new APILinkingService(database);
    const success = await apiService.revokeAPICredentials(apiKey, interaction.user.id);

    if (success) {
      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ API Credentials Revoked')
        .setDescription('The API key has been revoked and will no longer work.')
        .addFields(
          { name: 'API Key', value: `\`${apiKey.substring(0, 20)}...\``, inline: false },
          { name: 'Status', value: 'Revoked', inline: true },
          { name: 'Revoked At', value: new Date().toLocaleString(), inline: true }
        )
        .setFooter({ text: 'Create new credentials with /api-link create' });

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    } else {
      await interaction.reply({
        content: '❌ Failed to revoke credentials. Invalid API key or not owned by you.',
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error revoking API link:', error);
    await interaction.reply({
      content: '❌ Failed to revoke API credentials. Please try again.',
      ephemeral: true
    });
  }
}

/**
 * Check API link status
 */
async function handleAPILinkStatus(interaction, database) {
  try {
    const apiKey = interaction.options.getString('api_key');

    const credentials = await database.getAPICredentials(apiKey);

    if (!credentials || credentials.owner_id !== interaction.user.id) {
      await interaction.reply({
        content: '❌ API key not found or not owned by you.',
        ephemeral: true
      });
      return;
    }

    const statusEmbed = new EmbedBuilder()
      .setColor(credentials.status === 'active' ? '#00FF00' : '#FF6B6B')
      .setTitle('📊 API Link Status')
      .addFields(
        { name: 'Bot Name', value: credentials.bot_name, inline: true },
        { name: 'Bot ID', value: credentials.bot_id, inline: true },
        { name: 'Tier', value: credentials.tier.toUpperCase(), inline: true },
        { name: 'Status', value: credentials.status.toUpperCase(), inline: true },
        { name: 'Created', value: new Date(credentials.created_at).toLocaleDateString(), inline: true },
        { name: 'Rate Limit', value: `${credentials.rate_limits.requests_per_minute} req/min`, inline: true }
      )
      .setFooter({ text: 'API Key: ' + apiKey.substring(0, 20) + '...' });

    await interaction.reply({ embeds: [statusEmbed], ephemeral: true });

  } catch (error) {
    console.error('Error checking API status:', error);
    await interaction.reply({
      content: '❌ Failed to check API status. Please try again.',
      ephemeral: true
    });
  }
}

/**
 * View API usage statistics
 */
async function handleAPIUsage(interaction, database) {
  try {
    const apiKey = interaction.options.getString('api_key');
    const period = interaction.options.getString('period') || 'month';

    const credentials = await database.getAPICredentials(apiKey);

    if (!credentials || credentials.owner_id !== interaction.user.id) {
      await interaction.reply({
        content: '❌ API key not found or not owned by you.',
        ephemeral: true
      });
      return;
    }

    const apiService = new APILinkingService(database);
    const stats = await apiService.getAPIUsageStats(apiKey, period);

    const usageEmbed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('📈 API Usage Statistics')
      .setDescription(`Usage for the last ${period}`)
      .addFields(
        { name: 'Total Requests', value: stats.total_requests.toString(), inline: true },
        { name: 'Successful', value: stats.successful_requests.toString(), inline: true },
        { name: 'Failed', value: stats.failed_requests.toString(), inline: true },
        { name: 'Transactions Processed', value: stats.transactions_processed.toString(), inline: true },
        { name: 'Volume Processed', value: `${stats.volume_processed.toFixed(4)} SOL`, inline: true },
        { name: 'Success Rate', value: `${((stats.successful_requests / stats.total_requests) * 100).toFixed(1)}%`, inline: true }
      )
      .setFooter({ text: 'Bot: ' + credentials.bot_name });

    // Add endpoint breakdown
    const endpointList = Object.entries(stats.endpoints_used)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([endpoint, count]) => `• ${endpoint}: ${count} requests`)
      .join('\n');

    if (endpointList) {
      usageEmbed.addFields({
        name: 'Top Endpoints',
        value: endpointList,
        inline: false
      });
    }

    await interaction.reply({ embeds: [usageEmbed], ephemeral: true });

  } catch (error) {
    console.error('Error fetching API usage:', error);
    await interaction.reply({
      content: '❌ Failed to fetch API usage. Please try again.',
      ephemeral: true
    });
  }
}

/**
 * Register API link slash commands
 */
function registerAPILinkCommands() {
  return new SlashCommandBuilder()
    .setName('api-link')
    .setDescription('Manage API integrations for your bot (Premium feature)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create API credentials for your bot')
        .addStringOption(option =>
          option
            .setName('bot_id')
            .setDescription('Your Discord bot\'s ID')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('bot_name')
            .setDescription('Your bot\'s name')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('tier')
            .setDescription('API tier (default: developer)')
            .addChoices(
              { name: 'Developer ($4.99/mo)', value: 'developer' },
              { name: 'Business ($9.99/mo)', value: 'business' },
              { name: 'Enterprise (Custom)', value: 'enterprise' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('revoke')
        .setDescription('Revoke API credentials')
        .addStringOption(option =>
          option
            .setName('api_key')
            .setDescription('API key to revoke')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check API link status')
        .addStringOption(option =>
          option
            .setName('api_key')
            .setDescription('API key to check')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('usage')
        .setDescription('View API usage statistics')
        .addStringOption(option =>
          option
            .setName('api_key')
            .setDescription('API key to check')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('period')
            .setDescription('Time period')
            .addChoices(
              { name: 'Today', value: 'day' },
              { name: 'This Week', value: 'week' },
              { name: 'This Month', value: 'month' }
            )
            .setRequired(false)
        )
    );
}

module.exports = {
  handleAPILink,
  registerAPILinkCommands
};
