# Just The Tip

Just The Tip is a Discord bot that allows users to manage their cryptocurrency wallets for Solana (SOL) and Litecoin (LTC). Users can check their balances, send tips to other users, and register their wallet addresses. This project uses a simple JSON-based database for storing user data, which can be expanded to a proper database in the future.

## Features

- Fetch and display SOL and LTC balances.
- Send tips in SOL and LTC to other users.
- Register wallet addresses for SOL and LTC.
- Track transaction history and user balances.

## Project Structure

```
justthetip
├── chains
│   ├── litecoin.js       # Functions to interact with the Litecoin blockchain.
│   └── solana.js         # Functions to interact with the Solana blockchain.
├── db
│   └── database.js       # JSON-based database module for user data management.
├── data
│   └── users.json        # Persistent storage for user wallet addresses and balances.
├── bot.js                # Main logic for the Discord bot.
├── package.json          # npm configuration file.
└── README.md             # Documentation for the project.
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd justthetip
   ```

2. Install the dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your bot token and Solana private key:
   ```
   BOT_TOKEN=your_discord_bot_token
   SOL_PRIVATE_KEY=your_solana_private_key
   ```

4. Run the bot:
   ```
   node bot.js
   ```

## Usage

- **Check Balance**: Use the command `!balance` to check your SOL and LTC balances.
- **Send Tip**: Use the command `!tip @user amount coin` to send a tip to another user.
- **Register Wallet**: Use the command `!registerwallet coin address` to register your wallet address for SOL or LTC.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.