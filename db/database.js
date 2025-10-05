// Database connection and operations for JustTheTip bot
// Migrated to PostgreSQL for ACID compliance (real money operations)
const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = null;
  }

  async connectDB() {
    try {
      if (!process.env.DATABASE_URL) {
        console.log('📄 Database not configured - running in demo mode');
        return;
      }
      
      // PostgreSQL connection with SSL support for production
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      console.log('✅ Connected to PostgreSQL database');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('📄 Running in demo mode without database');
      this.pool = null;
    }
  }

  async getBalances(userId) {
    if (!this.pool) {
      return { SOL: 0, USDC: 0, LTC: 0 }; // Demo mode
    }
    
    try {
      // Ensure user exists
      await this.pool.query(
        'INSERT INTO users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
        [userId]
      );

      // Get all balances for user
      const result = await this.pool.query(
        'SELECT currency, amount FROM balances WHERE user_id = $1',
        [userId]
      );

      const balances = { SOL: 0, USDC: 0, LTC: 0 };
      result.rows.forEach(row => {
        balances[row.currency] = parseFloat(row.amount);
      });

      return balances;
    } catch (error) {
      console.error('Error getting balances:', error);
      return { SOL: 0, USDC: 0, LTC: 0 };
    }
  }

  async processTip(senderId, recipientId, amount, currency) {
    if (!this.pool) {
      console.log(`Demo: ${senderId} tipped ${recipientId} ${amount} ${currency}`);
      return;
    }
    
    const client = await this.pool.connect();
    
    try {
      // Begin transaction for ACID compliance
      await client.query('BEGIN');

      // Ensure both users exist
      await client.query(
        'INSERT INTO users (user_id) VALUES ($1), ($2) ON CONFLICT (user_id) DO NOTHING',
        [senderId, recipientId]
      );

      // Check sender balance
      const balanceResult = await client.query(
        'SELECT amount FROM balances WHERE user_id = $1 AND currency = $2 FOR UPDATE',
        [senderId, currency]
      );

      const currentBalance = balanceResult.rows.length > 0 
        ? parseFloat(balanceResult.rows[0].amount) 
        : 0;

      if (currentBalance < amount) {
        await client.query('ROLLBACK');
        throw new Error('Insufficient balance');
      }

      // Deduct from sender
      await client.query(
        `INSERT INTO balances (user_id, currency, amount) 
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, currency) 
         DO UPDATE SET amount = balances.amount - $3`,
        [senderId, currency, amount]
      );

      // Add to recipient
      await client.query(
        `INSERT INTO balances (user_id, currency, amount) 
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, currency) 
         DO UPDATE SET amount = balances.amount + $3`,
        [recipientId, currency, amount]
      );

      // Log transaction
      await client.query(
        `INSERT INTO transactions (transaction_type, sender_id, recipient_id, amount, currency, status) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['tip', senderId, recipientId, amount, currency, 'completed']
      );

      // Commit transaction
      await client.query('COMMIT');
      
      console.log(`✅ Tip processed: ${amount} ${currency} from ${senderId} to ${recipientId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing tip:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async creditBalance(userId, amount, currency) {
    if (!this.pool) {
      console.log(`Demo: Credited ${userId} with ${amount} ${currency}`);
      return;
    }
    
    const client = await this.pool.connect();
    
    try {
      // Begin transaction for ACID compliance
      await client.query('BEGIN');

      // Ensure user exists
      await client.query(
        'INSERT INTO users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
        [userId]
      );

      // Credit balance
      await client.query(
        `INSERT INTO balances (user_id, currency, amount) 
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, currency) 
         DO UPDATE SET amount = balances.amount + $3`,
        [userId, currency, amount]
      );

      // Log transaction
      await client.query(
        `INSERT INTO transactions (transaction_type, recipient_id, amount, currency, status) 
         VALUES ($1, $2, $3, $4, $5)`,
        ['credit', userId, amount, currency, 'completed']
      );

      // Commit transaction
      await client.query('COMMIT');
      
      console.log(`✅ Credited ${userId} with ${amount} ${currency}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error crediting balance:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Graceful shutdown
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('✅ Database connection pool closed');
    }
  }
}

module.exports = new Database();