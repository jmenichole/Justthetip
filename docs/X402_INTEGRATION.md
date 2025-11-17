# x402 Payment Protocol Integration

## Overview

JustTheTip integrates the **x402 payment protocol** for instant, micropayment-based API monetization on Solana. The x402 protocol leverages HTTP 402 (Payment Required) status codes to enable seamless pay-per-use access to premium features without requiring traditional authentication or subscription models.

## What is x402?

x402 is a payment protocol that enables:
- **Instant Payments**: USDC payments settle in <1 second on Solana
- **No Accounts Required**: Users pay directly with their Solana wallets
- **Micropayments**: Charge as little as $0.01 per API call
- **Transparent**: All payments are on-chain and verifiable
- **Web-Native**: Uses standard HTTP status codes (402)

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │         │  API Server  │         │   Solana    │
│   (Wallet)  │         │  (x402)      │         │  Blockchain │
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                        │
       │ 1. Request Resource   │                        │
       │──────────────────────>│                        │
       │                       │                        │
       │ 2. 402 Payment Req    │                        │
       │<──────────────────────│                        │
       │   (Payment Details)   │                        │
       │                       │                        │
       │ 3. USDC Payment       │                        │
       │───────────────────────┼───────────────────────>│
       │                       │                        │
       │ 4. Request + Proof    │                        │
       │──────────────────────>│                        │
       │  (X-Payment header)   │                        │
       │                       │ 5. Verify Payment      │
       │                       │<───────────────────────│
       │                       │                        │
       │ 6. Return Resource    │                        │
       │<──────────────────────│                        │
```

## Available Paid Endpoints

### 1. Premium Analytics Dashboard
**Endpoint**: `GET /api/x402/premium/analytics`  
**Price**: $1.00 USDC  
**Description**: Access detailed analytics including total tips, volume, active users, and top tippers.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "totalTips": 12500,
    "totalVolume": "1,234 SOL",
    "activeUsers": 450,
    "topTippers": [...],
    "recentActivity": [...]
  }
}
```

### 2. Priority NFT Minting
**Endpoint**: `POST /api/x402/premium/mint-priority`  
**Price**: $2.50 USDC  
**Description**: Skip the regular queue and get priority NFT minting with faster processing.

**Request Body**:
```json
{
  "discordId": "123456789",
  "walletAddress": "YourSolanaWalletAddress"
}
```

### 3. Premium Bot Commands
**Endpoint**: `POST /api/x402/premium/bot-commands`  
**Price**: $0.50 USDC  
**Description**: Unlock advanced bot commands like leaderboard exports and scheduled tips.

## Implementation Guide

### For Developers

#### 1. Make Initial Request
```javascript
const response = await fetch('https://api.justthetip.io/api/x402/premium/analytics', {
  method: 'GET'
});

if (response.status === 402) {
  // Payment required
  const paymentDetails = await response.json();
  console.log('Payment required:', paymentDetails.payment);
}
```

#### 2. Handle 402 Response
```javascript
{
  "error": "Payment Required",
  "code": 402,
  "payment": {
    "protocol": "x402",
    "version": "1.0",
    "chain": "solana",
    "network": "devnet",
    "payment": {
      "recipient": "TreasuryWalletAddress...",
      "amount": "1000000",
      "currency": "USDC",
      "mint": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      "description": "Premium Analytics Dashboard Access"
    }
  }
}
```

#### 3. Send Payment (Using @solana/web3.js)
```javascript
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';

async function payForResource(paymentDetails, wallet) {
  const connection = new Connection('https://api.devnet.solana.com');
  const usdcMint = new PublicKey(paymentDetails.payment.mint);
  const recipient = new PublicKey(paymentDetails.payment.recipient);
  
  // Get token accounts
  const senderTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    wallet.publicKey
  );
  const recipientTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    recipient
  );
  
  // Create transfer instruction
  const transferInstruction = createTransferInstruction(
    senderTokenAccount,
    recipientTokenAccount,
    wallet.publicKey,
    BigInt(paymentDetails.payment.amount)
  );
  
  // Build and send transaction
  const transaction = new Transaction().add(transferInstruction);
  const signature = await wallet.sendTransaction(transaction, connection);
  
  // Wait for confirmation
  await connection.confirmTransaction(signature);
  
  return signature;
}
```

#### 4. Retry with Payment Proof
```javascript
const signature = await payForResource(paymentDetails, wallet);

const paidResponse = await fetch('https://api.justthetip.io/api/x402/premium/analytics', {
  method: 'GET',
  headers: {
    'X-Payment': signature
  }
});

if (paidResponse.ok) {
  const data = await paidResponse.json();
  console.log('Premium data:', data);
}
```

### Using x402 SDK (Recommended)

Install the SDK:
```bash
npm install @payai/x402-solana
```

