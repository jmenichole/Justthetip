
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
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-glow-gradient-green rounded-full opacity-50 filter blur-3xl"></div>
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-glow-gradient-purple rounded-full opacity-50 filter blur-3xl"></div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 relative z-10">
            <span className="text-accent-primary">JustThe</span><span className="text-accent-secondary">Tip</span>
          </h1>

          <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 relative z-10 bg-brand-card border border-brand-border rounded-xl flex items-center justify-center">
            <span className="text-4xl md:text-5xl text-accent-primary font-mono">⚡</span>
          </div>

          <p className="max-w-2xl mx-auto text-2xl md:text-3xl text-gray-300 mb-6 relative z-10 leading-tight">
            Your Smart Contract SDK for
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary font-bold font-mono">Solana-Powered Discord Bots</span>
          </p>
          <p className="max-w-2xl mx-auto text-lg text-gray-400 mb-10 relative z-10">
            Build non-custodial Discord bots with smart contracts. Tip and airdrop tokens through Program Derived Addresses.
          </p>
          <div className="flex justify-center items-center gap-4 relative z-10">
            <button
              className="bg-accent-primary hover:bg-accent-primary/90 text-black font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-200 text-lg"
              onClick={handleSecondaryClick}
            >
              Deploy Smart Contract Bot
            </button>
          </div>
        </section>

        {/* Crypto Ticker Section */}
        <CryptoTicker />

        {/* How It Works Section */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-center text-white mb-12 tracking-wide">Smart Contract Architecture</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <HowItWorksCard
              step={1}
              title="DEPLOY CONTRACTS"
              description="Deploy your smart contracts with Program Derived Addresses for user account management."
              gradient="from-accent-primary/50 to-transparent"
            />
            <HowItWorksCard
              step={2}
              title="INTEGRATE SDK"
              description="Use our JavaScript SDK to interact with smart contracts directly from Discord commands."
              gradient="from-accent-secondary/50 to-transparent"
              isHighlighted
            />
            <HowItWorksCard
              step={3}
              title="NON-CUSTODIAL TIPS"
              description="Users tip directly through smart contract calls. No private key management required."
              gradient="from-accent-tertiary/50 to-transparent"
            />
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-24">
           <h2 className="text-4xl font-bold text-center text-white mb-12 tracking-wide">Developer-First SDK Features</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
             <FeatureCard 
               icon="⚡"
               title="Smart Contract Tipping"
               description="Execute tip transactions through smart contracts with automatic PDA generation and management."
             />
             <FeatureCard 
               icon="🔗"
               title="Program Derived Addresses"
               description="Automatically generate and manage PDAs for each Discord user without exposing private keys."
             />
             <FeatureCard 
               icon="📦"
               title="TypeScript SDK"
               description="Fully typed JavaScript/TypeScript SDK with comprehensive documentation and examples."
             />
             <FeatureCard 
               icon="🛠️"
               title="Custom Instructions"
               description="Build custom smart contract instructions for advanced Discord bot functionality."
             />
             <FeatureCard 
               icon="🔒"
               title="Zero Private Keys"
               description="Never handle private keys. All transactions are executed through smart contract calls."
             />
           </div>
        </section>

        {/* Solana Focus Section */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-center text-white mb-12 tracking-wide">Built for Solana</h2>
          <div className="flex justify-center">
            <div className="bg-brand-card/70 border border-accent-primary/20 rounded-xl px-8 py-6 text-center">
              <div className="text-4xl mb-4">◎</div>
              <div className="text-2xl font-bold text-accent-primary mb-2">SOL & SPL Tokens</div>
              <div className="text-gray-400">Native Solana Program integration with smart contract architecture</div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-center text-white mb-12 tracking-wide">Smart Contract Costs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <PricingCard 
              icon="⛽"
              title="Transaction Fees"
              description="Standard Solana network fees for smart contract execution. Typically ~0.000005 SOL per transaction."
              fee="~0.000005 SOL"
            />
            <PricingCard 
              icon="🔧"
              title="SDK Usage"
              description="The JustTheTip SDK is completely free to use. Deploy unlimited smart contract bots."
              fee="Free"
            />
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="text-center bg-brand-card/50 border border-brand-border rounded-2xl p-12 max-w-4xl mx-auto relative overflow-hidden">
           <div className="absolute -top-20 -left-20 w-60 h-60 bg-glow-gradient-green rounded-full opacity-30 filter blur-3xl"></div>
           <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-glow-gradient-purple rounded-full opacity-30 filter blur-3xl"></div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative z-10">Ready to Build Smart Contract Bots?</h2>
          <p className="max-w-xl mx-auto text-gray-400 mb-8 relative z-10">
            Deploy your first smart contract Discord bot and enable non-custodial tipping in minutes.
          </p>
          <div className="relative z-10">
            <button
              className="bg-accent-primary hover:bg-accent-primary/90 text-black font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-200 text-lg"
              onClick={handleSecondaryClick}
            >
               <span role="img" aria-label="rocket" className="mr-2">⚡</span> Get Started with SDK
            </button>
          </div>
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