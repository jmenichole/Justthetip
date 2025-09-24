import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, Transaction, PublicKey, SystemProgram } from '@solana/web3.js';
import { FC, useEffect, useState } from 'react';

export const BalanceDisplay: FC = () => {
  const [balance, setBalance] = useState<number>(0);
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  useEffect(() => {
    const updateBalance = async () => {
      if (!connection || !publicKey) {
        console.error('Wallet not connected or connection unavailable');
        return;
      }

      try {
        // Listen for account changes
        connection.onAccountChange(
          publicKey,
          (updatedAccountInfo) => {
            setBalance(updatedAccountInfo.lamports / LAMPORTS_PER_SOL);
          },
          'confirmed'
        );

        // Get initial balance
        const accountInfo = await connection.getAccountInfo(publicKey);

        if (accountInfo) {
          setBalance(accountInfo.lamports / LAMPORTS_PER_SOL);
        } else {
          throw new Error('Account info not found');
        }
      } catch (error) {
        console.error('Failed to retrieve account info:', error);
      }
    };

    updateBalance();
  }, [connection, publicKey]);

  return (
    <div className="bg-green-50 p-4 rounded-lg mb-4">
      <h3 className="font-semibold mb-2">Account Balance</h3>
      <p className="text-lg">
        {publicKey ? `${balance.toFixed(4)} SOL` : 'Connect wallet to view balance'}
      </p>
      {publicKey && (
        <p className="text-sm text-gray-600 mt-1">
          Address: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
        </p>
      )}
    </div>
  );
};

export const TransactionSender: FC = () => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendSol = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!publicKey) {
      alert('Wallet not connected');
      return;
    }

    if (!recipient || !amount) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const recipientPubKey = new PublicKey(recipient);
      const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;

      const transaction = new Transaction();
      const sendSolInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: recipientPubKey,
        lamports: lamports,
      });

      transaction.add(sendSolInstruction);

      const signature = await sendTransaction(transaction, connection);
      console.log(`Transaction signature: ${signature}`);

      alert(`Transaction sent! Signature: ${signature}`);

      // Clear form
      setRecipient('');
      setAmount('');

    } catch (error) {
      console.error('Transaction failed', error);
      alert(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h3 className="font-semibold mb-2">Send SOL</h3>
      <form onSubmit={sendSol} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter Solana address"
            className="w-full p-2 border rounded"
            disabled={!publicKey}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Amount (SOL)</label>
          <input
            type="number"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.1"
            className="w-full p-2 border rounded"
            disabled={!publicKey}
          />
        </div>

        <button
          type="submit"
          disabled={!publicKey || isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : publicKey ? 'Send SOL' : 'Connect Wallet First'}
        </button>
      </form>
    </div>
  );
};