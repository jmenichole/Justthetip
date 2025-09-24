const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.warn('⚠️ MONGODB_URI not found in environment variables. Using mock database functions.');
}

let client;
let db;

async function connectToDatabase() {
  if (!uri) {
    console.log('⚠️ Using mock database (no MongoDB URI provided)');
    return null;
  }
  
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    db = client.db('justthetip');
  }
  return db;
}

// Mock data store for when MongoDB is not available
const mockData = {
  wallets: {},
  balances: {},
  history: {}
};

async function registerWallet(userId, coin, address) {
  if (db) {
    const collection = db.collection('wallets');
    await collection.updateOne(
      { userId },
      { $set: { [`wallets.${coin.toUpperCase()}`]: address } },
      { upsert: true }
    );
  } else {
    // Mock implementation
    if (!mockData.wallets[userId]) mockData.wallets[userId] = {};
    mockData.wallets[userId][coin.toUpperCase()] = address;
  }
}

async function getWallet(userId, coin) {
  if (db) {
    const collection = db.collection('wallets');
    const user = await collection.findOne({ userId });
    return user?.wallets?.[coin.toUpperCase()] || null;
  } else {
    // Mock implementation
    return mockData.wallets[userId]?.[coin.toUpperCase()] || null;
  }
}

async function updateBalance(userId, coin, amount) {
  if (db) {
    const collection = db.collection('wallets');
    await collection.updateOne(
      { userId },
      { $set: { [`balances.${coin.toUpperCase()}`]: amount } },
      { upsert: true }
    );
  } else {
    // Mock implementation
    if (!mockData.balances[userId]) mockData.balances[userId] = {};
    mockData.balances[userId][coin.toUpperCase()] = amount;
  }
}

async function getBalance(userId, coin) {
  if (db) {
    const collection = db.collection('wallets');
    const user = await collection.findOne({ userId });
    return user?.balances?.[coin.toUpperCase()] || 0;
  } else {
    // Mock implementation
    return mockData.balances[userId]?.[coin.toUpperCase()] || 0;
  }
}

async function addHistory(userId, entry) {
  if (db) {
    const collection = db.collection('wallets');
    await collection.updateOne(
      { userId },
      { $push: { history: entry } },
      { upsert: true }
    );
  } else {
    // Mock implementation
    if (!mockData.history[userId]) mockData.history[userId] = [];
    mockData.history[userId].push(entry);
  }
}

async function getHistory(userId) {
  if (db) {
    const collection = db.collection('wallets');
    const user = await collection.findOne({ userId });
    return user?.history || [];
  } else {
    // Mock implementation
    return mockData.history[userId] || [];
  }
}

module.exports = {
  connectToDatabase,
  registerWallet,
  getWallet,
  updateBalance,
  getBalance,
  addHistory,
  getHistory,
};