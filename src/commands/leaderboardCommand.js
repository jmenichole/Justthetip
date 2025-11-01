/**
 * Leaderboard Command
 * 
 * Shows top tippers and recipients from the database.
 * Queries MongoDB/PostgreSQL for aggregated tipping statistics.
 * 
 * @module LeaderboardCommand
 * @author JustTheTip Bot Team
 * @license Custom MIT-based License
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Get top tippers from database
 * 
 * @param {Object} db - Database connection object
 * @param {number} limit - Number of top tippers to return (default 10)
 * @returns {Promise<Array>} Array of top tipper objects
 */
async function getTopTippers(db, limit = 10) {
  if (!db || !db.pool) {
    // Demo mode - return mock data
    return [
      { user_id: 'demo_user_1', username: 'DemoUser1', total_tipped: 100.5, tip_count: 25 },
      { user_id: 'demo_user_2', username: 'DemoUser2', total_tipped: 75.2, tip_count: 18 },
      { user_id: 'demo_user_3', username: 'DemoUser3', total_tipped: 50.0, tip_count: 12 },
    ];
  }

  try {
    const result = await db.pool.query(`
      SELECT 
        sender_id as user_id,
        SUM(amount) as total_tipped,
        COUNT(*) as tip_count
      FROM transactions
      WHERE transaction_type = 'tip' AND status = 'completed'
      GROUP BY sender_id
      ORDER BY total_tipped DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  } catch (error) {
    console.error('Error fetching top tippers:', error);
    return [];
  }
}

/**
 * Get top recipients from database
 * 
 * @param {Object} db - Database connection object
 * @param {number} limit - Number of top recipients to return (default 10)
 * @returns {Promise<Array>} Array of top recipient objects
 */
async function getTopRecipients(db, limit = 10) {
  if (!db || !db.pool) {
    // Demo mode - return mock data
    return [
      { user_id: 'demo_user_3', username: 'DemoUser3', total_received: 120.8, tip_count: 30 },
      { user_id: 'demo_user_1', username: 'DemoUser1', total_received: 85.5, tip_count: 22 },
      { user_id: 'demo_user_2', username: 'DemoUser2', total_received: 60.0, tip_count: 15 },
    ];
  }

  try {
    const result = await db.pool.query(`
      SELECT 
        recipient_id as user_id,
        SUM(amount) as total_received,
        COUNT(*) as tip_count
      FROM transactions
      WHERE transaction_type = 'tip' AND status = 'completed'
      GROUP BY recipient_id
      ORDER BY total_received DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  } catch (error) {
    console.error('Error fetching top recipients:', error);
    return [];
  }
}

/**
 * Get user's tipping stats
 * 
 * @param {Object} db - Database connection object
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object>} User stats object
 */
async function getUserStats(db, userId) {
  if (!db || !db.pool) {
    return {
      total_tipped: 0,
      total_received: 0,
      tips_sent: 0,
      tips_received: 0,
    };
  }

  try {
    // Get sent tips
    const sentResult = await db.pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_tipped,
        COUNT(*) as tips_sent
      FROM transactions
      WHERE sender_id = $1 AND transaction_type = 'tip' AND status = 'completed'
    `, [userId]);

    // Get received tips
    const receivedResult = await db.pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_received,
        COUNT(*) as tips_received
      FROM transactions
      WHERE recipient_id = $1 AND transaction_type = 'tip' AND status = 'completed'
    `, [userId]);

    return {
      total_tipped: parseFloat(sentResult.rows[0]?.total_tipped || 0),
      total_received: parseFloat(receivedResult.rows[0]?.total_received || 0),
      tips_sent: parseInt(sentResult.rows[0]?.tips_sent || 0),
      tips_received: parseInt(receivedResult.rows[0]?.tips_received || 0),
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      total_tipped: 0,
      total_received: 0,
      tips_sent: 0,
      tips_received: 0,
    };
  }
}

/**
 * Create leaderboard embed
 * 
 * @param {Object} client - Discord client
 * @param {Array} topTippers - Top tippers array
 * @param {Array} topRecipients - Top recipients array
 * @returns {EmbedBuilder} Discord embed
 */
function createLeaderboardEmbed(client, topTippers, topRecipients) {
  const embed = new EmbedBuilder()
    .setTitle('🏆 JustTheTip Leaderboard')
    .setColor(0xffd700)
    .setTimestamp();

  // Add top tippers section
  let tippersText = '';
  topTippers.forEach((tipper, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    // Note: Displaying as SOL for now. For multi-currency, aggregate by USD value
    tippersText += `${medal} <@${tipper.user_id}> - **${tipper.total_tipped.toFixed(2)}** (${tipper.tip_count} tips)\n`;
  });

  if (tippersText) {
    embed.addFields({
      name: '💸 Top Tippers',
      value: tippersText || 'No tips yet',
      inline: false,
    });
  }

  // Add top recipients section
  let recipientsText = '';
  topRecipients.forEach((recipient, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    // Note: Displaying amount generically. For multi-currency, aggregate by USD value
    recipientsText += `${medal} <@${recipient.user_id}> - **${recipient.total_received.toFixed(2)}** (${recipient.tip_count} tips)\n`;
  });

  if (recipientsText) {
    embed.addFields({
      name: '🎁 Top Recipients',
      value: recipientsText || 'No tips yet',
      inline: false,
    });
  }

  embed.setFooter({ text: 'Use /tip to send crypto to your friends!' });

  return embed;
}

/**
 * Handle leaderboard command
 * 
 * @param {Object} interaction - Discord interaction object
 * @param {Object} db - Database connection object
 * @returns {Promise<void>}
 */
async function handleLeaderboardCommand(interaction, db) {
  try {
    await interaction.deferReply();

    const [topTippers, topRecipients] = await Promise.all([
      getTopTippers(db, 10),
      getTopRecipients(db, 10),
    ]);

    const embed = createLeaderboardEmbed(
      interaction.client,
      topTippers,
      topRecipients
    );

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Leaderboard command error:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ An error occurred while fetching the leaderboard.',
      });
    } else {
      await interaction.reply({
        content: '❌ An error occurred while fetching the leaderboard.',
        ephemeral: true,
      });
    }
  }
}

module.exports = {
  getTopTippers,
  getTopRecipients,
  getUserStats,
  createLeaderboardEmbed,
  handleLeaderboardCommand,
};
