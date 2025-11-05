/**
 * JustTheTip Landing Page - Onboarding Flow
 * Handles: Terms → Discord OAuth → Wallet Connect → NFT Mint → Bot Install
 */

// ===== CONFIGURATION =====
const CONFIG = {
    DISCORD_CLIENT_ID: '1419742988128616479',
    DISCORD_REDIRECT_URI: 'https://jmenichole.github.io/Justthetip/landing.html',
    API_BASE_URL: 'https://api.justthetip.site', // TODO: Replace with your backend URL
    VERIFIED_NFT_COLLECTION: 'YOUR_COLLECTION_ADDRESS', // TODO: Replace after creating collection
    SOLANA_NETWORK: 'mainnet-beta', // or 'devnet' for testing
    RPC_ENDPOINT: 'https://api.mainnet-beta.solana.com'
};

// ===== STATE MANAGEMENT =====
const AppState = {
    termsAccepted: false,
    termsVersion: '1.0',
    discordUser: null,
    walletConnected: false,
    walletAddress: null,
    walletSignature: null,
    nftMinted: false,
    nftMintAddress: null,
    currentStep: 'terms' // terms, discord, wallet, nft, bot, complete
};

// ===== SOLANA WALLET INTEGRATION =====
let walletAdapter = null;

function initWalletAdapter() {
    // Check if Phantom is installed
    const isPhantomInstalled = window.solana && window.solana.isPhantom;
    
    if (isPhantomInstalled) {
        walletAdapter = window.solana;
        console.log('✅ Phantom wallet detected');
        return true;
    } else {
        console.warn('⚠️ No Solana wallet detected');
        return false;
    }
}

async function connectWallet() {
    try {
        if (!walletAdapter) {
            throw new Error('No wallet adapter available');
        }

        // Connect to wallet
        const response = await walletAdapter.connect();
        const publicKey = response.publicKey || walletAdapter.publicKey;
        
        AppState.walletConnected = true;
        AppState.walletAddress = publicKey.toString();
        
        console.log('✅ Wallet connected:', AppState.walletAddress);
        
        // Save to sessionStorage
        sessionStorage.setItem('walletAddress', AppState.walletAddress);
        
        return AppState.walletAddress;
    } catch (error) {
        console.error('❌ Wallet connection failed:', error);
        throw error;
    }
}

async function signMessage(message) {
    try {
        if (!walletAdapter || !AppState.walletConnected) {
            throw new Error('Wallet not connected');
        }

        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await walletAdapter.signMessage(encodedMessage);
        
        // Convert to base58
        const signature = btoa(String.fromCharCode(...signedMessage.signature));
        
        AppState.walletSignature = signature;
        console.log('✅ Message signed');
        
        return signature;
    } catch (error) {
        console.error('❌ Message signing failed:', error);
        throw error;
    }
}

// ===== TERMS OF SERVICE =====
function loadTermsAcceptance() {
    const stored = localStorage.getItem('justthetip_terms');
    if (stored) {
        const data = JSON.parse(stored);
        if (data.version === AppState.termsVersion) {
            AppState.termsAccepted = true;
            AppState.currentStep = 'discord';
            return true;
        }
    }
    return false;
}

