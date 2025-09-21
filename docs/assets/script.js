// Global state for click tracking
let clickStats = {
    addBotClicks: 0
};

// Crypto ticker functionality
const coinList = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    { id: 'solana', symbol: 'SOL', name: 'Solana' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
];

async function fetchCryptoData() {
    try {
        const ids = coinList.map(coin => coin.id).join(',');
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        if (!response.ok) {
            throw new Error('Failed to fetch crypto data');
        }
        const data = await response.json();
        
        const formattedData = coinList.map(coin => ({
            ...coin,
            price: data[coin.id]?.usd || 0,
            change: data[coin.id]?.usd_24h_change || 0,
        }));
        
        updateCryptoTicker(formattedData);
    } catch (error) {
        console.error("Error fetching crypto prices:", error);
        const ticker = document.getElementById('crypto-ticker');
        if (ticker) {
            ticker.innerHTML = '<div class="ticker-content"><div class="ticker-item">Market data unavailable</div></div>';
        }
    }
}

function updateCryptoTicker(cryptoData) {
    const ticker = document.getElementById('crypto-ticker');
    if (!ticker) return;
    
    const tickerItems = cryptoData.map(coin => {
        const isPositive = coin.change >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        const changeSymbol = isPositive ? '▲' : '▼';
        
        return `
            <div class="ticker-item">
                <span class="ticker-symbol" style="font-weight: 700; color: var(--text-primary);">${coin.symbol}</span>
                <span class="ticker-price">$${coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span class="ticker-change ${changeClass}" style="color: ${isPositive ? '#10b981' : '#ef4444'};">
                    <span>${changeSymbol}</span>
                    <span>${Math.abs(coin.change).toFixed(2)}%</span>
                </span>
            </div>
        `;
    }).join('');
    
    ticker.innerHTML = `
        <div class="ticker-content">
            ${tickerItems}
            ${tickerItems}
        </div>
    `;
}

// Modal functionality
function openContactModal() {
    const modal = document.getElementById('contact-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeContactModal() {
    const modal = document.getElementById('contact-modal');
    if (modal) modal.classList.add('hidden');
}

function openAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.classList.add('hidden');
}

// Contact form submission
function handleContactSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');

    const subject = encodeURIComponent(`Contact Form Inquiry from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
    const mailtoLink = `mailto:jmenichole007@outlook.com?subject=${subject}&body=${body}`;

    try {
        window.location.href = mailtoLink;
        closeContactModal();
        alert('Opening your email client to send the message.');
    } catch (error) {
        console.error("Failed to open mail client:", error);
        alert("Could not automatically open your email client. Please send your message to jmenichole007@outlook.com");
    }
}

// Admin functionality
function handleAdminSubmit(event) {
    event.preventDefault();
    const password = document.getElementById('admin-password').value;
    
    if (password === 'yourmom1') {
        closeAdminModal();
        showAdminDashboard();
    } else {
        alert('Incorrect password.');
        document.getElementById('admin-password').value = '';
    }
}

function showAdminDashboard() {
    document.body.innerHTML = `
        <div style="background: var(--bg-primary); min-height: 100vh; padding: 2rem; color: var(--text-primary);">
            <div style="max-width: 1200px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                    <h1 style="font-size: 2rem; font-weight: 700;">Admin Dashboard</h1>
                    <button onclick="location.reload()" class="btn btn-primary">Back to Site</button>
                </div>
                <div style="background: var(--bg-card); padding: 2rem; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem;">Button Click Analytics (Session)</h3>
                    <div style="background: rgba(17,24,39,0.5); padding: 1rem; border-radius: 0.5rem;">
                        <div style="color: var(--text-light); font-size: 0.875rem;">ADD BOT TO SERVER Clicks</div>
                        <div style="font-size: 2.5rem; font-weight: 900; color: var(--purple-color);">${clickStats.addBotClicks}</div>
                    </div>
                </div>
                <div style="background: var(--bg-card); padding: 2rem; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="margin-bottom: 1rem;">Admin Tools</h3>
                    <div style="background: rgba(17,24,39,0.5); padding: 1.5rem; border-radius: 0.5rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Send Global Announcement</label>
                        <textarea id="announcement-text" placeholder="Your announcement here..." rows="3" style="width: 100%; background: rgba(17,24,39,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; padding: 0.75rem; color: var(--text-primary); margin-bottom: 1rem;"></textarea>
                        <button onclick="sendAnnouncement()" class="btn btn-primary">Send Announcement</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function sendAnnouncement() {
    const announcement = document.getElementById('announcement-text').value;
    if (!announcement.trim()) {
        alert('Announcement message cannot be empty.');
        return;
    }
    alert(`Announcement sent! (Feature not implemented)\n\nMessage: "${announcement}"`);
    document.getElementById('announcement-text').value = '';
}

// Track bot invitation clicks
function trackBotClick() {
    clickStats.addBotClicks++;
    localStorage.setItem('botClickStats', JSON.stringify(clickStats));
}

// Load click stats from localStorage
function loadClickStats() {
    const saved = localStorage.getItem('botClickStats');
    if (saved) {
        clickStats = JSON.parse(saved);
    }
}

// Initialize everything when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // Load saved click stats
    loadClickStats();
    
    // Set up crypto ticker
    fetchCryptoData();
    setInterval(fetchCryptoData, 60000); // Update every minute
    
    // Set up event listeners
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
    
    const adminForm = document.getElementById('admin-form');
    if (adminForm) {
        adminForm.addEventListener('submit', handleAdminSubmit);
    }
    
    // Set up bot button click tracking
    const botButton = document.getElementById('add-bot-btn');
    if (botButton) {
        botButton.addEventListener('click', trackBotClick);
    }
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Copy command to clipboard functionality
    document.querySelectorAll('.command-card code').forEach(code => {
        code.style.cursor = 'pointer';
        code.title = 'Click to copy';
        
        code.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(code.textContent);
                
                const original = code.style.background;
                code.style.background = 'var(--success-color)';
                
                setTimeout(() => {
                    code.style.background = original;
                }, 1000);
                
            } catch (err) {
                console.log('Failed to copy text: ', err);
            }
        });
    });
    
    // Console easter egg
    console.log(`
🤏💸 JustTheTip Discord Bot
===============================
Made for degenerates, by degenerates.

GitHub: https://github.com/Mischief-Manager-inc/justthetipbot
Community: https://discord.gg/66gNdYCYZA

Self-custodial, multi-chain tipping at its finest!
`);
});
