// Fallback database with demo data for testing the simplified bot
const demoData = {
    users: {
        '1153034319271559328': { // Your user ID
            balances: {
                'SOL': 0.5,
                'USDC': 25.0,
                'LTC': 0.15,
                'BCH': 0.3
            },
            wallets: {
                'SOL': 'demo_sol_address_12345',
                'USDC': 'demo_usdc_address_67890',
                'LTC': 'demo_ltc_address_abcde',
                'BCH': 'demo_bch_address_fghij'
            },
            history: []
        }
    }
};

console.log('📦 Using demo database with test balances...');

async function connectToDatabase() {
    console.log('✅ Connected to demo database successfully');
    return Promise.resolve();
}

async function getBalance(userId, coin) {
    const user = demoData.users[userId];
    return user?.balances?.[coin.toUpperCase()] || 0;
}

async function getUserBalances(userId) {
    const user = demoData.users[userId];
    return user?.balances || {};
}

async function updateBalance(userId, coin, newBalance) {
    if (!demoData.users[userId]) {
        demoData.users[userId] = { balances: {}, wallets: {}, history: [] };
    }
    demoData.users[userId].balances[coin.toUpperCase()] = newBalance;
    console.log(`💰 Updated ${coin} balance for user ${userId}: ${newBalance}`);
    return true;
}

async function updateUserBalance(userId, coin, amount) {
    const currentBalance = await getBalance(userId, coin);
    return await updateBalance(userId, coin, currentBalance + amount);
}

async function getUserBalance(userId, coin) {
    return await getBalance(userId, coin);
}

async function registerWallet(userId, coin, address) {
    if (!demoData.users[userId]) {
        demoData.users[userId] = { balances: {}, wallets: {}, history: [] };
    }
    demoData.users[userId].wallets[coin.toUpperCase()] = address;
    console.log(`📝 Registered ${coin} wallet for user ${userId}: ${address}`);
    return true;
}

async function getWallet(userId, coin) {
    const user = demoData.users[userId];
    return user?.wallets?.[coin.toUpperCase()] || null;
}

async function addHistory(userId, entry) {
    if (!demoData.users[userId]) {
        demoData.users[userId] = { balances: {}, wallets: {}, history: [] };
    }
    demoData.users[userId].history.push({ ...entry, timestamp: new Date() });
    console.log(`📜 Added history entry for user ${userId}:`, entry);
    return true;
}

async function getHistory(userId, limit = 50) {
    const user = demoData.users[userId];
    const history = user?.history || [];
    return history.slice(-limit).reverse();
}

async function closeConnection() {
    console.log('🔒 Demo database connection closed');
    return Promise.resolve();
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
    closeConnection
};
