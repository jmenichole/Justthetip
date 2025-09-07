
import React, { useState } from 'react';
import { HowItWorksCard } from './components/HowItWorksCard';
import { PrimaryButton, SecondaryButton } from './components/Buttons';
import { Footer } from './components/Footer';
import { FeatureCard } from './components/FeatureCard';
import { Logo } from './components/Logo';
import { CryptoTicker } from './components/CryptoTicker';

// --- NEW COMPONENTS ---

// Privacy Policy Modal Component
const PrivacyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-brand-card border border-white/10 rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
        <h2 className="text-2xl font-bold text-white mb-6">Privacy Policy</h2>
        <div className="text-gray-300 space-y-4">
          <p><strong>Effective Date:</strong> September 6, 2025</p>
          <p>This Privacy Policy explains how JustTheTip handles your data when you use our Discord bot and related services.</p>
          
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">1. Data Collection</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>We collect only the minimum data required to operate the bot (e.g., Discord user IDs, server IDs, and off-chain balance records).</li>
            <li>We do not collect or store private keys or sensitive wallet information.</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-6 mb-3">2. Data Usage</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Data is used solely to provide bot functionality (e.g., processing tips, airdrops, and balance tracking).</li>
            <li>We do not sell or share your data with third parties.</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-6 mb-3">3. Data Security</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>We use reasonable security measures to protect your data.</li>
            <li>No method of transmission or storage is 100% secure; use at your own risk.</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-6 mb-3">4. User Rights</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>You may request deletion of your data by contacting us at jmenichole007@outlook.com.</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-6 mb-3">5. Changes to Policy</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>We may update this policy at any time. Continued use of the bot constitutes acceptance of the new policy.</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-6 mb-3">6. Contact</h3>
          <p>For privacy questions, contact: <a href="mailto:jmenichole007@outlook.com" className="text-cyan-300 hover:text-cyan-400">jmenichole007@outlook.com</a></p>
        </div>
      </div>
    </div>
  );
};

// Terms of Service Modal Component
const TermsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-brand-card border border-white/10 rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
        <h2 className="text-2xl font-bold text-white mb-6">Terms of Service</h2>
        <div className="text-gray-300 space-y-4">
          <p><strong>Effective Date:</strong> September 6, 2025</p>
          <p>Welcome to JustTheTip! By using our Discord bot and related services, you agree to the following terms:</p>
          
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">1. Service Description</h3>
          <p>JustTheTip is a non-custodial helper bot for Discord, allowing users to tip, airdrop, and manage crypto balances off-chain. The bot does not hold or control your private keys or funds.</p>

          <h3 className="text-xl font-semibold text-white mt-6 mb-3">2. User Responsibilities</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>You are responsible for your own wallet security and transactions.</li>
            <li>You must comply with Discord's Terms of Service and Community Guidelines.</li>
            <li>You agree not to use the bot for illegal or prohibited activities.</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-6 mb-3">3. No Custody or Financial Advice</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>JustTheTip does not provide financial, investment, or legal advice.</li>
            <li>The bot does not custody or control user funds; all transactions are off-chain and at your own risk.</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-6 mb-3">4. Limitation of Liability</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>We are not liable for any loss, damages, or claims arising from your use of the bot.</li>
            <li>The service is provided "as is" without warranties of any kind.</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-6 mb-3">5. Privacy</h3>
          <p>See our Privacy Policy for details on data handling.</p>

          <h3 className="text-xl font-semibold text-white mt-6 mb-3">6. Changes to Terms</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>We may update these terms at any time. Continued use of the bot constitutes acceptance of the new terms.</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-6 mb-3">7. Contact</h3>
          <p>For questions, contact: <a href="mailto:jmenichole007@outlook.com" className="text-cyan-300 hover:text-cyan-400">jmenichole007@outlook.com</a></p>
        </div>
      </div>
    </div>
  );
};

