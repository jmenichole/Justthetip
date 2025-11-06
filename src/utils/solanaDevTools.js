'use strict';

const { Connection, PublicKey, Keypair, clusterApiUrl } = require('@solana/web3.js');
const { Metaplex, keypairIdentity, irysStorage } = require('@metaplex-foundation/js');
const bs58 = require('bs58').default;
const logger = require('./logger');

const DEFAULT_CLUSTER = process.env.SOLANA_CLUSTER || 'mainnet-beta';
const SUPPORTED_CLUSTERS = new Set(['mainnet-beta', 'testnet', 'devnet', 'localnet']);

const state = {
  connections: new Map(),
  metaplexClients: new Map(),
  mintAuthorities: new Map(),
  nftStorageApiKey: process.env.NFT_STORAGE_API_KEY || null,
  lastErrors: new Map()
};

function getClusterRpcUrl(cluster, overrideUrl) {
  if (overrideUrl) {
    return overrideUrl;
  }

  if (!SUPPORTED_CLUSTERS.has(cluster)) {
    throw new Error(`Unsupported Solana cluster: ${cluster}`);
  }

  if (cluster === 'localnet') {
    return process.env.SOLANA_LOCALNET_RPC_URL || 'http://127.0.0.1:8899';
  }

  return clusterApiUrl(cluster);
}

function getConnection(cluster = DEFAULT_CLUSTER, rpcUrl) {
  const resolvedCluster = cluster || DEFAULT_CLUSTER;
  const url = getClusterRpcUrl(resolvedCluster, rpcUrl);
  const cacheKey = `${resolvedCluster}:${url}`;

  if (!state.connections.has(cacheKey)) {
    const connection = new Connection(url, 'confirmed');
    state.connections.set(cacheKey, { connection, url, cluster: resolvedCluster, lastReadyCheck: Date.now() });
    logger.info(`[solana-dev-tools] Created connection for ${resolvedCluster} → ${url}`);
  }

  const cached = state.connections.get(cacheKey);
  cached.lastReadyCheck = Date.now();
  return cached.connection;
}

function loadMintAuthority(secret, cluster) {
  if (!secret) {
    return null;
  }

  const cacheKey = `${cluster}:${secret.substring(0, 16)}`;
  if (state.mintAuthorities.has(cacheKey)) {
    return state.mintAuthorities.get(cacheKey);
  }

  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(secret));
    state.mintAuthorities.set(cacheKey, keypair);
    return keypair;
  } catch (error) {
    state.lastErrors.set('mintAuthority', error);
    throw new Error(`Failed to load mint authority: ${error.message}`);
  }
}

function createMetaplex(connection, mintAuthority, cluster) {
  if (!mintAuthority) {
    return null;
  }

  const cacheKey = `${cluster}:${mintAuthority.publicKey.toBase58()}`;
  if (state.metaplexClients.has(cacheKey)) {
    return state.metaplexClients.get(cacheKey);
  }

  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(mintAuthority))
    .use(irysStorage({
      address: process.env.IRYS_ADDRESS,
      providerUrl: connection.rpcEndpoint,
      timeout: 60_000
    }));

  state.metaplexClients.set(cacheKey, metaplex);
  return metaplex;
}

function initialize(options = {}) {
  const {
    cluster = DEFAULT_CLUSTER,
    rpcUrl,
    mintAuthoritySecret = process.env.MINT_AUTHORITY_KEYPAIR,
    nftStorageApiKey = process.env.NFT_STORAGE_API_KEY
  } = options;

  state.nftStorageApiKey = nftStorageApiKey;

  const connection = getConnection(cluster, rpcUrl);
  let metaplex = null;
  let mintAuthority = null;

  if (mintAuthoritySecret) {
    try {
      mintAuthority = loadMintAuthority(mintAuthoritySecret, cluster);
      metaplex = createMetaplex(connection, mintAuthority, cluster);
      logger.info(`[solana-dev-tools] Minting enabled for ${cluster}`);
    } catch (error) {
      logger.error(`[solana-dev-tools] Failed to initialize minting for ${cluster}: ${error.message}`);
      state.lastErrors.set(cluster, error);
    }
  } else {
    logger.warn(`[solana-dev-tools] Mint authority secret missing for ${cluster}. NFT minting disabled.`);
  }

  return { connection, metaplex, mintAuthority };
}

