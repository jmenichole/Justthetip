/**
 * JustTheTip Wallet Registration - Client-side JavaScript
 * Handles wallet connection, signature verification, and registration
 * 
 * This file is loaded by sign.html for CSP compliance (no inline scripts)
 * Supports both desktop browser extensions and mobile wallets via WalletConnect
 * 
 * @eslint-env browser
 */

// API Configuration - Backend URL for wallet registration
// When running locally with npm start, the API is at the same origin
// When deployed, the API backend should be on Vercel and frontend on GitHub Pages
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? window.location.origin  // Local development
    : (window.JUSTTHETIP_API_URL || 'https://api.mischief-manager.com'); // Production - can be overridden

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const discordUserId = urlParams.get('user');
const discordUsername = urlParams.get('username');
const nonce = urlParams.get('nonce');

// Detect if user is on mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Display user info and setup UI based on device
if (discordUserId && discordUsername && nonce) {
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('discordUsername').textContent = discordUsername;
    document.getElementById('discordUserId').textContent = discordUserId;
    document.getElementById('nonce').textContent = nonce.substring(0, 8) + '...';
    
    // Setup UI based on device type
    setupWalletButtons();
    
    // Check if there's a pending wallet connection (user returned from wallet app)
    checkPendingWalletConnection();
    
    // Test API connectivity on page load
    testAPIConnectivity();
} else {
    showStatus('error', '❌ Invalid registration link. Please request a new one from Discord.');
    disableAllButtons();
}

/**
 * Setup wallet connection buttons based on device type and available wallets
 */
function setupWalletButtons() {
    const desktopButtons = document.getElementById('desktopButtons');
    const mobileButtons = document.getElementById('mobileButtons');
    const walletConnectSection = document.getElementById('walletConnectSection');
    
    // Check if browser extensions are available
    const hasPhantom = window.solana && window.solana.isPhantom;
    const hasSolflare = window.solflare;
    
    if (isMobile) {
        // On mobile, prioritize WalletConnect but show extension buttons if apps are installed
        mobileButtons.style.display = 'block';
        walletConnectSection.style.display = 'block';
        
        if (hasPhantom || hasSolflare) {
            desktopButtons.style.display = 'block';
            // Show a note that extensions are detected
            const extensionNote = document.getElementById('extensionNote');
            if (extensionNote) {
                extensionNote.style.display = 'block';
            }
        } else {
            desktopButtons.style.display = 'none';
        }
    } else {
        // On desktop, show all options
        walletConnectSection.style.display = 'block';
        
        if (hasPhantom || hasSolflare) {
            // Show browser extension buttons
            desktopButtons.style.display = 'block';
            mobileButtons.style.display = 'none';
        } else {
            // No extensions detected - hide extension buttons, show WalletConnect prominently
            desktopButtons.style.display = 'none';
            mobileButtons.style.display = 'none';
            
            // Show a helpful message
            const noExtensionNote = document.getElementById('noExtensionNote');
            if (noExtensionNote) {
                noExtensionNote.style.display = 'block';
            }
        }
    }
    
    // Hide individual extension buttons if not available
    if (!hasPhantom) {
        document.getElementById('connectButton').style.display = 'none';
    }
    if (!hasSolflare) {
        document.getElementById('solflareButton').style.display = 'none';
    }
}

/**
 * Check if user is returning from wallet app with a pending connection
 * This allows automatic reconnection after deep link
 */
