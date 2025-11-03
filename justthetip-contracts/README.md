# JustTheTip Solana Smart Contracts

This directory contains the Anchor-based Solana smart contracts for the JustTheTip non-custodial tipping bot.

## Overview

The JustTheTip program enables:
- **Non-custodial tipping** with on-chain statistics
- **User account management** via Program Derived Addresses (PDAs)
- **Multi-recipient airdrops** with claim functionality
- **Support for SOL and SPL tokens**
- **Event emission** for analytics and indexing

## Prerequisites

To build and deploy the smart contracts, you need:

1. **Rust**: Install from https://rustup.rs/
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Solana CLI**: Install from https://docs.solana.com/cli/install-solana-cli-tools
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

3. **Anchor CLI**: Install from https://www.anchor-lang.com/docs/installation
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

4. **Node.js and Yarn**: For running tests
   ```bash
   npm install -g yarn
   ```

## Quick Start

### 1. Install Dependencies

```bash
cd justthetip-contracts
npm install
```

### 2. Build the Program

```bash
anchor build
```

This will:
- Compile the Rust program to BPF
- Generate the IDL (Interface Definition Language) file
- Create keypairs for deployment

### 3. Run Tests

```bash
# Start local validator (in a separate terminal)
solana-test-validator

# Run tests
anchor test --skip-local-validator
```

### 4. Deploy

**Deploy to Devnet:**
```bash
# Set Solana config to devnet
solana config set --url devnet

# Get some devnet SOL for deployment
solana airdrop 2

# Deploy the program
anchor deploy --provider.cluster devnet
```

**Deploy to Mainnet:**
```bash
# Set Solana config to mainnet
solana config set --url mainnet-beta

# Deploy (requires real SOL)
anchor deploy --provider.cluster mainnet
```

## Program Architecture

### Accounts

#### UserAccount
Stores per-user statistics using PDAs.

```rust
pub struct UserAccount {
    pub authority: Pubkey,       // User's wallet
    pub discord_id: String,       // Discord user ID
    pub total_sent: u64,          // Total lamports sent
    pub total_received: u64,      // Total lamports received
    pub tip_count: u64,           // Number of tips sent
    pub bump: u8,                 // PDA bump seed
}
```

**PDA Seeds:** `["user", discord_id]`

#### Airdrop
Manages multi-recipient airdrops.

```rust
pub struct Airdrop {
    pub creator: Pubkey,             // Airdrop creator
    pub total_amount: u64,           // Total amount to distribute
    pub amount_per_recipient: u64,   // Amount each recipient gets
    pub recipients_count: u8,        // Max number of recipients
    pub claimed_count: u8,           // Number of claims so far
    pub is_active: bool,             // Active status
    pub created_at: i64,             // Creation timestamp
    pub bump: u8,                    // PDA bump seed
}
```

**PDA Seeds:** `["airdrop", creator, timestamp]`

### Instructions

#### initialize_user
Creates a new user account PDA.

**Parameters:**
- `discord_id: String` - Discord user ID (max 50 chars)

**Accounts:**
- `user_account` - PDA to initialize
- `authority` - User's wallet (signer)
- `system_program` - System program

#### tip_sol
Send a SOL tip from one user to another.

**Parameters:**
- `amount: u64` - Amount in lamports

**Accounts:**
- `sender_account` - Sender's user PDA
- `recipient_account` - Recipient's user PDA
- `sender` - Sender's wallet (signer)
- `recipient` - Recipient's wallet
- `system_program` - System program

#### tip_spl_token
Send an SPL token tip.

**Parameters:**
- `amount: u64` - Amount in token units

**Accounts:**
- `sender_account` - Sender's user PDA
- `recipient_account` - Recipient's user PDA
- `sender` - Sender's wallet (signer)
- `sender_token_account` - Sender's token account
- `recipient_token_account` - Recipient's token account
- `token_program` - SPL Token program

#### create_airdrop
Create a new multi-recipient airdrop.

**Parameters:**
- `total_amount: u64` - Total amount to distribute
- `recipients_count: u8` - Number of recipients (max 50)

