/**
 * WalletConnect v2 Integration for Solana Wallet Registration
 * Uses official WalletConnect protocol with QR codes and mobile deep linking
 */

// WalletConnect Project ID - fetched from backend
let WALLETCONNECT_PROJECT_ID = null;

/**
 * Fetch WalletConnect configuration from backend
 */
async function fetchWalletConnectConfig() {
    try {
        const response = await fetch('/api/walletconnect/config');
        const config = await response.json();
        WALLETCONNECT_PROJECT_ID = config.projectId;
        return true;
    } catch (error) {
        console.error('Failed to fetch WalletConnect config:', error);
        return false;
    }
}

/**
 * Initialize WalletConnect provider and modal
 */
let wcProvider = null;
let wcModal = null;
let wcSession = null;

async function initializeWalletConnect() {
    try {
        // Fetch project ID from backend if not already loaded
        if (!WALLETCONNECT_PROJECT_ID) {
            const success = await fetchWalletConnectConfig();
            if (!success || !WALLETCONNECT_PROJECT_ID) {
                throw new Error('Failed to load WalletConnect configuration');
            }
        }
        
        // Initialize WalletConnect Universal Provider for Solana
        wcProvider = await window.WalletConnectUniversalProvider.init({
            projectId: WALLETCONNECT_PROJECT_ID,
            metadata: {
                name: 'JustTheTip',
                description: 'Solana Trustless Tipping Agent',
                url: window.location.origin,
                icons: [`${window.location.origin}/logo.png`]
            },
            chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'], // Solana mainnet
            methods: [
                'solana_signMessage',
                'solana_signTransaction'
            ],
            events: ['accountsChanged', 'chainChanged']
        });

        // Initialize WalletConnect Modal
        wcModal = new window.WalletConnectModal.WalletConnectModal({
            projectId: WALLETCONNECT_PROJECT_ID,
            chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
            themeMode: 'dark',
            themeVariables: {
                '--wcm-z-index': '9999'
            }
        });

        // Listen for session events
        wcProvider.on('display_uri', (uri) => {
            console.log('WalletConnect URI:', uri);
            wcModal.openModal({ uri });
        });

        wcProvider.on('session_event', (event) => {
            console.log('Session event:', event);
        });

        wcProvider.on('session_update', ({ topic, params }) => {
            console.log('Session updated:', topic, params);
            wcSession = wcProvider.session;
        });

        wcProvider.on('session_delete', () => {
            console.log('Session deleted');
            wcSession = null;
        });

        return true;
    } catch (error) {
        console.error('WalletConnect initialization error:', error);
        return false;
    }
}

/**
 * Connect wallet using WalletConnect protocol
 * @returns {Promise<{publicKey: string, provider: object}>}
 */
async function connectWalletConnect() {
    try {
        // Initialize if not already done
        if (!wcProvider) {
            const initialized = await initializeWalletConnect();
            if (!initialized) {
                throw new Error('Failed to initialize WalletConnect');
            }
        }

        // If already connected, disconnect first
        if (wcSession) {
            await wcProvider.disconnect();
            wcSession = null;
        }

        // Connect and get accounts
        const session = await wcProvider.connect({
            namespaces: {
                solana: {
                    methods: ['solana_signMessage', 'solana_signTransaction'],
                    chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
                    events: ['accountsChanged', 'chainChanged']
                }
            }
        });

        wcSession = session;

        // Get the connected account
        const accounts = session.namespaces.solana.accounts;
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts returned from wallet');
        }

        // Extract public key from account string (format: "solana:chainId:publicKey")
        const publicKey = accounts[0].split(':')[2];

        console.log('WalletConnect connected:', publicKey);

        return {
            publicKey,
            provider: wcProvider
        };

    } catch (error) {
        if (wcModal) {
            wcModal.closeModal();
        }
        throw error;
    }
}

/**
 * Sign message using WalletConnect
 * @param {string} message - Message to sign
 * @param {string} publicKey - Public key of the signer
 * @returns {Promise<{signature: Uint8Array, publicKey: string}>}
 */
async function signMessageWalletConnect(message, publicKey) {
    try {
        if (!wcProvider || !wcSession) {
            throw new Error('WalletConnect not connected');
        }

        // Encode message as base58
        const messageBytes = new TextEncoder().encode(message);
        const messageBase58 = bs58.encode(messageBytes);

        // Request signature using WalletConnect protocol
        const result = await wcProvider.request({
            method: 'solana_signMessage',
            params: {
                pubkey: publicKey,
                message: messageBase58
            }
        }, `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:${publicKey}`);

        // Decode signature from base58
        const signature = bs58.decode(result.signature);

        return {
            signature,
            publicKey
        };

    } catch (error) {
        console.error('WalletConnect sign error:', error);
        throw error;
    }
}

/**
 * Disconnect WalletConnect session
 */
async function disconnectWalletConnect() {
    try {
        if (wcProvider && wcSession) {
            await wcProvider.disconnect();
            wcSession = null;
        }
        if (wcModal) {
            wcModal.closeModal();
        }
    } catch (error) {
        console.error('WalletConnect disconnect error:', error);
    }
}

/**
 * Check if WalletConnect is available
 */
function isWalletConnectAvailable() {
    return typeof window.WalletConnectUniversalProvider !== 'undefined' &&
           typeof window.WalletConnectModal !== 'undefined';
}

// Export functions for use in sign.js
window.WalletConnectHandler = {
    initialize: initializeWalletConnect,
    connect: connectWalletConnect,
    signMessage: signMessageWalletConnect,
    disconnect: disconnectWalletConnect,
    isAvailable: isWalletConnectAvailable
};
