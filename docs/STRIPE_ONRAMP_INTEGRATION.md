# Stripe Crypto Onramp Integration

This document describes the Stripe Crypto Onramp integration in JustTheTip, which allows users to purchase cryptocurrency directly to their Solana wallets.

## Overview

Stripe's Crypto Onramp provides a secure, compliant way for users to buy cryptocurrency using credit/debit cards, bank transfers, and other payment methods. The embedded widget approach is Stripe's recommended implementation method.

## Features

- **Embedded Widget**: Seamlessly integrated into the JustTheTip interface
- **Backend Session Creation**: Secure server-side session management
- **Webhook Support**: Real-time notifications for transaction updates
- **Solana Support**: Direct purchases to Solana wallets (SOL and USDC)
- **Secure**: PCI-compliant payment processing by Stripe

## Architecture

### Backend Components

1. **Stripe Onramp Routes** (`api/routes/stripeOnrampRoutes.js`)
   - `POST /api/stripe/onramp/session` - Create new onramp session
   - `GET /api/stripe/onramp/session/:sessionId` - Get session status
   - `POST /api/stripe/onramp/webhook` - Handle Stripe webhooks
   - `GET /api/stripe/onramp/config` - Get public configuration

2. **Server Configuration** (`api/server.js`)
   - CSP headers updated to allow Stripe domains
   - Route mounting for Stripe endpoints
   - Stripe configuration in CONFIG object

### Frontend Components

1. **Buy Crypto Page** (`api/public/buy-crypto.html`)
   - Embedded Stripe Onramp widget
   - Wallet address validation
   - Session initialization
   - Event handling for purchase completion

## Setup Instructions

### 1. Get Stripe API Keys

1. Sign up for a Stripe account at [stripe.com](https://stripe.com)
2. Navigate to the [API Keys page](https://dashboard.stripe.com/apikeys)
3. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
4. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

### 2. Enable Crypto Onramp

1. Go to [Stripe Dashboard > Settings > Crypto](https://dashboard.stripe.com/settings/crypto)
2. Enable Crypto Onramp for your account
3. Complete any required verification steps

### 3. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Stripe Crypto Onramp Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here  # Optional, for production
```

### 4. Set Up Webhooks (Production Only)

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/stripe/onramp/webhook`
4. Select events to listen to:
   - `crypto.onramp_session.updated`
   - `crypto.onramp_session.completed`
5. Copy the **Signing Secret** and add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

## Usage

### Basic Usage

To allow a user to purchase crypto to their wallet:

1. Get the user's Solana wallet address
2. Redirect to the buy crypto page with the wallet address as a query parameter:
   ```
   /buy-crypto.html?wallet=<solana_wallet_address>
   ```
3. Optional: Add an amount parameter:
   ```
   /buy-crypto.html?wallet=<solana_wallet_address>&amount=100
   ```

### Integration Example

```javascript
// In your frontend code
const walletAddress = user.solanaWallet;
const buyUrl = `/buy-crypto.html?wallet=${walletAddress}&amount=50`;

// Open in new window or redirect
window.location.href = buyUrl;
```

## API Reference

### Create Onramp Session

**Endpoint:** `POST /api/stripe/onramp/session`

**Request Body:**
```json
{
  "walletAddress": "string (required)",
  "sourceAmount": "string (optional)",
  "sourceCurrency": "string (optional, default: usd)",
  "destinationNetwork": "string (optional, default: solana)",
  "destinationCurrency": "string (optional, default: sol)"
}
```

**Response:**
```json
{
  "success": true,
  "clientSecret": "string",
  "sessionId": "string",
  "walletAddress": "string",
  "network": "string"
}
```

### Get Session Status

**Endpoint:** `GET /api/stripe/onramp/session/:sessionId`

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "string",
    "status": "string",
    "walletAddress": "string",
    "destinationCurrency": "string",
    "destinationNetwork": "string",
    "createdAt": "number"
  }
}
```

### Get Configuration

**Endpoint:** `GET /api/stripe/onramp/config`

**Response:**
```json
{
  "success": true,
  "enabled": true,
  "publishableKey": "string",
  "supportedNetworks": ["solana"],
  "supportedCurrencies": ["sol", "usdc"],
  "defaultNetwork": "solana",
  "defaultCurrency": "sol"
}
```

## Security Considerations

1. **API Keys**: Keep your `STRIPE_SECRET_KEY` secure and never expose it to the frontend
2. **Webhook Verification**: Always verify webhook signatures in production
3. **Wallet Address Validation**: Validate Solana addresses before creating sessions
4. **CSP Headers**: Ensure Content Security Policy allows Stripe domains
5. **HTTPS**: Always use HTTPS in production for secure communication

## Testing

### Test Mode

1. Use test API keys (starting with `sk_test_` and `pk_test_`)
2. Stripe provides test card numbers for testing:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
3. Test wallets: Use any valid Solana wallet address from devnet

### Production Mode

1. Switch to live API keys (starting with `sk_live_` and `pk_live_`)
2. Complete Stripe account verification
3. Set up webhook endpoints
4. Test with small amounts first

## Troubleshooting

### Common Issues

1. **"Stripe Onramp not configured"**
   - Ensure `STRIPE_SECRET_KEY` is set in your environment
   - Verify the key is valid and not expired

2. **Widget not loading**
   - Check CSP headers in browser console
   - Verify `STRIPE_PUBLISHABLE_KEY` is correct
   - Ensure Stripe SDK script is loaded

3. **Webhook verification failed**
   - Verify `STRIPE_WEBHOOK_SECRET` is correct
   - Check that webhook signature is being sent
   - Ensure raw body is being used for verification

4. **Invalid wallet address**
   - Verify the wallet address is a valid Solana address
   - Check address length (32-44 characters)
   - Ensure it's not a program address

## Resources

- [Stripe Crypto Onramp Documentation](https://stripe.com/docs/crypto/onramp)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)

## Support

For issues related to:
- **Stripe Integration**: Contact Stripe Support or check their documentation
- **JustTheTip Bot**: Create an issue on the GitHub repository
- **Solana**: Refer to Solana documentation or Discord community

## License

This integration is part of the JustTheTip project. See the main LICENSE file for details.
