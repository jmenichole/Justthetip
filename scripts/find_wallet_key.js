#!/usr/bin/env node

const { Keypair, PublicKey } = require('@solana/web3.js');
const fs = require('fs');

// Target wallet address
const TARGET_WALLET = '8WpJPzTKFU6TRmVqUUd4R8qw1Pa4ZdnqepFzx7Yd3f6Z';

console.log('🔍 WALLET KEY FINDER');
console.log(`Target Address: ${TARGET_WALLET}`);
console.log('================================\n');

// Check current environment private key
console.log('1. Checking SOL_PRIVATE_KEY from .env...');
try {
    const envPrivateKey = [94,129,4,219,144,209,6,135,191,167,53,135,70,238,10,159,90,71,70,70,171,81,32,235,165,212,254,79,219,189,59,105,251,234,151,176,97,64,206,220,134,10,225,173,23,45,138,22,120,134,246,168,6,204,113,79,201,197,192,199,63,99,69,52];
    
    const envKeypair = Keypair.fromSecretKey(new Uint8Array(envPrivateKey));
    console.log(`   Generated Address: ${envKeypair.publicKey.toString()}`);
    console.log(`   Matches Target: ${envKeypair.publicKey.toString() === TARGET_WALLET ? '✅ YES' : '❌ NO'}`);
    
    if (envKeypair.publicKey.toString() === TARGET_WALLET) {
        console.log('🎉 FOUND! Your SOL_PRIVATE_KEY matches the target wallet!');
        process.exit(0);
    }
} catch (error) {
    console.log(`   ❌ Error checking env key: ${error.message}`);
}

// Check other common locations
console.log('\n2. Checking common wallet files...');
const commonPaths = [
    '.security/treasury.json',
    '.security/hot_wallet.json', 
    '.security/dev_wallet.json',
    '.security/main_wallet.json',
    'wallet.json',
    'keypair.json'
];

for (const path of commonPaths) {
    try {
        if (fs.existsSync(path)) {
            console.log(`   Checking ${path}...`);
            const content = fs.readFileSync(path, 'utf8');
            const data = JSON.parse(content);
            
            let secretKey;
            if (Array.isArray(data)) {
                secretKey = data;
            } else if (data.secretKey && Array.isArray(data.secretKey)) {
                secretKey = data.secretKey;
            } else if (data.privateKey && Array.isArray(data.privateKey)) {
                secretKey = data.privateKey;
            }
            
            if (secretKey) {
                const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
                console.log(`      Address: ${keypair.publicKey.toString()}`);
                if (keypair.publicKey.toString() === TARGET_WALLET) {
                    console.log('🎉 FOUND! The target wallet key is in:', path);
                    console.log('Private key format:', typeof secretKey === 'object' ? 'JSON Array' : 'Other');
                    process.exit(0);
                }
            }
        }
    } catch (error) {
        console.log(`      Error reading ${path}: ${error.message}`);
    }
}

console.log('\n3. RECOMMENDATIONS:');
console.log('❌ Target wallet private key not found in common locations');
console.log('\nPossible solutions:');
console.log('• Check if you have the private key saved elsewhere');
console.log('• Check if this wallet was created on a different machine');
console.log('• If this is a tip.cc wallet, use their platform to withdraw');
console.log('• Generate a new wallet and transfer funds to it');
console.log('\n🔗 View wallet details: https://solscan.io/account/' + TARGET_WALLET);