**Accounts:**
- `airdrop` - Airdrop PDA to initialize
- `creator` - Creator's wallet (signer, funds PDA)
- `system_program` - System program

#### claim_airdrop
Claim from an active airdrop.

**Accounts:**
- `airdrop` - Airdrop PDA
- `claimer` - Claimer's wallet (signer)
- `system_program` - System program

#### close_airdrop
Close an airdrop and return remaining funds.

**Accounts:**
- `airdrop` - Airdrop PDA (closed)
- `creator` - Creator's wallet (receives remaining funds)
- `system_program` - System program

### Events

#### TipEvent
Emitted when a tip is sent.

```rust
pub struct TipEvent {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub token_type: TokenType,
    pub timestamp: i64,
}
```

#### AirdropClaimEvent
Emitted when an airdrop is claimed.

```rust
pub struct AirdropClaimEvent {
    pub airdrop: Pubkey,
    pub claimer: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
```

## Integration with Bot

After deploying the program, update the bot configuration:

1. **Update Program ID**: Copy the program ID from deployment
2. **Update Anchor.toml**: Add the program ID to all clusters
3. **Generate IDL**: The IDL is in `target/idl/justthetip.json`
4. **Update SDK**: Import and use the IDL in your TypeScript/JavaScript code

Example integration:

```typescript
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { Justthetip } from './target/types/justthetip';
import idl from './target/idl/justthetip.json';

const programId = new web3.PublicKey('YOUR_PROGRAM_ID');
const provider = AnchorProvider.env();
const program = new Program<Justthetip>(idl as any, programId, provider);

// Initialize user
const [userPda] = web3.PublicKey.findProgramAddressSync(
  [Buffer.from('user'), Buffer.from('discord_user_123')],
  programId
);

await program.methods
  .initializeUser('discord_user_123')
  .accounts({
    userAccount: userPda,
    authority: wallet.publicKey,
    systemProgram: web3.SystemProgram.programId,
  })
  .rpc();
```

## Development Workflow

### 1. Make Changes to Program
Edit `programs/justthetip/src/lib.rs`

### 2. Build
```bash
anchor build
```

### 3. Test
```bash
anchor test
```

### 4. Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

### 5. Test with Bot
Update bot configuration with new program ID and test.

### 6. Deploy to Mainnet
```bash
anchor deploy --provider.cluster mainnet
```

## Debugging

### View Program Logs
```bash
solana logs --url devnet
```

### Check Account Data
```bash
solana account <ACCOUNT_ADDRESS> --url devnet
```

### Verify Program Deployment
```bash
solana program show <PROGRAM_ID> --url devnet
```

## Security Considerations

1. **Input Validation**: All inputs are validated on-chain
2. **PDA Security**: PDAs ensure deterministic account generation
3. **Signer Checks**: All state-changing operations require proper signers
4. **Integer Overflow**: Uses checked arithmetic operations
5. **Rent Exemption**: All accounts are rent-exempt

## Testing

The test suite in `tests/justthetip.ts` covers:
- User account initialization
- SOL tipping with statistics tracking
- Airdrop creation and claiming
- Multiple user interactions

Run tests with:
```bash
anchor test
```

## Cost Estimates

**Devnet (free):**
- User account initialization: ~0.002 SOL (rent)
- Tip transaction: ~0.000005 SOL (tx fee)
- Airdrop creation: ~0.003 SOL (rent + tx fee)

**Mainnet:**
- Similar costs with real SOL

## Troubleshooting

**Build Errors:**
- Ensure Rust and Anchor are up to date
- Run `cargo clean` and rebuild

**Test Failures:**
- Check if local validator is running
- Ensure sufficient test SOL
- Verify account states between tests

**Deployment Issues:**
- Verify sufficient SOL for deployment
- Check network connectivity
- Ensure correct cluster configuration

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Solana Program Library](https://spl.solana.com/)

## License

JustTheTip Custom License (Based on MIT) - see LICENSE file for details.
