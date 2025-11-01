# Non-Custodial Tipping: Technical Architecture

## Overview

JustTheTip implements a **non-custodial architecture** that ensures users maintain complete control over their cryptocurrency funds. Unlike traditional custodial Discord bots where the bot controls private keys, JustTheTip generates unsigned transaction instructions that users sign with their own wallets.

This document provides a comprehensive technical explanation of how JustTheTip ensures non-custodial tipping.

## Core Principle: User Sovereignty

**Custodial vs Non-Custodial:**

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTODIAL APPROACH ❌                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User deposits funds to bot's controlled wallet           │
│  2. Bot stores user balances in database                     │
│  3. Bot controls private keys                                │
│  4. Bot signs transactions on user's behalf                  │
│  5. Single point of failure - bot compromise = fund loss     │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  NON-CUSTODIAL APPROACH ✅                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User keeps funds in their own wallet                     │
│  2. User registers wallet address with bot                   │
│  3. Bot generates unsigned transaction instructions          │
│  4. User signs transaction with their own wallet             │
│  5. Zero bot risk - bot never has access to funds            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Technical Architecture

### 1. Wallet Registration

Users register their Solana wallet addresses with the Discord bot:

```javascript
// User executes: /register-wallet <SOLANA_ADDRESS>

// Bot validates and stores mapping
const walletMapping = {
  discordUserId: "123456789",
  solanaAddress: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK"
};

// Stored in database - NO private keys
db.users.insert(walletMapping);
```

**Security Properties:**
- ✅ Only public addresses are stored
- ✅ Bot never sees or stores private keys
- ✅ Users can change registered address anytime
- ✅ Multiple addresses can be registered per user

### 2. Transaction Instruction Generation

When a user wants to tip, the bot creates an **unsigned transaction**:

```javascript
// User executes: /sc-tip @recipient 0.5

const { JustTheTipSDK } = require('./contracts/sdk');
const sdk = new JustTheTipSDK(SOLANA_RPC_URL);

// Generate unsigned transaction instruction
const transaction = sdk.createTipInstruction(
  senderAddress,    // Sender's registered address
  recipientAddress, // Recipient's registered address
  0.5              // Amount in SOL
);

// Transaction is UNSIGNED - no private keys involved
// Bot returns transaction to user for signing
```

### 3. Transaction Signing Flow

The complete transaction flow ensures user control:

```
┌──────────────┐
│              │
│  Discord     │
│  User        │
│              │
└──────┬───────┘
       │
       │ /sc-tip @user 0.5
       ▼
┌──────────────────────────────────────────────┐
│                                              │
│  JustTheTip Bot                              │
│  ┌────────────────────────────────────────┐ │
│  │  1. Validate user registration         │ │
│  │  2. Validate recipient registration    │ │
│  │  3. Generate unsigned transaction      │ │
│  │  4. Encode transaction as base64       │ │
│  └────────────────────────────────────────┘ │
│                                              │
└──────────────┬───────────────────────────────┘
               │
               │ Returns unsigned transaction
               ▼
┌──────────────────────────────────────────────┐
│                                              │
│  User's Wallet (Phantom, Solflare, etc.)    │
│  ┌────────────────────────────────────────┐ │
│  │  1. Decode transaction                 │ │
│  │  2. Display transaction details        │ │
│  │  3. User reviews and approves          │ │
│  │  4. Wallet signs with user's key       │ │
│  │  5. Wallet submits to Solana network   │ │
│  └────────────────────────────────────────┘ │
│                                              │
└──────────────┬───────────────────────────────┘
               │
               │ Signed transaction
               ▼
┌──────────────────────────────────────────────┐
│                                              │
│  Solana Blockchain                           │
│  ┌────────────────────────────────────────┐ │
│  │  1. Validates signature                │ │
│  │  2. Checks sender has sufficient funds │ │
│  │  3. Executes transfer                  │ │
│  │  4. Updates on-chain state             │ │
│  └────────────────────────────────────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

### 4. On-Chain Balance Queries

Instead of maintaining a database of balances, the bot queries the blockchain directly:

```javascript
// User executes: /sc-balance

