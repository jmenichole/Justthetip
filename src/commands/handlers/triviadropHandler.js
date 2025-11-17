/**
 * JustTheTip - Triviadrop Command Handler
 * Handle trivia-based airdrops with automatic winner selection
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
  createTriviadrop,
  startNextRound,
  submitAnswer,
  endRound,
  getTriviadropStatus,
  getAllWinners,
  getLeaderboard
} = require('../../services/triviadropService');

// Track active trivia sessions per channel
const activeSessions = new Map();

// Round delay configuration (reduced for testing)
const ROUND_DELAY_MS = process.env.NODE_ENV === 'test' ? 100 : 5000;
const ROUND_DELAY_SECONDS = Math.floor(ROUND_DELAY_MS / 1000);

/**
 * Handle the /triviadrop command
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} context - Command context
 */
async function handleTriviadropCommand(interaction, context) {
  const topic = interaction.options.getString('topic') || 'random';
  const rounds = interaction.options.getInteger('rounds') || 3;
  const totalAmount = interaction.options.getNumber('total_amount');
  const winnersPerRound = interaction.options.getInteger('winners_per_round') || 1;
  const timer = interaction.options.getInteger('timer') || 30; // Default 30 seconds
  
  // TODO: Check user's premium status from database
  const userPremiumTier = 'free'; // Default to free tier

  await interaction.deferReply({ ephemeral: true }); // Make confirmation ephemeral

  try {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const channelId = interaction.channel.id;
    const guildId = interaction.guild?.id;

    // Check if there's already an active triviadrop in this channel
    if (activeSessions.has(channelId)) {
      return interaction.editReply({
        content: '❌ There is already an active triviadrop in this channel. Please wait for it to complete.',
        ephemeral: true
      });
    }

    // Validate parameters
    if (totalAmount < 0.10 || totalAmount > 1000) {
      return interaction.editReply({
        content: '❌ Total amount must be between $0.10 and $1000.',
        ephemeral: true
      });
    }

    if (rounds < 1 || rounds > 10) {
      return interaction.editReply({
        content: '❌ Number of rounds must be between 1 and 10.',
        ephemeral: true
      });
    }

    if (winnersPerRound < 1 || winnersPerRound > 20) {
      return interaction.editReply({
        content: '❌ Winners per round must be between 1 and 20.',
        ephemeral: true
      });
    }

    const totalWinners = rounds * winnersPerRound;
    const amountPerWinner = totalAmount / totalWinners;

    // Create triviadrop with timer validation
    let triviadrop;
    try {
      triviadrop = createTriviadrop({
        creator_id: userId,
        creator_name: username,
        total_amount: totalAmount,
        rounds,
        topic,
        winners_per_round: winnersPerRound,
        guild_id: guildId,
        channel_id: channelId,
        timer,
        premium_tier: userPremiumTier
      });
    } catch (error) {
      return interaction.editReply({
        content: `❌ ${error.message}\n\n💡 Free users can use 15s or 30s timers. Upgrade to Premium for custom timers (10-120s) and fee-free transactions!`,
        ephemeral: true
      });
    }

    activeSessions.set(channelId, triviadrop.triviadrop_id);

    // Build confirmation message with auto-defaults explanation
    let confirmationMsg = `✅ **Triviadrop Configuration Confirmed** (Only you can see this)\n\n`;
    confirmationMsg += `**Settings:**\n`;
    confirmationMsg += `• Total Prize Pool: $${totalAmount.toFixed(2)} USD in SOL\n`;
    confirmationMsg += `• Topic: ${topic} ${interaction.options.getString('topic') ? '' : '*(default)*'}\n`;
    confirmationMsg += `• Rounds: ${rounds} ${interaction.options.getInteger('rounds') ? '' : '*(default)*'}\n`;
    confirmationMsg += `• Winners per Round: ${winnersPerRound} ${interaction.options.getInteger('winners_per_round') ? '' : '*(default)*'}\n`;
    confirmationMsg += `• Timer: ${timer} seconds ${interaction.options.getInteger('timer') ? '' : '*(default)*'}\n`;
    confirmationMsg += `• Prize per Winner: $${amountPerWinner.toFixed(4)} USD\n`;
    confirmationMsg += `• Fee-free: ${triviadrop.fee_free ? '✅ Yes (Premium)' : '❌ No (Free tier)'}\n`;
    confirmationMsg += `• Premium Tier: ${userPremiumTier === 'premium' ? '⭐ Premium' : '🆓 Free'}\n\n`;
    
    if (userPremiumTier === 'free') {
      confirmationMsg += `💡 **Upgrade to Premium ($14.99/month) for:**\n`;
      confirmationMsg += `• Custom timers (10-120 seconds)\n`;
      confirmationMsg += `• Fee-free transactions\n`;
      confirmationMsg += `• Up to 20 rounds\n`;
      confirmationMsg += `• Up to 50 winners per round\n\n`;
    }
    
    confirmationMsg += `The game will start publicly in the channel in 5 seconds...`;

    await interaction.editReply({
      content: confirmationMsg,
      ephemeral: true
    });

    // Create public announcement embed
    const embed = new EmbedBuilder()
      .setTitle('🎯 Triviadrop Started!')
      .setDescription(
        `**${username}** started a trivia game!\n\n` +
        `💰 **Total Prize Pool:** $${totalAmount.toFixed(2)} USD in SOL\n` +
        `🎲 **Topic:** ${topic}\n` +
        `🔢 **Rounds:** ${rounds}\n` +
        `🏆 **Winners per Round:** ${winnersPerRound}\n` +
        `💎 **Prize per Winner:** $${amountPerWinner.toFixed(4)} USD\n` +
        `⏱️ **Time per Question:** ${timer} seconds\n\n` +
        `Get ready! Round 1 starts in ${ROUND_DELAY_SECONDS} seconds...`
      )
      .setColor(0x9333ea)
      .setTimestamp();

    await interaction.channel.send({ embeds: [embed] });

    // Wait then start first round
    setTimeout(async () => {
      await startRound(interaction.channel, triviadrop.triviadrop_id, context);
    }, ROUND_DELAY_MS);

  } catch (error) {
    console.error('Error creating triviadrop:', error);
    return interaction.editReply({
      content: '❌ Failed to create triviadrop. Please try again.',
      ephemeral: true
    });
  }
}

