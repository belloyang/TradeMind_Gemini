import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Check } from 'lucide-react';
import { DisciplineChecklist } from '../types';

interface DisciplineGuardProps {
  onProceed: (checklist: DisciplineChecklist, score: number) => void;
  onCancel: () => void;
}

const DisciplineGuard: React.FC<DisciplineGuardProps> = ({ onProceed, onCancel }) => {
  const [checks, setChecks] = useState<DisciplineChecklist>({
    strategyMatch: false,
    riskDefined: false,
    sizeWithinLimits: false,
    ivConditionsMet: false,
    emotionalStateCheck: false,
  });

  const toggleCheck = (key: keyof DisciplineChecklist) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <ShieldCheck className="h-8 w-8 text-indigo-500" />
          <h2 className="text-xl font-bold text-white">Discipline Guard</h2>
        </div>
        
        <p className="mb-6 text-center text-sm text-zinc-400">
          Verify your entry rules before logging this trade. 
          <br/>Honesty is key to improvement.
        </p>

        <div className="space-y-3">
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
           <div className="mt-6 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-amber-500">
             <AlertTriangle className="h-5 w-5 shrink-0" />
             <p className="text-xs font-medium">Proceeding with unchecked items will record a rule violation and lower your Discipline Score.</p>
           </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-4">
          <button 
            onClick={onCancel}
            className="rounded-lg border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
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
  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:bg-zinc-800/50 transition-colors">
    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600 bg-zinc-800'}`}>
      {checked && <Check className="h-3 w-3 text-white" />}
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
    <span className={`text-sm ${checked ? 'text-white' : 'text-zinc-400'}`}>{label}</span>
  </label>
);

export default DisciplineGuard;