const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
    {
        name: 'help',
        description: 'Show bot help and commands'
    },
    {
        name: 'balance', 
        description: 'Check your crypto balances'
    },
    {
        name: 'tip',
        description: 'Tip another user cryptocurrency',
        options: [
            {
                name: 'user',
                type: 6, // USER type
                description: 'User to tip',
                required: true
            },
            {
                name: 'amount',
                type: 10, // NUMBER type
                description: 'Amount to tip',
                required: true,
                min_value: 0.000001
            },
            {
                name: 'coin',
                type: 3, // STRING type
                description: 'Cryptocurrency to tip',
                required: true,
                choices: [
                    { name: 'Solana (SOL)', value: 'sol' },
                    { name: 'USDC', value: 'usdc' },
                    { name: 'Litecoin (LTC)', value: 'ltc' },
                    { name: 'Bitcoin Cash (BCH)', value: 'bch' }
                ]
            }
        ]
    },
    {
        name: 'withdraw',
        description: 'Withdraw cryptocurrency to external wallet',
        options: [
            {
                name: 'address',
                type: 3, // STRING type
                description: 'Wallet address to withdraw to',
                required: true
            },
            {
                name: 'amount',
                type: 10, // NUMBER type  
                description: 'Amount to withdraw',
                required: true,
                min_value: 0.000001
            },
            {
                name: 'coin',
                type: 3, // STRING type
                description: 'Cryptocurrency to withdraw',
                required: true,
                choices: [
                    { name: 'Solana (SOL)', value: 'sol' },
                    { name: 'USDC', value: 'usdc' },
                    { name: 'Litecoin (LTC)', value: 'ltc' },
                    { name: 'Bitcoin Cash (BCH)', value: 'bch' }
                ]
            }
        ]
    },
    {
        name: 'deposit',
        description: 'Get deposit instructions for your account'
    },
    {
        name: 'registerwallet',
        description: 'Register your wallet address for withdrawals', 
        options: [
            {
                name: 'coin',
                type: 3, // STRING type
                description: 'Cryptocurrency type',
                required: true,
                choices: [
                    { name: 'Solana (SOL)', value: 'sol' },
                    { name: 'USDC', value: 'usdc' },
                    { name: 'Litecoin (LTC)', value: 'ltc' },
                    { name: 'Bitcoin Cash (BCH)', value: 'bch' }
                ]
            },
            {
                name: 'address',
                type: 3, // STRING type
                description: 'Your wallet address',
                required: true
            }
        ]
    },
    {
        name: 'airdrop',
        description: 'Create an airdrop for others to collect',
        options: [
            {
                name: 'amount',
                type: 10, // NUMBER type
                description: 'Amount to airdrop',
                required: true,
                min_value: 0.000001
            },
            {
                name: 'coin',
                type: 3, // STRING type
                description: 'Cryptocurrency to airdrop',
                required: true,
                choices: [
                    { name: 'Solana (SOL)', value: 'sol' },
                    { name: 'USDC', value: 'usdc' },
                    { name: 'Litecoin (LTC)', value: 'ltc' },
                    { name: 'Bitcoin Cash (BCH)', value: 'bch' }
                ]
            }
        ]
    },
    {
        name: 'burn',
        description: 'Donate cryptocurrency to support development',
        options: [
            {
                name: 'amount',
                type: 10, // NUMBER type
                description: 'Amount to donate',
                required: true,
                min_value: 0.000001
            },
            {
                name: 'coin',
                type: 3, // STRING type
                description: 'Cryptocurrency to donate',
                required: true,
                choices: [
                    { name: 'Solana (SOL)', value: 'sol' },
                    { name: 'USDC', value: 'usdc' },
                    { name: 'Litecoin (LTC)', value: 'ltc' },
                    { name: 'Bitcoin Cash (BCH)', value: 'bch' }
                ]
            }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

async function deployCommands() {
    try {
        console.log('🔄 Started refreshing application (/) commands...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('✅ Successfully reloaded application (/) commands globally!');
        console.log(`📝 Deployed ${commands.length} slash commands:`);
        commands.forEach(cmd => console.log(`   • /${cmd.name} - ${cmd.description}`));
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
}

deployCommands();
