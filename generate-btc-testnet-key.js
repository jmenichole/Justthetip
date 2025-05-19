// Generates a Bitcoin testnet keypair and prints the WIF and address
const bitcoin = require('bitcoinjs-lib');
const ECPairFactory = require('ecpair').default;
const ecc = require('@bitcoinerlab/secp256k1');

const ECPair = ECPairFactory(ecc);

try {
  const keyPair = ECPair.makeRandom({ network: bitcoin.networks.testnet });
  // Convert Uint8Array to Buffer for compatibility
  const pubkeyBuffer = Buffer.from(keyPair.publicKey);
  const { address } = bitcoin.payments.p2wpkh({ pubkey: pubkeyBuffer, network: bitcoin.networks.testnet });
  if (!keyPair || !address) throw new Error('Key generation failed');
  console.log('WIF:', keyPair.toWIF());
  console.log('Address:', address);
  process.stdout.write('', () => process.exit(0));
} catch (e) {
  console.error('Error generating testnet key:', e);
  process.exit(1);
}
