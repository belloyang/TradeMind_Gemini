
import React, { useState, useEffect } from 'react';
import { BrainCircuit, RefreshCw, Sparkles, Lock } from 'lucide-react';
import { Trade, SubscriptionTier } from '../types';
import { getTradingCoaching } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface AICoachProps {
  trades: Trade[];
  subscriptionTier: SubscriptionTier;
  onUpgradeClick: () => void;
}

const AICoach: React.FC<AICoachProps> = ({ trades, subscriptionTier, onUpgradeClick }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsight = async () => {
    if (subscriptionTier === 'free') return;
    setLoading(true);
    try {
      const result = await getTradingCoaching(trades);
      setInsight(result);
    } catch (error) {
      setInsight("Unable to connect to your AI Coach right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trades.length > 0 && !insight && subscriptionTier === 'pro') {
      fetchInsight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionTier]);

  const isLocked = subscriptionTier === 'free';

  return (
    <div className="relative overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900 p-6 shadow-lg shadow-indigo-100 dark:shadow-none backdrop-blur-sm transition-colors duration-300">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-200/50 dark:bg-indigo-500/10 blur-3xl"></div>
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <BrainCircuit className="h-6 w-6" />
          <h2 className="text-lg font-semibold">AI Trading Coach</h2>
          {isLocked && <span className="rounded bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Pro</span>}
        </div>
        {!isLocked && (
          <button 
            onClick={fetchInsight} 
            disabled={loading}
            className="rounded-full p-2 text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
            title="Refresh Insight"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <div className="relative z-10 mt-4 min-h-[100px]">
        {isLocked ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
             <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
               <Lock className="h-6 w-6 text-zinc-400" />
             </div>
             <div>
               <p className="font-semibold text-zinc-900 dark:text-white">Unlock AI Insights</p>
               <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto mt-1">
                 Get personalized psychological analysis and discipline coaching based on your trade history.
               </p>
             </div>
             <button 
               onClick={onUpgradeClick}
               className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
             >
               Upgrade to Pro
             </button>
          </div>
        ) : loading ? (
          <div className="flex h-full flex-col items-center justify-center space-y-3 py-4">
            <Sparkles className="h-8 w-8 animate-pulse text-indigo-500 dark:text-indigo-400" />
            <p className="text-sm text-zinc-500 dark:text-slate-400">Analyzing your trading patterns...</p>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-zinc-700 dark:text-slate-200 prose-headings:text-zinc-900 dark:prose-headings:text-white prose-strong:text-zinc-900 dark:prose-strong:text-white">
             <ReactMarkdown>{insight || "Log some trades to unlock AI insights."}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICoach;
