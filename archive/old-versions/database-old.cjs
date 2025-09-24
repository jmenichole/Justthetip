/**
 * Retrieves all balances for a user as an object { COIN: amount, ... }
 * @param {string} userId - The Discord user's ID.
 * @returns {Promise<object>} Balances object (e.g., { SOL: 1.23, USDC: 0.5 })
 */
async function getBalances(userId) {
  const users = getUsersCollection();
  const user = await users.findOne({ userId });
  return user && user.balances ? user.balances : {};
}
/**
 * Atomically credits a user's balance for a given coin.
 * @param {string} userId - The Discord user's ID.
 * @param {number} amount - The amount to credit (can be negative to debit).
 * @param {string} coin - The coin ticker (e.g., 'SOL', 'USDC').
 * @returns {Promise<void>}
 */
async function creditBalance(userId, amount, coin) {
  const users = getUsersCollection();
  await users.updateOne(
    { userId },
    { $inc: { [`balances.${coin.toUpperCase()}`]: amount } },
    { upsert: true }
  );
}
// --- Airdrop MongoDB Functions ---

function getAirdropsCollection() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return db.collection('airdrops');
}

/**
 * Creates a new airdrop document.
 * @param {object} airdrop - The airdrop data (creator, amount, coin, maxUsers, timeMs, created, etc.)
 * @returns {Promise<string>} The inserted airdrop's _id as string.
 */
async function createAirdrop(airdrop) {
  const airdrops = getAirdropsCollection();
  const result = await airdrops.insertOne({ ...airdrop, claimedBy: [], ended: false });
  return result.insertedId.toString();
}

/**
 * Atomically claim a share from an airdrop.
 * @param {string} airdropId - The airdrop's _id as string.
 * @param {string} userId - The Discord user ID.
 * @param {number} share - The amount to credit.
 * @returns {Promise<'claimed'|'already_claimed'|'ended'|'error'>}
 */
async function claimAirdrop(airdropId, userId, share) {
  const airdrops = getAirdropsCollection();
  // Atomically add user to claimedBy if not present and not ended
  const result = await airdrops.findOneAndUpdate(
    {
      _id: require('mongodb').ObjectId(airdropId),
      ended: false,
      [`claimedBy`]: { $ne: userId }
    },
    {
      $addToSet: { claimedBy: userId },
      $inc: { claimCount: 1 }
    },
    { returnDocument: 'after' }
  );
  if (!result.value) return 'ended';
  if (result.value.claimedBy.includes(userId)) {
    if (result.value.claimedBy.filter(id => id === userId).length > 1) return 'already_claimed';
    if (result.value.claimedBy.length > result.value.maxUsers) return 'ended';
    // End airdrop if max users reached
    if (result.value.claimedBy.length >= result.value.maxUsers) {
      await airdrops.updateOne({ _id: require('mongodb').ObjectId(airdropId) }, { $set: { ended: true } });
    }
    return 'claimed';
  }
  return 'error';
}

/**
 * Ends an airdrop by ID.
 */
async function endAirdrop(airdropId) {
  const airdrops = getAirdropsCollection();
  await airdrops.updateOne({ _id: require('mongodb').ObjectId(airdropId) }, { $set: { ended: true } });
}

/**
 * Get airdrop by ID.
 */
async function getAirdrop(airdropId) {
  const airdrops = getAirdropsCollection();
  return await airdrops.findOne({ _id: require('mongodb').ObjectId(airdropId) });
}

/**
 * Get latest active airdrop.
 */
async function getLatestActiveAirdrop() {
  const airdrops = getAirdropsCollection();
  return await airdrops.findOne({ ended: false }, { sort: { created: -1 } });
}
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
  creditBalance,
  getBalances,
  // Airdrop functions
  getAirdropsCollection,
  createAirdrop,
  claimAirdrop,
  endAirdrop,
  getAirdrop,
  getLatestActiveAirdrop,
};
