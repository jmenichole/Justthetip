# JustTheTip - Solana Smart Contract Integration

A Discord bot with **trustless** crypto tipping powered by Solana smart contracts.

## 🔐 **Architecture Overview**

### **Trustless Design**
- ✅ **No custodial wallets** - Bot never controls private keys
- ✅ **Smart contracts handle all funds** - Deposits, tips, withdrawals
- ✅ **On-chain transparency** - All transactions are public and verifiable
- ✅ **Self-custody friendly** - Users can interact with contracts directly
- ✅ **Decentralized** - No single point of failure

### **How It Works**
```
1. User deposits → Smart Contract (not bot wallet)
2. Contract mints → Internal credits tied to Discord ID
3. User tips → Internal transfers within contract
4. User withdraws → Contract sends to their chosen address
```

## 🚀 **Features**

### **Core Functions**
- **`/deposit`** - Get your unique deposit address
- **`/balance`** - Check your on-chain balance
- **`/tip @user amount`** - Tip SOL to other Discord users
- **`/withdraw address amount`** - Withdraw to any Solana wallet
- **`/wallet`** - View your deposit address
- **`/stats`** - View program statistics

### **Smart Contract Features**
- ⚡ **Instant tips** between Discord users
- 💰 **Real SOL deposits/withdrawals** 
- 🔒 **Multi-signature admin controls**
- ⏸️ **Emergency pause functionality**
- 📊 **On-chain statistics tracking**
- 💸 **Configurable fee structure** (currently 2.5%)

## 🛠 **Technical Stack**

### **Blockchain**
- **Solana** - Fast, cheap transactions (~$0.0005 per transaction)
- **Anchor Framework** - Rust-based smart contract framework
- **Program ID**: `ACXw2hSqvuRMPJGJpnwvJvNkJnU3dL1jsyrJmfZYXnBN`

### **Bot Technology**
- **Discord.js v14** - Modern Discord bot framework
- **@solana/web3.js** - Solana JavaScript SDK
- **@project-serum/anchor** - Anchor client library

## 📁 **Project Structure**

```
justthetip/
├── bot-solana.js              # Main Discord bot with Solana integration
├── solana/
│   └── solanaService.js       # Solana smart contract interface
├── solana-contracts/
│   └── justthetip-program/    # Anchor program source code
│       └── programs/
│           └── justthetip-program/
│               └── src/
│                   └── lib.rs # Smart contract logic
└── README-SOLANA.md          # This file
```

## 🔧 **Smart Contract Functions**

### **User Management**
```rust
// Create on-chain user account
pub fn create_user(ctx: Context<CreateUser>, discord_id: String) -> Result<()>

// Get user balance and stats
// Derived from: ["user_state", discord_id]
```

### **Deposits**
```rust
// Deposit SOL into smart contract
pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()>

// Deposit USDC (SPL Token)
pub fn deposit_usdc(ctx: Context<DepositUsdc>, amount: u64) -> Result<()>
```

### **Tipping**
```rust
// Tip SOL between users (internal transfer)
pub fn tip_sol(ctx: Context<TipSol>, amount: u64) -> Result<()>

// Tip USDC between users
pub fn tip_usdc(ctx: Context<TipUsdc>, amount: u64) -> Result<()>
```

### **Withdrawals**
```rust
// Withdraw SOL to external wallet
pub fn withdraw_sol(ctx: Context<WithdrawSol>, amount: u64) -> Result<()>

// Withdraw USDC to external wallet
pub fn withdraw_usdc(ctx: Context<WithdrawUsdc>, amount: u64) -> Result<()>
```

### **Admin Functions**
```rust
// Emergency pause all operations
pub fn pause_program(ctx: Context<AdminAction>) -> Result<()>

// Resume operations
pub fn resume_program(ctx: Context<AdminAction>) -> Result<()>
```

## 📊 **Data Structures**

