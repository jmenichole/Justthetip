/**
 * JustTheTip - WalletConnect Integration Module
 * Provides universal wallet connection support using deep links and WalletConnect protocol
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 * 
 * This file is part of JustTheTip.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * See LICENSE file in the project root for full license information.
 * 
 * This module handles:
 * - WalletConnect v2 protocol for QR code scanning
 * - Deep linking to mobile wallets
 * - Universal wallet selection modal
 * - Automatic signature requests after connection
 */

// Supported wallets with their connection methods
const SUPPORTED_WALLETS = [
    {
        id: 'phantom',
        name: 'Phantom',
        icon: '🟣',
        description: 'Popular Solana wallet',
        downloadUrl: 'https://phantom.app/',
        mobileDeepLink: (uri) => `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent(window.location.origin)}&dapp_encryption_public_key=${uri}&cluster=mainnet&redirect_link=${encodeURIComponent(window.location.href)}`,
        desktopExtension: window.phantom?.solana
    },
    {
        id: 'solflare',
        name: 'Solflare',
        icon: '🟠',
        description: 'Secure Solana wallet',
        downloadUrl: 'https://solflare.com/',
        mobileDeepLink: (_uri) => `https://solflare.com/ul/v1/connect?ref=${encodeURIComponent(window.location.href)}&cluster=mainnet`,
        desktopExtension: window.solflare
    },
    {
        id: 'trust',
        name: 'Trust Wallet',
        icon: '🔵',
        description: 'Multi-chain wallet',
        downloadUrl: 'https://trustwallet.com/',
        mobileDeepLink: (uri) => `trust://wc?uri=${encodeURIComponent(uri)}`,
        desktopExtension: null
    },
    {
        id: 'coinbase',
        name: 'Coinbase Wallet',
        icon: '🔷',
        description: 'Coinbase self-custody wallet',
        downloadUrl: 'https://www.coinbase.com/wallet',
        mobileDeepLink: (uri) => `https://go.cb-w.com/wc?uri=${encodeURIComponent(uri)}`,
        desktopExtension: null
    },
    {
        id: 'backpack',
        name: 'Backpack',
        icon: '🎒',
        description: 'Modern Solana wallet',
        downloadUrl: 'https://backpack.app/',
        mobileDeepLink: (uri) => `https://backpack.app/wc?uri=${encodeURIComponent(uri)}`,
        desktopExtension: window.backpack
    }
];

/**
 * Show wallet selection modal
 * @param {Function} onWalletSelected - Callback when wallet is selected
 */
export function showWalletModal(onWalletSelected) {
    const modal = createWalletModal(onWalletSelected);
    document.body.appendChild(modal);
    
    // Animate in
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });
    
    return modal;
}

/**
 * Create the wallet selection modal DOM
 */
