# Solana Wallet Adapter Integration

This project now includes Solana Wallet Adapter integration, allowing users to connect their wallets and sign transactions through web applications.

## Installation

The required packages have been installed:

```bash
npm install @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-react-ui
```

## Components

### React Components

- `src/components/WalletAdapterDemo.tsx` - Main demo component with wallet connection
- `src/components/WalletFeatures.tsx` - Balance display and transaction sending components

### HTML Demo

- `wallet-adapter-demo.html` - Standalone HTML demo that works without build setup

## Usage

### Basic Setup

Wrap your app with the required providers:

```tsx
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

const App = () => {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const wallets = useMemo(() => [], []); // Empty array for Wallet Standard

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>
          <WalletMultiButton />
          {/* Your app content */}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
```

### Accessing Wallet State

```tsx
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

const MyComponent = () => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  // publicKey is null when not connected
  // connection provides access to Solana network
};
```

### Sending Transactions

```tsx
const sendTransaction = async () => {
  if (!publicKey) return;

  const transaction = new Transaction();
  // Add instructions to transaction

  const signature = await sendTransaction(transaction, connection);
  console.log('Transaction signature:', signature);
};
```

## Supported Wallets

All wallets that support the Wallet Standard work automatically:

- Phantom
- Solflare
- Backpack
- Trust Wallet
- Coinbase Wallet
- And many more...

## Demo

To test the wallet adapter:

1. Open `wallet-adapter-demo.html` in a web browser
2. Click "Select Wallet" to connect
3. Choose your preferred Solana wallet
4. View your balance and send SOL transactions

## Key Features

- **Automatic Wallet Detection**: No need to manually configure wallet adapters
- **Secure Transaction Signing**: All transactions are signed in the user's wallet
- **Real-time Balance Updates**: Account changes are monitored automatically
- **Responsive UI**: Works on desktop and mobile devices
- **TypeScript Support**: Full type safety with TypeScript definitions

## Environment Setup

Make sure your environment variables are configured:

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
```

## Next Steps

- Integrate wallet adapter into your main application
- Add custom transaction building logic
- Implement wallet-specific features if needed
- Add error handling and user feedback