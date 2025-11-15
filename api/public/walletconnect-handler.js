/**
 * JustTheTip - WalletConnect AppKit Integration
 * Uses @reown/appkit for universal wallet connection with QR codes
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 * 
 * This file is part of JustTheTip.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * See LICENSE file in the project root for full license information.
 */

// WalletConnect/Reown AppKit Configuration
let appKit = null;
let connectedAccount = null;

/**
 * Fetch WalletConnect configuration from backend
 */
async function fetchWalletConnectConfig() {
    try {
        const response = await fetch('/api/walletconnect/config');
        const config = await response.json();
        return config.projectId;
    } catch (error) {
        console.error('Failed to fetch WalletConnect config:', error);
        return null;
    }
}

/**
 * Initialize AppKit modal
 */
async function initializeWalletConnect() {
    try {
        // Fetch project ID from backend
        const projectId = await fetchWalletConnectConfig();
        if (!projectId) {
            throw new Error('Failed to load WalletConnect project ID');
        }

        // Initialize AppKit with Solana configuration
        const { createAppKit } = window.Reown.AppKit;
        const { SolanaAdapter } = window.Reown.AppKitAdapterSolana;
        const { solana, solanaTestnet, solanaDevnet } = window.Reown.AppKitNetworks;

        // Create Solana adapter with mainnet
        const solanaWeb3JsAdapter = new SolanaAdapter({
            wallets: [] // Auto-detect all available wallets
        });

        // Create AppKit instance
        appKit = createAppKit({
            adapters: [solanaWeb3JsAdapter],
            networks: [solana, solanaTestnet, solanaDevnet],
            defaultNetwork: solana,
            projectId: projectId,
            features: {
                analytics: false, // Disable analytics
                email: false, // Disable email login
                socials: false, // Disable social login
                onramp: false // Disable onramp
            },
            themeMode: 'dark',
            themeVariables: {
                '--w3m-z-index': 9999,
                '--w3m-accent': '#667eea'
            }
        });

        // Listen for account changes
        appKit.subscribeAccount((account) => {
            if (account && account.address) {
                connectedAccount = account.address;
                console.log('Account connected:', connectedAccount);
            } else {
                connectedAccount = null;
            }
        });

        return true;
    } catch (error) {
        console.error('AppKit initialization error:', error);
        return false;
    }
}

/**
 * Connect wallet using AppKit modal
 * @returns {Promise<{publicKey: string}>}
 */
async function connectWalletConnect() {
    // Initialize if not already done
    if (!appKit) {
        const initialized = await initializeWalletConnect();
        if (!initialized) {
            throw new Error('Failed to initialize AppKit');
        }
    }

    // Open the AppKit modal
    await appKit.open();

    // Wait for connection with timeout
    const maxWaitTime = 120000; // 2 minutes
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const checkConnection = setInterval(() => {
            if (connectedAccount) {
                clearInterval(checkConnection);
                appKit.close();
                resolve({ publicKey: connectedAccount });
            } else if (Date.now() - startTime > maxWaitTime) {
                clearInterval(checkConnection);
                reject(new Error('Connection timeout'));
            }
        }, 500);

        // Also listen for modal close without connection
        const unsubscribe = appKit.subscribeState((state) => {
            if (!state.open && !connectedAccount) {
                clearInterval(checkConnection);
                unsubscribe();
                reject(new Error('User closed modal without connecting'));
            }
        });
    });
}

/**
 * Sign message using connected wallet
 * @param {string} message - Message to sign
 * @param {string} publicKey - Public key of the signer
 * @returns {Promise<{signature: Uint8Array, publicKey: string}>}
 */
async function signMessageWalletConnect(message, publicKey) {
    try {
        if (!appKit || !connectedAccount) {
            throw new Error('Wallet not connected');
        }

        // Get the Solana provider from AppKit
        const provider = appKit.getWalletProvider();
        
        if (!provider || !provider.signMessage) {
            throw new Error('Wallet does not support message signing');
        }

        // Encode message to Uint8Array
        const messageBytes = new TextEncoder().encode(message);

        // Request signature
        const signatureResult = await provider.signMessage(messageBytes);
        
        // signatureResult.signature is already a Uint8Array
        return {
            signature: signatureResult.signature,
            publicKey: publicKey
        };

    } catch (error) {
        console.error('AppKit sign error:', error);
        throw error;
    }
}

/**
 * Disconnect wallet
 */
async function disconnectWalletConnect() {
    try {
        if (appKit) {
            await appKit.disconnect();
            connectedAccount = null;
        }
    } catch (error) {
        console.error('AppKit disconnect error:', error);
    }
}

/**
 * Check if AppKit is available
 */
function isWalletConnectAvailable() {
    return typeof window.Reown !== 'undefined' && 
           typeof window.Reown.AppKit !== 'undefined';
}

/**
 * Wait for Reown modules to load
 */
function waitForReown() {
    return new Promise((resolve) => {
        if (isWalletConnectAvailable()) {
            resolve();
        } else {
            window.addEventListener('reown-loaded', () => resolve(), { once: true });
        }
    });
}

// Export functions for use in sign.js
window.WalletConnectHandler = {
    initialize: async () => {
        await waitForReown();
        return initializeWalletConnect();
    },
    connect: connectWalletConnect,
    signMessage: signMessageWalletConnect,
    disconnect: disconnectWalletConnect,
    isAvailable: isWalletConnectAvailable
};
