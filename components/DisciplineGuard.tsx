import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Check, X } from 'lucide-react';
import { DisciplineChecklist } from '../types';

interface DisciplineGuardProps {
  onProceed: (checklist: DisciplineChecklist, score: number) => void;
  onCancel: () => void;
  currentDailyTrades: number;
  maxDailyTrades: number;
}

const DisciplineGuard: React.FC<DisciplineGuardProps> = ({ onProceed, onCancel, currentDailyTrades, maxDailyTrades }) => {
  const isMaxTradesRespected = (currentDailyTrades + 0.5) <= maxDailyTrades;

  const [checks, setChecks] = useState<DisciplineChecklist>({
    strategyMatch: false,
    riskDefined: false,
    sizeWithinLimits: false,
    ivConditionsMet: false,
    emotionalStateCheck: false,
    maxTradesRespected: isMaxTradesRespected,
  });

  const toggleCheck = (key: keyof DisciplineChecklist) => {
    if (key === 'maxTradesRespected') return;
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const calculateScore = () => {
    const values = Object.values(checks);
    const trueCount = values.filter(Boolean).length;
    return Math.round((trueCount / values.length) * 100);
  };

  const handleProceed = () => {
    onProceed(checks, calculateScore());
  };

  const allChecked = Object.values(checks).every(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-2xl transition-colors">
        <div className="mb-6 flex items-center justify-center gap-3">
          <ShieldCheck className="h-8 w-8 text-indigo-600 dark:text-indigo-500" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Discipline Guard</h2>
        </div>
        
        <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Verify your entry rules before logging this trade. 
          <br/>Honesty is key to improvement.
        </p>

        <div className="space-y-3">
           {/* Automatic System Check */}
          <div className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
            isMaxTradesRespected 
              ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50' 
              : 'border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/10'
          }`}>
            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
              isMaxTradesRespected ? 'border-emerald-500 bg-emerald-500' : 'border-rose-500 bg-rose-500'
            }`}>
              {isMaxTradesRespected ? <Check className="h-3 w-3 text-white" /> : <X className="h-3 w-3 text-white" />}
            </div>
            <div className="flex-1">
              <span className={`text-sm block ${isMaxTradesRespected ? 'text-zinc-700 dark:text-zinc-300' : 'text-rose-600 dark:text-rose-400 font-medium'}`}>
                I haven't reached the max trade of the day
              </span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">
                Current: <span className="text-zinc-900 dark:text-white font-mono">{currentDailyTrades}</span> / Limit: <span className="text-zinc-900 dark:text-white font-mono">{maxDailyTrades}</span>
              </span>
            </div>
            {!isMaxTradesRespected && (
               <div title="Daily Limit Exceeded">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
               </div>
            )}
          </div>

          {/* Manual Checks */}
          <CheckItem 
            label="Is this trade in my written strategy plan?" 
            checked={checks.strategyMatch} 
            onChange={() => toggleCheck('strategyMatch')} 
          />
          <CheckItem 
            label="Is my risk strictly defined (Stop/Max Loss)?" 
            checked={checks.riskDefined} 
            onChange={() => toggleCheck('riskDefined')} 
          />
          <CheckItem 
            label="Is position size within my % rules?" 
            checked={checks.sizeWithinLimits} 
            onChange={() => toggleCheck('sizeWithinLimits')} 
          />
          <CheckItem 
            label="Are IV / Market conditions favorable?" 
            checked={checks.ivConditionsMet} 
            onChange={() => toggleCheck('ivConditionsMet')} 
          />
          <CheckItem 
            label="Am I calm, grounded, and not trading emotionally?" 
            checked={checks.emotionalStateCheck} 
            onChange={() => toggleCheck('emotionalStateCheck')} 
          />
        </div>

        {!allChecked && (
           <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3 text-amber-600 dark:text-amber-500">
             <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
             <div>
                <p className="text-xs font-medium">Proceeding with unchecked items will record a rule violation.</p>
                {!isMaxTradesRespected && (
                   <p className="text-[10px] mt-1 opacity-80">
                     Note: You have exceeded your daily trade limit.
                   </p>
                )}
             </div>
           </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-4">
          <button 
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleProceed}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              allChecked 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {allChecked ? 'Approve Trade' : 'Log Violation & Trade'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CheckItem: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors">
    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'}`}>
      {checked && <Check className="h-3 w-3 text-white" />}
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
    <span className={`text-sm ${checked ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>{label}</span>
  </label>
);

export default DisciplineGuard;