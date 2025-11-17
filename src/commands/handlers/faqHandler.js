/**
 * JustTheTip - FAQ Command Handler
 * Handle FAQ queries and intelligent help
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder } = require('discord.js');
const { searchFAQ, getAllCategories, getFAQsByCategory, getRandomTip } = require('../../services/faqService');

/**
 * Handle the /faq command
 * @param {Interaction} interaction - Discord interaction
 */
async function handleFAQCommand(interaction) {
  const query = interaction.options.getString('query');
  const category = interaction.options.getString('category');
  
  await interaction.deferReply({ ephemeral: true });
  
  try {
    // If category specified, show all FAQs in that category
    if (category) {
      const categoryData = getFAQsByCategory(category);
      
      if (!categoryData) {
        return interaction.editReply({
          content: '❌ Category not found. Use /faq without options to browse categories.',
          ephemeral: true
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`📚 ${categoryData.category}`)
        .setColor(0x667eea)
        .setDescription(`Here are the FAQs in this category:`)
        .setFooter({ text: 'JustTheTip FAQ System' });
      
      categoryData.questions.forEach((faq, index) => {
        embed.addFields({
          name: `${index + 1}. ${faq.question}`,
          value: faq.answer,
          inline: false
        });
      });
      
      return interaction.editReply({ embeds: [embed], ephemeral: true });
    }
    
    // If query provided, search FAQs
    if (query) {
      const results = searchFAQ(query);
      
      if (results.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🔍 No Results Found')
          .setDescription(`No FAQs match your query: "${query}"\n\nTry:\n• Rephrasing your question\n• Using different keywords\n• Browsing categories with \`/faq\`\n• Using \`/support\` for specific issues`)
          .setColor(0xf59e0b)
          .setFooter({ text: getRandomTip() });
        
        return interaction.editReply({ embeds: [embed], ephemeral: true });
      }
      
      // Show top result
      const topResult = results[0];
      const embed = new EmbedBuilder()
        .setTitle(`❓ ${topResult.question}`)
        .setDescription(topResult.answer)
        .setColor(0x10b981)
        .setFooter({ text: `Category: ${topResult.category} | ${getRandomTip()}` });
      
      // Add related FAQs if available
      if (results.length > 1) {
        const relatedQuestions = results.slice(1, 4)
          .map((faq, idx) => `${idx + 1}. ${faq.question}`)
          .join('\n');
        
        embed.addFields({
          name: '📖 Related Questions',
          value: relatedQuestions || 'No related questions found',
          inline: false
        });
      }
      
      return interaction.editReply({ embeds: [embed], ephemeral: true });
    }
    
    // No query or category - show all categories
    const categories = getAllCategories();
    
    const embed = new EmbedBuilder()
      .setTitle('📚 FAQ Categories')
      .setDescription('Browse our knowledge base or search with `/faq query:<your question>`')
      .setColor(0x667eea)
      .setFooter({ text: getRandomTip() });
    
    categories.forEach(cat => {
      embed.addFields({
        name: `📁 ${cat.category}`,
        value: `${cat.questionCount} questions | Use: \`/faq category:${cat.key}\``,
        inline: false
      });
    });
    
    return interaction.editReply({ embeds: [embed], ephemeral: true });
    
  } catch (error) {
    console.error('Error handling FAQ command:', error);
    return interaction.editReply({
      content: '❌ An error occurred while searching FAQs. Please try again.',
      ephemeral: true
    });
  }
}

module.exports = { handleFAQCommand };