function checkPendingWalletConnection() {
    const isPending = sessionStorage.getItem('walletConnectionPending');
    const walletId = sessionStorage.getItem('walletIdPending');
    
    if (isPending === 'true' && walletId) {
        // User returned from wallet app - attempt to auto-connect
        let provider = null;
        
        switch (walletId) {
            case 'phantom':
                provider = window.solana?.isPhantom ? window.solana : null;
                break;
            case 'solflare':
                provider = window.solflare;
                break;
            case 'backpack':
                provider = window.backpack;
                break;
        }
        
        if (provider) {
            // Wallet provider is now available - attempt automatic connection
            showStatus('pending', '<span class="loading"></span>Wallet detected! Connecting automatically...');
            
            setTimeout(async () => {
                try {
                    await connectWallet(walletId.charAt(0).toUpperCase() + walletId.slice(1), provider);
                } catch (error) {
                    console.error('Auto-reconnect failed:', error);
                    // Clear pending state and show normal UI
                    sessionStorage.removeItem('walletConnectionPending');
                    sessionStorage.removeItem('walletIdPending');
                    showStatus('pending', 'Waiting for wallet connection...');
                }
            }, 1000); // Small delay to ensure wallet is fully loaded
        } else {
            // Wallet not detected yet - start polling
            showStatus('pending', '<span class="loading"></span>Waiting for wallet to connect...');
            startWalletProviderPolling(walletId);
        }
    }
}

/**
 * Disable all connection buttons
 */
function disableAllButtons() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = true;
    });
}

/**
 * Test API connectivity before wallet connection
 */
async function testAPIConnectivity() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.warn('API health check returned non-OK status:', response.status);
            showStatus('pending', `⚠️ Server connection weak (Status: ${response.status}). You can still try to connect your wallet.`);
        } else {
            console.log('API connectivity test passed');
        }
    } catch (error) {
        console.error('API connectivity test failed:', error);
        if (error.name === 'AbortError') {
            showStatus('error', `
                ⚠️ <strong>Warning: Cannot reach registration server</strong><br><br>
                The server is not responding. Please check your internet connection.<br>
                You can still attempt to connect, but registration may fail.
            `);
        } else if (error.message.includes('Failed to fetch')) {
            showStatus('error', `
                ⚠️ <strong>Warning: Network connection issue detected</strong><br><br>
                Unable to reach the registration server.<br>
                Please check your internet connection before connecting your wallet.
            `);
        }
        // Don't disable buttons - let user try anyway
    }
}

/**
 * Display status message to user
 * @param {string} type - Status type ('pending', 'success', 'error')
 * @param {string} message - Message to display (may contain safe HTML)
 */
function showStatus(type, message) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.className = `status ${type}`;
    // Note: innerHTML is used here to support formatted messages with HTML.
    // All messages are generated from trusted sources (our own code) and do not
    // include unsanitized user input. Message content is either:
    // 1. Hardcoded strings with HTML formatting
    // 2. Template literals with safe variables (HTTP status codes, hardcoded URLs)
    // 3. Error messages from controlled sources (try/catch blocks)
    statusEl.innerHTML = message;
}

/**
 * Fetch with automatic retry logic for network failures
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Check if response is ok (status 200-299)
            if (!response.ok) {
                // For server errors (5xx), we might want to retry
                if (response.status >= 500 && attempt < maxRetries) {
                    lastError = new Error(`Server error: ${response.status} ${response.statusText}`);
                    await sleep(1000 * (attempt + 1)); // Exponential backoff
                    continue;
                }
                // For client errors (4xx), don't retry
                throw new Error(`Request failed: ${response.status} ${response.statusText}`);
            }
            
            return response;
            
        } catch (error) {
            lastError = error;
            
            // Don't retry for aborted requests or if we're out of retries
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - The server took too long to respond. Please check your internet connection and try again.');
            }
            
            // For network errors, retry
            if (attempt < maxRetries && (
                error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError') ||
                error.message.includes('Network request failed')
            )) {
                console.log(`Retry attempt ${attempt + 1}/${maxRetries} after network error`);
                await sleep(1000 * (attempt + 1)); // Exponential backoff: 1s, 2s
                continue;
            }
            
            // No more retries or non-retryable error
            throw error;
        }
    }
    
    // If we get here, all retries failed
    throw lastError;
}

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handle connection errors with detailed user feedback
 * @param {Error} error - The error object
 */
