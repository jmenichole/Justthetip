// Bitcoin Cash support using bitcore-lib-cash and axios for broadcast (example, not production ready)
const bitcore = require('bitcore-lib-cash');
const axios = require('axios');
require('dotenv').config();

const privateKey = new bitcore.PrivateKey(process.env.BCH_WIF);
const address = privateKey.toAddress().toString();

async function getBchBalance(address) {
  // Use a public API for balance (Blockchair, etc.)
  const res = await axios.get(`https://api.blockchair.com/bitcoin-cash/dashboards/address/${address}`);
  return res.data.data[address].address.balance / 1e8;
}

async function getUtxos(address) {
  const res = await axios.get(`https://api.blockchair.com/bitcoin-cash/dashboards/address/${address}`);
  const utxos = res.data.data[address].utxo;
  return utxos.map(u => ({
    txId: u.transaction_hash,
    outputIndex: u.index,
    satoshis: u.value,
    script: bitcore.Script.buildPublicKeyHashOut(address).toHex()
  }));
}

async function broadcastTx(rawTx) {
  const res = await axios.post('https://api.blockchair.com/bitcoin-cash/push/transaction', {
    data: rawTx
  });
  return res.data.data.transaction_hash;
}

async function sendBch(to, amount) {
  const fromAddress = address;
  const utxos = await getUtxos(fromAddress);
  const sendAmount = Math.round(amount * 1e8);
  const fee = 500; // 500 satoshis (adjust as needed)
  let total = 0;
  const inputs = [];
  for (const utxo of utxos) {
    inputs.push(utxo);
    total += utxo.satoshis;
    if (total >= sendAmount + fee) break;
  }
  if (total < sendAmount + fee) throw new Error('Insufficient BCH balance');
  const tx = new bitcore.Transaction();
  tx.from(inputs);
  tx.to(to, sendAmount);
  if (total > sendAmount + fee) {
    tx.change(fromAddress);
  }
  tx.fee(fee);
  tx.sign(privateKey);
  const rawTx = tx.serialize();
  const txid = await broadcastTx(rawTx);
  return txid;
}

module.exports = { getBchBalance, sendBch };
