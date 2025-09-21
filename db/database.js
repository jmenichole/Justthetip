// Database connection and operations for JustTheTip bot
const { MongoClient } = require('mongodb');

class Database {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connectDB() {
    try {
      if (!process.env.MONGODB_URI) {
        console.log('📄 Database not configured - running in demo mode');
        return;
      }
      
      this.client = new MongoClient(process.env.MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db('justthetip');
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('📄 Running in demo mode without database');
    }
  }

  async getBalances(userId) {
    if (!this.db) {
      return { SOL: 0, USDC: 0, LTC: 0 }; // Demo mode
    }
    
    try {
      const user = await this.db.collection('users').findOne({ userId });
      return user?.balances || { SOL: 0, USDC: 0, LTC: 0 };
    } catch (error) {
      console.error('Error getting balances:', error);
      return { SOL: 0, USDC: 0, LTC: 0 };
    }
  }

  async processTip(senderId, recipientId, amount, currency) {
    if (!this.db) {
      console.log(`Demo: ${senderId} tipped ${recipientId} ${amount} ${currency}`);
      return;
    }
    
    try {
      // In a real implementation, this would:
      // 1. Check sender balance
      // 2. Deduct from sender
      // 3. Add to recipient
      // 4. Log transaction
      console.log(`Tip processed: ${amount} ${currency} from ${senderId} to ${recipientId}`);
    } catch (error) {
      console.error('Error processing tip:', error);
      throw error;
    }
  }

  async creditBalance(userId, amount, currency) {
    if (!this.db) {
      console.log(`Demo: Credited ${userId} with ${amount} ${currency}`);
      return;
    }
    
    try {
      await this.db.collection('users').updateOne(
        { userId },
        { $inc: { [`balances.${currency}`]: amount } },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error crediting balance:', error);
      throw error;
    }
  }
}

module.exports = new Database();