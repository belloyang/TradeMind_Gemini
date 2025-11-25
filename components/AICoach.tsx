import React, { useState, useEffect } from 'react';
import { BrainCircuit, RefreshCw, Sparkles } from 'lucide-react';
import { Trade } from '../types';
import { getTradingCoaching } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface AICoachProps {
  trades: Trade[];
}

const AICoach: React.FC<AICoachProps> = ({ trades }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsight = async () => {
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
    if (trades.length > 0 && !insight) {
      fetchInsight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900 p-6 shadow-lg shadow-indigo-100 dark:shadow-none backdrop-blur-sm transition-colors duration-300">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-200/50 dark:bg-indigo-500/10 blur-3xl"></div>
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <BrainCircuit className="h-6 w-6" />
          <h2 className="text-lg font-semibold">AI Trading Coach</h2>
        </div>
        <button 
          onClick={fetchInsight} 
          disabled={loading}
          className="rounded-full p-2 text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
          title="Refresh Insight"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="relative z-10 mt-4 min-h-[100px]">
        {loading ? (
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