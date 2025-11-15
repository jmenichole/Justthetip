/**
 * JustTheTip - Fee Processing Scheduler
 * Daily scheduler to process accumulated non-SOL fees and swap to SOL
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 */

const feeAccumulation = require('../db/feeAccumulation');

class FeeScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    // Run every 24 hours (in milliseconds)
    this.DAILY_INTERVAL = 24 * 60 * 60 * 1000;
  }
  
  /**
   * Start the daily fee processing scheduler
   * @param {string} signerSecret - Bot wallet secret key for swapping
   */
  start(signerSecret) {
    if (this.isRunning) {
      console.log('⚠️  Fee scheduler is already running');
      return;
    }
    
    if (!signerSecret) {
      console.error('❌ Cannot start fee scheduler: No signer secret provided');
      return;
    }
    
    console.log('🕐 Starting daily fee processing scheduler...');
    
    // Run immediately on start
    this.processFees(signerSecret);
    
    // Then run daily
    this.intervalId = setInterval(() => {
      this.processFees(signerSecret);
    }, this.DAILY_INTERVAL);
    
    this.isRunning = true;
    console.log('✅ Fee scheduler started (runs every 24 hours)');
  }
  
  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🛑 Fee scheduler stopped');
    }
  }
  
  /**
   * Process accumulated fees
   * @param {string} signerSecret - Bot wallet secret key
   */
  async processFees(signerSecret) {
    try {
      const timestamp = new Date().toISOString();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 Daily Fee Processing - ${timestamp}`);
      console.log('='.repeat(60));
      
      // Get current stats
      const beforeStats = feeAccumulation.getStats();
      console.log('\n📊 Current Fee Status:');
      console.log(`  Pending: ${beforeStats.summary.totalPending}`);
      console.log(`  Swapped: ${beforeStats.summary.totalSwapped}`);
      console.log(`  Failed: ${beforeStats.summary.totalFailed}`);
      
      // Process all accumulated fees
      const result = await feeAccumulation.processAllAccumulatedFees(signerSecret);
      
      if (result.success) {
        console.log('\n✅ Daily fee processing completed successfully');
        
        // Log results
        if (result.processed && result.processed.length > 0) {
          console.log('\n📈 Processing Summary:');
          result.processed.forEach(item => {
            if (item.success) {
              console.log(`  ✓ ${item.token}: ${item.inputAmount} → ${item.outputAmount.toFixed(6)} SOL`);
            } else {
              console.log(`  ⏳ ${item.token}: ${item.message || 'Not processed'}`);
            }
          });
        }
      } else {
        console.error('❌ Daily fee processing failed:', result.error);
      }
      
      console.log(`\n${'='.repeat(60)}\n`);
      
    } catch (error) {
      console.error('❌ Error in fee processing scheduler:', error);
    }
  }
  
  /**
   * Manually trigger fee processing (for testing or manual runs)
   * @param {string} signerSecret - Bot wallet secret key
   * @returns {Promise<Object>} Processing result
   */
  async processNow(signerSecret) {
    console.log('🔄 Manually triggering fee processing...');
    return await this.processFees(signerSecret);
  }
  
  /**
   * Get scheduler status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMs: this.DAILY_INTERVAL,
      intervalHours: this.DAILY_INTERVAL / (60 * 60 * 1000),
      nextRunEstimate: this.isRunning ? 
        new Date(Date.now() + this.DAILY_INTERVAL).toISOString() : 
        'Not running'
    };
  }
}

// Export singleton instance
module.exports = new FeeScheduler();
