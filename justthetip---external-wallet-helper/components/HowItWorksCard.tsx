
import React from 'react';

interface HowItWorksCardProps {
  step: number;
  title: string;
  description: string;
  gradient: string;
  isHighlighted?: boolean;
}

export const HowItWorksCard: React.FC<HowItWorksCardProps> = ({ step, title, description, gradient, isHighlighted = false }) => {
  const highlightClass = isHighlighted ? 'shadow-2xl shadow-cyan-500/20' : '';

  return (
    <div className={`p-[2px] rounded-2xl bg-gradient-to-br ${gradient} ${highlightClass} transition-all duration-300 hover:scale-105`}>
      <div className="bg-brand-card rounded-[14px] p-6 h-full flex flex-col text-center items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
        <p className="text-8xl font-black text-white/10 absolute -top-4">{step}</p>
        <div className="z-10 mt-16">
          <h3 className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400 mb-3">
            {title}
          </h3>
          <p className="text-gray-400 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};
