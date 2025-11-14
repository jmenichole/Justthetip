# JustTheTip Solana Program Development Guide

This guide covers everything you need to know to develop, build, test, and deploy the JustTheTip Solana smart contracts.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Program Architecture](#program-architecture)
4. [Building the Program](#building-the-program)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Integration with Bot](#integration-with-bot)
8. [Best Practices](#best-practices)

## Prerequisites

### Required Tools

1. **Rust** (version 1.70+)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

2. **Solana CLI** (version 1.17+)
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
   ```

3. **Anchor Framework** (version 0.29+)
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

4. **Node.js and Yarn** (for tests)
   ```bash
   # Using nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   npm install -g yarn
   ```

### Verify Installation

```bash
# Check Rust
rustc --version
cargo --version

# Check Solana
solana --version

# Check Anchor
anchor --version

# Check Node
node --version
yarn --version
```

## Development Setup

### 1. Clone and Navigate

```bash
cd Justthetip/justthetip-contracts
```

### 2. Install Dependencies

```bash
# Install Node dependencies for tests
npm install

# Or use yarn
yarn install
```

### 3. Configure Solana CLI

```bash
# Create a new keypair (if you don't have one)
solana-keygen new -o ~/.config/solana/id.json

# Set to devnet for development
solana config set --url devnet

# Get some devnet SOL
solana airdrop 2
```

### 4. Build the Program

```bash
anchor build
```

This will:
- Compile the Rust program to BPF bytecode
- Generate the program keypair
- Create the IDL (Interface Definition Language) file
- Output artifacts to `target/` directory

## Program Architecture

### Directory Structure

```
justthetip-contracts/
├── Anchor.toml                 # Anchor workspace config
├── Cargo.toml                  # Rust workspace config
├── package.json                # Node.js dependencies
├── tsconfig.json               # TypeScript config
├── programs/
│   └── justthetip/
│       ├── Cargo.toml          # Program dependencies
│       ├── Xargo.toml          # Build configuration
│       └── src/
│           └── lib.rs          # Main program code
├── tests/
│   └── justthetip.ts           # TypeScript integration tests
├── migrations/
│   └── deploy.ts               # Deployment script
└── target/
    ├── deploy/                 # Compiled programs
    ├── idl/                    # Generated IDL files
    └── types/                  # TypeScript types
```

### Program Accounts

The program manages two main account types:

1. **UserAccount**: Tracks per-user statistics
   - Authority (wallet owner)
   - Discord ID
   - Total sent/received amounts
   - Tip count

2. **Airdrop**: Manages multi-recipient airdrops
   - Creator
   - Total amount
   - Recipients count/claimed count
   - Active status

### Key Features

- **Non-custodial**: Users control their keys
- **PDA-based**: Deterministic account addresses
- **Event emission**: For analytics and indexing
- **SOL and SPL token support**: Flexible payment options
- **On-chain statistics**: Leaderboards and tracking

## Building the Program

### Initial Build

```bash
anchor build
```

### Rebuilding After Changes

```bash
# Clean build
anchor clean
anchor build
```

### Build Output

After building, you'll have:

1. **Compiled Program**: `target/deploy/justthetip.so`
2. **Program Keypair**: `target/deploy/justthetip-keypair.json`
3. **IDL File**: `target/idl/justthetip.json`
4. **TypeScript Types**: `target/types/justthetip.ts`

### Getting Program ID

```bash
anchor keys list
```

Or check the keypair:

```bash
solana address -k target/deploy/justthetip-keypair.json
```

## Testing

### Running Tests

```bash
# Run all tests (starts local validator automatically)
anchor test

# Run tests on existing validator
solana-test-validator  # In another terminal
anchor test --skip-local-validator

# Run specific test file
anchor test --skip-local-validator tests/justthetip.ts
```

### Test Structure

The tests in `tests/justthetip.ts` cover:

1. **User Initialization**: Creating user accounts
2. **SOL Tipping**: Sending tips between users
3. **Statistics Tracking**: Verifying on-chain stats
4. **Airdrop Creation**: Creating multi-recipient airdrops
5. **Airdrop Claiming**: Claiming from airdrops

### Writing New Tests

Example test:

```typescript
it("Creates a new user account", async () => {
  const discordId = "test_user_123";
  
  const [userPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user"), Buffer.from(discordId)],
    program.programId
  );
  
  await program.methods
    .initializeUser(discordId)
    .accounts({
      userAccount: userPda,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
    
  const account = await program.account.userAccount.fetch(userPda);
  assert.equal(account.discordId, discordId);
});
```

## Deployment

### Deploy to Devnet

```bash
# Ensure you're on devnet
solana config set --url devnet

# Get some SOL for deployment
solana airdrop 2

# Deploy
anchor deploy --provider.cluster devnet
```

### Deploy to Mainnet

**⚠️ Important**: Mainnet deployment requires real SOL and should be done carefully.

```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Verify you have enough SOL (deployment costs ~0.5-1 SOL)
solana balance

# Deploy
anchor deploy --provider.cluster mainnet

# Verify deployment
solana program show <PROGRAM_ID> --url mainnet-beta
```

### Program Upgrade

If you need to upgrade the program:

```bash
# Build new version
anchor build

# Upgrade (requires program authority)
solana program deploy \
  target/deploy/justthetip.so \
  --program-id target/deploy/justthetip-keypair.json \
  --url mainnet-beta
```

### Setting Program Authority

For security, you may want to set a multisig as the upgrade authority:

```bash
solana program set-upgrade-authority \
  <PROGRAM_ID> \
  --new-upgrade-authority <MULTISIG_ADDRESS> \
  --url mainnet-beta
```

## Integration with Bot

### 1. Update Program ID

After deployment, update `Anchor.toml` with your program ID:

```toml
[programs.mainnet]
justthetip = "YOUR_DEPLOYED_PROGRAM_ID"
```

### 2. Copy IDL to Bot

```bash
cp target/idl/justthetip.json ../contracts/
```

### 3. Update Bot Configuration

In your bot code, use the deployed program:

```javascript
const { Program, AnchorProvider } = require('@coral-xyz/anchor');
const idl = require('./contracts/justthetip.json');

const programId = new PublicKey('YOUR_PROGRAM_ID');
const provider = new AnchorProvider(connection, wallet, {});
const program = new Program(idl, programId, provider);
```

### 4. Update SDK

Modify `contracts/sdk.js` to use the deployed program for:
- User account initialization
- Tip transactions
- Airdrop operations

### 5. Environment Variables

Add to `.env`:

```env
JUSTTHETIP_PROGRAM_ID=YOUR_PROGRAM_ID
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Best Practices

### Development

1. **Test Thoroughly**: Always test on devnet before mainnet
2. **Use Localnet**: Test locally first with `solana-test-validator`
3. **Version Control**: Commit IDL files and program keypairs
4. **Clean Builds**: Run `anchor clean` if you see caching issues

### Security

1. **Audit Code**: Have the program audited before mainnet deployment
2. **Limit Program Authority**: Use multisig for upgrade authority
3. **Monitor Logs**: Watch program logs for issues
4. **Start Small**: Deploy with small amounts first

### Deployment

1. **Backup Keypairs**: Securely backup all keypairs
2. **Document Program ID**: Record the deployed program ID
3. **Verify Deployment**: Test all instructions after deployment
4. **Emergency Procedures**: Have a plan for upgrades/fixes

### Cost Management

1. **Optimize Account Size**: Minimize account sizes to reduce rent
2. **Batch Operations**: Combine multiple instructions when possible
3. **Monitor Costs**: Track SOL spent on transactions

## Common Issues

### Build Errors

**Issue**: `error: failed to run custom build command`
```bash
# Solution: Update Rust
rustup update
```

**Issue**: `anchor: command not found`
```bash
# Solution: Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
```

### Test Failures

**Issue**: Tests fail with "Attempt to debit an account but found no record of a prior credit"
```bash
# Solution: Airdrop more SOL to test accounts
solana airdrop 2 --url devnet
```

**Issue**: "Transaction simulation failed: Blockhash not found"
```bash
# Solution: Restart local validator
pkill solana-test-validator
solana-test-validator
```

### Deployment Issues

**Issue**: "Insufficient funds for deployment"
```bash
# Solution: Get more SOL
solana airdrop 2 --url devnet  # For devnet
# For mainnet, transfer real SOL to your wallet
```

**Issue**: "Program already exists"
```bash
# Solution: Use upgrade instead of deploy
solana program deploy target/deploy/justthetip.so \
  --program-id target/deploy/justthetip-keypair.json
```

## Advanced Topics

### Program Upgrades

Upgrading deployed programs requires:
1. Program authority access
2. Compiled new version
3. Sufficient SOL for transaction

### Cross-Program Invocation (CPI)

The program uses CPI to:
- Transfer SOL via System Program
- Transfer SPL tokens via Token Program

### Event Indexing

Events emitted by the program can be indexed:
1. Listen to program logs
2. Parse event data
3. Store in database for analytics

### PDAs and Seeds

Understanding PDA generation:
```rust
// User PDA
seeds = [b"user", discord_id.as_bytes()]

// Airdrop PDA
seeds = [b"airdrop", creator.as_ref(), timestamp.to_le_bytes()]
```

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Solana Program Library](https://spl.solana.com/)
- [Anchor Examples](https://github.com/coral-xyz/anchor/tree/master/tests)

## Support

For issues or questions:
- GitHub Issues: [Report bugs](https://github.com/jmenichole/Justthetip/issues)
- Developer Guide: See `DEVELOPER_GUIDE.md`

## License

JustTheTip Custom License (Based on MIT) - see LICENSE file for details.