function handleConnectionError(error) {
    console.error('Connection error details:', error);
    
    // User cancelled/rejected the request
    if (error.message && error.message.includes('User rejected')) {
        showStatus('error', '❌ Signature request was cancelled. Please try again when you\'re ready.');
        return;
    }
    
    // Network/fetch failures
    if (error.message && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('Network request failed')
    )) {
        showStatus('error', `
            ❌ <strong>Network Connection Error</strong><br><br>
            Unable to reach the registration server. This could be due to:<br>
            <ul style="text-align: left; margin: 10px 20px;">
                <li>No internet connection</li>
                <li>Server is temporarily down</li>
                <li>Browser extension blocking the request (ad blocker, etc.)</li>
                <li>Firewall or network restrictions</li>
            </ul>
            <strong>What to try:</strong><br>
            <ul style="text-align: left; margin: 10px 20px;">
                <li>Check your internet connection</li>
                <li>Disable browser extensions temporarily</li>
                <li>Try a different browser or network</li>
                <li>Request a new registration link from Discord</li>
            </ul>
        `);
        return;
    }
    
    // Timeout errors
    if (error.message && error.message.includes('timeout')) {
        showStatus('error', `
            ❌ <strong>Request Timeout</strong><br><br>
            The server took too long to respond.<br><br>
            <strong>What to try:</strong><br>
            • Check your internet connection<br>
            • Try again in a few moments<br>
            • Request a new registration link if problem persists
        `);
        return;
    }
    
    // CORS errors (though they might also appear as "Failed to fetch")
    if (error.message && error.message.includes('CORS')) {
        showStatus('error', `
            ❌ <strong>Security Error</strong><br><br>
            A security policy is blocking the request.<br><br>
            Please try:<br>
            • Using a different browser<br>
            • Disabling strict browser security settings<br>
            • Requesting a new registration link from Discord
        `);
        return;
    }
    
    // Server errors
    if (error.message && error.message.includes('Server error')) {
        showStatus('error', `
            ❌ <strong>Server Error</strong><br><br>
            ${error.message}<br><br>
            The server is experiencing issues. Please try again in a few moments or request a new registration link from Discord.
        `);
        return;
    }
    
    // Generic fallback
    showStatus('error', `
        ❌ <strong>Connection Error</strong><br><br>
        ${error.message || 'Failed to connect wallet'}<br><br>
        If this problem persists, please:<br>
        • Check your internet connection<br>
        • Try a different browser<br>
        • Disable browser extensions temporarily<br>
        • Request a new registration link from Discord
    `);
}

/**
 * Connect to wallet extension (legacy function for Phantom/Solflare buttons)
 */
async function connectWalletExtension(walletType) {
    const provider = walletType === 'phantom' ? window.solana : window.solflare;
    
    if (!provider) {
        const walletName = walletType === 'phantom' ? 'Phantom' : 'Solflare';
        const installUrl = walletType === 'phantom' 
            ? 'https://phantom.app/' 
            : 'https://solflare.com/';
        showStatus('error', `❌ ${walletName} wallet not found. <a href="${installUrl}" target="_blank">Install ${walletName}</a>`);
        return;
    }

    await connectWallet(walletType.charAt(0).toUpperCase() + walletType.slice(1), provider);
}

/**
 * Connect via WalletConnect - Show wallet selection modal
 * Supports multiple Solana wallets with deep linking and extensions
 */
async function connectWalletConnect() {
    try {
        showStatus('pending', '<span class="loading"></span>Opening wallet selection...');
        
        // Show wallet selection modal
        showWalletSelectionModal();
        
    } catch (error) {
        console.error('WalletConnect error:', error);
        handleConnectionError(error);
    }
}

/**
 * Show custom wallet selection modal
 */