const sdk = new JustTheTipSDK(SOLANA_RPC_URL);

// Query Solana blockchain directly
const solBalance = await sdk.getBalance(userAddress);
const usdcBalance = await sdk.getSPLTokenBalance(
  userAddress,
  USDC_MINT_ADDRESS
);

// Real-time, accurate, verifiable balances
// No database synchronization issues
// No risk of accounting errors
```

**Benefits:**
- ✅ Real-time balance information
- ✅ No database synchronization needed
- ✅ Users can verify balances independently
- ✅ Impossible for bot to manipulate balances

### 5. Program Derived Addresses (PDAs)

For advanced features, JustTheTip uses Solana's PDA system:

```javascript
// Generate deterministic address for user
const pda = sdk.generateUserPDA(discordUserId);

console.log({
  address: pda.address,  // Unique address for this user
  bump: pda.bump        // Derivation bump number
});

// PDA Properties:
// - Deterministic: Same input always produces same address
// - Unique: Different Discord IDs produce different addresses
// - No private key exists for PDA
// - Can be used for escrow and advanced features
```

**Use Cases:**
- Escrow accounts for secure trades
- Multi-signature requirements
- Cross-program invocations
- Gasless account creation

## Security Guarantees

### What the Bot CAN Do ✅

1. **Read Public Data**: Query blockchain for balances and transaction history
2. **Generate Instructions**: Create unsigned transaction instructions
3. **Store Mappings**: Store Discord ID to wallet address mappings
4. **Validate Addresses**: Verify Solana addresses are correctly formatted
5. **Display Information**: Show users their balances and transaction details

### What the Bot CANNOT Do ❌

1. **Sign Transactions**: Bot never has access to private keys
2. **Move Funds**: Bot cannot transfer user funds without explicit user signature
3. **Access Wallets**: Bot cannot access user wallet contents
4. **Reverse Transactions**: Like all blockchain transactions, they are immutable
5. **Manipulate Balances**: All balances come directly from blockchain

## Attack Vector Analysis

### Scenario 1: Bot Server Compromise

**Traditional Custodial Bot:**
```
Attacker gains server access
  → Accesses stored private keys
  → Steals ALL user funds ❌
  → Total platform loss
```

**JustTheTip Non-Custodial:**
```
Attacker gains server access
  → No private keys stored ✅
  → Can only see wallet addresses (public info)
  → ZERO user fund risk ✅
  → Users unaffected
```

### Scenario 2: Database Breach

**Traditional Custodial Bot:**
```
Database compromised
  → User balances manipulated ❌
  → Fraudulent withdrawals possible ❌
  → Accounting chaos
```

**JustTheTip Non-Custodial:**
```
Database compromised
  → Only Discord ID to address mappings exposed
  → All addresses are public information anyway ✅
  → Users can re-register with new addresses ✅
  → Funds remain safe on blockchain ✅
```

### Scenario 3: Malicious Bot Operator

**Traditional Custodial Bot:**
```
Malicious operator
  → Has access to all private keys ❌
  → Can drain all user funds ❌
  → Users have no recourse
```

**JustTheTip Non-Custodial:**
```
Malicious operator
  → No access to private keys ✅
  → Cannot sign transactions ✅
  → Can only generate instructions ✅
  → Users must still approve every transaction ✅
