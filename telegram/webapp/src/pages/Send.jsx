import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { fetchBalance, fetchTokenPrices, createTip } from '../utils/api';
import { formatTokenAmount, formatUSD, getTokenEmoji } from '../utils/format';

const SUPPORTED_TOKENS = ['SOL', 'USDC', 'BONK', 'USDT'];

export default function Send() {
  const navigate = useNavigate();
  const {
    user,
    showBackButton,
    hideBackButton,
    showMainButton,
    hideMainButton,
    showAlert,
    showConfirm,
    hapticFeedback,
  } = useTelegram();

  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState({});
  const [prices, setPrices] = useState({});

  // Form state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('SOL');
  const [note, setNote] = useState('');

  useEffect(() => {
    showBackButton();
    loadData();

    return () => {
      hideBackButton();
      hideMainButton();
    };
  }, []);

  useEffect(() => {
    // Show/hide send button based on form validity
    if (recipient && amount && parseFloat(amount) > 0) {
      showMainButton('Send Tip', handleSend);
    } else {
      hideMainButton();
    }
  }, [recipient, amount]);

  async function loadData() {
    try {
      const [balanceData, pricesData] = await Promise.all([
        fetchBalance(user.id),
        fetchTokenPrices(),
      ]);

      setBalance(balanceData);
      setPrices(pricesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  async function handleSend() {
    hapticFeedback('impact');

    const amountNum = parseFloat(amount);

    // Validation
    if (!recipient) {
      showAlert('Please enter a recipient username');
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      showAlert('Please enter a valid amount');
      return;
    }

    if (amountNum > (balance[selectedToken] || 0)) {
      showAlert(`Insufficient ${selectedToken} balance`);
      return;
    }

    // Confirmation
    const usdValue = formatUSD(amountNum * (prices[selectedToken] || 0));
    const confirmMessage = `Send ${amount} ${selectedToken} (${usdValue}) to @${recipient}?`;

    showConfirm(confirmMessage, async (confirmed) => {
      if (!confirmed) return;

      try {
        setLoading(true);
        hapticFeedback('notification');

        const tipData = {
          sender_telegram_id: user.id,
          recipient_username: recipient,
          amount: amountNum,
          token: selectedToken,
          note: note || null,
        };

        const result = await createTip(tipData);

        showAlert('Tip created! Sign the transaction in your wallet.');

        // Navigate to transactions after a delay
        setTimeout(() => {
          navigate('/transactions');
        }, 1500);
      } catch (error) {
        console.error('Failed to create tip:', error);
        showAlert('Failed to create tip. Please try again.');
        hapticFeedback('error');
      } finally {
        setLoading(false);
      }
    });
  }

  function handleTokenSelect(token) {
    hapticFeedback('selection');
    setSelectedToken(token);
  }

  const currentBalance = balance[selectedToken] || 0;
  const estimatedUSD = parseFloat(amount || 0) * (prices[selectedToken] || 0);

  return (
    <div className="min-h-screen bg-telegram-bg pb-8">
      {/* Header */}
      <header className="bg-brand-gradient text-white px-6 py-6 safe-top">
        <h1 className="text-2xl font-bold">Send a Tip</h1>
        <p className="text-white/80 text-sm mt-1">Tip anyone on Telegram</p>
      </header>

      <div className="px-6 mt-6 space-y-6">
        {/* Recipient Input */}
        <div>
          <label className="block text-sm font-medium text-telegram-text mb-2">
            Recipient Username
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-telegram-hint">
              @
            </span>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.replace('@', ''))}
              placeholder="username"
              className="input-field pl-8"
              disabled={loading}
            />
          </div>
        </div>

        {/* Token Selection */}
        <div>
          <label className="block text-sm font-medium text-telegram-text mb-2">
            Select Token
          </label>
          <div className="grid grid-cols-4 gap-2">
            {SUPPORTED_TOKENS.map((token) => {
              const tokenBalance = balance[token] || 0;
              const isSelected = selectedToken === token;

              return (
                <button
                  key={token}
                  onClick={() => handleTokenSelect(token)}
                  disabled={loading}
                  className={`card py-4 text-center transition-all active:scale-95 ${
                    isSelected ? 'ring-2 ring-brand-purple' : ''
                  }`}
                >
                  <div className="text-2xl mb-1">{getTokenEmoji(token)}</div>
                  <div className="text-xs font-medium text-telegram-text">{token}</div>
                  <div className="text-xs text-telegram-hint mt-1">
                    {formatTokenAmount(tokenBalance, token)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-telegram-text">Amount</label>
            <button
              onClick={() => setAmount(currentBalance.toString())}
              className="text-sm text-brand-purple font-medium"
              disabled={loading}
            >
              Max: {formatTokenAmount(currentBalance, selectedToken)}
            </button>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="any"
            min="0"
            className="input-field text-2xl font-bold text-center"
            disabled={loading}
          />
          {estimatedUSD > 0 && (
            <div className="text-center text-telegram-hint mt-2">
              ≈ {formatUSD(estimatedUSD)}
            </div>
          )}
        </div>

        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {[1, 5, 10, 20].map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset.toString())}
              className="btn-secondary py-2 text-sm"
              disabled={loading}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Note (Optional) */}
        <div>
          <label className="block text-sm font-medium text-telegram-text mb-2">
            Note (Optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a message..."
            rows="3"
            maxLength="200"
            className="input-field resize-none"
            disabled={loading}
          />
          <div className="text-xs text-telegram-hint text-right mt-1">
            {note.length}/200
          </div>
        </div>

        {/* Info Card */}
        <div className="card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">ℹ️</div>
            <div className="flex-1 text-sm text-telegram-text">
              <p className="font-medium mb-1">How it works:</p>
              <ol className="list-decimal list-inside space-y-1 text-telegram-hint">
                <li>Recipient must have a registered wallet</li>
                <li>You'll sign the transaction in your wallet</li>
                <li>Tip is confirmed on Solana blockchain</li>
                <li>Both users receive notifications</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
