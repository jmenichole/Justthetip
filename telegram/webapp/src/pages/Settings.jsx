import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useEffect } from 'react';
import { formatAddress } from '../utils/format';

export default function Settings() {
  const navigate = useNavigate();
  const { user, showBackButton, hideBackButton, openLink, hapticFeedback } = useTelegram();

  // Mock wallet address - would be fetched from API in production
  const walletAddress = 'YourWalletAddressHere123456789';

  useEffect(() => {
    showBackButton();
    return () => hideBackButton();
  }, []);

  function handleMenuClick(action) {
    hapticFeedback('selection');

    if (action === 'wallet') {
      openLink(`https://solscan.io/account/${walletAddress}?cluster=devnet`);
    } else if (action === 'help') {
      openLink('https://jmenichole.github.io/Justthetip/');
    } else if (action === 'telegram') {
      openLink('https://t.me/justthetip_bot');
    }
  }

  return (
    <div className="min-h-screen bg-telegram-bg pb-8">
      {/* Header */}
      <header className="bg-brand-gradient text-white px-6 py-6 safe-top">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-white/80 text-sm mt-1">Manage your account and preferences</p>
      </header>

      <div className="px-6 mt-6 space-y-6">
        {/* User Info Card */}
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-brand-gradient flex items-center justify-center text-white text-2xl font-bold">
              {user.first_name?.[0] || '?'}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-telegram-text text-lg">
                {user.first_name} {user.last_name || ''}
              </h3>
              <p className="text-sm text-telegram-hint">@{user.username || 'no_username'}</p>
              <p className="text-xs text-telegram-hint mt-1">ID: {user.id}</p>
            </div>
          </div>
        </div>

        {/* Wallet Section */}
        <div>
          <h3 className="text-sm font-medium text-telegram-hint mb-3">Wallet</h3>
          <button
            onClick={() => handleMenuClick('wallet')}
            className="card w-full flex items-center justify-between active:scale-98 transition-transform"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">👛</span>
              <div className="text-left">
                <div className="font-medium text-telegram-text">View on Solscan</div>
                <div className="text-sm text-telegram-hint font-mono">
                  {formatAddress(walletAddress, 6)}
                </div>
              </div>
            </div>
            <span className="text-telegram-hint">→</span>
          </button>
        </div>

        {/* App Settings */}
        <div>
          <h3 className="text-sm font-medium text-telegram-hint mb-3">App Settings</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/transactions')}
              className="card w-full flex items-center justify-between active:scale-98 transition-transform"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📊</span>
                <span className="font-medium text-telegram-text">Transaction History</span>
              </div>
              <span className="text-telegram-hint">→</span>
            </button>

            <button
              onClick={() => handleMenuClick('help')}
              className="card w-full flex items-center justify-between active:scale-98 transition-transform"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📚</span>
                <span className="font-medium text-telegram-text">Help & Documentation</span>
              </div>
              <span className="text-telegram-hint">→</span>
            </button>

            <button
              onClick={() => handleMenuClick('telegram')}
              className="card w-full flex items-center justify-between active:scale-98 transition-transform"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🤖</span>
                <span className="font-medium text-telegram-text">Telegram Bot</span>
              </div>
              <span className="text-telegram-hint">→</span>
            </button>
          </div>
        </div>

        {/* Support Section */}
        <div>
          <h3 className="text-sm font-medium text-telegram-hint mb-3">Support</h3>
          <div className="card space-y-3 text-sm text-telegram-text">
            <div className="flex items-center justify-between">
              <span className="text-telegram-hint">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-telegram-hint">Network</span>
              <span className="font-medium">Solana Devnet</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-telegram-hint">Status</span>
              <span className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="font-medium text-green-500">Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="text-center text-sm text-telegram-hint space-y-2 pb-4">
          <p>JustTheTip - Non-custodial Solana tipping</p>
          <p>Made with 💜 by the JustTheTip team</p>
          <p className="text-xs">© 2025 JustTheTip. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
