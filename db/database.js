const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/users.json');

function loadDB() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getUser(userId) {
  const db = loadDB();
  return db[userId] || null;
}

function registerWallet(userId, coin, address) {
  const db = loadDB();
  if (!db[userId]) db[userId] = { wallets: {}, balances: { SOL: 0, LTC: 0 }, history: [] };
  db[userId].wallets[coin.toUpperCase()] = address;
  saveDB(db);
}

function getWallet(userId, coin) {
  const db = loadDB();
  return db[userId]?.wallets?.[coin.toUpperCase()] || null;
}

function updateBalance(userId, coin, amount) {
  const db = loadDB();
  if (!db[userId]) db[userId] = { wallets: {}, balances: { SOL: 0, LTC: 0 }, history: [] };
  db[userId].balances[coin.toUpperCase()] = amount;
  saveDB(db);
}

function getBalance(userId, coin) {
  const db = loadDB();
  return db[userId]?.balances?.[coin.toUpperCase()] || 0;
}

function addHistory(userId, entry) {
  const db = loadDB();
  if (!db[userId]) db[userId] = { wallets: {}, balances: { SOL: 0, LTC: 0 }, history: [] };
  db[userId].history.push(entry);
  saveDB(db);
}

function getHistory(userId) {
  const db = loadDB();
  return db[userId]?.history || [];
}

module.exports = {
  getUser,
  registerWallet,
  getWallet,
  updateBalance,
  getBalance,
  addHistory,
  getHistory
};
