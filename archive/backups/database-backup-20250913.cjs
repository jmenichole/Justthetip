const { MongoClient, Decimal128 } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://jchapman7:b6lJKtXh4aG7BaZj@justhetip.0z3jtr.mongodb.net/justthetip';
let client;
let database;

async function connectToDatabase() {
  try {
    if (!client) {
      client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
      });
      await client.connect();
      database = client.db('justthetip');
      console.log('✅ Connected to MongoDB successfully');
    }
    return database;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
}

// Health check function
async function checkDatabaseHealth() {
  try {
    if (!database) {
      await connectToDatabase();
    }
    await database.admin().ping();
    return { status: 'healthy', message: 'Database connection successful' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

async function registerWallet(userId, coin, address) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('wallets');
    
    const result = await collection.updateOne(
      { userId },
      { 
        $set: { 
          [`wallets.${coin.toUpperCase()}`]: address,
          lastUpdated: new Date()
        } 
      },
      { upsert: true }
    );
    
    console.log(`📝 Wallet registered for user ${userId}: ${coin.toUpperCase()} -> ${address}`);
    return result;
  } catch (error) {
    console.error('❌ Error registering wallet:', error);
    throw error;
  }
}

async function getWallet(userId, coin) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('wallets');
    const user = await collection.findOne({ userId });
    return user?.wallets?.[coin.toUpperCase()] || null;
  } catch (error) {
    console.error('❌ Error getting wallet:', error);
    return null;
  }
}

async function updateBalance(userId, coin, amount) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('wallets');
    
    // Convert to 8 decimal precision
    const preciseAmount = Math.round(amount * 100000000) / 100000000;
    
    await collection.updateOne(
      { userId },
      { 
        $set: { 
          [`balances.${coin.toUpperCase()}`]: preciseAmount,
          lastUpdated: new Date()
        } 
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('❌ Error updating balance:', error);
    throw error;
  }
}

async function getBalance(userId, coin) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('wallets');
    const user = await collection.findOne({ userId });
    const balance = user?.balances?.[coin.toUpperCase()] || 0;
    
    // Ensure proper decimal precision
    return Math.round(balance * 100000000) / 100000000;
  } catch (error) {
    console.error('❌ Error getting balance:', error);
    return 0;
  }
}

// Get formatted balance with proper decimal places
function getFormattedBalance(balance, coin) {
  const decimals = coin.toUpperCase() === 'BTC' ? 8 : 
                  coin.toUpperCase() === 'LTC' ? 8 :
                  coin.toUpperCase() === 'BCH' ? 8 :
                  coin.toUpperCase() === 'SOL' ? 6 : 2;
  return parseFloat(balance).toFixed(decimals);
}

// Check if user has sufficient balance
async function hasSufficientBalance(userId, coin, amount) {
  try {
    const currentBalance = await getBalance(userId, coin);
    return currentBalance >= amount;
  } catch (error) {
    console.error('❌ Error checking balance:', error);
    return false;
  }
}

async function addHistory(userId, entry) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('wallets');
    
    const historyEntry = {
      ...entry,
      timestamp: new Date(),
      id: Date.now().toString()
    };
    
    await collection.updateOne(
      { userId },
      { $push: { history: historyEntry } },
      { upsert: true }
    );
  } catch (error) {
    console.error('❌ Error adding history:', error);
    throw error;
  }
}

async function getHistory(userId, limit = 20) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('wallets');
    const user = await collection.findOne({ userId });
    const history = user?.history || [];
    
    // Return most recent entries first
    return history
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  } catch (error) {
    console.error('❌ Error getting history:', error);
    return [];
  }
}

module.exports = {
  connectToDatabase,
  checkDatabaseHealth,
  registerWallet,
  getWallet,
  updateBalance,
  getBalance,
  getFormattedBalance,
  hasSufficientBalance,
  addHistory,
  getHistory,
};
