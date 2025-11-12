import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { fetchTransactions } from '../utils/api';
import {
  formatTokenAmount,
  formatUSD,
  formatRelativeTime,
  getTransactionIcon,
  getStatusBadge,
  formatAddress,
} from '../utils/format';

export default function Transactions() {
  const navigate = useNavigate();
  const { user, showBackButton, hideBackButton, openLink, hapticFeedback } = useTelegram();

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'sent' | 'received'
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    showBackButton();
    loadTransactions();

    return () => {
      hideBackButton();
    };
  }, []);

  async function loadTransactions() {
    try {
      setLoading(true);
      const data = await fetchTransactions(user.id, { limit: 50 });
      setTransactions(data.transactions || []);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(newFilter) {
    hapticFeedback('selection');
    setFilter(newFilter);
  }

  function handleTransactionClick(tx) {
    hapticFeedback('impact');
    if (tx.signature) {
      openLink(`https://solscan.io/tx/${tx.signature}?cluster=devnet`);
    }
  }

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'all') return true;
    if (filter === 'sent') return tx.type.includes('sent');
    if (filter === 'received') return tx.type.includes('received');
    return true;
  });

  return (
    <div className="min-h-screen bg-telegram-bg pb-8">
      {/* Header */}
      <header className="bg-brand-gradient text-white px-6 py-6 safe-top">
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-white/80 text-sm mt-1">All your tips and transfers</p>
      </header>

      {/* Filter Tabs */}
      <div className="px-6 mt-6">
        <div className="flex space-x-2 bg-telegram-secondaryBg rounded-xl p-1">
          <button
            onClick={() => handleFilterChange('all')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-brand-gradient text-white shadow-sm'
                : 'text-telegram-hint'
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleFilterChange('sent')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              filter === 'sent'
                ? 'bg-brand-gradient text-white shadow-sm'
                : 'text-telegram-hint'
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => handleFilterChange('received')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              filter === 'received'
                ? 'bg-brand-gradient text-white shadow-sm'
                : 'text-telegram-hint'
            }`}
          >
            Received
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="px-6 mt-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-telegram-text mb-2">No Transactions</h3>
            <p className="text-telegram-hint">
              {filter === 'all'
                ? 'Start tipping to see your transaction history here'
                : `No ${filter} transactions yet`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => navigate('/send')}
                className="btn-primary mt-6"
              >
                Send Your First Tip
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => {
              const isSent = tx.type.includes('sent');
              const isRain = tx.type.includes('rain');

              return (
                <div
                  key={tx.id}
                  onClick={() => handleTransactionClick(tx)}
                  className="transaction-item cursor-pointer"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    {/* Icon */}
                    <div className="text-2xl">{getTransactionIcon(tx.type)}</div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-telegram-text">
                          {isSent ? 'Sent' : 'Received'}
                          {isRain && ' (Rain)'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>

                      <div className="text-sm text-telegram-hint mt-1 flex items-center space-x-2">
                        <span>
                          {isSent ? 'To:' : 'From:'}{' '}
                          {tx.recipient_username || tx.sender_username || 'Unknown'}
                        </span>
                        <span>•</span>
                        <span>{formatRelativeTime(tx.created_at)}</span>
                      </div>

                      {tx.signature && (
                        <div className="text-xs text-telegram-hint font-mono mt-1">
                          {formatAddress(tx.signature, 8)}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <div className={`font-bold ${isSent ? 'text-red-500' : 'text-green-500'}`}>
                        {isSent ? '-' : '+'}
                        {formatTokenAmount(tx.amount, tx.token)} {tx.token}
                      </div>
                      {tx.amount_usd && (
                        <div className="text-sm text-telegram-hint">
                          {formatUSD(tx.amount_usd)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="text-center mt-6">
            <button className="btn-secondary">Load More</button>
          </div>
        )}
      </div>
    </div>
  );
}