```

## Comparison with Traditional Finance

### Custodial Bot = Traditional Bank

```
┌────────────────────────────────────┐
│  Traditional Bank Model            │
├────────────────────────────────────┤
│  - Bank controls your funds        │
│  - You trust bank to manage money  │
│  - Bank can freeze accounts        │
│  - Requires KYC/AML compliance     │
│  - FDIC insurance (up to limit)    │
└────────────────────────────────────┘
```

### Non-Custodial Bot = Self-Custody

```
┌────────────────────────────────────┐
│  Non-Custodial Model               │
├────────────────────────────────────┤
│  - You control your funds          │
│  - You are your own bank           │
│  - No one can freeze your assets   │
│  - No KYC required                 │
│  - Your responsibility to secure   │
└────────────────────────────────────┘
```

## Code Implementation

### SDK Core Functions

```javascript
class JustTheTipSDK {
  /**
   * Create unsigned SOL transfer instruction
   * @param {string} sender - Sender's public key
   * @param {string} recipient - Recipient's public key
   * @param {number} amount - Amount in SOL
   * @returns {Transaction} Unsigned transaction
   */
  createTipInstruction(sender, recipient, amount) {
    const senderPubkey = new PublicKey(sender);
    const recipientPubkey = new PublicKey(recipient);
    const lamports = amount * LAMPORTS_PER_SOL;

    // Create transfer instruction
    const instruction = SystemProgram.transfer({
      fromPubkey: senderPubkey,
      toPubkey: recipientPubkey,
      lamports,
    });

    // Add to transaction (UNSIGNED)
    const transaction = new Transaction().add(instruction);
    
    // No signing happens here!
    return transaction;
  }

  /**
   * Get on-chain balance
   * @param {string} address - Wallet address
   * @returns {number} Balance in SOL
   */
  async getBalance(address) {
    const pubkey = new PublicKey(address);
    const lamports = await this.connection.getBalance(pubkey);
    return lamports / LAMPORTS_PER_SOL;
  }
}
```

### Bot Integration

```javascript
// Discord slash command handler
client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'sc-tip') {
    const recipient = interaction.options.getUser('user');
    const amount = interaction.options.getNumber('amount');

    // Get registered addresses
    const senderAddress = await db.getWalletAddress(interaction.user.id);
    const recipientAddress = await db.getWalletAddress(recipient.id);

    // Generate unsigned transaction
    const transaction = sdk.createTipInstruction(
      senderAddress,
      recipientAddress,
      amount
    );

    // Encode for user to sign
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    const base64 = serialized.toString('base64');

    // Return to user
    await interaction.reply({
      content: 'Sign this transaction in your wallet:',
      components: [createSignatureButton(base64)]
    });
  }
});
```

## Best Practices

### For Users

1. **Verify Transaction Details**: Always check amount and recipient before signing
2. **Use Hardware Wallets**: For large amounts, use Ledger or similar
3. **Keep Keys Secure**: Never share your seed phrase or private keys
4. **Regular Monitoring**: Check transaction history on Solana explorers
5. **Small Test Transactions**: Test with small amounts first

### For Developers

1. **Never Store Private Keys**: Use the SDK to generate unsigned transactions
2. **Validate All Inputs**: Check addresses, amounts, and user permissions
3. **Rate Limiting**: Implement rate limits to prevent abuse
4. **Audit Logging**: Log all instruction generation (not keys!)
5. **Clear User Communication**: Explain the signature process clearly

## Conclusion

JustTheTip's non-custodial architecture represents the gold standard for blockchain integration in Discord bots. By ensuring users always maintain control of their private keys and must explicitly sign every transaction, the system provides:

- ✅ Maximum security
- ✅ User sovereignty
- ✅ Transparency and verifiability
- ✅ Regulatory compliance
- ✅ Zero custodial risk

This architecture proves that convenience and security are not mutually exclusive - users can enjoy seamless tipping while maintaining complete control of their funds.

## Further Reading

- [Solana Transaction Documentation](https://docs.solana.com/developing/programming-model/transactions)
- [Program Derived Addresses](https://docs.solana.com/developing/programming-model/calling-between-programs#program-derived-addresses)
- [Self-Custody Best Practices](https://www.ledger.com/academy/not-your-keys-not-your-coins-why-it-matters)
- [JustTheTip SDK Documentation](../contracts/README.md)

---

*For questions or contributions, please see [CONTRIBUTING.md](../CONTRIBUTING.md)*
