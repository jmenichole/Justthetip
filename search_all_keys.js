#!/usr/bin/env node

const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const TARGET = '8WpJPzTKFU6TRmVqUUd4R8qw1Pa4ZdnqepFzx7Yd3f6Z';

function searchDirectory(dir) {
    try {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                searchDirectory(fullPath);
            } else if (file.endsWith('.json') || file.endsWith('.key') || file.includes('wallet') || file.includes('keypair')) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    
                    // Try to parse as JSON
                    if (content.includes('[') && content.includes(']')) {
                        const matches = content.match(/\[[\d,\s]+\]/g);
                        if (matches) {
                            for (const match of matches) {
                                try {
                                    const arr = JSON.parse(match);
                                    if (Array.isArray(arr) && arr.length === 64) {
                                        const keypair = Keypair.fromSecretKey(new Uint8Array(arr));
                                        if (keypair.publicKey.toString() === TARGET) {
                                            console.log(`🎉 FOUND in ${fullPath}!`);
                                            console.log(`Key: ${JSON.stringify(arr)}`);
                                            return true;
                                        }
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                } catch (e) {}
            }
        }
    } catch (e) {}
    return false;
}

console.log(`🔍 Deep searching for private key of ${TARGET}...`);
console.log('This may take a moment...\n');

if (searchDirectory('./')) {
    console.log('\n✅ Private key found!');
} else {
    console.log('❌ Private key not found in current directory tree');
    console.log('\nNext steps:');
    console.log('1. Check other machines/backups where you might have created this wallet');
    console.log('2. Transfer the funds using a tool that has access to the private key');
    console.log('3. Consider the funds lost if no private key can be located');
}
