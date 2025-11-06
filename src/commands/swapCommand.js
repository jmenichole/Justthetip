const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { JupiterSwap, TOKEN_MINTS, TOKEN_DECIMALS } = require('../utils/jupiterSwap');

const SUPPORTED_TOKENS = Object.keys(TOKEN_MINTS);
const DEFAULT_SLIPPAGE_BPS = 50;

function formatOutputAmount(amount, decimals) {
  const divisor = Math.pow(10, decimals);
  const value = Number(amount) / divisor;
  return value.toFixed(6);
}

function buildJupiterLink(fromToken, toToken, rawAmount) {
  const amountParam = rawAmount.toString();
  return `https://jup.ag/swap/${fromToken}-${toToken}?inputAmount=${amountParam}`;
}

async function handleSwapCommand(interaction) {
  const fromToken = interaction.options.getString('from');
  const toToken = interaction.options.getString('to');
  const amount = interaction.options.getNumber('amount');

  if (!SUPPORTED_TOKENS.includes(fromToken) || !SUPPORTED_TOKENS.includes(toToken)) {
    return interaction.reply({
      content: '❌ Unsupported token pair. Please choose one of the available options.',
      ephemeral: true,
    });
  }

  if (fromToken === toToken) {
    return interaction.reply({
      content: '❌ Please choose two different tokens to swap.',
      ephemeral: true,
    });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return interaction.reply({
      content: '❌ Amount must be greater than 0.',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const fromMint = TOKEN_MINTS[fromToken];
    const toMint = TOKEN_MINTS[toToken];
    const fromDecimals = TOKEN_DECIMALS[fromToken] ?? 9;
    const toDecimals = TOKEN_DECIMALS[toToken] ?? 9;
    const inputAmount = Math.floor(amount * Math.pow(10, fromDecimals));

    const jupiter = new JupiterSwap(process.env.SOLANA_RPC_URL);
    const quote = await jupiter.getQuote(fromMint, toMint, inputAmount, DEFAULT_SLIPPAGE_BPS);

    if (!quote || !quote.outAmount) {
      return interaction.editReply({
        content: '❌ Unable to fetch a swap quote right now. Please try again later.',
      });
    }

    const estimatedOutput = formatOutputAmount(quote.outAmount, toDecimals);
    const priceImpactPct = quote.priceImpactPct
      ? (parseFloat(quote.priceImpactPct) * 100).toFixed(2)
      : '0.00';
    const routeSteps = quote.routePlan?.length ?? 0;
    const jupiterLink = buildJupiterLink(fromToken, toToken, inputAmount);

    const embed = new EmbedBuilder()
      .setTitle('🔄 Jupiter Swap Quote')
      .setColor(0x7c3aed)
      .setDescription(`Swap **${amount} ${fromToken}** → **~${estimatedOutput} ${toToken}**`)
      .addFields(
        { name: 'Estimated Output', value: `~${estimatedOutput} ${toToken}`, inline: true },
        { name: 'Price Impact', value: `${priceImpactPct}%`, inline: true },
        { name: 'Route Steps', value: `${routeSteps}`, inline: true },
      )
      .addFields(
        {
          name: 'Next Steps',
          value: '1. Review this quote\n2. Click **Open in Jupiter**\n3. Connect your wallet and execute the swap',
        }
      )
      .setFooter({ text: 'Quotes powered by Jupiter Aggregator' });

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Open in Jupiter')
          .setStyle(ButtonStyle.Link)
          .setURL(jupiterLink),
        new ButtonBuilder()
          .setCustomId('swap_help')
          .setLabel('Swap Help')
          .setStyle(ButtonStyle.Secondary),
      );

    await interaction.editReply({ embeds: [embed], components: [buttons] });
  } catch (error) {
    console.error('Swap command error:', error);

    const errorMessage = '❌ An error occurred while processing your swap request. Please try again later.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMessage });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

async function handleSwapHelpButton(interaction) {
  const helpEmbed = new EmbedBuilder()
    .setTitle('ℹ️ How to Execute a Jupiter Swap')
    .setColor(0x3b82f6)
    .setDescription(
      '**Need to complete the trade?**\n\n' +
      '1. Click **Open in Jupiter** to load the quote.\n' +
      '2. Connect your Solana wallet (Phantom, Solflare, etc.).\n' +
      '3. Review the slippage settings and route.\n' +
      '4. Approve the transaction in your wallet.\n\n' +
      '_Tip: Quotes expire quickly. If the transaction fails, request a new quote before retrying._'
    );

  await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
}

module.exports = {
  handleSwapCommand,
  handleSwapHelpButton,
};