function saveTermsAcceptance() {
    const data = {
        accepted: true,
        version: AppState.termsVersion,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('justthetip_terms', JSON.stringify(data));
    AppState.termsAccepted = true;
}

function showTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ===== DISCORD OAUTH2 (USER IDENTIFICATION) =====
function initiateDiscordUserAuth() {
    // Check if terms accepted
    if (!AppState.termsAccepted) {
        showError('Please accept the Terms of Service first');
        showTermsModal();
        return;
    }

    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('oauth_state', state);
    
    // USER AUTH (identify scope) - NOT bot installation
    const authUrl = `https://discord.com/api/oauth2/authorize?` +
        `client_id=${CONFIG.DISCORD_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(CONFIG.DISCORD_REDIRECT_URI)}` +
        `&response_type=token` +
        `&scope=identify` +
        `&state=${state}`;
    
    console.log('🔗 Redirecting to Discord OAuth (user identification)...');
    window.location.href = authUrl;
}

async function handleDiscordCallback() {
    const fragment = window.location.hash.substring(1);
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const state = params.get('state');
    
    if (!accessToken) return false;
    
    // Verify state
    const savedState = sessionStorage.getItem('oauth_state');
    if (state !== savedState) {
        showError('Invalid OAuth state. Please try again.');
        return false;
    }
    
    sessionStorage.removeItem('oauth_state');
    
    try {
        showLoading(true, 'Fetching Discord profile...');
        
        // Fetch user info
        const response = await fetch('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }
        
        const userData = await response.json();
        
        AppState.discordUser = {
            id: userData.id,
            username: userData.username,
            discriminator: userData.discriminator,
            avatar: userData.avatar,
            accessToken: accessToken
        };
        
        AppState.currentStep = 'wallet';
        
        // Save to sessionStorage
        sessionStorage.setItem('discord_user', JSON.stringify(AppState.discordUser));
        
        console.log('✅ Discord user authenticated:', AppState.discordUser.username);
        
        // Clear URL fragment
        window.history.replaceState(null, null, window.location.pathname);
        
        // Show wallet connection step
        showOnboardingModal();
        updateOnboardingStep('wallet');
        
        return true;
    } catch (error) {
        console.error('❌ Discord OAuth error:', error);
        showError('Failed to authenticate with Discord');
        return false;
    } finally {
        showLoading(false);
    }
}

// ===== NFT MINTING =====
async function mintVerificationNFT() {
    if (!AppState.discordUser || !AppState.walletAddress || !AppState.walletSignature) {
        throw new Error('Missing required data for NFT mint');
    }

    try {
        showLoading(true, 'Minting your verification NFT...');

        const mintData = {
            discordId: AppState.discordUser.id,
            discordUsername: AppState.discordUser.username,
            walletAddress: AppState.walletAddress,
            signature: AppState.walletSignature,
            termsVersion: AppState.termsVersion,
            timestamp: new Date().toISOString()
        };

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/mintBadge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mintData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'NFT minting failed');
        }

        const result = await response.json();

        AppState.nftMinted = true;
        AppState.nftMintAddress = result.nftMintAddress;
        AppState.currentStep = 'bot';

        // Save to sessionStorage
        sessionStorage.setItem('nft_mint_address', result.nftMintAddress);

        console.log('✅ NFT minted successfully:', result.nftMintAddress);
        
        return result;
    } catch (error) {
        console.error('❌ NFT minting error:', error);
        
        // Fallback: Save data locally if backend unavailable
        if (error.message.includes('fetch')) {
            console.warn('⚠️ Backend unavailable, saving data locally');
            localStorage.setItem('pending_verification', JSON.stringify({
                discordId: AppState.discordUser.id,
                walletAddress: AppState.walletAddress,
                timestamp: new Date().toISOString()
            }));
        }
        
        throw error;
    } finally {
        showLoading(false);
    }
}

