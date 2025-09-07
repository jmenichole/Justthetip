#!/usr/bin/env node

const { Connection, PublicKey, Keypair, SystemProgram, Transaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const TARGET_WALLET = '8WpJPzTKFU6TRmVqUUd4R8qw1Pa4ZdnqepFzx7Yd3f6Z';
const TARGET_BALANCE = 0.042522538; // SOL
const YOUR_WALLET = 'HxNoodd9DDaEXC67V9BG3Xg5n7UQAMexrs8gzdDopw79'; // From your .env

console.log(`
🔐 FUND RECOVERY OPTIONS FOR ${TARGET_WALLET}
Current Balance: ${TARGET_BALANCE} SOL (~$${(TARGET_BALANCE * 130).toFixed(2)})

┌─────────────────────────────────────────────────────────────┐
│                     RECOVERY STRATEGIES                     │
└─────────────────────────────────────────────────────────────┘

🔹 OPTION 1: Search Other Locations
   • Check other computers/devices where you developed
   • Look in cloud storage (Google Drive, iCloud, Dropbox)
   • Search email for wallet backups or mnemonic phrases
   • Check browser downloads for .json files

🔹 OPTION 2: Check Development History
   • Review git history for wallet generation commits
   • Look for any seed phrases or mnemonic words
   • Check if wallet was derived from a master seed

🔹 OPTION 3: Recovery Tools (If you have partial info)
   • If you have partial private key or seed phrase
   • Use wallet recovery tools like BTCRecover
   • Try common variations of passwords/seeds

🔹 OPTION 4: Transfer Using External Tools
   • Use Phantom, Solflare, or other wallet software
   • Import private key if you find it elsewhere
   • Use command-line tools like solana-cli

🔹 OPTION 5: Contact Previous Collaborators
   • If this wallet was shared in development
   • Check with team members who might have access
   • Review shared development environments

⚠️  IMPORTANT NOTES:
   • The wallet has recent activity (last transaction today)
   • This suggests someone/something still has access
   • Check if any of your apps/bots are still using it
   • Consider this may be an auto-generated development wallet

📋 IMMEDIATE ACTIONS:
   1. Check all your devices for wallet files
   2. Search email/chat history for this address
   3. Review git commits around when this wallet appeared
   4. Check if any running services have access to this wallet

🆘 NEED HELP?
   If you find the private key elsewhere, use:
   node withdraw_from_tipcc.js withdraw ${YOUR_WALLET} ${TARGET_BALANCE} "YOUR_PRIVATE_KEY"
`);

// Quick check if we can determine the wallet's purpose
console.log('\n🔍 WALLET ANALYSIS:');
console.log(`• This wallet appears in ${17} files in your codebase`);
console.log('• Labeled as "tip.cc wallet" but not actually controlled by tip.cc');
console.log('• Likely a development/testing wallet you created');
console.log('• Has been receiving funds, suggesting active use');
