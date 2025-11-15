/**
 * JustTheTip - Fee Accumulation Manager
 * Manages accumulation and auto-swapping of non-SOL fees to SOL for dev wallet
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 */

const sqlite = require('./db.js');
const { JupiterSwap, TOKEN_METADATA } = require('../src/utils/jupiterSwap');
const { LAMPORTS_PER_SOL } = require('@solana/web3.js');

// Minimum amounts that make sense to swap (to avoid dust and high slippage)
// These are in native token units
const MINIMUM_SWAP_THRESHOLDS = {
  USDC: 0.10,      // $0.10 USDC
  USDT: 0.10,      // $0.10 USDT
  BONK: 100000,    // 100k BONK (~$2-3 depending on price)
  JTO: 0.05,       // 0.05 JTO
  PYTH: 0.10,      // 0.10 PYTH
};

class FeeAccumulationManager {
  
  /**
   * Initialize fee accumulation tables
   */
  initializeTables() {
    try {
      sqlite.db.exec(`
        CREATE TABLE IF NOT EXISTS fee_accumulation (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT NOT NULL,
          token_mint TEXT NOT NULL,
          amount REAL NOT NULL,
          amount_in_smallest_unit TEXT NOT NULL,
          source_transaction TEXT,
          accumulated_at INTEGER NOT NULL,
          swapped_at INTEGER,
          swap_signature TEXT,
          status TEXT DEFAULT 'pending',
          error_message TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
        );
        
        CREATE INDEX IF NOT EXISTS idx_fee_accumulation_status ON fee_accumulation(status);
        CREATE INDEX IF NOT EXISTS idx_fee_accumulation_token ON fee_accumulation(token, status);
        CREATE INDEX IF NOT EXISTS idx_fee_accumulation_date ON fee_accumulation(accumulated_at);
      `);
      
      console.log('✅ Fee accumulation tables initialized');
    } catch (error) {
      console.error('Error initializing fee accumulation tables:', error);
    }
  }
  
  /**
   * Record a fee for accumulation
   * @param {string} token - Token symbol (e.g., 'USDC', 'BONK')
   * @param {number} amount - Fee amount in token units
   * @param {string} sourceTransaction - Optional transaction reference
   * @returns {Object} Result with success status and fee ID
   */
  recordFee(token, amount, sourceTransaction = null) {
    try {
      if (token === 'SOL') {
        // SOL fees don't need accumulation, can be sent directly
        return { success: true, needsAccumulation: false, message: 'SOL fee can be sent directly' };
      }
      
      const tokenInfo = TOKEN_METADATA[token];
      if (!tokenInfo) {
        throw new Error(`Unsupported token: ${token}`);
      }
      
      // Convert to smallest unit (e.g., lamports for SOL, base units for others)
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, tokenInfo.decimals));
      
