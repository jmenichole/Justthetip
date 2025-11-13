/**
 * Smart Wallet Connection with iOS/Android App Suggestions
 * Uses Universal Links and Intent URLs to trigger OS-level app suggestions
 */

// Enhanced wallet configuration with proper deep links
const WALLET_CONFIG = {
    phantom: {
        name: 'Phantom',
        icon: '��',
        universalLink: 'https://phantom.app/ul/v1/browse/',
        deepLink: 'phantom://',
        iosScheme: 'phantom://',
        androidPackage: 'app.phantom',
        detected: () => window.phantom?.solana
    },
    trust: {
        name: 'Trust Wallet',
        icon: '🔵',
        universalLink: 'https://link.trustwallet.com/wc?uri=',
        deepLink: 'trust://',
        iosScheme: 'trust://',
        androidPackage: 'com.wallet.crypto.trustapp',
        detected: () => window.trustwallet
    },
    coinbase: {
        name: 'Coinbase Wallet',
        icon: '🔷',
        universalLink: 'https://go.cb-w.com/wc?uri=',
        deepLink: 'cbwallet://',
        iosScheme: 'cbwallet://',
        androidPackage: 'org.toshi',
        detected: () => window.coinbaseWallet
    },
    solflare: {
        name: 'Solflare',
        icon: '🟠',
        universalLink: 'https://solflare.com/ul/v1/browse/',
        deepLink: 'solflare://',
        iosScheme: 'solflare://',
        androidPackage: 'com.solflare.mobile',
        detected: () => window.solflare
    }
};

/**
 * Smart wallet connection that triggers OS app suggestions
 */
export async function smartWalletConnect(walletId, connectionData) {
    const wallet = WALLET_CONFIG[walletId];
    if (!wallet) throw new Error('Unknown wallet');

    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isMobile = isIOS || isAndroid;

    // Desktop: Try browser extension first
    if (!isMobile && wallet.detected()) {
        return connectBrowserExtension(walletId);
    }

    // Mobile: Use Universal Links (triggers iOS app suggestions)
    if (isMobile) {
        return connectMobileWallet(wallet, connectionData, isIOS, isAndroid);
    }

    // Desktop without extension: Show QR or download prompt
    return showDesktopOptions(wallet);
}

/**
 * Connect via mobile wallet using Universal Links
 * This triggers iOS to suggest installed wallet apps
 */
async function connectMobileWallet(wallet, data, isIOS, isAndroid) {
    const params = new URLSearchParams({
        dappUrl: window.location.origin,
        redirect: window.location.href,
        cluster: 'mainnet-beta',
        ...data
    });

    // For iOS: Use Universal Link first (triggers app suggestions)
    if (isIOS) {
        const universalUrl = `${wallet.universalLink}${window.location.href}?${params}`;
        
        // Try Universal Link
        window.location.href = universalUrl;
        
        // Fallback to deep link after 1 second
        setTimeout(() => {
            window.location.href = `${wallet.iosScheme}?${params}`;
        }, 1000);
        
        // If neither works, show install prompt
        setTimeout(() => {
            if (document.hidden) return; // App opened successfully
            showInstallPrompt(wallet);
        }, 3000);
    }

    // For Android: Use Intent URL
    if (isAndroid) {
        const intentUrl = `intent://wc?${params}#Intent;scheme=${wallet.deepLink.replace('://', '')};package=${wallet.androidPackage};end`;
        window.location.href = intentUrl;
        
        setTimeout(() => {
            if (document.hidden) return;
            showInstallPrompt(wallet);
        }, 2000);
    }

    return new Promise((resolve) => {
        // Listen for page visibility change (user returned from wallet)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                resolve({ success: true, method: 'mobile' });
            }
        });
    });
}

/**
 * Connect via browser extension
 */
async function connectBrowserExtension(walletId) {
    const wallet = WALLET_CONFIG[walletId];
    const provider = wallet.detected();
    
    if (!provider) {
        throw new Error(`${wallet.name} extension not found`);
    }

    const resp = await provider.connect();
    return {
        success: true,
        method: 'extension',
        publicKey: resp.publicKey.toString(),
        provider
    };
}

/**
 * Show install prompt for wallet
 */
function showInstallPrompt(wallet) {
    const message = `${wallet.name} doesn't appear to be installed. Install it to continue.`;
    const installUrl = `https://apps.apple.com/search?term=${encodeURIComponent(wallet.name)}`;
    
    if (confirm(message)) {
        window.open(installUrl, '_blank');
    }
}

/**
 * Show desktop options (QR code or extension download)
 */
function showDesktopOptions(wallet) {
    return {
        success: false,
        requiresQR: true,
        wallet: wallet.name
    };
}

export { WALLET_CONFIG };
