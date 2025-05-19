// Script to ensure all users in users.json have all supported coin balances
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/users.json');
const COINS = ['SOL', 'LTC', 'BTC', 'BCH', 'USDC'];

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
for (const userId of Object.keys(db)) {
  if (!db[userId].balances) db[userId].balances = {};
  for (const coin of COINS) {
    if (typeof db[userId].balances[coin] !== 'number') db[userId].balances[coin] = 0;
  }
}
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
console.log('User balances fixed.');
