/**
 * Jupiter Swap Integration
 * 
 * Provides cross-token tipping functionality via Jupiter Aggregator API.
 * Users can send one token and recipient receives another (e.g., send USDC, receive BONK).
 * 
 * @module JupiterSwap
 * @author JustTheTip Bot Team
 * @license Custom MIT-based License
 */

const axios = require('axios');

/**
 * Jupiter Swap API client
 */
class JupiterSwap {
  /**
   * Initialize Jupiter Swap client
   * @param {string} rpcUrl - Solana RPC endpoint
   */
  constructor(rpcUrl = 'https://api.mainnet-beta.solana.com') {
    this.apiUrl = 'https://quote-api.jup.ag/v6';
    this.rpcUrl = rpcUrl;
  }

  /**
   * Get a swap quote from Jupiter
   * 
   * @param {string} inputMint - Input token mint address
   * @param {string} outputMint - Output token mint address
   * @param {number} amount - Amount in smallest unit (e.g., lamports for SOL)
   * @param {number} slippageBps - Slippage tolerance in basis points (default 50 = 0.5%)
   * @returns {Promise<Object|null>} Quote object or null on error
   */
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

  /**
   * Get swap transaction from Jupiter
   * 
   * @param {Object} quoteResponse - Quote response from getQuote()
   * @param {string} userPublicKey - User's wallet public key
   * @param {boolean} wrapUnwrapSOL - Whether to wrap/unwrap SOL (default true)
   * @returns {Promise<Object|null>} Swap transaction object or null on error
   */
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

  /**
   * Get supported tokens list
   * 
   * @returns {Promise<Array|null>} Array of token objects or null on error
   */
  async getTokenList() {
    try {
      const response = await axios.get('https://token.jup.ag/strict');
      return response.data;
    } catch (error) {
      console.error('Error fetching token list:', error.message);
      return null;
    }
  }

  /**
   * Find token by symbol
   * 
   * @param {string} symbol - Token symbol (e.g., 'SOL', 'USDC', 'BONK')
   * @returns {Promise<Object|null>} Token object or null if not found
   */
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

  /**
   * Calculate output amount for a swap (helper)
   * 
   * @param {string} inputMint - Input token mint address
   * @param {string} outputMint - Output token mint address
   * @param {number} inputAmount - Input amount in smallest unit
   * @returns {Promise<Object|null>} Object with outputAmount and priceImpact or null
   */
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

/**
 * Common token mint addresses on Solana
 */
const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JTO: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
};

module.exports = {
  JupiterSwap,
  TOKEN_MINTS,
};
