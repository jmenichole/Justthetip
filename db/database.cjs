const { MongoClient } = require('mongodb');
// require('dotenv').config(); // Already loaded by bot

const uri = process.env.MONGODB_URI;

// In-memory database for testing when MongoDB is not available
let inMemoryDB = new Map();

if (!uri) {
  console.log('MONGODB_URI not set, using in-memory database for testing');

  // Mock functions for in-memory database
  async function connectDB() {
    console.log('Connected to in-memory database (testing mode)');
    return inMemoryDB;
  }

  async function registerWallet(userId, coin, address) {
    if (!inMemoryDB.has(userId)) {
      inMemoryDB.set(userId, { wallets: {} });
    }
    const user = inMemoryDB.get(userId);
    user.wallets[coin.toUpperCase()] = address;
    console.log(`Registered ${coin} wallet for user ${userId}: ${address}`);
  }

  async function getWallet(userId, coin) {
    const user = inMemoryDB.get(userId);
    return user?.wallets?.[coin.toUpperCase()] || null;
  }

  module.exports = {
    connectDB,
    registerWallet,
    getWallet,
  };
} else {
  // Original MongoDB implementation
  const client = new MongoClient(uri);

  let db;

  async function connectDB() {
    if (db) return db;
    try {
      await client.connect();
      console.log('Connected successfully to MongoDB');
      db = client.db();
      return db;
    } catch (err) {
      console.error('Failed to connect to MongoDB', err);
      console.error('\n--- TROUBLESHOOTING ---');
      console.error('This error usually means the database is not reachable.');
      console.error('1. Check that your current IP address is whitelisted in MongoDB Atlas under Network Access.');
      console.error('2. Ensure your MONGODB_URI in the .env file is correct and does not contain extra characters.');
      console.error('-----------------------');
      process.exit(1);
    }
  }

  function getUsersCollection() {
    if (!db) {
      throw new Error('Database not connected. Call connectDB first.');
    }
    return db.collection('users');
  }

  async function registerWallet(userId, coin, address) {
    const users = getUsersCollection();
    await users.updateOne(
      { userId },
      { $set: { [`wallets.${coin.toUpperCase()}`]: address } },
      { upsert: true }
    );
  }

  async function getWallet(userId, coin) {
    const users = getUsersCollection();
    const user = await users.findOne({ userId });
    return user?.wallets?.[coin.toUpperCase()];
  }

  module.exports = {
    connectDB,
    getUsersCollection,
    registerWallet,
    getWallet,
  };
}
