// Usage: node solana-mnemonic-to-json.js
// Converts a Solana mnemonic to a keypair JSON array (64 bytes)

const bip39 = require('bip39');
const ed25519 = require('ed25519-hd-key');
const solanaWeb3 = require('@solana/web3.js');

const mnemonic = 'midnight volcano embrace journey quantum harvest silk puzzle orbit dragon melody pioneer';
const derivationPath = "m/44'/501'/0'/0'"; // Standard Solana path

async function main() {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const derived = ed25519.derivePath(derivationPath, seed.toString('hex'));
  const keypair = solanaWeb3.Keypair.fromSeed(derived.key);
  // Output full 64-byte secret key (private + public)
  console.log(JSON.stringify(Array.from(keypair.secretKey)));
}

main();
