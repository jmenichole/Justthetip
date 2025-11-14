# JustTheTip Solana Development Quick Start

Get up and running with JustTheTip Solana smart contract development in minutes.

## Prerequisites Checklist

Before you begin, ensure you have:

- [ ] **Rust** (1.70+): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- [ ] **Solana CLI** (1.17+): `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"`
- [ ] **Anchor** (0.29+): `cargo install --git https://github.com/coral-xyz/anchor avm --locked --force && avm install latest && avm use latest`
- [ ] **Node.js** (18+): `nvm install 18 && nvm use 18`

### Quick Verification

```bash
# Verify all tools are installed
rustc --version && solana --version && anchor --version && node --version
```

## 5-Minute Setup

### 1. Configure Solana

```bash
# Create a new keypair (if needed)
solana-keygen new -o ~/.config/solana/id.json

# Set to devnet
solana config set --url devnet

# Get devnet SOL
solana airdrop 2
```

### 2. Install Dependencies

```bash
cd justthetip-contracts
npm install
```

### 3. Build the Program

```bash
anchor build
```

Expected output:
```
✨ Built programs
✅ Created IDL files
```

### 4. Run Tests

```bash
# Option A: Run tests (starts validator automatically)
anchor test

# Option B: Use existing validator
solana-test-validator  # In another terminal
anchor test --skip-local-validator
```

### 5. Deploy to Devnet

```bash
# Using the deployment script
./scripts/deploy.sh devnet

# Or manually
anchor deploy --provider.cluster devnet
```

## What You Just Built

You now have:

✅ **Compiled Solana Program**: `target/deploy/justthetip.so`  
✅ **Program ID**: Check with `anchor keys list`  
✅ **IDL File**: `target/idl/justthetip.json` (for client integration)  
✅ **TypeScript Types**: `target/types/justthetip.ts`  
✅ **Deployed to Devnet**: Ready for testing!

## Next Steps

### Test Your Deployment

```bash
# Get your program ID
PROGRAM_ID=$(anchor keys list | grep justthetip | awk '{print $2}')

# View on Solana Explorer
echo "https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"

# Check program info
solana program show $PROGRAM_ID --url devnet
```

### Integrate with Bot

1. **Copy IDL to bot**:
   ```bash
   cp target/idl/justthetip.json ../contracts/
   ```

2. **Update bot config** with your program ID

3. **Test bot commands** using the deployed program

### Make Changes

1. Edit `programs/justthetip/src/lib.rs`
2. Rebuild: `anchor build`
3. Test: `anchor test`
4. Deploy: `anchor deploy --provider.cluster devnet`

## Common Commands

```bash
# Build
anchor build

# Test
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet (be careful!)
anchor deploy --provider.cluster mainnet

# Clean build artifacts
anchor clean

# View program logs
solana logs --url devnet

# Check account
solana account <ADDRESS> --url devnet
```

## Program Features

Your deployed program includes:

- ✅ **User Accounts**: PDA-based user stats tracking
- ✅ **SOL Tipping**: Send SOL tips with on-chain records
- ✅ **SPL Token Support**: Tip with any SPL token
- ✅ **Airdrops**: Create and claim multi-recipient airdrops
- ✅ **Events**: Emitted for analytics and indexing
- ✅ **Statistics**: Total sent, received, and tip counts

## Troubleshooting

### "anchor: command not found"
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### "Insufficient funds"
```bash
# For devnet
solana airdrop 2 --url devnet

# For mainnet, transfer real SOL to your wallet
```

### Build errors
```bash
# Clean and rebuild
anchor clean
anchor build
```

### Tests fail
```bash
# Restart validator
pkill solana-test-validator
solana-test-validator

# Run tests again
anchor test --skip-local-validator
```

## Development Workflow

1. **Make changes** to `programs/justthetip/src/lib.rs`
2. **Build**: `anchor build`
3. **Test**: `anchor test`
4. **Deploy to devnet**: `anchor deploy --provider.cluster devnet`
5. **Test with bot**: Update bot and test commands
6. **Deploy to mainnet**: When ready, `anchor deploy --provider.cluster mainnet`

## Resources

- **Full Guide**: See `SOLANA_PROGRAM_GUIDE.md`
- **Program README**: See `justthetip-contracts/README.md`
- **Anchor Docs**: https://www.anchor-lang.com/
- **Solana Docs**: https://docs.solana.com/

## Getting Help

- 📖 Check `SOLANA_PROGRAM_GUIDE.md` for detailed documentation
- 🐛 Report issues on GitHub
- 💬 Join the Discord community

## Security Reminder

⚠️ **Before deploying to mainnet**:
- Test thoroughly on devnet
- Have the code audited
- Start with small amounts
- Use a multisig for program authority
- Monitor program logs

---

**Ready to build?** Start with `anchor build` and follow the steps above!

For more detailed information, see the comprehensive `SOLANA_PROGRAM_GUIDE.md`.