### **Program State**
```rust
pub struct TipState {
    pub admin: Pubkey,           // Admin wallet
    pub total_users: u64,        // Total registered users
    pub total_volume: u64,       // Total SOL volume
    pub fee_rate: u16,           // Fee in basis points (250 = 2.5%)
    pub paused: bool,            // Emergency pause state
}
```

### **User State**
```rust
pub struct UserState {
    pub discord_id: String,      // Discord user ID
    pub sol_balance: u64,        // SOL balance in lamports
    pub usdc_balance: u64,       // USDC balance
    pub total_tipped: u64,       // Total amount tipped
    pub total_received: u64,     // Total amount received
    pub created_at: i64,         // Account creation timestamp
}
```

## 🔐 **Security Features**

### **Smart Contract Security**
- ✅ **Program Derived Addresses (PDAs)** - Deterministic, secure addresses
- ✅ **Account ownership validation** - Only authorized users can modify their accounts
- ✅ **Overflow protection** - Safe math operations prevent exploits
- ✅ **Admin-only functions** - Critical operations require admin signature
- ✅ **Emergency pause** - Can halt all operations if needed

### **Bot Security**
- ✅ **No private key storage** - Bot never handles user private keys
- ✅ **Read-only access** - Bot can only read blockchain state
- ✅ **User-initiated transactions** - Users must sign their own transactions
- ✅ **Input validation** - All user inputs are sanitized and validated

## 🚀 **Getting Started**

### **For Users**
1. Join Discord server with JustTheTip bot
2. Run `/wallet` to get your deposit address
3. Send SOL to your deposit address
4. Run `/deposit <amount>` to credit your account
5. Use `/tip @friend <amount>` to tip other users
6. Use `/withdraw <address> <amount>` to withdraw

### **For Developers**

#### **Install Dependencies**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install latest
avm use latest

# Install Node.js dependencies
npm install @solana/web3.js @project-serum/anchor discord.js dotenv
```

#### **Environment Setup**
```bash
# .env file
BOT_TOKEN=your_discord_bot_token
SOLANA_KEYPAIR_PATH=/path/to/your/keypair.json
```

#### **Deploy Smart Contract**
```bash
cd solana-contracts/justthetip-program
anchor build
anchor deploy
```

#### **Run Discord Bot**
```bash
node bot-solana.js
```

## 🔗 **Useful Links**

- **Solana Explorer (Devnet)**: https://explorer.solana.com/?cluster=devnet
- **Anchor Documentation**: https://anchor-lang.com/
- **Solana Web3.js Docs**: https://solana-labs.github.io/solana-web3.js/
- **Discord.js Guide**: https://discordjs.guide/

## 🎯 **Advantages Over Traditional Bots**

### **Traditional Custodial Bots**
- ❌ Bot controls all user funds
- ❌ Users must trust bot operator
- ❌ Single point of failure
- ❌ No transparency
- ❌ Exit scam risk

### **JustTheTip Smart Contract Bot**
- ✅ Smart contract controls funds
- ✅ Users maintain self-custody
- ✅ Decentralized and resilient
- ✅ Full transparency on blockchain
- ✅ Trustless operation

## 📈 **Future Enhancements**

- 🔄 **Cross-chain swapping** (SOL ↔ USDC, etc.)
- 🎯 **Group tipping** and **split tips**
- 📊 **Advanced analytics** and **leaderboards**
- 🎁 **NFT integration** for tip rewards
- ⚡ **Lightning Network** integration for Bitcoin
- 🌉 **Cross-chain bridges** to Ethereum/Polygon

## 💡 **Why Solana?**

- ⚡ **Fast**: ~400ms transaction finality
- 💰 **Cheap**: ~$0.0005 per transaction
- 🔧 **Developer-friendly**: Excellent tooling (Anchor, web3.js)
- 🏗️ **Scalable**: Handles thousands of TPS
- 🌟 **Growing ecosystem**: Active DeFi and NFT communities

---

**JustTheTip** - *The future of decentralized Discord tipping* 🚀