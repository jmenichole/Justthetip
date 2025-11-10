/**
 * JustTheTip Wallet Registration - Client-side JavaScript
 * Handles wallet connection, signature verification, and registration
 * 
 * This file is loaded by sign.html for CSP compliance (no inline scripts)
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

// Display user info
if (discordUserId && discordUsername && nonce) {
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('discordUsername').textContent = discordUsername;
    document.getElementById('discordUserId').textContent = discordUserId;
    document.getElementById('nonce').textContent = nonce.substring(0, 8) + '...';
    
    // Test API connectivity on page load
    testAPIConnectivity();
} else {
    showStatus('error', '❌ Invalid registration link. Please request a new one from Discord.');
    document.getElementById('connectButton').disabled = true;
    document.getElementById('solflareButton').disabled = true;
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

document.getElementById('connectButton').addEventListener('click', () => connectWallet('phantom'));
document.getElementById('solflareButton').addEventListener('click', () => connectWallet('solflare'));