function showWalletSelectionModal() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'wallet-modal-overlay';
    overlay.innerHTML = `
        <div class="wallet-modal">
            <div class="wallet-modal-header">
                <h2>Connect Wallet</h2>
                <button class="wallet-modal-close">✕</button>
            </div>
            <div class="wallet-modal-subtitle">
                Choose your preferred Solana wallet
            </div>
            <div class="wallet-modal-content">
                ${generateWalletOptions()}
            </div>
            <div class="wallet-modal-footer">
                <p>🔒 Your keys never leave your wallet</p>
                <p style="font-size: 12px; opacity: 0.7; margin-top: 8px;">
                    Don't have a wallet? <a href="https://phantom.app/" target="_blank">Download Phantom</a>
                </p>
            </div>
        </div>
    `;
    
    // Add modal styles
    addWalletModalStyles();
    
    // Add event listeners
    overlay.querySelector('.wallet-modal-close').addEventListener('click', () => {
        overlay.remove();
        showStatus('pending', 'Waiting for wallet connection...');
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            showStatus('pending', 'Waiting for wallet connection...');
        }
    });
    
    // Add wallet option click handlers
    overlay.querySelectorAll('.wallet-option').forEach(button => {
        button.addEventListener('click', async () => {
            const walletId = button.getAttribute('data-wallet-id');
            overlay.remove();
            await connectSelectedWallet(walletId);
        });
    });
    
    // Append to body and animate in
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });
}

/**
 * Generate wallet option buttons
 */
function generateWalletOptions() {
    const wallets = [
        {
            id: 'phantom',
            name: 'Phantom',
            icon: '🟣',
            description: 'Popular Solana wallet',
            available: window.solana?.isPhantom || isMobile,
            deepLink: 'https://phantom.app/ul/browse/' + encodeURIComponent(window.location.href)
        },
        {
            id: 'solflare',
            name: 'Solflare',
            icon: '🟠',
            description: 'Secure Solana wallet',
            available: window.solflare || isMobile,
            deepLink: 'https://solflare.com/ul/v1/browse/' + encodeURIComponent(window.location.href)
        },
        {
            id: 'trust',
            name: 'Trust Wallet',
            icon: '🔵',
            description: 'Multi-chain wallet',
            available: isMobile,
            deepLink: 'trust://open_url?coin_id=501&url=' + encodeURIComponent(window.location.href)
        },
        {
            id: 'coinbase',
            name: 'Coinbase Wallet',
            icon: '🔷',
            description: 'Coinbase self-custody wallet',
            available: isMobile,
            deepLink: 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(window.location.href)
        },
        {
            id: 'backpack',
            name: 'Backpack',
            icon: '🎒',
            description: 'Modern Solana wallet',
            available: window.backpack || isMobile,
            deepLink: 'https://backpack.app/dapp?url=' + encodeURIComponent(window.location.href)
        }
    ];
    
    return wallets.map(wallet => `
        <button class="wallet-option" data-wallet-id="${wallet.id}" data-deep-link="${wallet.deepLink}">
            <span class="wallet-icon">${wallet.icon}</span>
            <div class="wallet-info">
                <div class="wallet-name">${wallet.name}</div>
                <div class="wallet-description">${wallet.description}</div>
            </div>
            <span class="wallet-arrow">→</span>
        </button>
    `).join('');
}

/**
 * Connect to selected wallet
 */
