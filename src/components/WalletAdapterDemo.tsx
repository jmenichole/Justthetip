import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';
import { BalanceDisplay, TransactionSender } from './WalletFeatures';

const WalletAdapterDemo: FC = () => {
  // Use devnet for development
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);

  // Empty wallets array since all major wallets support Wallet Standard
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>
          <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
              <h1 className="text-3xl font-bold text-center mb-8">
                Solana Wallet Adapter Demo
              </h1>

              <div className="text-center mb-8">
                <WalletMultiButton />
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <BalanceDisplay />
                <TransactionSender />
              </div>

              <div className="text-sm text-gray-600">
                <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                  <h3 className="font-semibold mb-2">How it works:</h3>
                  <ol className="text-left space-y-1 list-decimal list-inside">
                    <li>Connect your Solana wallet using the button above</li>
                    <li>View your account balance in real-time</li>
                    <li>Send SOL to any Solana address</li>
                    <li>Transactions are signed in your wallet</li>
                  </ol>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Supported Wallets:</h3>
                  <p className="mb-2">
                    All wallets that support the Wallet Standard work automatically:
                  </p>
                  <ul className="text-left space-y-1">
                    <li>• Phantom</li>
                    <li>• Solflare</li>
                    <li>• Backpack</li>
                    <li>• Trust Wallet</li>
                    <li>• And many more...</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletAdapterDemo;