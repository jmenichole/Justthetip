import React from 'react';

interface FooterProps {
  onOpenContactModal: () => void;
  onGoToAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenContactModal, onGoToAdmin }) => {
  return (
    <footer className="w-full max-w-5xl mx-auto py-8 text-gray-500 border-t border-white/10">
      <div className="flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-8">
        <div className="flex flex-col items-center sm:items-start">
          <p className="text-sm tracking-widest mb-2">PART OF THE <span className="font-bold text-purple-400">TILTCHECK.IT</span> ECOSYSTEM</p>
          <div className="flex justify-center items-center gap-6 sm:gap-8 flex-wrap">
            <a href="https://discord.gg/66gNdYCYZA" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-cyan-300 transition-colors duration-200">
              <span role="img" aria-label="discord">💬</span> Discord
            </a>
            <button onClick={onOpenContactModal} className="flex items-center gap-2 hover:text-cyan-300 transition-colors duration-200">
              <span role="img" aria-label="envelope">✉️</span> Contact Us
            </button>
            <a href="https://github.com/sponsors/jmenichole" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-cyan-300 transition-colors duration-200">
              <span role="img" aria-label="heart">❤️</span> Sponsor
            </a>
          </div>
        </div>
        <div className="text-xs text-gray-600 max-w-xs sm:text-right">
          <p className="mb-2">&copy; {new Date().getFullYear()} Justthetip. All Rights Reserved.</p>
          <p>Disclaimer: This is a non-custodial helper tool. Users are responsible for their own wallet security and transactions.</p>
          <button onClick={onGoToAdmin} className="text-gray-700 hover:text-cyan-400 transition-colors duration-200 mt-2">Admin</button>
        </div>
      </div>
      <p className="text-center text-sm text-gray-400 mt-8">
        made for degens by degens ❤️
      </p>
    </footer>
  );
};