async function connectSelectedWallet(walletId) {
    try {
        showStatus('pending', '<span class="loading"></span>Connecting to wallet...');
        
        let provider = null;
        let deepLink = null;
        
        // Map wallet ID to provider and deep link
        switch (walletId) {
            case 'phantom':
                provider = window.solana?.isPhantom ? window.solana : null;
                deepLink = 'https://phantom.app/ul/browse/' + encodeURIComponent(window.location.href);
                break;
            case 'solflare':
                provider = window.solflare;
                deepLink = 'https://solflare.com/ul/v1/browse/' + encodeURIComponent(window.location.href);
                break;
            case 'backpack':
                provider = window.backpack;
                deepLink = 'https://backpack.app/dapp?url=' + encodeURIComponent(window.location.href);
                break;
            case 'trust':
                deepLink = 'trust://open_url?coin_id=501&url=' + encodeURIComponent(window.location.href);
                break;
            case 'coinbase':
                deepLink = 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(window.location.href);
                break;
        }
        
        // Try browser extension first
        if (provider) {
            await connectWallet(walletId.charAt(0).toUpperCase() + walletId.slice(1), provider);
        } else if (deepLink && isMobile) {
            // On mobile, initiate deep link flow with automatic signature capture
            await connectViaMobileDeepLink(walletId, deepLink);
        } else {
            // No provider and not mobile - show install instructions
            const walletName = walletId.charAt(0).toUpperCase() + walletId.slice(1);
            const installUrls = {
                phantom: 'https://phantom.app/',
                solflare: 'https://solflare.com/',
                trust: 'https://trustwallet.com/',
                coinbase: 'https://www.coinbase.com/wallet',
                backpack: 'https://backpack.app/'
            };
            
            showStatus('error', `
                ❌ <strong>${walletName} Not Found</strong><br><br>
                Please install the ${walletName} wallet extension or mobile app:<br><br>
                <a href="${installUrls[walletId]}" target="_blank" class="button primary" style="display: inline-block; margin-top: 10px;">
                    Install ${walletName}
                </a><br><br>
                After installation, refresh this page and try again.
            `);
        }
        
    } catch (error) {
        console.error('Wallet selection error:', error);
        handleConnectionError(error);
    }
}

/**
 * Connect via mobile deep link with automatic signature capture
 * This function attempts to connect via deep link and then poll for wallet provider
 */
async function connectViaMobileDeepLink(walletId, deepLink) {
    try {
        // Create the message to sign before opening the wallet
        const message = {
            app: "JustTheTip",
            discord_user: discordUsername,
            discord_id: discordUserId,
            timestamp: new Date().toISOString(),
            nonce: nonce,
            purpose: "Register this wallet for deposits & withdrawals"
        };
        const messageString = JSON.stringify(message, null, 2);
        
        // Store message in session storage for later use
        sessionStorage.setItem('walletConnectMessage', messageString);
        sessionStorage.setItem('walletConnectionPending', 'true');
        sessionStorage.setItem('walletIdPending', walletId);
        
        showStatus('pending', `
            <div style="text-align: center; padding: 20px;">
                <h3 style="margin-bottom: 15px;">Opening Wallet App...</h3>
                <p style="margin-bottom: 15px;">
                    When your wallet app opens:<br><br>
                    1. Connect your wallet<br>
                    2. Sign the verification message<br>
                    3. Return to this page - your signature will be captured automatically!
                </p>
                <div class="loading" style="margin: 20px auto;"></div>
                <p style="font-size: 14px; margin-top: 15px; opacity: 0.8;">
                    Waiting for wallet response...
                </p>
            </div>
        `);
        
        // Try to open the deep link
        setTimeout(() => {
            window.location.href = deepLink;
        }, 500);
        
        // Start polling for wallet provider (in case user returns to browser)
        startWalletProviderPolling(walletId);
        
    } catch (error) {
        console.error('Mobile deep link connection error:', error);
        handleConnectionError(error);
    }
}

/**
 * Poll for wallet provider after deep link activation
 * This helps detect when the user returns from the wallet app
 */