// ===== ONBOARDING MODAL MANAGEMENT =====
function showOnboardingModal() {
    const modal = document.getElementById('onboardingModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideOnboardingModal() {
    const modal = document.getElementById('onboardingModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateOnboardingStep(step) {
    const content = document.getElementById('onboardingContent');
    const title = document.getElementById('onboardingTitle');
    
    if (!content || !title) return;

    switch (step) {
        case 'discord':
            title.textContent = 'Step 1: Connect Discord';
            content.innerHTML = `
                <div class="onboarding-step">
                    <div class="step-icon">🎮</div>
                    <p class="step-description">Connect your Discord account to get started.</p>
                    <button class="btn btn-primary" id="connectDiscordBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                        Connect Discord
                    </button>
                </div>
            `;
            document.getElementById('connectDiscordBtn').addEventListener('click', initiateDiscordUserAuth);
            break;

        case 'wallet':
            title.textContent = '🪙 How to Link Your Wallet';
            content.innerHTML = `
                <div class="onboarding-step">
                    <p class="step-description" style="margin-bottom: 1.5rem; font-weight: 600;">Follow these 3 quick steps:</p>
                    <div class="user-badge" style="margin-bottom: 1.5rem;">
                        <img src="https://cdn.discordapp.com/avatars/${AppState.discordUser.id}/${AppState.discordUser.avatar}.png" 
                             alt="Avatar" class="user-avatar-small">
                        <span>${AppState.discordUser.username}</span>
                    </div>
                    <div style="text-align: left; margin-bottom: 1.5rem; padding: 0 1rem;">
                        <p style="margin-bottom: 1rem; line-height: 1.6;">
                            <strong>1️⃣ Click <strong>Verify Wallet</strong> below.</strong><br>
                            <span style="margin-left: 1.5rem; color: #94a3b8; font-size: 0.9rem;">(No private key, no funds — just proof of ownership.)</span>
                        </p>
                        <p style="margin-bottom: 1rem; line-height: 1.6;">
                            <strong>2️⃣ Approve the message in your wallet (Phantom/Solflare/etc.)</strong><br>
                            <span style="margin-left: 1.5rem; color: #94a3b8; font-size: 0.9rem;">This confirms it's really you.</span>
                        </p>
                        <p style="margin-bottom: 1rem; line-height: 1.6;">
                            <strong>3️⃣ Return here — your wallet will show as "Verified ✅".</strong>
                        </p>
                    </div>
                    <button class="btn btn-primary" id="connectWalletBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="5" width="20" height="14" rx="2"/>
                            <path d="M2 10h20"/>
                        </svg>
                        Verify Wallet
                    </button>
                    <p class="step-hint">Need help? Type <code>/help</code> or visit <a href="https://jmenichole.github.io/justthetip.app/guide" target="_blank">jmenichole.github.io/justthetip.app/guide</a></p>
                </div>
            `;
            document.getElementById('connectWalletBtn').addEventListener('click', handleWalletConnect);
            break;

        case 'sign':
            title.textContent = 'Step 3: Sign Message';
            content.innerHTML = `
                <div class="onboarding-step">
                    <div class="step-icon">✍️</div>
                    <p class="step-description">Sign a message to prove wallet ownership and accept Terms.</p>
                    <div class="wallet-info">
                        <strong>Wallet:</strong> ${AppState.walletAddress.slice(0, 8)}...${AppState.walletAddress.slice(-8)}
                    </div>
                    <div class="message-preview">
                        <code>I accept JustTheTip Terms v${AppState.termsVersion} on ${new Date().toISOString()}, Discord ID: ${AppState.discordUser.id}</code>
                    </div>
                    <button class="btn btn-primary" id="signMessageBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        Sign Message
                    </button>
                </div>
            `;
            document.getElementById('signMessageBtn').addEventListener('click', handleMessageSign);
            break;

        case 'nft':
            title.textContent = 'Step 4: Mint Verification NFT';
            content.innerHTML = `
                <div class="onboarding-step">
                    <div class="step-icon">🎫</div>
                    <p class="step-description">Mint your verification NFT to unlock all features.</p>
                    <div class="verification-summary">
                        <div class="verify-item">✅ Discord: ${AppState.discordUser.username}</div>
                        <div class="verify-item">✅ Wallet: ${AppState.walletAddress.slice(0, 8)}...</div>
                        <div class="verify-item">✅ Signature: Verified</div>
                    </div>
                    <button class="btn btn-primary" id="mintNftBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        Mint Verification NFT
                    </button>
                    <p class="step-hint">This NFT proves you control both your Discord and wallet.</p>
                </div>
            `;
            document.getElementById('mintNftBtn').addEventListener('click', handleNftMint);
            break;

        case 'bot':
            title.textContent = 'Step 5: Add Bot to Discord';
            content.innerHTML = `
                <div class="onboarding-step">
                    <div class="step-icon">✅</div>
                    <h3>Verification Complete!</h3>
                    <p class="step-description">Your NFT has been minted successfully.</p>
                    <div class="nft-info">
                        <strong>NFT Address:</strong>
                        <code>${AppState.nftMintAddress}</code>
                        <a href="https://solscan.io/token/${AppState.nftMintAddress}" target="_blank" class="view-explorer">
                            View on Solscan →
                        </a>
                    </div>
                    <p class="step-description" style="margin-top: 2rem;">Now add the bot to your Discord server to start tipping!</p>
                    <a href="https://discord.com/api/oauth2/authorize?client_id=${CONFIG.DISCORD_CLIENT_ID}&permissions=0&scope=bot%20applications.commands" 
                       target="_blank" 
                       class="btn btn-primary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                        Add JustTheTip Bot
                    </a>
                    <button class="btn btn-secondary" onclick="location.reload()">Done</button>
                </div>
            `;
            break;
    }
}

// ===== EVENT HANDLERS =====
async function handleWalletConnect() {
    try {
        showLoading(true, 'Connecting to wallet...');
        
        if (!initWalletAdapter()) {
            throw new Error('No Solana wallet found. Please install Phantom.');
        }

        await connectWallet();
        
        // Move to signing step
        AppState.currentStep = 'sign';
        updateOnboardingStep('sign');
        
    } catch (error) {
        showError(error.message);
        console.error('Wallet connection error:', error);
    } finally {
        showLoading(false);
    }
}

async function handleMessageSign() {
    try {
        showLoading(true, 'Waiting for signature...');
        
        const message = `I accept JustTheTip Terms v${AppState.termsVersion} on ${new Date().toISOString()}, Discord ID: ${AppState.discordUser.id}`;
        
        await signMessage(message);
        
        // Move to NFT minting step
        AppState.currentStep = 'nft';
        updateOnboardingStep('nft');
        
    } catch (error) {
        showError('Failed to sign message. Please try again.');
        console.error('Message signing error:', error);
    } finally {
        showLoading(false);
    }
}

async function handleNftMint() {
    try {
        await mintVerificationNFT();
        
        // Move to bot installation step
        updateOnboardingStep('bot');
        
    } catch (error) {
        showError(error.message || 'Failed to mint NFT. Please try again.');
        console.error('NFT minting error:', error);
    }
}

// ===== UI UTILITIES =====
function showError(message) {
    // Try to use existing error display
    const errorDiv = document.getElementById('errorMessage') || createErrorElement();
    errorDiv.textContent = message;
    errorDiv.classList.add('visible');
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.classList.remove('visible');
        errorDiv.style.display = 'none';
    }, 5000);
}