// Contact Modal Component
const ContactModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');

    const subject = encodeURIComponent(`Contact Form Inquiry from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
    const mailtoLink = `mailto:jmenichole007@outlook.com?subject=${subject}&body=${body}`;

    try {
      window.location.href = mailtoLink;
      onClose(); // Close the modal assuming the mail client opened
    } catch (error) {
      console.error("Failed to open mail client:", error);
      alert("Could not automatically open your email client. Please send your message to jmenichole007@outlook.com");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-brand-card border border-white/10 rounded-2xl p-8 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Contact Us</h2>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <input name="name" type="text" placeholder="Your Name" required className="bg-brand-dark/50 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          <input name="email" type="email" placeholder="Your Email" required className="bg-brand-dark/50 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          <textarea name="message" placeholder="Your Message" required rows={4} className="bg-brand-dark/50 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"></textarea>
          <PrimaryButton>Send Message</PrimaryButton>
        </form>
      </div>
    </div>
  );
};


// Admin Login Component
const AdminLogin: React.FC<{ onLogin: (password: string) => void; onBack: () => void }> = ({ onLogin, onBack }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="min-h-screen bg-brand-dark text-gray-300 font-sans flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8 text-white">Admin Access</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4 bg-brand-card p-8 rounded-lg border border-white/10">
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" 
          className="bg-brand-dark/50 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" 
        />
        <PrimaryButton>Login</PrimaryButton>
        <button type="button" onClick={onBack} className="text-center text-gray-400 hover:text-cyan-400 mt-2">Back to site</button>
      </form>
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard: React.FC<{ clicks: { secondary: number }; onGoToMain: () => void }> = ({ clicks, onGoToMain }) => {
  const [announcement, setAnnouncement] = useState('');

  const handleSendAnnouncement = () => {
    if (!announcement.trim()) {
      alert('Announcement message cannot be empty.');
      return;
    }
    alert(`Announcement sent! (Feature not implemented)\n\nMessage: "${announcement}"`);
    setAnnouncement('');
  };

  return (
    <div className="min-h-screen bg-brand-dark text-gray-300 font-sans flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <div className="flex flex-wrap justify-between items-center gap-y-4 mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex gap-4">
            <PrimaryButton onClick={onGoToMain}>Home</PrimaryButton>
            <SecondaryButton onClick={onGoToMain}>Logout</SecondaryButton>
          </div>
        </div>
        
        <div className="bg-brand-card p-6 sm:p-8 rounded-lg border border-white/10 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Button Click Analytics (Session)</h2>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6 max-w-sm mx-auto">
            <div className="bg-brand-dark/50 p-6 rounded-lg">
              <p className="text-gray-400 text-sm">"ADD BOT TO SERVER" Clicks</p>
              <p className="text-4xl sm:text-5xl font-black text-purple-400">{clicks.secondary}</p>
            </div>
          </div>
        </div>

        <div className="bg-brand-card p-6 sm:p-8 rounded-lg border border-white/10">
          <h2 className="text-2xl font-semibold text-white mb-6">Admin Tools</h2>
          <div className="bg-brand-dark/50 p-6 rounded-lg">
            <p className="text-white mb-2 font-semibold">Send Global Announcement</p>
            <p className="text-gray-400 text-sm mb-4">This will send a message to all servers the bot is in. Use with caution.</p>
            <textarea 
              placeholder="Your announcement here..." 
              rows={3} 
              className="w-full bg-brand-dark/50 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-4"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
            ></textarea>
            <PrimaryButton onClick={handleSendAnnouncement}>Send Announcement</PrimaryButton>
          </div>
        </div>

      </div>
    </div>
  );
};

// Pricing Card Component
const PricingCard: React.FC<{ icon: string; title: string; description: string; fee: string; }> = ({ icon, title, description, fee }) => {
  return (
    <div className="bg-brand-card/50 border border-white/10 rounded-2xl p-6 flex flex-col text-left backdrop-blur-sm transition-all duration-300 hover:bg-white/5 hover:-translate-y-1 h-full">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-4xl mb-4" role="img">{icon}</div>
          <h3 className="text-lg font-bold text-white mb-2 tracking-wider">{title}</h3>
        </div>
        <div className="text-2xl font-bold text-cyan-300 whitespace-nowrap ml-4">{fee}</div>
      </div>
      <p className="text-gray-400 leading-relaxed mt-2">{description}</p>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState('main'); // main, admin-login, admin-dashboard
  const [isContactModalOpen, setContactModalOpen] = useState(false);
  const [isPrivacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setTermsModalOpen] = useState(false);
  const [clicks, setClicks] = useState({ secondary: 0 });

  const handleAdminLogin = (password: string) => {
    if (password === 'yourmom1') {
      setView('admin-dashboard');
    } else {
      alert('Incorrect password.');
    }
  };

  const handleSecondaryClick = () => {
    setClicks(prev => ({ ...prev, secondary: prev.secondary + 1 }));
    window.open('https://discord.com/oauth2/authorize?client_id=1373784722718720090', '_blank');
  };

  // --- View Rendering ---
  if (view === 'admin-login') {
    return <AdminLogin onLogin={handleAdminLogin} onBack={() => setView('main')} />;
  }

  if (view === 'admin-dashboard') {
    return <AdminDashboard clicks={clicks} onGoToMain={() => setView('main')} />;
  }
  
  // --- Main View ---
  return (
    <div className="bg-brand-dark text-gray-300 font-sans">
      {isContactModalOpen && <ContactModal onClose={() => setContactModalOpen(false)} />}
      {isPrivacyModalOpen && <PrivacyModal onClose={() => setPrivacyModalOpen(false)} />}
      {isTermsModalOpen && <TermsModal onClose={() => setTermsModalOpen(false)} />}

      <main className="container mx-auto px-4 py-16 sm:py-24">
        {/* Hero Section */}
        <section className="text-center mb-24 relative">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-glow-gradient-purple rounded-full opacity-50 filter blur-3xl"></div>
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-glow-gradient-cyan rounded-full opacity-50 filter blur-3xl"></div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-4 relative z-10">
            JustTheTip
          </h1>
          <div className="w-64 h-48 md:w-80 md:h-60 overflow-hidden mx-auto mb-6 relative z-10">
            <img 
              src="/logo.png" 
              alt="An iceberg logo" 
              className="w-64 h-64 md:w-80 md:h-80 object-contain -translate-y-1/4"
            />
          </div>
          <p className="max-w-2xl mx-auto text-2xl md:text-3xl text-gray-300 mb-6 relative z-10 leading-tight">
            Your Wallet, Your Discord,<br />
            <span className="text-cyan-300">Your Crypto, Your Control.</span>
          </p>
          <p className="max-w-2xl mx-auto text-lg text-gray-400 mb-10 relative z-10">
            Justthetip is a non-custodial helper bot for your external wallets. Tip and airdrop crypto directly in Discord, securely and instantly. No custody, no risk—just the tip!
          </p>
          <div className="flex justify-center items-center gap-4 relative z-10">
            <button
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all duration-200 text-lg"
              onClick={handleSecondaryClick}
            >
              Add to Discord
            </button>
            <button
              className="bg-brand-card/80 border border-cyan-400 text-cyan-300 font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-cyan-900/30 transition-all duration-200 text-lg"
              onClick={() => setContactModalOpen(true)}
            >
              Contact
            </button>
          </div>
        </section>

        {/* Crypto Ticker Section */}
        <CryptoTicker />

        {/* How It Works Section */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-center text-white mb-12 tracking-wide">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <HowItWorksCard
              step={1}
              title="Connect & Register"
              description="Invite JustTheTip to your Discord server and register your external wallet address. No custody, no risk."
              gradient="from-cyan-400 via-blue-500 to-purple-500"
              isHighlighted
            />
            <HowItWorksCard
              step={2}
              title="Tip & Airdrop"
              description="Use simple slash commands to tip, airdrop, or collect crypto. All transactions are off-chain and instant."
              gradient="from-purple-400 via-pink-500 to-cyan-400"
            />
            <HowItWorksCard
              step={3}
              title="Withdraw Anytime"
              description="Withdraw to your own wallet at any time. You always control your funds."
              gradient="from-cyan-400 via-green-400 to-blue-500"
            />
          </div>
        </section>

        {/* Supported Coin Section */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-center text-white mb-12 tracking-wide">Supported Coin</h2>
          <div className="flex flex-wrap justify-center gap-6 max-w-3xl mx-auto">
            <div className="bg-brand-card/70 border border-white/10 rounded-xl px-6 py-4 text-lg font-bold text-white shadow-md">
              SOL
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-center text-white mb-12 tracking-wide">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              icon="�"
              title="Tipping"
              description="Send tips to friends instantly. No fees for internal tips."
              fee="0%"
            />
            <PricingCard
              icon="🎁"
              title="Airdrops"
              description="Create airdrops for your community. Only pay network fees on withdrawal."
              fee="0%"
            />
            <PricingCard
              icon="🚀"
              title="Withdrawals"
              description="Withdraw to your own wallet anytime. Only pay the network fee."
              fee="Network Fee"
            />
          </div>
        </section>
        
        {/* Call to Action Section */}
        <section className="text-center bg-brand-card/50 border border-white/10 rounded-2xl p-12 max-w-4xl mx-auto relative overflow-hidden">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-lg text-gray-300 mb-8">Add JustTheTip to your Discord server and start tipping crypto in seconds.</p>
          <button
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all duration-200 text-lg"
            onClick={handleSecondaryClick}
          >
            Add to Discord
          </button>
        </section>
      </main>

      <Footer 
        onOpenContactModal={() => setContactModalOpen(true)}
        onOpenPrivacyModal={() => setPrivacyModalOpen(true)}
        onOpenTermsModal={() => setTermsModalOpen(true)}
        onGoToAdmin={() => setView('admin-login')}
      />

    </div>
  );
};

export default App;