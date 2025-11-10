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
    : (window.JUSTTHETIP_API_URL || 'https://justthetip.vercel.app'); // Production - can be overridden

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

function showStatus(type, message) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.className = `status ${type}`;
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

async function connectWallet(walletType) {
    const provider = walletType === 'phantom' ? window.solana : window.solflare;
    
    if (!provider) {
        const walletName = walletType === 'phantom' ? 'Phantom' : 'Solflare';
        const installUrl = walletType === 'phantom' 
            ? 'https://phantom.app/' 
            : 'https://solflare.com/';
        showStatus('error', `❌ ${walletName} wallet not found. <a href="${installUrl}" target="_blank">Install ${walletName}</a>`);
        return;
    }

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

        // Request signature
        const signedMessage = await provider.signMessage(encodedMessage, 'utf8');
        
        // Convert signature to base64 for transmission
        const signatureBase64 = btoa(String.fromCharCode(...signedMessage.signature));

        showStatus('pending', '<span class="loading"></span>Verifying signature...');

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
            showStatus('success', `✅ Wallet registered successfully!<br><br>Wallet: ${publicKey.substring(0, 8)}...${publicKey.substring(publicKey.length - 8)}<br><br>You can now close this window and return to Discord.`);
            document.getElementById('connectButton').disabled = true;
            document.getElementById('solflareButton').disabled = true;
        } else {
            showStatus('error', `❌ Registration failed: ${result.error || 'Unknown error'}<br><br>Please try again or request a new registration link.`);
        }

    } catch (error) {
        console.error('Wallet connection error:', error);
        handleConnectionError(error);
    }
}

/**
 * Connect via WalletConnect for mobile wallets or desktop QR code scanning
 * Uses a manual approach since we need both desktop QR and mobile deep linking
 */
async function connectWalletConnect() {
    try {
        showStatus('pending', '<span class="loading"></span>Preparing WalletConnect...');
        
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
        
        // Store the message and session for later verification
        sessionStorage.setItem('walletConnectMessage', messageString);
        sessionStorage.setItem('walletConnectNonce', nonce);
        
        // Provide instructions based on device type
        let instructions;
        
        if (isMobile) {
            // Mobile instructions - direct wallet app connection
            instructions = `
                <div style="text-align: left; padding: 20px;">
                    <h3 style="margin-bottom: 15px;">📱 Mobile Wallet Connection</h3>
                    <p style="margin-bottom: 15px;">To register your wallet on mobile:</p>
                    <ol style="margin-left: 20px; line-height: 1.8;">
                        <li><strong>Install a Solana wallet app</strong> (if you don't have one):
                            <ul style="margin: 10px 0 10px 20px;">
                                <li>Phantom Wallet (recommended)</li>
                                <li>Solflare Wallet</li>
                                <li>Trust Wallet</li>
                                <li>Or any Solana-compatible wallet</li>
                            </ul>
                        </li>
                        <li><strong>Open the wallet app</strong> and create/import your wallet</li>
                        <li><strong>Copy your wallet address</strong> from the app</li>
                        <li><strong>Click "Enter Wallet Details"</strong> below</li>
                        <li><strong>Paste your wallet address</strong> when prompted</li>
                        <li><strong>Sign the message</strong> in your wallet app to complete registration</li>
                    </ol>
                    <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <strong>💡 Note:</strong> You'll need to manually sign a message in your wallet app. 
                        We'll provide the exact message text for you to copy.
                    </div>
                </div>
            `;
        } else {
            // Desktop instructions - QR code scanning with mobile wallet
            instructions = `
                <div style="text-align: left; padding: 20px;">
                    <h3 style="margin-bottom: 15px;">🖥️ Desktop + Mobile Wallet Connection</h3>
                    <p style="margin-bottom: 15px;">Don't have a browser extension? Connect using your mobile wallet:</p>
                    <ol style="margin-left: 20px; line-height: 1.8;">
                        <li><strong>Install a Solana wallet on your phone</strong> (if you don't have one):
                            <ul style="margin: 10px 0 10px 20px;">
                                <li>Phantom Wallet (recommended) - <a href="https://phantom.app/" target="_blank">phantom.app</a></li>
                                <li>Solflare Wallet - <a href="https://solflare.com/" target="_blank">solflare.com</a></li>
                                <li>Trust Wallet or any Solana wallet</li>
                            </ul>
                        </li>
                        <li><strong>Open your wallet app on your phone</strong></li>
                        <li><strong>Copy your wallet address</strong> from the app (tap to copy)</li>
                        <li><strong>Return to this page on desktop</strong></li>
                        <li><strong>Click "Enter Wallet Details"</strong> below and paste your address</li>
                        <li><strong>Sign the verification message</strong> in your mobile wallet app</li>
                        <li><strong>Copy the signature</strong> and submit it here</li>
                    </ol>
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <strong>⚡ Why manual entry?</strong> This ensures compatibility with all Solana wallets. 
                        The process is secure and only takes 2-3 minutes.
                    </div>
                    <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 15px;">
                        <strong>🔒 Security:</strong> Your private keys never leave your phone. 
                        You're only sharing a cryptographic proof of ownership.
                    </div>
                </div>
            `;
        }
        
        showStatus('pending', instructions);
        
        // Show manual entry button
        document.getElementById('manualEntryButton').style.display = 'block';
        document.getElementById('mobileButtons').style.display = 'block';
        
    } catch (error) {
        console.error('WalletConnect error:', error);
        handleConnectionError(error);
    }
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
document.getElementById('connectButton').addEventListener('click', () => connectWallet('phantom'));
document.getElementById('solflareButton').addEventListener('click', () => connectWallet('solflare'));

// Setup event listener for WalletConnect button (mobile)
document.getElementById('walletConnectButton').addEventListener('click', connectWalletConnect);

// Setup event listener for manual entry button
document.getElementById('manualEntryButton').addEventListener('click', handleManualEntry);