async function getProgramAccounts(programId, options = {}) {
  const { cluster = 'devnet', rpcUrl, config, log = true } = options;
  const connection = getConnection(cluster, rpcUrl);
  const programPublicKey = new PublicKey(programId);
  const accounts = await connection.getProgramAccounts(programPublicKey, config);

  const simplified = accounts.map((account) => ({
    pubkey: account.pubkey.toBase58(),
    lamports: account.account.lamports,
    owner: account.account.owner.toBase58(),
    executable: account.account.executable,
    rentEpoch: account.account.rentEpoch,
    dataLength: account.account.data.length
  }));

  if (log) {
    logger.info(`[solana-dev-tools] Program ${programPublicKey.toBase58()} has ${simplified.length} accounts on ${cluster}`);
    simplified.forEach((accountInfo, index) => {
      logger.info(`  [${index + 1}] ${accountInfo.pubkey} — ${accountInfo.dataLength} bytes (${accountInfo.lamports} lamports)`);
    });
  }

  return simplified;
}

async function requestAirdrop(walletAddress, lamports, options = {}) {
  const { cluster = 'devnet', rpcUrl } = options;
  if (cluster === 'mainnet-beta') {
    throw new Error('Airdrops are not available on mainnet-beta');
  }

  const connection = getConnection(cluster, rpcUrl);
  const publicKey = new PublicKey(walletAddress);
  const signature = await connection.requestAirdrop(publicKey, lamports);
  return { signature };
}

async function getNftMetadata(mintAddress, options = {}) {
  const { cluster = DEFAULT_CLUSTER, rpcUrl, mintAuthoritySecret } = options;
  const connection = getConnection(cluster, rpcUrl);
  const mintAuthority = mintAuthoritySecret ? loadMintAuthority(mintAuthoritySecret, cluster) : null;
  const metaplex = createMetaplex(connection, mintAuthority, cluster);

  if (!metaplex) {
    throw new Error('Metaplex client not initialized. Mint authority secret required.');
  }

  const mint = new PublicKey(mintAddress);
  const nft = await metaplex.nfts().findByMint({ mintAddress: mint });
  return {
    mint: nft.mint.address.toBase58(),
    name: nft.name,
    symbol: nft.symbol,
    uri: nft.uri,
    json: nft.json ?? null,
    updateAuthority: nft.updateAuthorityAddress.toBase58(),
    sellerFeeBasisPoints: nft.sellerFeeBasisPoints
  };
}

function getStatus() {
  const connections = [];
  for (const [key, value] of state.connections.entries()) {
    connections.push({
      cacheKey: key,
      cluster: value.cluster,
      rpcUrl: value.url,
      lastReadyCheck: value.lastReadyCheck
    });
  }

  const metaplexClients = [];
  for (const [key, client] of state.metaplexClients.entries()) {
    metaplexClients.push({
      cacheKey: key,
      identity: client.identity().publicKey.toBase58()
    });
  }

  const mintAuthorities = [];
  for (const [key, keypair] of state.mintAuthorities.entries()) {
    mintAuthorities.push({ cacheKey: key, publicKey: keypair.publicKey.toBase58() });
  }

  const lastErrors = [];
  for (const [scope, error] of state.lastErrors.entries()) {
    lastErrors.push({ scope, message: error.message });
  }

  return {
    defaultCluster: DEFAULT_CLUSTER,
    connections,
    metaplexClients,
    mintAuthorities,
    nftStorageConfigured: Boolean(state.nftStorageApiKey),
    lastErrors
  };
}

module.exports = {
  initialize,
  getConnection,
  getProgramAccounts,
  requestAirdrop,
  getNftMetadata,
  getStatus
};
