#!/usr/bin/env node

const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');

// Configuration
const TIPCC_WALLET = '8WpJPzTKFU6TRmVqUUd4R8qw1Pa4ZdnqepFzx7Yd3f6Z';
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

class TipCCWithdrawal {
    constructor() {
        this.sourceWallet = TIPCC_WALLET;
    }

    async checkBalance() {
        try {
            const publicKey = new PublicKey(this.sourceWallet);
            const balance = await connection.getBalance(publicKey);
            console.log('=== TIP.CC WALLET STATUS ===');
            console.log(`Address: ${this.sourceWallet}`);
            console.log(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(9)} SOL`);
            console.log(`Lamports: ${balance}`);
            return balance;
        } catch (error) {
            console.error('❌ Error checking balance:', error.message);
            return 0;
        }
    }

    async withdraw(destinationAddress, amountSOL, privateKeySource) {
        try {
            console.log('\n=== WITHDRAWAL PROCESS ===');
            
            // Validate destination address
            let destinationPubkey;
            try {
                destinationPubkey = new PublicKey(destinationAddress);
            } catch (error) {
                throw new Error('Invalid destination address');
            }

            // Load private key
            let sourceKeypair;
            if (privateKeySource.startsWith('[')) {
                // Array format [1,2,3,...]
                const secretKey = JSON.parse(privateKeySource);
                sourceKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
            } else if (privateKeySource.length === 88) {
                // Base58 private key
                sourceKeypair = Keypair.fromSecretKey(Buffer.from(privateKeySource, 'base58'));
            } else {
                throw new Error('Invalid private key format');
            }

            // Verify the keypair matches the expected address
            if (sourceKeypair.publicKey.toString() !== this.sourceWallet) {
                throw new Error(`Private key doesn't match tip.cc wallet!\nExpected: ${this.sourceWallet}\nGot: ${sourceKeypair.publicKey.toString()}`);
            }

            // Check current balance
            const balance = await connection.getBalance(sourceKeypair.publicKey);
            const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
            
            console.log(`Current Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(9)} SOL`);
            console.log(`Withdrawal Amount: ${amountSOL} SOL`);
            console.log(`Destination: ${destinationAddress}`);

            // Check if sufficient funds
            const estimatedFee = 5000; // 0.000005 SOL
            if (balance < amountLamports + estimatedFee) {
                throw new Error(`Insufficient funds! Need ${((amountLamports + estimatedFee) / LAMPORTS_PER_SOL).toFixed(9)} SOL, have ${(balance / LAMPORTS_PER_SOL).toFixed(9)} SOL`);
            }

            // Create transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: sourceKeypair.publicKey,
                    toPubkey: destinationPubkey,
                    lamports: amountLamports,
                })
            );

            // Get recent blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = sourceKeypair.publicKey;

            // Sign transaction
            transaction.sign(sourceKeypair);

            // Send transaction
            console.log('\n🚀 Sending transaction...');
            const signature = await connection.sendRawTransaction(transaction.serialize());
            
            console.log(`�� Transaction Signature: ${signature}`);
            console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);

            // Wait for confirmation
            console.log('⏳ Waiting for confirmation...');
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');
            
            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${confirmation.value.err}`);
            }

            console.log('✅ Transaction confirmed!');
            
            // Check new balance
            const newBalance = await connection.getBalance(sourceKeypair.publicKey);
            console.log(`\n💰 New Balance: ${(newBalance / LAMPORTS_PER_SOL).toFixed(9)} SOL`);
            
            return signature;

        } catch (error) {
            console.error('❌ Withdrawal failed:', error.message);
            throw error;
        }
    }

    displayHelp() {
        console.log(`
🏧 TIP.CC WALLET WITHDRAWAL TOOL

Usage:
  node withdraw_from_tipcc.js balance
  node withdraw_from_tipcc.js withdraw <destination> <amount> <private_key>

Examples:
  # Check balance
  node withdraw_from_tipcc.js balance

  # Withdraw 0.01 SOL to your wallet
  node withdraw_from_tipcc.js withdraw YOUR_WALLET 0.01 "YOUR_PRIVATE_KEY"

⚠️  SECURITY WARNINGS:
  • Only use this if you control the private key for ${TIPCC_WALLET}
  • If this is a tip.cc service wallet, use their platform instead
  • Never share your private key
  • Test with small amounts first

📋 Current Status:
  • Source Wallet: ${TIPCC_WALLET}
  • Network: Solana Mainnet
  • Balance: 0.042522538 SOL (~$5.53)
        `);
    }
}

// Main execution
async function main() {
    const withdrawal = new TipCCWithdrawal();
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === 'help') {
        withdrawal.displayHelp();
        return;
    }

    switch (args[0]) {
        case 'balance':
            await withdrawal.checkBalance();
            break;

        case 'withdraw':
            if (args.length !== 4) {
                console.error('❌ Usage: node withdraw_from_tipcc.js withdraw <destination> <amount> <private_key>');
                process.exit(1);
            }
            
            const [, destination, amount, privateKey] = args;
            const amountNum = parseFloat(amount);
            
            if (isNaN(amountNum) || amountNum <= 0) {
                console.error('❌ Invalid amount');
                process.exit(1);
            }

            await withdrawal.withdraw(destination, amountNum, privateKey);
            break;

        default:
            console.error('❌ Unknown command. Use "balance", "withdraw", or "help"');
            withdrawal.displayHelp();
            process.exit(1);
    }
}

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled error:', error.message);
    process.exit(1);
});

if (require.main === module) {
    main().catch(console.error);
}

module.exports = TipCCWithdrawal;
