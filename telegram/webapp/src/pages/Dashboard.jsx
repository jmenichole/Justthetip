import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { fetchWalletData, fetchBalance, fetchTokenPrices, fetchUserStats } from '../utils/api';
import { formatUSD, formatTokenAmount, formatCompact, formatAddress, getTokenEmoji } from '../utils/format';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, hapticFeedback, showAlert } = useTelegram();

  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState(null);
  const [balance, setBalance] = useState(null);
  const [prices, setPrices] = useState({});
  const [stats, setStats] = useState(null);
  const [portfolioData, setPortfolioData] = useState([]);
  const [totalValue, setTotalValue] = useState(0);

  // Token colors for pie chart
  const TOKEN_COLORS = {
    SOL: '#667eea',
    USDC: '#2775CA',
    BONK: '#F2A900',
    USDT: '#26A17B',
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [walletRes, balanceRes, pricesRes, statsRes] = await Promise.all([
        fetchWalletData(user.id),
        fetchWalletData(user.id).then(w => fetchBalance(w.wallet_address)),
        fetchTokenPrices(),
        fetchUserStats(user.id),
      ]);

      setWalletData(walletRes);
      setBalance(balanceRes);
      setPrices(pricesRes);
      setStats(statsRes);

      // Calculate portfolio data
      if (balanceRes && pricesRes) {
        const portfolio = Object.entries(balanceRes)
          .filter(([_, amount]) => amount > 0)
          .map(([token, amount]) => {
            const price = pricesRes[token] || 0;
            const value = amount * price;
            return { token, amount, value, color: TOKEN_COLORS[token] };
          });

        const total = portfolio.reduce((sum, item) => sum + item.value, 0);

        setPortfolioData(portfolio);
        setTotalValue(total);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showAlert('Failed to load wallet data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleQuickAction(action) {
    hapticFeedback('selection');

    if (action === 'send') {
      navigate('/send');
    } else if (action === 'transactions') {
      navigate('/transactions');
    } else if (action === 'refresh') {
      loadDashboardData();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-telegram-bg">
      {/* Header */}
      <header className="bg-brand-gradient text-white px-6 py-8 safe-top">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Hi, {user.first_name}! 👋</h1>
            <p className="text-white/80 text-sm mt-1">Welcome to JustTheTip</p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
          >
            <span className="text-xl">⚙️</span>
          </button>
        </div>

        {/* Total Portfolio Value */}
        <div className="text-center">
          <p className="text-white/80 text-sm mb-2">Total Portfolio Value</p>
          <h2 className="text-4xl font-bold mb-1">{formatUSD(totalValue)}</h2>
          {walletData && (
            <p className="text-white/60 text-xs font-mono">
              {formatAddress(walletData.wallet_address, 6)}
            </p>
          )}
        </div>
      </header>

      {/* Quick Actions */}
      <div className="px-6 -mt-6">
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleQuickAction('send')}
            className="card flex flex-col items-center py-4 active:scale-95 transition-transform"
          >
            <span className="text-2xl mb-2">💸</span>
            <span className="text-sm font-medium text-telegram-text">Send</span>
          </button>
          <button
            onClick={() => handleQuickAction('transactions')}
            className="card flex flex-col items-center py-4 active:scale-95 transition-transform"
          >
            <span className="text-2xl mb-2">📊</span>
            <span className="text-sm font-medium text-telegram-text">History</span>
          </button>
          <button
            onClick={() => handleQuickAction('refresh')}
            className="card flex flex-col items-center py-4 active:scale-95 transition-transform"
          >
            <span className="text-2xl mb-2">🔄</span>
            <span className="text-sm font-medium text-telegram-text">Refresh</span>
          </button>
        </div>
      </div>

      {/* Portfolio Breakdown */}
      {portfolioData.length > 0 && (
        <div className="px-6 mt-6">
          <h3 className="text-lg font-bold text-telegram-text mb-4">Portfolio</h3>

          {/* Pie Chart */}
          <div className="card mb-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={portfolioData}
                  dataKey="value"
                  nameKey="token"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {portfolioData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Token List */}
          <div className="space-y-3">
            {portfolioData.map((item) => {
              const percentage = ((item.value / totalValue) * 100).toFixed(1);
              return (
                <div
                  key={item.token}
                  className="card flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <div>
                      <div className="font-semibold text-telegram-text">
                        {getTokenEmoji(item.token)} {item.token}
                      </div>
                      <div className="text-sm text-telegram-hint">
                        {formatTokenAmount(item.amount, item.token)} {item.token}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-telegram-text">
                      {formatUSD(item.value)}
                    </div>
                    <div className="text-sm text-telegram-hint">{percentage}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="px-6 mt-6 pb-8">
          <h3 className="text-lg font-bold text-telegram-text mb-4">Your Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card">
              <div className="text-2xl mb-1">🎁</div>
              <div className="text-2xl font-bold text-telegram-text">
                {stats.tips_sent || 0}
              </div>
              <div className="text-sm text-telegram-hint">Tips Sent</div>
            </div>
            <div className="stat-card">
              <div className="text-2xl mb-1">💰</div>
              <div className="text-2xl font-bold text-telegram-text">
                {formatCompact(stats.total_sent_usd || 0)}
              </div>
              <div className="text-sm text-telegram-hint">Total Sent</div>
            </div>
            <div className="stat-card">
              <div className="text-2xl mb-1">📥</div>
              <div className="text-2xl font-bold text-telegram-text">
                {stats.tips_received || 0}
              </div>
              <div className="text-sm text-telegram-hint">Tips Received</div>
            </div>
            <div className="stat-card">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-2xl font-bold text-telegram-text">
                #{stats.leaderboard_rank || '-'}
              </div>
              <div className="text-sm text-telegram-hint">Global Rank</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