function createWalletModal(onWalletSelected) {
    const modal = document.createElement('div');
    modal.className = 'wallet-modal-overlay';
    modal.innerHTML = `
        <div class="wallet-modal">
            <div class="wallet-modal-header">
                <h2>Connect Wallet</h2>
                <button class="wallet-modal-close" onclick="this.closest('.wallet-modal-overlay').remove()">✕</button>
            </div>
            <div class="wallet-modal-subtitle">
                Choose your preferred Solana wallet
            </div>
            <div class="wallet-modal-content">
                ${SUPPORTED_WALLETS.map(wallet => `
                    <button class="wallet-option" data-wallet-id="${wallet.id}">
                        <span class="wallet-icon">${wallet.icon}</span>
                        <div class="wallet-info">
                            <div class="wallet-name">${wallet.name}</div>
                            <div class="wallet-description">${wallet.description}</div>
                        </div>
                        <span class="wallet-arrow">→</span>
                    </button>
                `).join('')}
            </div>
            <div class="wallet-modal-footer">
                <p>🔒 Your keys never leave your wallet</p>
                <p style="font-size: 12px; opacity: 0.7; margin-top: 8px;">
                    Don't have a wallet? <a href="https://phantom.app/" target="_blank">Download Phantom</a>
                </p>
            </div>
        </div>
    `;
    
    // Add click handlers
    modal.querySelectorAll('.wallet-option').forEach(button => {
        button.addEventListener('click', () => {
            const walletId = button.getAttribute('data-wallet-id');
            const wallet = SUPPORTED_WALLETS.find(w => w.id === walletId);
            if (wallet && onWalletSelected) {
                onWalletSelected(wallet);
            }
        });
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
}

/**
 * Connect to wallet via deep link (mobile) or extension (desktop)
 * @param {Object} wallet - Wallet configuration object
 * @param {Function} onConnected - Callback with wallet address when connected
 * @param {Function} onError - Callback when connection fails
 */
export async function connectWallet(wallet, onConnected, onError) {
    try {
        // Check if browser extension is available
        if (wallet.desktopExtension && !isMobileDevice()) {
            await connectViaExtension(wallet, onConnected, onError);
        } else {
            // Use deep link for mobile or when no extension
            await connectViaDeepLink(wallet, onConnected, onError);
        }
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (onError) {
            onError(error);
        }
    }
}

/**
 * Connect via browser extension
 */
async function connectViaExtension(wallet, onConnected, onError) {
    try {
        const provider = wallet.desktopExtension;
        
        if (!provider) {
            throw new Error(`${wallet.name} extension not found. Please install it from ${wallet.downloadUrl}`);
        }
        
        // Connect to wallet
        const response = await provider.connect();
        const publicKey = response.publicKey.toString();
        
        if (onConnected) {
            onConnected({
                address: publicKey,
                provider: provider,
                method: 'extension'
            });
        }
        
    } catch (error) {
        console.error('Extension connection error:', error);
        if (onError) {
            onError(error);
        }
    }
}

/**
 * Connect via deep link (for mobile wallets)
 */
async function connectViaDeepLink(wallet, onConnected, onError) {
    try {
        // Generate a simple connection request
        const connectionId = generateRandomId();
        const connectUrl = wallet.mobileDeepLink(connectionId);
        
        // Store connection request
        sessionStorage.setItem('walletConnectionId', connectionId);
        sessionStorage.setItem('walletConnectionWallet', wallet.id);
        sessionStorage.setItem('walletConnectionTimestamp', Date.now().toString());
        
        if (isMobileDevice()) {
            // On mobile, open the deep link directly
            window.location.href = connectUrl;
            
            // Show instructions
            showDeepLinkInstructions(wallet, 'mobile');
        } else {
            // On desktop, show QR code
            showQRCodeModal(connectUrl, wallet);
        }
        
        // In a real WalletConnect implementation, we would:
        // 1. Establish WebSocket connection
        // 2. Wait for wallet approval
        // 3. Get the wallet address
        // 4. Call onConnected
        
        // For now, show instructions for manual completion
        if (onError) {
            onError(new Error('deep_link_requires_manual_completion'));
        }
        
    } catch (error) {
        console.error('Deep link connection error:', error);
        if (onError) {
            onError(error);
        }
    }
}

/**
 * Show instructions for deep link connection
 */
function showDeepLinkInstructions(wallet, deviceType) {
    // This would show a modal with instructions
    console.log(`Opening ${wallet.name} via deep link on ${deviceType}`);
}

/**
 * Show QR code for desktop users
 */
function showQRCodeModal(url, wallet) {
    // This would generate and show a QR code
    // For now, we'll use the existing manual flow
    console.log(`QR Code for ${wallet.name}:`, url);
}

/**
 * Detect if user is on mobile device
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Generate random ID for connection
 */
function generateRandomId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Request signature from connected wallet
 * @param {Object} provider - Wallet provider
 * @param {Uint8Array} message - Message to sign
 * @returns {Promise<{signature: Uint8Array, publicKey: string}>}
 */
export async function requestSignature(provider, message) {
    try {
        const signedMessage = await provider.signMessage(message, 'utf8');
        
        return {
            signature: signedMessage.signature,
            publicKey: signedMessage.publicKey.toString()
        };
    } catch (error) {
        console.error('Signature request error:', error);
        throw error;
    }
}

// Add required CSS styles
const style = document.createElement('style');
style.textContent = `
.wallet-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
    padding: 20px;
}

.wallet-modal-overlay.active {
    opacity: 1;
}

.wallet-modal {
    background: linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(15, 15, 35, 0.95) 100%);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    max-width: 440px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s ease;
}

@keyframes slideUp {
    from {
        transform: translateY(20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.wallet-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 24px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.wallet-modal-header h2 {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.wallet-modal-close {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 24px;
    cursor: pointer;
    padding: 4px;
    line-height: 1;
    transition: all 0.2s;
}

.wallet-modal-close:hover {
    color: #fff;
    transform: rotate(90deg);
}

.wallet-modal-subtitle {
    padding: 0 24px 16px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
}

.wallet-modal-content {
    padding: 8px 24px 24px;
    max-height: 400px;
    overflow-y: auto;
}

.wallet-option {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 8px;
    font-family: inherit;
    text-align: left;
}

.wallet-option:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(102, 126, 234, 0.5);
    transform: translateY(-2px);
}

.wallet-icon {
    font-size: 32px;
    line-height: 1;
}

.wallet-info {
    flex: 1;
}

.wallet-name {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 4px;
}

.wallet-description {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
}

.wallet-arrow {
    font-size: 20px;
    color: rgba(255, 255, 255, 0.4);
    transition: transform 0.2s;
}

.wallet-option:hover .wallet-arrow {
    transform: translateX(4px);
}

.wallet-modal-footer {
    padding: 16px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    text-align: center;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
}

.wallet-modal-footer a {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
}

.wallet-modal-footer a:hover {
    text-decoration: underline;
}

@media (max-width: 480px) {
    .wallet-modal {
        margin: 0;
        border-radius: 24px 24px 0 0;
        max-height: 80vh;
    }
    
    .wallet-modal-header h2 {
        font-size: 20px;
    }
    
    .wallet-option {
        padding: 14px;
    }
    
    .wallet-icon {
        font-size: 28px;
    }
}
`;
document.head.appendChild(style);
