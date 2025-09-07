
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export const PrimaryButton: React.FC<ButtonProps> = ({ children, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group relative inline-flex items-center justify-center gap-3 px-8 py-3 font-bold text-white rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 transition-all duration-300 hover:from-purple-500 hover:to-cyan-400 hover:shadow-xl hover:shadow-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-brand-dark hover:-translate-y-1"
    >
      <span className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
      <span className="relative">{children}</span>
    </button>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({ children, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group relative p-[2px] rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30 focus:outline-none"
    >
      <span className="flex items-center justify-center gap-3 px-8 py-[10px] font-bold text-gray-200 bg-brand-card rounded-md transition-all duration-300 group-hover:bg-brand-dark group-hover:scale-105">
        {children}
      </span>
    </button>
  );
};
