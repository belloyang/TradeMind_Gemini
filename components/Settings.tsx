
import React, { useState } from 'react';
import { 
  RefreshCw, History, AlertTriangle, Wallet, ArrowRight, Calendar, 
  ChevronLeft, X, DollarSign, Hash, Activity, Check, Brain, Target, ShieldAlert, Layers, Download, Upload, FileJson, TrendingDown, Receipt, HelpCircle, Mail, FileText, Shield
} from 'lucide-react';
import { ArchivedSession, Trade, TradeStatus, DisciplineChecklist, UserSettings, UserProfile } from '../types';

interface SettingsProps {
  userProfile: UserProfile;
  onUpdateSettings: (settings: UserSettings) => void;
  onReset: (newCapital: number) => void;
  onImportProfile: (profile: UserProfile) => void;
}

const checklistItems: { key: keyof DisciplineChecklist; label: string }[] = [
  { key: 'maxTradesRespected', label: 'Daily Trade Limit Respected' },
  { key: 'maxRiskRespected', label: 'Risk Limit Respected' },
  { key: 'strategyMatch', label: 'In Strategy Plan' },
  { key: 'ivConditionsMet', label: 'IV Conditions Met' },
  { key: 'emotionalStateCheck', label: 'Emotionally Stable' },
];

const formatContractName = (ticker: string, strike?: number, type?: string, dateStr?: string) => {
  if (!strike || !type || !dateStr) return ticker;
  try {
    const d = new Date(dateStr);
    const yy = d.getFullYear().toString().slice(-2);
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    const typeChar = type.charAt(0).toUpperCase();
    return `${ticker} ${strike}${typeChar} ${yy}${mm}${dd}`;
  } catch (e) {
    return ticker;
  }
};