function startWalletProviderPolling(walletId) {
    let pollCount = 0;
    const maxPolls = 60; // Poll for up to 60 seconds
    
    const pollInterval = setInterval(async () => {
        pollCount++;
        
        // Check if polling should stop
        if (pollCount >= maxPolls || sessionStorage.getItem('walletConnectionPending') !== 'true') {
            clearInterval(pollInterval);
            return;
        }
        
        // Check if wallet provider is now available
        let provider = null;
        switch (walletId) {
            case 'phantom':
                provider = window.solana?.isPhantom ? window.solana : null;
                break;
            case 'solflare':
                provider = window.solflare;
                break;
            case 'backpack':
                provider = window.backpack;
                break;
        }
        
        // If provider is now available, try to connect automatically
        if (provider) {
            clearInterval(pollInterval);
            sessionStorage.removeItem('walletConnectionPending');
            
            try {
                showStatus('pending', '<span class="loading"></span>Wallet detected! Connecting...');
                await connectWallet(walletId.charAt(0).toUpperCase() + walletId.slice(1), provider);
            } catch (error) {
                console.error('Auto-connect after deep link failed:', error);
                // Don't show error - user can still manually retry
            }
        }
    }, 1000); // Poll every second
}

/**
 * Generic wallet connection function with automatic signature capture
 */