function createErrorElement() {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'errorMessage';
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(239, 68, 68, 0.9);
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 10000;
        display: none;
    `;
    document.body.appendChild(errorDiv);
    return errorDiv;
}

function showLoading(show, message = 'Loading...') {
    let spinner = document.getElementById('loadingOverlay');
    
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'loadingOverlay';
        spinner.innerHTML = `
            <div style="text-align: center;">
                <div class="spinner" style="margin: 0 auto 1rem;"></div>
                <div id="loadingMessage" style="color: #e2e8f0;">${message}</div>
            </div>
        `;
        spinner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(15, 23, 42, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        document.body.appendChild(spinner);
    }
    
    const messageEl = document.getElementById('loadingMessage');
    if (messageEl) messageEl.textContent = message;
    
    spinner.style.display = show ? 'flex' : 'none';
}

// ===== INITIALIZATION =====
function loadSessionData() {
    // Load Discord user
    const storedUser = sessionStorage.getItem('discord_user');
    if (storedUser) {
        AppState.discordUser = JSON.parse(storedUser);
        AppState.currentStep = 'wallet';
    }
    
    // Load wallet
    const storedWallet = sessionStorage.getItem('walletAddress');
    if (storedWallet) {
        AppState.walletAddress = storedWallet;
        AppState.walletConnected = true;
    }
    
    // Load NFT
    const storedNFT = sessionStorage.getItem('nft_mint_address');
    if (storedNFT) {
        AppState.nftMintAddress = storedNFT;
        AppState.nftMinted = true;
        AppState.currentStep = 'bot';
    }
}

function initializeApp() {
    console.log('🚀 JustTheTip Landing App Initialized');
    
    // Load terms acceptance
    loadTermsAcceptance();
    
    // Load session data
    loadSessionData();
    
    // Check for OAuth callback
    if (window.location.hash.includes('access_token')) {
        handleDiscordCallback();
    }
    
    // Initialize wallet adapter
    initWalletAdapter();
    
    // Attach event listeners
    attachEventListeners();
}

function attachEventListeners() {
    // Terms modal
    const termsAcceptBtn = document.getElementById('termsAcceptBtn');
    const termsCloseBtn = document.getElementById('termsCloseBtn');
    
    if (termsAcceptBtn) {
        termsAcceptBtn.addEventListener('click', () => {
            saveTermsAcceptance();
            hideTermsModal();
            AppState.currentStep = 'discord';
            showOnboardingModal();
            updateOnboardingStep('discord');
        });
    }
    
    if (termsCloseBtn) {
        termsCloseBtn.addEventListener('click', hideTermsModal);
    }
    
    // Onboarding modal close
    const onboardingCloseBtn = document.getElementById('onboardingCloseBtn');
    if (onboardingCloseBtn) {
        onboardingCloseBtn.addEventListener('click', hideOnboardingModal);
    }
    
    // Get Started buttons
    const getStartedBtns = document.querySelectorAll('.get-started-btn, .hero-cta .btn-primary');
    getStartedBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!AppState.termsAccepted) {
                showTermsModal();
            } else {
                showOnboardingModal();
                updateOnboardingStep(AppState.currentStep);
            }
        });
    });
}

// ===== START APP =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// ===== EXPORT FOR DEBUGGING =====
window.JustTheTip = {
    state: AppState,
    config: CONFIG,
    resetOnboarding: () => {
        sessionStorage.clear();
        localStorage.removeItem('justthetip_terms');
        location.reload();
    },
    showState: () => console.table(AppState)
};
