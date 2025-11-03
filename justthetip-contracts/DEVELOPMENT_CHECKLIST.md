# JustTheTip Smart Contract Development Checklist

Use this checklist to ensure proper setup and deployment of the Solana smart contracts.

## Initial Setup

### Prerequisites Installation
- [ ] Install Rust (1.70+)
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
- [ ] Install Solana CLI (1.17+)
  ```bash
  sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
  ```
- [ ] Install Anchor CLI (0.29+)
  ```bash
  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
  avm install latest && avm use latest
  ```
- [ ] Install Node.js (18+) and npm/yarn
- [ ] Verify installations:
  ```bash
  rustc --version
  solana --version
  anchor --version
  node --version
  ```

### Solana Configuration
- [ ] Create or import Solana keypair
  ```bash
  solana-keygen new -o ~/.config/solana/id.json
  ```
- [ ] Set Solana to devnet
  ```bash
  solana config set --url devnet
  ```
- [ ] Get devnet SOL
  ```bash
  solana airdrop 2
  ```
- [ ] Verify balance
  ```bash
  solana balance
  ```

### Project Setup
- [ ] Navigate to contracts directory
  ```bash
  cd justthetip-contracts
  ```
- [ ] Install Node dependencies
  ```bash
  npm install
  ```

## Development Workflow

### Building
- [ ] Clean previous builds (if any)
  ```bash
  anchor clean
  ```
- [ ] Build the program
  ```bash
  anchor build
  ```
- [ ] Verify build artifacts exist:
  - [ ] `target/deploy/justthetip.so`
  - [ ] `target/deploy/justthetip-keypair.json`
  - [ ] `target/idl/justthetip.json`
  - [ ] `target/types/justthetip.ts`
- [ ] Get program ID
  ```bash
  anchor keys list
  ```

### Testing
- [ ] Run local validator (in separate terminal)
  ```bash
  solana-test-validator
  ```
- [ ] Run tests
  ```bash
  anchor test --skip-local-validator
  ```
- [ ] Verify all tests pass
- [ ] Check test coverage includes:
  - [ ] User initialization
  - [ ] SOL tipping
  - [ ] Statistics tracking
  - [ ] Airdrop creation
  - [ ] Airdrop claiming

### Code Quality
- [ ] Format Rust code
  ```bash
  cargo fmt --all
  ```
- [ ] Run Clippy (linter)
  ```bash
  cargo clippy -- -D warnings
  ```
- [ ] Fix any warnings or errors
- [ ] Review code for security issues
- [ ] Check for proper error handling

## Deployment

### Devnet Deployment
- [ ] Ensure on devnet
  ```bash
  solana config set --url devnet
  ```
- [ ] Check balance (need ~0.5 SOL)
  ```bash
  solana balance
  ```
- [ ] Deploy program
  ```bash
  anchor deploy --provider.cluster devnet
  # OR
  ./scripts/deploy.sh devnet
  ```
- [ ] Record program ID
- [ ] Verify deployment on explorer
  ```
  https://explorer.solana.com/address/[PROGRAM_ID]?cluster=devnet
  ```
- [ ] Test deployed program
  ```bash
  anchor test --skip-local-validator
  ```

### Mainnet Deployment Preparation
- [ ] Complete all devnet testing
- [ ] Security audit completed
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Integration tests pass
- [ ] Load testing completed (if applicable)
- [ ] Emergency procedures documented
- [ ] Backup all keypairs securely
- [ ] Get sufficient mainnet SOL (~2-3 SOL recommended)

### Mainnet Deployment
- [ ] **Final review**: Are you sure you're ready?
- [ ] Switch to mainnet
  ```bash
  solana config set --url mainnet-beta
  ```
- [ ] Verify wallet balance
  ```bash
  solana balance
  ```
- [ ] Deploy to mainnet
  ```bash
  anchor deploy --provider.cluster mainnet
  # OR
  ./scripts/deploy.sh mainnet
  ```
- [ ] Record mainnet program ID
- [ ] Verify deployment on explorer
  ```
  https://explorer.solana.com/address/[PROGRAM_ID]
  ```
- [ ] Test with small amounts first
- [ ] Monitor program logs
  ```bash
  solana logs [PROGRAM_ID]
  ```

## Post-Deployment

### Integration
- [ ] Update `Anchor.toml` with program ID
- [ ] Copy IDL to bot directory
  ```bash
  cp target/idl/justthetip.json ../contracts/
  ```
- [ ] Update bot configuration with program ID
- [ ] Update environment variables
  ```bash
  JUSTTHETIP_PROGRAM_ID=[YOUR_PROGRAM_ID]
  ```
- [ ] Test bot integration
- [ ] Verify all bot commands work

### Documentation
- [ ] Update README with program ID
- [ ] Document deployment date and cluster
- [ ] Update integration examples
- [ ] Record program authority wallet
- [ ] Document upgrade procedures

### Monitoring
- [ ] Set up program log monitoring
- [ ] Set up error alerting
- [ ] Monitor transaction volume
- [ ] Track program rent status
- [ ] Monitor for unusual activity

### Security
- [ ] Backup program keypair securely
- [ ] Set upgrade authority (multisig recommended)
  ```bash
  solana program set-upgrade-authority [PROGRAM_ID] \
    --new-upgrade-authority [MULTISIG_ADDRESS]
  ```
- [ ] Document emergency procedures
- [ ] Set up incident response plan
- [ ] Regular security reviews scheduled

## Maintenance

### Regular Tasks
- [ ] Monitor program logs weekly
- [ ] Review transactions monthly
- [ ] Check for Anchor/Solana updates
- [ ] Review and update documentation
- [ ] Test upgrades on devnet first

### Upgrade Procedure
- [ ] Test changes on devnet
- [ ] Run full test suite
- [ ] Deploy to devnet and test
- [ ] Get approval (if required)
- [ ] Build new version
  ```bash
  anchor build
  ```
- [ ] Deploy upgrade
  ```bash
  solana program deploy target/deploy/justthetip.so \
    --program-id target/deploy/justthetip-keypair.json
  ```
- [ ] Verify upgrade
- [ ] Monitor for issues
- [ ] Update documentation

## Troubleshooting Reference

### Build Issues
- [ ] Run `cargo clean` and rebuild
- [ ] Update Rust: `rustup update`
- [ ] Update Anchor: `avm update`
- [ ] Check Cargo.toml dependencies

### Test Failures
- [ ] Restart local validator
- [ ] Check account balances
- [ ] Review test logs
- [ ] Verify account states

### Deployment Issues
- [ ] Check SOL balance
- [ ] Verify network connectivity
- [ ] Check program size limits
- [ ] Review deployment logs

## Resources Checklist
- [ ] Bookmark [Anchor Docs](https://www.anchor-lang.com/)
- [ ] Bookmark [Solana Docs](https://docs.solana.com/)
- [ ] Bookmark [Solana Explorer](https://explorer.solana.com/)
- [ ] Save program ID
- [ ] Save wallet addresses
- [ ] Save RPC endpoints

## Sign-Off

### Development Complete
- [ ] All features implemented
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation complete
- [ ] Ready for deployment

### Deployment Complete
- [ ] Deployed to devnet: _____ (date)
- [ ] Deployed to mainnet: _____ (date)
- [ ] Program ID recorded: _____
- [ ] Bot integrated: _____ (date)
- [ ] Monitoring active: _____ (date)

---

**Notes:**
- Keep this checklist updated as requirements change
- Use it as a template for each major deployment
- Add project-specific items as needed