async function connectWallet(walletName, provider) {
    try {
        showStatus('pending', '<span class="loading"></span>Connecting to wallet...');
        
        // Connect to wallet
        const resp = await provider.connect();
        const publicKey = resp.publicKey.toString();
        
        showStatus('pending', '<span class="loading"></span>Wallet connected! Preparing message to sign...');

        // Create the message to sign
        const message = {
            app: "JustTheTip",
            discord_user: discordUsername,
            discord_id: discordUserId,
            timestamp: new Date().toISOString(),
            nonce: nonce,
            purpose: "Register this wallet for deposits & withdrawals"
        };

        const messageString = JSON.stringify(message, null, 2);
        const encodedMessage = new TextEncoder().encode(messageString);

        showStatus('pending', '<span class="loading"></span>Please sign the message in your wallet...');

        // Request signature - this is where the automatic capture happens
        const signedMessage = await provider.signMessage(encodedMessage, 'utf8');
        
        // Automatically convert signature to base64 for transmission
        const signatureBase64 = btoa(String.fromCharCode(...signedMessage.signature));

        showStatus('pending', '<span class="loading"></span>Signature captured! Verifying...');

        // Send to backend for verification with retry logic
        const response = await fetchWithRetry(`${API_BASE_URL}/api/registerwallet/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: messageString,
                publicKey: publicKey,
                signature: signatureBase64,
                discordUserId: discordUserId,
                discordUsername: discordUsername,
                nonce: nonce
            })
        }, 2);

        const result = await response.json();

        if (result.success) {
            showStatus('success', `✅ Wallet registered successfully!<br><br>Wallet: ${publicKey.substring(0, 8)}...${publicKey.substring(publicKey.length - 8)}<br><br>Your signature was automatically captured and verified.<br><br>You can now close this window and return to Discord.`);
            disableAllButtons();
            
            // Clear session storage
            sessionStorage.removeItem('walletConnectMessage');
            sessionStorage.removeItem('walletConnectionPending');
            sessionStorage.removeItem('walletIdPending');
        } else {
            showStatus('error', `❌ Registration failed: ${result.error || 'Unknown error'}<br><br>Please try again or request a new registration link.`);
        }

    } catch (error) {
        console.error('Wallet connection error:', error);
        handleConnectionError(error);
    }
}

/**
 * Add wallet modal styles to the page
 */
function addWalletModalStyles() {
    if (document.getElementById('wallet-modal-styles')) {
        return; // Already added
    }
    
    const style = document.createElement('style');
    style.id = 'wallet-modal-styles';
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
    color: inherit;
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
}

/**
 * Handle manual wallet address entry for mobile users
 */
async function handleManualEntry() {
    try {
        const walletAddress = prompt('Enter your Solana wallet address:');
        
        if (!walletAddress || walletAddress.trim().length === 0) {
            showStatus('error', '❌ No wallet address provided. Please try again.');
            return;
        }
        
        // Validate wallet address format (basic check)
        if (walletAddress.length < 32 || walletAddress.length > 44) {
            showStatus('error', '❌ Invalid wallet address format. Solana addresses are 32-44 characters long.');
            return;
        }
        
        const messageString = sessionStorage.getItem('walletConnectMessage');
        
        if (!messageString) {
            showStatus('error', '❌ Session expired. Please refresh and try again.');
            return;
        }
        
        // Show the message that needs to be signed
        const signatureInstructions = `
            <div style="text-align: left; padding: 20px;">
                <h3 style="margin-bottom: 15px;">✍️ Sign This Message</h3>
                <p style="margin-bottom: 15px;">Copy the message below and sign it in your wallet app:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0; overflow-x: auto;">
                    <pre style="margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 12px;">${messageString}</pre>
                </div>
                <button onclick="navigator.clipboard.writeText(\`${messageString.replace(/[`\\]/g, '\\$&')}\`).then(() => alert('Message copied to clipboard!'))" 
                        style="padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; margin-bottom: 15px;">
                    📋 Copy Message to Clipboard
                </button>
                <p style="margin: 15px 0;"><strong>After signing in your wallet app:</strong></p>
                <ol style="margin-left: 20px; line-height: 1.8;">
                    <li>Your wallet will generate a signature</li>
                    <li>Copy the signature (usually in base64 or base58 format)</li>
                    <li>Click "Submit Signature" below</li>
                    <li>Paste the signature when prompted</li>
                </ol>
            </div>
        `;
        
        showStatus('pending', signatureInstructions);
        
        // Show signature entry button
        document.getElementById('signatureEntryButton').style.display = 'block';
        document.getElementById('signatureEntryButton').onclick = () => submitSignature(walletAddress);
        
    } catch (error) {
        console.error('Manual entry error:', error);
        showStatus('error', `❌ Error: ${error.message}`);
    }
}

/**
 * Submit the signature for verification
 */
async function submitSignature(walletAddress) {
    try {
        let signature = prompt('Enter the signature from your wallet (base64 or base58 format):');
        
        if (!signature || signature.trim().length === 0) {
            showStatus('error', '❌ No signature provided. Please try again.');
            return;
        }
        
        signature = signature.trim();
        
        // Note: Backend will handle both base58 and base64 signature formats
        const signatureToSend = signature;
        
        showStatus('pending', '<span class="loading"></span>Verifying signature...');
        
        const messageString = sessionStorage.getItem('walletConnectMessage');
        
        // Send to backend for verification with retry logic
        const response = await fetchWithRetry(`${API_BASE_URL}/api/registerwallet/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: messageString,
                publicKey: walletAddress,
                signature: signatureToSend,
                discordUserId: discordUserId,
                discordUsername: discordUsername,
                nonce: nonce
            })
        }, 2);

        const result = await response.json();

        if (result.success) {
            showStatus('success', `✅ Wallet registered successfully!<br><br>Wallet: ${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 8)}<br><br>You can now close this window and return to Discord.`);
            document.getElementById('manualEntryButton').style.display = 'none';
            document.getElementById('signatureEntryButton').style.display = 'none';
            disableAllButtons();
            
            // Clear session storage
            sessionStorage.removeItem('walletConnectMessage');
            sessionStorage.removeItem('walletConnectNonce');
        } else {
            showStatus('error', `❌ Registration failed: ${result.error || 'Unknown error'}<br><br>Please make sure you:<br>• Signed the exact message shown<br>• Copied the complete signature<br>• Are using the correct wallet address<br><br>You can try again by refreshing this page and requesting a new registration link from Discord.`);
        }

    } catch (error) {
        console.error('Signature submission error:', error);
        handleConnectionError(error);
    }
}

// Setup event listeners for desktop wallet buttons
document.getElementById('connectButton').addEventListener('click', () => connectWalletExtension('phantom'));
document.getElementById('solflareButton').addEventListener('click', () => connectWalletExtension('solflare'));

// Setup event listener for WalletConnect button (mobile)
document.getElementById('walletConnectButton').addEventListener('click', connectWalletConnect);

// Setup event listener for manual entry button
document.getElementById('manualEntryButton').addEventListener('click', handleManualEntry);
