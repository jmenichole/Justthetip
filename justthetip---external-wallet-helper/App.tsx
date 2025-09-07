
import React, { useState } from 'react';
import { HowItWorksCard } from './components/HowItWorksCard';
import { PrimaryButton, SecondaryButton } from './components/Buttons';
import { Footer } from './components/Footer';
import { FeatureCard } from './components/FeatureCard';
import { Logo } from './components/Logo';
import { CryptoTicker } from './components/CryptoTicker';

// --- NEW COMPONENTS ---

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

      <main className="container mx-auto px-4 py-16 sm:py-24">
        
        {/* Hero Section */}
        <section className="text-center mb-24 relative">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-glow-gradient-purple rounded-full opacity-50 filter blur-3xl"></div>
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-glow-gradient-cyan rounded-full opacity-50 filter blur-3xl"></div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-4 relative z-10">
            <span className="text-cyan-300">Just</span><span className="text-purple-400">TheTip</span>
          </h1>

          <div className="w-64 h-48 md:w-80 md:h-60 overflow-hidden mx-auto mb-6 relative z-10">
            <img 
              src="/logo.png" 
              alt="An iceberg logo" 
              className="w-64 h-64 md:w-80 md:h-80 object-contain -translate-y-1/4"
            />
          </div>

          <p className="max-w-2xl mx-auto text-2xl md:text-3xl text-gray-300 mb-6 relative z-10 leading-tight">
            Your Wallet, Your Discord,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-bold">Supercharged.</span>
          </p>
          <p className="max-w-2xl mx-auto text-lg text-gray-400 mb-10 relative z-10">
            Justthetip is a non-custodial helper bot for your external wallets. Tip and airdrop crypto directly in Discord, securely.
          </p>
          <div className="flex justify-center items-center gap-4 relative z-10">
            <SecondaryButton onClick={handleSecondaryClick}>
              ADD BOT TO SERVER
            </SecondaryButton>
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
              title="CONNECT"
              description="Securely link your existing wallet via WalletConnect. We never see your private keys."
              gradient="from-cyan-500/50 to-transparent"
            />
            <HowItWorksCard
              step={2}
              title="VERIFY"
              description="The bot assigns you roles based on the tokens you hold, unlocking exclusive channels."
              gradient="from-purple-500/50 to-transparent"
              isHighlighted
            />
            <HowItWorksCard
              step={3}
              title="ENGAGE"
              description="Use simple slash commands to tip, airdrop, or check balances directly in your server."
              gradient="from-cyan-500/50 to-transparent"
            />
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-24">
           <h2 className="text-4xl font-bold text-center text-white mb-12 tracking-wide">Next-Gen Helper Features</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
             <FeatureCard 
               icon="💸"
               title="Seamless Tipping"
               description="Send crypto to any Discord user with a simple @mention. It's the ultimate social payment experience."
             />
             <FeatureCard 
               icon="🎁"
               title="Effortless Airdrops"
               description="Reward your community by airdropping tokens to specific roles with a single command."
             />
             <FeatureCard 
               icon="🛡️"
               title="Role-Based Access"
               description="Grant exclusive channel access and permissions based on wallet contents (Token Gating)."
             />
             <FeatureCard 
               icon="📊"
               title="In-Discord Dashboard"
               description="Use slash commands to view your wallet balance and recent transactions without leaving Discord."
             />
             <FeatureCard 
               icon="🤖"
               title="Non-Custodial Security"
               description="Your keys, your crypto. We never have access to your funds. All transactions are signed by you."
             />
           </div>
        </section>

        {/* Pricing Section */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-center text-white mb-12 tracking-wide">Transparent Fees</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <PricingCard 
              icon="💰"
              title="Tipping"
              description="A small, dynamic network fee is applied to cover gas costs for on-chain transactions."
              fee="Network Fee"
            />
            <PricingCard 
              icon="🚀"
              title="Airdrops & Utility"
              description="A flat 0.5% service fee is taken on the total value of mass distributions and other utility functions."
              fee="0.5%"
            />
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="text-center bg-brand-card/50 border border-white/10 rounded-2xl p-12 max-w-4xl mx-auto relative overflow-hidden">
           <div className="absolute -top-20 -left-20 w-60 h-60 bg-glow-gradient-cyan rounded-full opacity-30 filter blur-3xl"></div>
           <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-glow-gradient-purple rounded-full opacity-30 filter blur-3xl"></div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative z-10">Ready to Level Up Your Server?</h2>
          <p className="max-w-xl mx-auto text-gray-400 mb-8 relative z-10">
            Add the Justthetip bot and unlock a new dimension of web3 community engagement.
          </p>
          <div className="relative z-10">
            <SecondaryButton onClick={handleSecondaryClick}>
               <span role="img" aria-label="rocket" className="mr-2">🚀</span> ADD BOT TO SERVER
            </SecondaryButton>
          </div>
        </section>
      </main>

      <Footer 
        onOpenContactModal={() => setContactModalOpen(true)}
        onGoToAdmin={() => setView('admin-login')}
      />

    </div>
  );
};

export default App;