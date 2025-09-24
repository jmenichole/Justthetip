const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not defined in the .env file');
}

const client = new MongoClient(uri);

let db;

async function connectDB() {
  if (db) return db;
  try {
    await client.connect();
    console.log('Connected successfully to MongoDB');
    db = client.db(); // Use the default database specified in the URI
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

// --- Start of new, non-custodial functions ---

/**
 * Associates a public wallet address with a user for a specific coin.
 * @param {string} userId - The Discord user's ID.
 * @param {string} coin - The coin ticker (e.g., 'SOL', 'USDC').
 * @param {string} address - The public wallet address.
 */
async function registerWallet(userId, coin, address) {
  const users = getUsersCollection();
  await users.updateOne(
    { userId },
    { $set: { [`wallets.${coin.toUpperCase()}`]: address } },
    { upsert: true }
  );
}

/**
 * Retrieves the registered public wallet address for a user and coin.
 * @param {string} userId - The Discord user's ID.
 * @param {string} coin - The coin ticker (e.g., 'SOL', 'USDC').
 * @returns {Promise<string|null>} The wallet address or null if not found.
 */
async function getWallet(userId, coin) {
  const users = getUsersCollection();
  const user = await users.findOne({ userId });
  return user?.wallets?.[coin.toUpperCase()];
}

// --- End of new, non-custodial functions ---

module.exports = {
  connectDB,
  getUsersCollection,
  registerWallet,
  getWallet,
};
