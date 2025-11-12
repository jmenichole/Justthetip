/**
 * API utility functions for communicating with the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Get auth headers with Telegram init data
 */
function getAuthHeaders() {
  const tg = window.Telegram?.WebApp;
  return {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': tg?.initData || '',
  };
}

/**
 * Fetch user wallet data
 */
export async function fetchWalletData(telegramId) {
  const response = await fetch(`${API_BASE_URL}/telegram/user/${telegramId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch wallet data');
  }

  return response.json();
}

/**
 * Fetch user balance for all tokens
 */
export async function fetchBalance(walletAddress) {
  const response = await fetch(`${API_BASE_URL}/wallet/${walletAddress}/balance`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch balance');
  }

  return response.json();
}

/**
 * Fetch transaction history
 */
export async function fetchTransactions(telegramId, { limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset });
  const response = await fetch(
    `${API_BASE_URL}/telegram/user/${telegramId}/transactions?${params}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch transactions');
  }

  return response.json();
}

/**
 * Fetch token prices
 */
export async function fetchTokenPrices(tokens = ['SOL', 'USDC', 'BONK', 'USDT']) {
  const params = new URLSearchParams({ tokens: tokens.join(',') });
  const response = await fetch(`${API_BASE_URL}/prices?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch token prices');
  }

  return response.json();
}

/**
 * Create a new tip transaction
 */
export async function createTip(tipData) {
  const response = await fetch(`${API_BASE_URL}/telegram/tip/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(tipData),
  });

  if (!response.ok) {
    throw new Error('Failed to create tip');
  }

  return response.json();
}

/**
 * Get tip status
 */
export async function getTipStatus(tipId) {
  const response = await fetch(`${API_BASE_URL}/telegram/tip/${tipId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get tip status');
  }

  return response.json();
}

/**
 * Get leaderboard data
 */
export async function fetchLeaderboard(chatId, period = '7d') {
  const params = new URLSearchParams({ period });
  const endpoint = chatId
    ? `${API_BASE_URL}/telegram/chat/${chatId}/leaderboard?${params}`
    : `${API_BASE_URL}/telegram/leaderboard?${params}`;

  const response = await fetch(endpoint, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }

  return response.json();
}

/**
 * Get user statistics
 */
export async function fetchUserStats(telegramId) {
  const response = await fetch(`${API_BASE_URL}/telegram/user/${telegramId}/stats`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user stats');
  }

  return response.json();
}
