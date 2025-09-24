# JustTheTip Solana Smart Contract

A Solana program that enables non-custodial tipping functionality using Program Derived Addresses (PDAs).

## Features

- **Non-custodial**: Users maintain full control of their funds
- **PDA-based**: Uses Program Derived Addresses for user accounts
- **Tip lifecycle**: Create → Execute/Cancel tip transactions
- **SOL transfers**: Native SOL tipping with escrow functionality

## Program Instructions

### InitializeUserAccount
Creates a PDA for a Discord user to store tip-related data.

### CreateTip
Creates a tip transaction that holds the tip amount in escrow until executed.

### ExecuteTip
Executes the tip by transferring SOL from sender to recipient.

### CancelTip
Cancels a pending tip and returns funds to the sender.

## Building

```bash
cd contracts/solana-program
cargo build-bpf
```

## Deployment

```bash
solana program deploy target/deploy/justthetip_program.so
```

## Program ID

After deployment, update the program ID in:
- `contracts/sdk.js`
- `src/bots/bot_smart_contract_pure.js`

## Security

- All transfers require explicit user signatures
- Funds are held in PDAs controlled by the program
- No private keys are stored or handled by the bot