const HistoricalTradeModal: React.FC<{ trade: Trade; onClose: () => void }> = ({ trade, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 relative text-zinc-900 dark:text-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 px-6 py-6 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
                 {formatContractName(trade.ticker, trade.strikePrice, trade.optionType, trade.expirationDate)}
              </h2>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${trade.status === TradeStatus.OPEN ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-400'}`}>
                {trade.status}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
               <span className={`rounded px-2 py-0.5 font-bold text-white dark:text-zinc-900 ${trade.direction === 'Long' ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'}`}>
                {trade.direction.toUpperCase()}
              </span>
              <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-600 dark:text-zinc-300">{trade.optionType}</span>
              {trade.setup && (
                 <span className="rounded bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 text-indigo-600 dark:text-indigo-300">{trade.setup}</span>
              )}
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(trade.entryDate).toLocaleDateString()}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 p-4">
              <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Net P&L</p>
              <p className={`text-xl font-mono font-bold ${
                (trade.pnl || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (trade.pnl || 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400'
              }`}>
                {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '---'}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 p-4">
              <p className="text-xs text-zinc-500 mb-1">Entry Price</p>
              <p className="text-xl font-mono font-bold text-zinc-900 dark:text-zinc-200">${trade.entryPrice.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 p-4">
              <p className="text-xs text-zinc-500 mb-1">Exit Price</p>
              <p className="text-xl font-mono font-bold text-zinc-900 dark:text-zinc-200">
                {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '---'}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 p-4">
              <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><Hash className="h-3 w-3" /> Quantity</p>
              <p className="text-xl font-mono font-bold text-zinc-900 dark:text-zinc-200">{trade.quantity}</p>
            </div>
          </div>
          
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {/* Fees Card */}
               <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><Receipt className="h-3 w-3" /> Commission / Fees</p>
                    <p className="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-200">${(trade.fees || 0).toFixed(2)}</p>
                  </div>
               </div>
            </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-900/10 p-4 flex flex-col justify-between">
                 <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1 flex items-center gap-1">
                   <Target className="h-3 w-3" /> Target Price
                 </p>
                 <p className="text-xl font-mono font-bold text-zinc-900 dark:text-white">
                   {trade.targetPrice ? `$${trade.targetPrice.toFixed(2)}` : '---'}
                 </p>
              </div>
              <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-900/10 p-4 flex flex-col justify-between">
                 <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mb-1 flex items-center gap-1">
                   <ShieldAlert className="h-3 w-3" /> Stop Loss
                 </p>
                 <p className="text-xl font-mono font-bold text-zinc-900 dark:text-white">
                   {trade.stopLossPrice ? `$${trade.stopLossPrice.toFixed(2)}` : '---'}
                 </p>
              </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
               <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  <Activity className="h-4 w-4 text-indigo-500" /> 
                  Trade Logic & Notes
               </h3>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {trade.notes || "No notes recorded for this trade."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  <Check className="h-4 w-4 text-emerald-500" /> 
                  Entry Checklist
                </h3>
                <div className={`flex items-center gap-1 text-sm font-bold ${
                  trade.disciplineScore === 100 ? 'text-emerald-600 dark:text-emerald-400' : trade.disciplineScore > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  <span>{trade.disciplineScore}%</span>
                </div>
              </div>
              <div className="space-y-3">
                {checklistItems.map((item) => (
                  <div key={item.key} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">{item.label}</span>
                    {trade.checklist[item.key] ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <X className="h-4 w-4 text-rose-500" />
                    )}
                  </div>
                ))}
              </div>
              {trade.violationReason && (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 p-3">
                   <div className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
                     <AlertTriangle className="h-4 w-4 shrink-0" />
                     <p>{trade.violationReason}</p>
                   </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                <Brain className="h-4 w-4 text-purple-500" /> 
                Psychology
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Entry State</p>
                  <div className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {trade.entryEmotion}
                  </div>
                </div>
                {trade.exitEmotion && (
                   <div>
                    <p className="text-xs text-zinc-500 mb-1">Exit State</p>
                    <div className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300">
                      {trade.exitEmotion}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Settings: React.FC<SettingsProps> = ({ 
  userProfile,
  onUpdateSettings,
  onReset,
  onImportProfile
}) => {
  const { trades, initialCapital, startDate, archives, settings: userSettings } = userProfile;
  const currentTotalPnL = trades.filter(t => t.pnl !== undefined).reduce((sum, t) => sum + (t.pnl || 0), 0);
  const currentBalance = initialCapital + currentTotalPnL;
  
  const [newCapital, setNewCapital] = useState<string>(initialCapital.toString());
  const [showConfirm, setShowConfirm] = useState(false);
  const [viewingArchive, setViewingArchive] = useState<ArchivedSession | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleReset = () => {
    onReset(parseFloat(newCapital) || 0);
    setShowConfirm(false);
  };

  const handleExportCSV = () => {
    if (trades.length === 0) {
      alert("No trades to export.");
      return;
    }
    const headers = ["Date", "Ticker", "Direction", "Type", "Strike", "Expiration", "Setup", "Entry Price", "Exit Price", "Quantity", "Fees", "P&L", "Status", "Notes", "Entry Emotion", "Discipline Score"];
    const csvContent = [
      headers.join(','),
      ...trades.map(t => {
        const date = new Date(t.entryDate).toLocaleDateString();
        const cleanNotes = (t.notes || '').replace(/"/g, '""');
        return [date, t.ticker, t.direction, t.optionType, t.strikePrice || '', t.expirationDate || '', t.setup || '', t.entryPrice, t.exitPrice || '', t.quantity, t.fees || 0, t.pnl || '', t.status, `"${cleanNotes}"`, t.entryEmotion, t.disciplineScore].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trademind_history_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportBackup = () => {
    const dataStr = JSON.stringify(userProfile, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trademind_backup_${userProfile.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        onImportProfile(json);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  if (viewingArchive) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-right-4">
        {selectedTrade && <HistoricalTradeModal trade={selectedTrade} onClose={() => setSelectedTrade(null)} />}
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setViewingArchive(null)} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Session History</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{new Date(viewingArchive.startDate).toLocaleDateString()} — {new Date(viewingArchive.endDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { l: 'Initial Capital', v: viewingArchive.initialCapital },
            { l: 'Final Balance', v: viewingArchive.finalBalance, c: viewingArchive.finalBalance >= viewingArchive.initialCapital ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400' },
            { l: 'Total Trades', v: viewingArchive.tradeCount, f: false },
            { l: 'Net P&L', v: viewingArchive.totalPnL, c: viewingArchive.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400', pnl: true }
          ].map((item: any) => (
             <div key={item.l} className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
                <p className="text-xs text-zinc-500 mb-1">{item.l}</p>
                <p className={`text-lg font-mono font-bold ${item.c || 'text-zinc-900 dark:text-zinc-200'}`}>
                  {item.pnl && item.v > 0 ? '+' : ''}{item.f === false ? item.v : `$${item.v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
             </div>
          ))}
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm">
           <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Contract / Ticker</th>
                <th className="px-6 py-4">Side</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {viewingArchive.trades.map((trade) => (
                <tr key={trade.id} onClick={() => setSelectedTrade(trade)} className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-300">{new Date(trade.entryDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{formatContractName(trade.ticker, trade.strikePrice, trade.optionType, trade.expirationDate)}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300"><span className={`inline-block rounded px-2 py-1 text-xs font-bold ${trade.direction === 'Long' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'}`}>{trade.direction.toUpperCase()}</span></td>
                   <td className="px-6 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${trade.status === TradeStatus.OPEN ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-400'}`}>{trade.status}</span></td>
                  <td className={`px-6 py-4 text-right font-mono font-medium ${(trade.pnl || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (trade.pnl || 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500'}`}>{trade.pnl ? `${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '-'}</td>
                </tr>
              ))}
            </tbody>
           </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="h-6 w-6 text-indigo-500" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Account Settings</h2>
      </div>

      {/* Support & Compliance Section */}
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-900/10 p-6 shadow-sm">
         <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200 mb-4 flex items-center gap-2">
           <HelpCircle className="h-5 w-5" /> Support & Compliance
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
               <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Need Help?</h4>
               <p className="text-xs text-zinc-500 dark:text-zinc-400">Our support team is available M-F 9am-5pm EST.</p>
               <a 
                 href="mailto:by.business@outlook.com?subject=TradeMind Support Request" 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
               >
                 <Mail className="h-4 w-4" /> Contact Support
               </a>
            </div>
            <div className="space-y-3">
               <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Legal Resources</h4>
               <div className="flex flex-col gap-2">
                 <a href="#" title="Placeholder for Beta - No real terms yet" className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                    <FileText className="h-4 w-4" /> Terms of Service
                 </a>
                 <a href="#" title="Placeholder for Beta - No real policy yet" className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                    <Shield className="h-4 w-4" /> Privacy Policy
                 </a>
               </div>
            </div>
         </div>
      </div>

      {/* Risk Configuration */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Risk Management Defaults</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Set your default profit targets, stop losses, and trade limits.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-2"><Target className="h-3 w-3" /> Default Profit Target (%)</label>
            <div className="relative">
              <input type="number" value={userSettings.defaultTargetPercent} onChange={(e) => onUpdateSettings({...userSettings, defaultTargetPercent: parseFloat(e.target.value)})} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-2"><ShieldAlert className="h-3 w-3" /> Default Stop Loss (%)</label>
            <div className="relative">
              <input type="number" value={userSettings.defaultStopLossPercent} onChange={(e) => onUpdateSettings({...userSettings, defaultStopLossPercent: parseFloat(e.target.value)})} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
            </div>
          </div>
          <div>
             <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-2"><TrendingDown className="h-3 w-3" /> Max Risk Per Trade (%)</label>
             <div className="relative">
                <input type="number" step="0.5" value={userSettings.maxRiskPerTradePercent} onChange={(e) => onUpdateSettings({...userSettings, maxRiskPerTradePercent: parseFloat(e.target.value)})} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
             </div>
             <p className="text-[10px] text-zinc-500 mt-1">Warns if risk > % of Balance</p>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-2"><Layers className="h-3 w-3" /> Max Trades Per Day</label>
            <div className="relative">
              <input type="number" min="0.5" step="0.5" value={userSettings.maxTradesPerDay} onChange={(e) => onUpdateSettings({...userSettings, maxTradesPerDay: parseFloat(e.target.value)})} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Open/Close = 0.5 each</p>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Data Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-3">
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Backup & History</h4>
              <p className="text-xs text-zinc-500">Download your data to prevent loss or to analyze in other tools.</p>
              <div className="flex flex-col gap-2">
                 <button onClick={handleExportBackup} className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <span className="flex items-center gap-2"><FileJson className="h-4 w-4" /> Download Full Backup (JSON)</span>
                  <Download className="h-4 w-4 text-zinc-500" />
                </button>
                <button onClick={handleExportCSV} className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Export Trade History (CSV)</span>
                  <Download className="h-4 w-4 text-zinc-500" />
                </button>
              </div>
           </div>

           <div className="space-y-3">
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Restore Data</h4>
              <p className="text-xs text-zinc-500">Restore a previously saved JSON backup file. <span className="text-rose-500">Warning: Overwrites current profile.</span></p>
              <div className="relative">
                 <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileChange} className="hidden" id="restore-upload" />
                 <label htmlFor="restore-upload" className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/30 px-4 py-8 text-sm text-zinc-500 dark:text-zinc-400 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                   <Upload className="h-5 w-5" />
                   <span>Click to Upload Backup JSON</span>
                 </label>
              </div>
           </div>
        </div>
      </div>

      {/* Current Session Manager */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Current Session Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Started On</p>
            <p className="text-sm font-mono text-zinc-900 dark:text-zinc-200">{new Date(startDate).toLocaleDateString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total Trades</p>
            <p className="text-sm font-mono text-zinc-900 dark:text-zinc-200">{trades.length}</p>
          </div>
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Current Balance</p>
            <p className={`text-sm font-mono font-bold ${currentBalance >= initialCapital ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Reset Journal & Account
          </h4>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-2xl">
            This will archive all current trades into history and start a fresh journal with a new initial capital. 
          </p>

          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="w-full sm:w-64">
              <label className="block text-xs text-zinc-500 mb-2">New Starting Balance</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input 
                  type="number" 
                  value={newCapital}
                  onChange={(e) => setNewCapital(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 pl-7 pr-4 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g. 10000"
                />
              </div>
            </div>
            
            {!showConfirm ? (
              <button onClick={() => setShowConfirm(true)} className="w-full sm:w-auto px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors border border-zinc-200 dark:border-zinc-700">
                Reset Account
              </button>
            ) : (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4">
                 <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-sm">Cancel</button>
                <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-rose-900/20">
                  <AlertTriangle className="h-4 w-4" /> Confirm Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History / Archives */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 px-1">
          <History className="h-5 w-5" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Historical Logs</h3>
        </div>

        {archives.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-8 text-center text-zinc-500">
            <p>No archived sessions yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {archives.map((session) => (
              <div 
                key={session.id} 
                onClick={() => setViewingArchive(session)}
                className="group cursor-pointer rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">
                        {new Date(session.startDate).toLocaleDateString()} — {new Date(session.endDate).toLocaleDateString()}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1">{session.tradeCount} trades logged</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 md:gap-12 pl-14 md:pl-0">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Starting Balance</p>
                      <p className="font-mono text-zinc-500 dark:text-zinc-400">${session.initialCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-400 dark:text-zinc-600 hidden md:block" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Final Balance</p>
                      <p className={`font-mono font-bold ${session.finalBalance >= session.initialCapital ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        ${session.finalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                     <div className="text-right min-w-[80px]">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Net P&L</p>
                      <p className={`font-mono font-bold ${session.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {session.totalPnL > 0 ? '+' : ''}${session.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