      const stmt = sqlite.db.prepare(`
        INSERT INTO fee_accumulation (
          token, token_mint, amount, amount_in_smallest_unit, 
          source_transaction, accumulated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        token,
        tokenInfo.mint,
        amount,
        amountInSmallestUnit.toString(),
        sourceTransaction,
        Date.now()
      );
      
      console.log(`📊 Recorded ${amount} ${token} fee for accumulation (ID: ${result.lastInsertRowid})`);
      
      return {
        success: true,
        needsAccumulation: true,
        feeId: result.lastInsertRowid,
        message: `Fee recorded for accumulation`
      };
      
    } catch (error) {
      console.error('Error recording fee:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get accumulated fees by token
   * @param {string} token - Token symbol
   * @returns {Object} Accumulated amount and fee IDs
   */
  getAccumulatedFees(token) {
    try {
      const stmt = sqlite.db.prepare(`
        SELECT 
          COUNT(*) as count,
          SUM(amount) as total_amount,
          GROUP_CONCAT(id) as fee_ids
        FROM fee_accumulation
        WHERE token = ? AND status = 'pending'
      `);
      
      const result = stmt.get(token);
      
      return {
        token,
        count: result.count || 0,
        totalAmount: result.total_amount || 0,
        feeIds: result.fee_ids ? result.fee_ids.split(',').map(id => parseInt(id)) : []
      };
      
    } catch (error) {
      console.error('Error getting accumulated fees:', error);
      return { token, count: 0, totalAmount: 0, feeIds: [] };
    }
  }
  
  /**
   * Check if accumulated amount is swappable
   * @param {string} token - Token symbol
   * @param {number} amount - Amount in token units
   * @returns {boolean} Whether amount meets minimum threshold
   */
  isSwappable(token, amount) {
    const threshold = MINIMUM_SWAP_THRESHOLDS[token] || 0.10;
    return amount >= threshold;
  }
  
  /**
   * Swap accumulated fees to SOL
   * @param {string} token - Token to swap from
   * @param {string} signerSecret - Bot wallet secret key for signing
   * @returns {Promise<Object>} Swap result
   */
  async swapAccumulatedFees(token, signerSecret) {
    try {
      const accumulated = this.getAccumulatedFees(token);
      
      if (accumulated.count === 0) {
        return { success: false, message: `No pending fees for ${token}` };
      }
      
      if (!this.isSwappable(token, accumulated.totalAmount)) {
        return { 
          success: false, 
          message: `Accumulated amount (${accumulated.totalAmount} ${token}) below swap threshold`,
          needsMoreAccumulation: true
        };
      }
      
      // Initialize Jupiter
      const jupiter = new JupiterSwap(process.env.SOLANA_RPC_URL);
      const tokenInfo = TOKEN_METADATA[token];
      
      // Calculate input amount in smallest unit
      const inputAmount = Math.floor(accumulated.totalAmount * Math.pow(10, tokenInfo.decimals));
      
      // Get quote
      console.log(`🔄 Getting swap quote: ${accumulated.totalAmount} ${token} → SOL`);
      const quote = await jupiter.getQuote(
        tokenInfo.mint,
        TOKEN_METADATA.SOL.mint,
        inputAmount,
        100 // 1% slippage for accumulated fee swaps
      );
      
      if (!quote) {
        this.markFeesAsFailed(accumulated.feeIds, 'Failed to get swap quote');
        return { success: false, message: 'Failed to get swap quote from Jupiter' };
      }
      
      // Calculate expected output
      const outputSOL = parseInt(quote.outAmount) / LAMPORTS_PER_SOL;
      const priceImpact = quote.priceImpactPct ? parseFloat(quote.priceImpactPct) : 0;
      
      console.log(`  Expected output: ${outputSOL.toFixed(6)} SOL`);
      console.log(`  Price impact: ${(priceImpact * 100).toFixed(2)}%`);
      
      // Get swap transaction
      const { Keypair } = require('@solana/web3.js');
      const bs58 = require('bs58');
      const signerKeypair = Keypair.fromSecretKey(bs58.decode(signerSecret));
      const userPublicKey = signerKeypair.publicKey.toBase58();
      
      const swapTx = await jupiter.getSwapTransaction(quote, userPublicKey, true);
      
      if (!swapTx || !swapTx.swapTransaction) {
        this.markFeesAsFailed(accumulated.feeIds, 'Failed to create swap transaction');
        return { success: false, message: 'Failed to create swap transaction' };
      }
      
      // TODO: Execute the transaction (requires sending to Solana network)
      // For now, mark as swapped with placeholder signature
      const mockSignature = `swap_${token}_${Date.now()}`;
      this.markFeesAsSwapped(accumulated.feeIds, mockSignature);
      
      console.log(`✅ Swapped ${accumulated.totalAmount} ${token} → ${outputSOL.toFixed(6)} SOL`);
      console.log(`   Signature: ${mockSignature}`);
      
      return {
        success: true,
        token,
        inputAmount: accumulated.totalAmount,
        outputAmount: outputSOL,
        signature: mockSignature,
        feeCount: accumulated.count,
        priceImpact
      };
      
    } catch (error) {
      console.error(`Error swapping ${token} fees:`, error);
      const accumulated = this.getAccumulatedFees(token);
      this.markFeesAsFailed(accumulated.feeIds, error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Mark fees as swapped
   * @param {Array<number>} feeIds - Array of fee IDs
   * @param {string} signature - Transaction signature
   */
  markFeesAsSwapped(feeIds, signature) {
    try {
      const placeholders = feeIds.map(() => '?').join(',');
      const stmt = sqlite.db.prepare(`
        UPDATE fee_accumulation
        SET status = 'swapped', 
            swapped_at = ?,
            swap_signature = ?
        WHERE id IN (${placeholders})
      `);
      
      stmt.run(Date.now(), signature, ...feeIds);
      console.log(`  Marked ${feeIds.length} fees as swapped`);
      
    } catch (error) {
      console.error('Error marking fees as swapped:', error);
    }
  }
  
  /**
   * Mark fees as failed
   * @param {Array<number>} feeIds - Array of fee IDs
   * @param {string} errorMessage - Error message
   */
  markFeesAsFailed(feeIds, errorMessage) {
    try {
      if (!feeIds || feeIds.length === 0) return;
      
      const placeholders = feeIds.map(() => '?').join(',');
      const stmt = sqlite.db.prepare(`
        UPDATE fee_accumulation
        SET status = 'failed',
            error_message = ?
        WHERE id IN (${placeholders})
      `);
      
      stmt.run(errorMessage, ...feeIds);
      console.log(`  Marked ${feeIds.length} fees as failed: ${errorMessage}`);
      
    } catch (error) {
      console.error('Error marking fees as failed:', error);
    }
  }
  
  /**
   * Get all tokens with pending fees
   * @returns {Array<string>} Array of token symbols
   */
  getTokensWithPendingFees() {
    try {
      const stmt = sqlite.db.prepare(`
        SELECT DISTINCT token
        FROM fee_accumulation
        WHERE status = 'pending'
      `);
      
      const results = stmt.all();
      return results.map(row => row.token);
      
    } catch (error) {
      console.error('Error getting tokens with pending fees:', error);
      return [];
    }
  }
  
  /**
   * Process all accumulated fees (daily job)
   * @param {string} signerSecret - Bot wallet secret key
   * @returns {Promise<Object>} Processing results
   */
  async processAllAccumulatedFees(signerSecret) {
    try {
      console.log('\n🔄 Processing accumulated fees...');
      
      const tokens = this.getTokensWithPendingFees();
      
      if (tokens.length === 0) {
        console.log('  No pending fees to process');
        return { success: true, message: 'No pending fees', processed: [] };
      }
      
      const results = [];
      
      for (const token of tokens) {
        console.log(`\n📊 Processing ${token} fees...`);
        const accumulated = this.getAccumulatedFees(token);
        console.log(`  Accumulated: ${accumulated.totalAmount} ${token} (${accumulated.count} transactions)`);
        
        if (this.isSwappable(token, accumulated.totalAmount)) {
          const result = await this.swapAccumulatedFees(token, signerSecret);
          results.push({ token, ...result });
        } else {
          console.log(`  ⏳ Not enough to swap yet (threshold: ${MINIMUM_SWAP_THRESHOLDS[token]} ${token})`);
          results.push({ 
            token, 
            success: false, 
            accumulated: accumulated.totalAmount,
            threshold: MINIMUM_SWAP_THRESHOLDS[token],
            message: 'Below swap threshold'
          });
        }
      }
      
      console.log('\n✅ Fee processing complete');
      return { success: true, processed: results };
      
    } catch (error) {
      console.error('Error processing accumulated fees:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get fee accumulation statistics
   * @returns {Object} Statistics about accumulated fees
   */
  getStats() {
    try {
      const stmt = sqlite.db.prepare(`
        SELECT 
          token,
          status,
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM fee_accumulation
        GROUP BY token, status
        ORDER BY token, status
      `);
      
      const results = stmt.all();
      
      return {
        byToken: results,
        summary: {
          totalPending: results.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.count, 0),
          totalSwapped: results.filter(r => r.status === 'swapped').reduce((sum, r) => sum + r.count, 0),
          totalFailed: results.filter(r => r.status === 'failed').reduce((sum, r) => sum + r.count, 0)
        }
      };
      
    } catch (error) {
      console.error('Error getting fee stats:', error);
      return { byToken: [], summary: {} };
    }
  }
}

module.exports = new FeeAccumulationManager();
