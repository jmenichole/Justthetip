const { Keypair } = require('@solana/web3.js');
const fs = require('fs');

console.log('🏦 GENERATING TREASURY WALLET (COLD STORAGE)\n');

// Generate new keypair for treasury
const treasuryKeypair = Keypair.generate();
const treasuryAddress = treasuryKeypair.publicKey.toString();
const treasurySecretArray = Array.from(treasuryKeypair.secretKey);

console.log('✅ Treasury Wallet Generated:');
console.log('Address:', treasuryAddress);
console.log('\n🔐 IMPORTANT: Save this information securely!');
console.log('\n📝 Private Key (JSON Array):');
console.log(JSON.stringify(treasurySecretArray));

// Save to secure file
const treasuryConfig = {
  address: treasuryAddress,
  privateKey: treasurySecretArray,
  created: new Date().toISOString(),
  purpose: 'Cold storage treasury wallet',
  security: 'Keep this file secure and backup offline'
};

const secureDir = './.security';
if (!fs.existsSync(secureDir)) {
  fs.mkdirSync(secureDir, { mode: 0o700 });
}

fs.writeFileSync('./.security/treasury.json', JSON.stringify(treasuryConfig, null, 2), { mode: 0o600 });
console.log('\n💾 Treasury configuration saved to .security/treasury.json');

console.log('\n🛡️ SECURITY RECOMMENDATIONS:');
console.log('1. Backup the treasury.json file to multiple secure locations');
console.log('2. Store offline copies (USB drives, paper backup)');
console.log('3. Never share the private key');
console.log('4. Consider hardware wallet for large amounts');

console.log('\n📋 NEXT STEPS:');
console.log('1. Add treasury address to .env file');
console.log('2. Transfer excess funds from hot wallet to treasury');
console.log('3. Monitor hot wallet balance regularly');
