/**
 * Jupiter Swap Integration
 *
 * Provides access to the Jupiter quote/swap APIs so the bot can surface
 * cross-token swap information for members.
 */

const axios = require('axios');

class JupiterSwap {
  constructor(rpcUrl = 'https://api.mainnet-beta.solana.com') {
    this.apiUrl = 'https://quote-api.jup.ag/v6';
    this.rpcUrl = rpcUrl;
  }

  async getQuote(inputMint, outputMint, amount, slippageBps = 50) {
    try {
      const response = await axios.get(`${this.apiUrl}/quote`, {
        params: {
          inputMint,
          outputMint,
          amount,
          slippageBps,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Jupiter quote error:', error.message);
      return null;
    }
  }

  async getSwapTransaction(quoteResponse, userPublicKey, wrapUnwrapSOL = true) {
    try {
      const response = await axios.post(`${this.apiUrl}/swap`, {
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: wrapUnwrapSOL,
      });

      return response.data;
    } catch (error) {
      console.error('Jupiter swap transaction error:', error.message);
      return null;
    }
  }

  async getTokenList() {
    try {
      const response = await axios.get('https://token.jup.ag/strict');
      return response.data;
    } catch (error) {
      console.error('Error fetching token list:', error.message);
      return null;
    }
  }

  async findTokenBySymbol(symbol) {
    try {
      const tokens = await this.getTokenList();
      if (!tokens) return null;

      return tokens.find(token =>
        token.symbol.toLowerCase() === symbol.toLowerCase()
      ) || null;
    } catch (error) {
      console.error('Error finding token:', error.message);
      return null;
    }
  }

  async calculateSwapOutput(inputMint, outputMint, inputAmount) {
    try {
      const quote = await this.getQuote(inputMint, outputMint, inputAmount);

      if (!quote) return null;

      return {
        outputAmount: quote.outAmount,
        priceImpactPct: quote.priceImpactPct,
        route: quote.routePlan,
      };
    } catch (error) {
      console.error('Error calculating swap output:', error.message);
      return null;
    }
  }
}

// Canonical mint addresses for the tokens we expose through /swap.

const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JTO: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
};

// Decimal precision for each supported token (used when converting to base units).

const TOKEN_DECIMALS = {
  SOL: 9,
  USDC: 6,
  USDT: 6,
  BONK: 5,
  JTO: 9,
  PYTH: 6,
};

// Export a frozen list so command builders and handlers stay perfectly in sync
const SUPPORTED_TOKENS = Object.freeze(Object.keys(TOKEN_MINTS));

// Pre-build the Discord choice objects so multiple consumers stay aligned.
const SWAP_TOKEN_CHOICES = Object.freeze(
  SUPPORTED_TOKENS.map(token => ({ name: token, value: token }))
);


module.exports = {
  JupiterSwap,
  TOKEN_MINTS,
  TOKEN_DECIMALS,
  SUPPORTED_TOKENS,
  SWAP_TOKEN_CHOICES,

};
