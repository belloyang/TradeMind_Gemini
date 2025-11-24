import React, { useEffect, useState } from 'react';

const SplashScreen: React.FC = () => {
  const [opacity, setOpacity] = useState('opacity-0');
  const [scale, setScale] = useState('scale-95');

  useEffect(() => {
    // Trigger animation start
    const timer = setTimeout(() => {
      setOpacity('opacity-100');
      setScale('scale-100');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white">
      <div className={`flex flex-col items-center justify-center transition-all duration-1000 ease-out ${opacity} ${scale} px-6 text-center`}>
        
        {/* Logo Animation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 animate-pulse rounded-2xl bg-indigo-600/30 blur-2xl"></div>
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-2xl shadow-indigo-900/50">
            <span className="font-mono text-5xl font-bold text-white">T</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          TradeMind
        </h1>

        {/* Tagline / Description */}
        <div className="mx-auto max-w-lg">
           <p className="text-lg leading-relaxed text-zinc-400">
            Master the markets by mastering yourself—TradeMind is the all-in-one journal designed to keep option traders disciplined and profitable.
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="mt-12 flex gap-1">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.3s]"></div>
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.15s]"></div>
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;