Client-side usage:
```javascript
import { createX402Client } from '@payai/x402-solana/client';

const client = createX402Client({
  wallet: yourSolanaWallet,
  network: 'solana-devnet',
  maxPaymentAmount: BigInt(10_000_000) // Max $10 USDC
});

// Automatically handles 402 response and payment
const response = await client.fetch('/api/x402/premium/analytics');
const data = await response.json();
```

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# x402 Payment Protocol
X402_TREASURY_WALLET=YourSolanaTreasuryWalletAddress

# USDC automatically selected based on cluster
# Devnet: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
# Mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### Testing on Devnet

1. Get devnet USDC:
   ```bash
   # Request devnet SOL
   solana airdrop 2
   
   # Get devnet USDC from faucet
   # Visit: https://spl-token-faucet.com/
   ```

2. Test payment endpoint:
   ```bash
   curl https://api.justthetip.io/api/x402/info
   ```

## Advanced Features

### Custom Payment Amounts

Create custom paid endpoints:
```javascript
const x402Handler = new X402PaymentHandler({
  network: 'devnet',
  treasuryAddress: process.env.X402_TREASURY_WALLET
});

app.get('/api/custom/feature', x402Handler.requirePayment({
  amount: "500000", // $0.50 USDC
  description: "Custom Feature Access",
  resource: "custom-feature"
}), async (req, res) => {
  // Your custom logic here
  res.json({ data: "Premium content" });
});
```

### Payment Verification

Check payment status:
```bash
curl https://api.justthetip.io/api/x402/payment/{transactionSignature}
```

Response:
```json
{
  "success": true,
  "signature": "5Xz...",
  "status": {
    "status": "confirmed",
    "message": "Payment confirmed",
    "blockTime": 1699123456,
    "slot": 123456789
  }
}
```

## Security Considerations

### Payment Verification
- All payments are verified on-chain before granting access
- Transaction signatures cannot be reused
- Recipient address is validated
- Amount is checked (minimum required)

### Best Practices
1. Always verify payments on-chain
2. Use mainnet for production
3. Set reasonable payment amounts
4. Implement rate limiting
5. Log all payment attempts
6. Monitor for suspicious activity

## Integration Examples

### Discord Bot Integration

Add x402 payments to Discord commands:
```javascript
// Premium command requiring payment
client.on('interactionCreate', async interaction => {
  if (interaction.commandName === 'premium-analytics') {
    const paymentUrl = 'https://api.justthetip.io/api/x402/premium/analytics';
    
    await interaction.reply({
      content: 'This feature requires a small payment. Visit the link below to access:',
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 5,
          label: 'Pay & Access ($1.00 USDC)',
          url: paymentUrl
        }]
      }]
    });
  }
});
```

### Web Application Integration

React component example:
```jsx
import { useWallet } from '@solana/wallet-adapter-react';
import { createX402Client } from '@payai/x402-solana/client';

function PremiumAnalytics() {
  const { wallet } = useWallet();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const fetchPremiumData = async () => {
    setLoading(true);
    try {
      const client = createX402Client({ wallet, network: 'solana-devnet' });
      const response = await client.fetch('/api/x402/premium/analytics');
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Payment failed:', error);
    }
    setLoading(false);
  };
  
  return (
    <div>
      <button onClick={fetchPremiumData} disabled={loading}>
        {loading ? 'Processing Payment...' : 'Access Premium Analytics ($1.00)'}
      </button>
      {data && <AnalyticsDisplay data={data} />}
    </div>
  );
}
```

## Monitoring & Analytics

### Track Payments
```javascript
// Get all payments to treasury
const payments = await connection.getSignaturesForAddress(
  new PublicKey(treasuryAddress),
  { limit: 100 }
);
```

### Revenue Tracking
Monitor revenue in real-time:
```bash
curl https://api.justthetip.io/api/x402/stats
```

## Troubleshooting

### Common Issues

**Issue**: Payment not verified  
**Solution**: Ensure transaction is confirmed on-chain before retrying request

**Issue**: 402 response not showing payment details  
**Solution**: Check X402_TREASURY_WALLET is configured

**Issue**: Invalid signature error  
**Solution**: Verify transaction signature format (base58 string)

**Issue**: Insufficient funds  
**Solution**: Ensure wallet has enough USDC for payment + transaction fees

## Resources

- [x402 Protocol Specification](https://solana.com/x402)
- [Solana x402 Hackathon](https://solana.com/x402/hackathon)
- [@payai/x402-solana SDK](https://www.npmjs.com/package/x402-solana)
- [JustTheTip GitHub](https://github.com/jmenichole/Justthetip)

## Support

For x402 integration support:
- GitHub Issues: https://github.com/jmenichole/Justthetip/issues
- Solana Discord: #x402-hackathon channel
- Landing Page: https://jmenichole.github.io/Justthetip/

---

**Built for Solana x402 Hackathon**  
*Instant Payments, Infinite Possibilities*
