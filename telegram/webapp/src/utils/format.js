/**
 * Formatting utilities for displaying data in the UI
 */

/**
 * Format token amount with appropriate decimal places
 */
export function formatTokenAmount(amount, token) {
  if (!amount || amount === 0) return '0';

  const decimals = {
    SOL: 4,
    USDC: 2,
    USDT: 2,
    BONK: 0,
  };

  const decimalPlaces = decimals[token] || 2;
  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces,
  });
}

/**
 * Format USD amount
 */
export function formatUSD(amount) {
  if (!amount || amount === 0) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompact(num) {
  if (num < 1000) return num.toString();

  const units = ['', 'K', 'M', 'B', 'T'];
  const order = Math.floor(Math.log10(num) / 3);
  const unitname = units[order];
  const num_formatted = (num / 1000 ** order).toFixed(1);

  return num_formatted + unitname;
}

/**
 * Format wallet address (shorten middle part)
 */
export function formatAddress(address, chars = 4) {
  if (!address) return '';
  if (address.length <= chars * 2) return address;

  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return past.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: past.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format full date
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get token emoji
 */
export function getTokenEmoji(token) {
  const emojis = {
    SOL: '◎',
    USDC: '$',
    USDT: '$',
    BONK: '🐕',
  };

  return emojis[token] || '●';
}

/**
 * Get transaction type icon
 */
export function getTransactionIcon(type) {
  const icons = {
    tip_sent: '↗️',
    tip_received: '↙️',
    rain_sent: '☔',
    rain_received: '💧',
    deposit: '⬇️',
    withdraw: '⬆️',
  };

  return icons[type] || '●';
}

/**
 * Get status color
 */
export function getStatusColor(status) {
  const colors = {
    pending: 'text-yellow-500',
    signed: 'text-blue-500',
    confirmed: 'text-green-500',
    failed: 'text-red-500',
  };

  return colors[status] || 'text-gray-500';
}

/**
 * Get status badge classes
 */
export function getStatusBadge(status) {
  const badges = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    signed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };

  return badges[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
}