/**
 * Start a trivia round
 * @param {Channel} channel - Discord channel
 * @param {string} triviadropId - Triviadrop ID
 * @param {Object} context - Command context
 */
async function startRound(channel, triviadropId, context) {
  try {
    const roundInfo = startNextRound(triviadropId);
    const status = getTriviadropStatus(triviadropId);

    // Create round embed with question
    const embed = new EmbedBuilder()
      .setTitle(`❓ Round ${roundInfo.round}/${roundInfo.total_rounds}`)
      .setDescription(
        `**Question:**\n${roundInfo.question}\n\n` +
        `**Options:**\n${roundInfo.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}\n\n` +
        `⏱️ You have **${roundInfo.time_limit} seconds** to answer!\n` +
        `Type the letter (A, B, C, or D) of your answer.`
      )
      .setColor(0x3b82f6)
      .setFooter({ text: `Prize per winner: $${status.amount_per_winner.toFixed(4)} USD` })
      .setTimestamp();

    const message = await channel.send({ embeds: [embed] });

    // Set up answer collection
    const filter = m => !m.author.bot && ['a', 'b', 'c', 'd'].includes(m.content.toLowerCase().trim());
    const collector = channel.createMessageCollector({ 
      filter, 
      time: roundInfo.time_limit * 1000 
    });

    const answers = new Map();

    collector.on('collect', async (m) => {
      const answerIndex = m.content.toLowerCase().trim().charCodeAt(0) - 97;
      const answer = roundInfo.options[answerIndex];
      
      if (answer && !answers.has(m.author.id)) {
        answers.set(m.author.id, { username: m.author.username, answer });
        
        try {
          const result = submitAnswer(triviadropId, m.author.id, m.author.username, answer);
          // React to show answer was recorded
          await m.react('✅');
        } catch (error) {
          console.error('Error submitting answer:', error);
        }
      }
    });

    collector.on('end', async () => {
      // End round and select winners
      const results = endRound(triviadropId);
      
      // Create results embed
      const resultsEmbed = new EmbedBuilder()
        .setTitle(`🎯 Round ${results.round} Results`)
        .setDescription(
          `**Question:** ${results.question}\n` +
          `**Correct Answer:** ${results.correct_answer}\n\n` +
          `📊 **Participants:** ${results.participants_count}\n` +
          `🏆 **Winners:**\n${results.winners.length > 0 
            ? results.winners.map(w => `• <@${w.userId}> - $${w.amount.toFixed(4)} USD`).join('\n')
            : 'No winners this round (no correct answers)'
          }`
        )
        .setColor(results.winners.length > 0 ? 0x10b981 : 0xf59e0b)
        .setTimestamp();

      await channel.send({ embeds: [resultsEmbed] });

      // Process winner payments
      for (const winner of results.winners) {
        try {
          // Credit winner's balance
          await context.database.creditBalance(winner.userId, winner.amount, 'SOL');
          
          // Try to DM winner
          try {
            const user = await context.client.users.fetch(winner.userId);
            await user.send(
              `🎉 Congratulations! You won **$${winner.amount.toFixed(4)} USD** in SOL from the triviadrop!\n` +
              `The funds have been credited to your JustTheTip wallet.`
            );
          } catch (dmError) {
            // User has DMs disabled
            console.log(`Could not DM winner ${winner.userId}`);
          }
        } catch (error) {
          console.error(`Error processing winner payment for ${winner.userId}:`, error);
        }
      }

      // Check if there are more rounds
      if (results.completed) {
        // Show final leaderboard
        const leaderboard = getLeaderboard(triviadropId);
        const allWinners = getAllWinners(triviadropId);

        const finalEmbed = new EmbedBuilder()
          .setTitle('🏁 Triviadrop Complete!')
          .setDescription(
            `**Top Performers:**\n${leaderboard.slice(0, 5).map((p, i) => 
              `${i + 1}. <@${p.userId}> - ${p.correct_answers} correct`
            ).join('\n')}\n\n` +
            `**Total Winners:** ${allWinners.length}\n` +
            `**Total Distributed:** $${status.total_amount.toFixed(2)} USD`
          )
          .setColor(0x9333ea)
          .setTimestamp();

        await channel.send({ embeds: [finalEmbed] });

        // Clear session
        activeSessions.delete(channel.id);
      } else {
        // Start next round after delay
        await channel.send(`⏳ Next round starting in ${ROUND_DELAY_SECONDS} seconds...`);
        setTimeout(async () => {
          await startRound(channel, triviadropId, context);
        }, ROUND_DELAY_MS);
      }
    });

  } catch (error) {
    console.error('Error starting round:', error);
    await channel.send('❌ Error starting round. Triviadrop cancelled.');
    activeSessions.delete(channel.id);
  }
}

module.exports = {
  handleTriviadropCommand
};
