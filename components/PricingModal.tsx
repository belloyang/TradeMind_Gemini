
import React from 'react';
import { X, Check, Zap, BrainCircuit, Cloud, Lock } from 'lucide-react';

interface PricingModalProps {
  onClose: () => void;
  onUpgrade: () => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ onClose, onUpgrade }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shadow-2xl overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-8 text-center">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Upgrade Your Trading</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Unlock AI insights, unlimited history, and cloud sync.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 pt-0">
          {/* Free Plan */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Starter</h3>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">$0 <span className="text-sm font-normal text-zinc-500">/ forever</span></p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                <Check className="h-5 w-5 text-emerald-500" /> Local Storage Only
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                <Check className="h-5 w-5 text-emerald-500" /> Max 30 Trades / Month
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                <Check className="h-5 w-5 text-emerald-500" /> Basic Dashboard
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-400 dark:text-zinc-600">
                <Lock className="h-4 w-4" /> No AI Coach
              </li>
               <li className="flex items-center gap-3 text-sm text-zinc-400 dark:text-zinc-600">
                <Lock className="h-4 w-4" /> No Cloud Sync
              </li>
            </ul>
            <button 
              onClick={onClose}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 py-3 text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Continue Free
            </button>
          </div>

          {/* Pro Plan */}
          <div className="relative rounded-xl border-2 border-indigo-500 bg-white dark:bg-zinc-900 p-6 flex flex-col shadow-xl shadow-indigo-500/10">
            <div className="absolute top-0 right-0 -mt-3 mr-4 rounded-full bg-indigo-500 px-3 py-1 text-xs font-bold text-white uppercase tracking-wide">
              Most Popular
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Pro Trader</h3>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">$19 <span className="text-sm font-normal text-zinc-500">/ month</span></p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                <Cloud className="h-5 w-5 text-indigo-500" /> Secure Cloud Sync & Backup
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                <Zap className="h-5 w-5 text-indigo-500" /> Unlimited Trades
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                <BrainCircuit className="h-5 w-5 text-indigo-500" /> AI Trading Coach
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                <Check className="h-5 w-5 text-indigo-500" /> Advanced Analytics (Calendar/Setup)
              </li>
            </ul>
            <button 
              onClick={onUpgrade}
              className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02]"
            >
              Upgrade Now
            </button>
            <p className="mt-3 text-center text-xs text-zinc-400">7-day money-back guarantee</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
