const { MongoClient } = require('mongodb');
require('dotenv').config();

// Fallback database configuration with better error handling
const uri = process.env.MONGODB_URI;
let client;
let db;
let isConnected = false;

async function connectToDatabase() {
    if (!client) {
        try {
            console.log('🔐 Attempting SCRAM-SHA-256 authentication...');
            client = new MongoClient(uri, { 
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000 
            });
            await client.connect();
            db = client.db('justthetip');
            isConnected = true;
            console.log('✅ Connected to MongoDB successfully');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            console.log('🔄 Bot will continue with limited functionality...');
            isConnected = false;
            return null;
        }
    }
    return db;
}

// Mock functions for when database is unavailable
const mockBalance = { SOL: 0, USDC: 0, LTC: 0 };

async function getBalance(userId, coin) {
    if (!isConnected) {
        console.log('⚠️  Database offline - returning mock balance');
        return 0;
    }
    try {
        if (!db) await connectToDatabase();
        if (!db) return 0;
        const collection = db.collection('users');
        const user = await collection.findOne({ userId });
        return user?.balances?.[coin.toUpperCase()] || 0;
    } catch (error) {
        console.error('❌ Error getting balance:', error.message);
        return 0;
    }
}

async function getUserBalances(userId) {
    if (!isConnected) {
        console.log('⚠️  Database offline - returning mock balances');
        return mockBalance;
    }
    try {
        if (!db) await connectToDatabase();
        if (!db) return mockBalance;
        const collection = db.collection('users');
        const user = await collection.findOne({ userId });
        return user?.balances || mockBalance;
    } catch (error) {
        console.error('❌ Error getting user balances:', error.message);
        return mockBalance;
    }
}

async function updateBalance(userId, coin, newBalance) {
    if (!isConnected) {
        console.log('⚠️  Database offline - balance update skipped');
        return false;
    }
    try {
        if (!db) await connectToDatabase();
        if (!db) return false;
        const collection = db.collection('users');
        await collection.updateOne(
            { userId },
            { $set: { [`balances.${coin.toUpperCase()}`]: newBalance } },
            { upsert: true }
        );
        return true;
    } catch (error) {
        console.error('❌ Error updating balance:', error.message);
        return false;
    }
}

async function updateUserBalance(userId, coin, amount) {
    if (!isConnected) {
        console.log('⚠️  Database offline - balance update skipped');
        return false;
    }
    try {
        if (!db) await connectToDatabase();
        if (!db) return false;
        const collection = db.collection('users');
        await collection.updateOne(
            { userId },
            { $inc: { [`balances.${coin.toUpperCase()}`]: amount } },
            { upsert: true }
        );
        return true;
    } catch (error) {
        console.error('❌ Error updating user balance:', error.message);
        return false;
    }
}

async function getUserBalance(userId, coin) {
    return await getBalance(userId, coin);
}

async function registerWallet(userId, coin, address) {
    if (!isConnected) {
        console.log('⚠️  Database offline - wallet registration skipped');
        return false;
    }
    try {
        if (!db) await connectToDatabase();
        if (!db) return false;
        const collection = db.collection('users');
        await collection.updateOne(
            { userId },
            { $set: { [`wallets.${coin.toUpperCase()}`]: address } },
            { upsert: true }
        );
        return true;
    } catch (error) {
        console.error('❌ Error registering wallet:', error.message);
        return false;
    }
}

async function getWallet(userId, coin) {
    if (!isConnected) {
        console.log('⚠️  Database offline - no wallet found');
        return null;
    }
    try {
        if (!db) await connectToDatabase();
        if (!db) return null;
        const collection = db.collection('users');
        const user = await collection.findOne({ userId });
        return user?.wallets?.[coin.toUpperCase()] || null;
    } catch (error) {
        console.error('❌ Error getting wallet:', error.message);
        return null;
    }
}

async function addHistory(userId, entry) {
    if (!isConnected) {
        console.log('⚠️  Database offline - history entry skipped');
        return false;
    }
    try {
        if (!db) await connectToDatabase();
        if (!db) return false;
        const collection = db.collection('users');
        await collection.updateOne(
            { userId },
            { $push: { history: { ...entry, timestamp: new Date() } } },
            { upsert: true }
        );
        return true;
    } catch (error) {
        console.error('❌ Error adding history:', error.message);
        return false;
    }
}

async function getHistory(userId, limit = 50) {
    if (!isConnected) {
        console.log('⚠️  Database offline - no history available');
        return [];
    }
    try {
        if (!db) await connectToDatabase();
        if (!db) return [];
        const collection = db.collection('users');
        const user = await collection.findOne({ userId });
        const history = user?.history || [];
        return history.slice(-limit).reverse();
    } catch (error) {
        console.error('❌ Error getting history:', error.message);
        return [];
    }
}

async function closeConnection() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        isConnected = false;
        console.log('🔒 Database connection closed');
    }
}

module.exports = {
    connectToDatabase,
    getBalance,
    getUserBalance,
    getUserBalances,
    updateBalance,
    updateUserBalance,
    registerWallet,
    getWallet,
    addHistory,
    getHistory,
    closeConnection,
    isConnected: () => isConnected
};
