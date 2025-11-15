/**
 * JustTheTip - Multi-Chain Configuration
 * Supported blockchain networks for Magic wallet creation
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 */

// Supported blockchain networks
const SUPPORTED_CHAINS = {
  solana: {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    magicExtension: '@magic-ext/solana',
    description: 'Fast, low-cost blockchain - supports SOL and all SPL tokens',
    tokenStandard: 'SPL',
    defaultRpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
    features: ['tips', 'airdrops', 'swaps', 'nfts'],
    isDefault: true,
    emoji: '☀️'
  },
  
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    magicExtension: 'ethereum', // Built into magic-sdk
    description: 'Leading smart contract platform - supports ETH and all ERC-20 tokens',
    tokenStandard: 'ERC-20',
    defaultRpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    features: ['tips', 'nfts', 'defi'],
    isDefault: false,
    emoji: '⟠'
  },
  
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    magicExtension: 'ethereum', // Uses Ethereum extension with different chain ID
    chainId: 137,
    description: 'Ethereum Layer 2 - fast and cheap transactions',
    tokenStandard: 'ERC-20',
    defaultRpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    features: ['tips', 'nfts'],
    isDefault: false,
    emoji: '🟣'
  },
  
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    magicExtension: '@magic-ext/bitcoin',
    description: 'Original cryptocurrency - store of value',
    tokenStandard: 'Native',
    defaultRpcUrl: null, // Bitcoin uses different infrastructure
    explorerUrl: 'https://blockstream.info',
    features: ['tips'],
    isDefault: false,
    emoji: '₿'
  },
  
  flow: {
    id: 'flow',
    name: 'Flow',
    symbol: 'FLOW',
    magicExtension: '@magic-ext/flow',
    description: 'NFT-focused blockchain by Dapper Labs',
    tokenStandard: 'Native',
    defaultRpcUrl: 'https://rest-mainnet.onflow.org',
    explorerUrl: 'https://flowscan.org',
    features: ['nfts'],
    isDefault: false,
    emoji: '🌊'
  }
};

// Get chain config by ID
function getChainConfig(chainId) {
  const normalized = chainId ? chainId.toLowerCase() : 'solana';
  return SUPPORTED_CHAINS[normalized] || SUPPORTED_CHAINS.solana;
}

// Get all supported chain IDs
function getSupportedChainIds() {
  return Object.keys(SUPPORTED_CHAINS);
}

// Get default chain
function getDefaultChain() {
  return SUPPORTED_CHAINS.solana;
}

// Check if chain is supported
function isChainSupported(chainId) {
  const normalized = chainId ? chainId.toLowerCase() : '';
  return normalized in SUPPORTED_CHAINS;
}

// Format chain list for help command
function formatChainListForHelp() {
  return Object.values(SUPPORTED_CHAINS)
    .map(chain => {
      const features = chain.features.join(', ');
      const defaultBadge = chain.isDefault ? ' **(Default)**' : '';
      return `${chain.emoji} **${chain.name}** (${chain.symbol})${defaultBadge}\n` +
             `   ${chain.description}\n` +
             `   Token Standard: ${chain.tokenStandard} | Features: ${features}`;
    })
    .join('\n\n');
}

// Get chain selection choices for Discord slash command
function getChainChoices() {
  return Object.values(SUPPORTED_CHAINS).map(chain => ({
    name: `${chain.emoji} ${chain.name} (${chain.symbol})${chain.isDefault ? ' - Default' : ''}`,
    value: chain.id
  }));
}

module.exports = {
  SUPPORTED_CHAINS,
  getChainConfig,
  getSupportedChainIds,
  getDefaultChain,
  isChainSupported,
  formatChainListForHelp,
  getChainChoices
};
