
import React from 'react';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-brand-card/50 border border-white/10 rounded-2xl p-6 flex flex-col items-start text-left backdrop-blur-sm transition-all duration-300 hover:bg-white/5 hover:-translate-y-1 h-full">
      <div className="text-4xl mb-4" role="img" aria-label={`${title} icon`}>{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2 tracking-wider">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
};
