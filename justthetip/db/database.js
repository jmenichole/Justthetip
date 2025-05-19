const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../data/users.json');

function readUsers() {
  if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify({ users: [] }));
  }
  const data = fs.readFileSync(usersFilePath);
  return JSON.parse(data);
}

function writeUsers(data) {
  fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 2));
}

function registerWallet(userId, coin, address) {
  const usersData = readUsers();
  const userIndex = usersData.users.findIndex(user => user.id === userId);

  if (userIndex === -1) {
    usersData.users.push({ id: userId, wallets: {}, balances: {}, transactionHistory: [] });
  }

  usersData.users[userIndex].wallets[coin] = address;
  writeUsers(usersData);
}

function lookupWallet(userId, coin) {
  const usersData = readUsers();
  const user = usersData.users.find(user => user.id === userId);
  return user ? user.wallets[coin] : null;
}

function updateBalance(userId, coin, amount) {
  const usersData = readUsers();
  const user = usersData.users.find(user => user.id === userId);

  if (user) {
    user.balances[coin] = (user.balances[coin] || 0) + amount;
    writeUsers(usersData);
  }
}

function recordTransaction(userId, coin, amount, type) {
  const usersData = readUsers();
  const user = usersData.users.find(user => user.id === userId);

  if (user) {
    user.transactionHistory.push({ coin, amount, type, date: new Date() });
    writeUsers(usersData);
  }
}

function getUserData(userId) {
  const usersData = readUsers();
  return usersData.users.find(user => user.id === userId) || null;
}

module.exports = {
  registerWallet,
  lookupWallet,
  updateBalance,
  recordTransaction,
  getUserData
};