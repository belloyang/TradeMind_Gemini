import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "h-8 w-8" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      fill="none" 
      strokeWidth="6" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      {/* Brain Left (Logic/Navy) */}
      <path d="M50 85 C40 95 20 95 15 80 C10 65 15 55 20 50 C15 45 10 35 15 25 C20 15 40 15 48 25" stroke="currentColor" className="text-indigo-800 dark:text-indigo-400" />
      
      {/* Brain Right (Creative/Gold) */}
      <path d="M52 25 C60 15 80 15 85 25 C90 35 85 45 80 50 C85 55 90 65 85 80 C80 95 60 95 50 85" stroke="currentColor" className="text-amber-500" />
      
      {/* Center Structure */}
      <path d="M50 25 L50 85" stroke="currentColor" strokeWidth="4" strokeOpacity="0.3" className="text-indigo-900 dark:text-indigo-300" />
      
      {/* Growth Arrow (Chart) */}
      <path d="M30 65 L45 50 L55 60 L75 30" stroke="currentColor" strokeWidth="8" className="text-amber-600 dark:text-amber-400" />
      <path d="M75 30 L65 30 M75 30 L75 40" stroke="currentColor" strokeWidth="8" className="text-amber-600 dark:text-amber-400" />
    </svg>
  );
};

export default Logo;