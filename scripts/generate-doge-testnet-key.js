// Generates a Dogecoin testnet keypair and prints the WIF and address
const ECPairFactory = require('ecpair').default;
const ecc = require('@bitcoinerlab/secp256k1');
const bs58check = require('bs58check');
const crypto = require('crypto');

const network = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bip32: { public: 0x043587cf, private: 0x04358394 }, // testnet
  pubKeyHash: 0x71, // testnet
  scriptHash: 0xc4, // testnet
  wif: 0xf1 // testnet
};

const ECPair = ECPairFactory(ecc);

try {
  const keyPair = ECPair.makeRandom({ network, rng: () => Buffer.from(crypto.randomBytes(32)) });
  const { publicKey } = keyPair;

  // Dogecoin testnet P2PKH address
  function pubkeyToAddress(pubkey, network) {
    const pubkeyHash = crypto.createHash('ripemd160').update(
      crypto.createHash('sha256').update(pubkey).digest()
    ).digest();
    const payload = Buffer.allocUnsafe(21);
    payload.writeUInt8(network.pubKeyHash, 0);
    pubkeyHash.copy(payload, 1);
    return bs58check.encode(payload);
  }

  const address = pubkeyToAddress(publicKey, network);
  console.log('WIF:', keyPair.toWIF());
  console.log('Address:', address);
  process.stdout.write('', () => process.exit(0));
} catch (e) {
  console.error('Error generating DOGE testnet key:', e);
  process.exit(1);
}
