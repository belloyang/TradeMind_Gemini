
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, DollarSign, Hash, Activity, Brain, Check, AlertTriangle, Clock, Edit2, Trash2, StopCircle, RefreshCcw, Search, Loader2, Target, ShieldAlert, PartyPopper, ThumbsUp, Tag, Zap, Eye, EyeOff } from 'lucide-react';
import { Trade, TradeDirection, OptionType, Emotion, DisciplineChecklist, TradeStatus, UserSettings } from '../types';
import { DIRECTIONS, OPTION_TYPES, EMOTIONS, POPULAR_TICKERS, COMMON_SETUPS } from '../constants';
import DisciplineGuard from './DisciplineGuard';
import { getPriceEstimate, getCurrentVix } from '../services/geminiService';

interface TradeJournalProps {
  trades: Trade[];
  userSettings: UserSettings;
  initialCapital: number;
  onAddTrade: (trade: Trade) => void;
  onUpdateTrade: (trade: Trade) => void;
  onDeleteTrade: (tradeId: string) => void;
}

// Helper to get local ISO string for datetime-local input
// This ensures the input shows the user's actual wall-clock time, not UTC
const toLocalISOString = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000; // offset in milliseconds
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
};

// Formats trade into: SPY 510C 251118
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

// Helper to determine trade outcome status icon
const getOutcomeIcon = (trade: Trade) => {
  if (trade.status === TradeStatus.OPEN || !trade.exitPrice || !trade.entryPrice) return null;

  const directionMultiplier = trade.direction === TradeDirection.LONG ? 1 : -1;
  const percentChange = ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100 * directionMultiplier;

  if (trade.stopLossPrice && (
    (trade.direction === TradeDirection.LONG && trade.exitPrice <= trade.stopLossPrice) ||
    (trade.direction === TradeDirection.SHORT && trade.exitPrice >= trade.stopLossPrice)
  )) {
    return (
      <div title={`Stop Loss Violation (${percentChange.toFixed(1)}%)`} className="flex items-center justify-center rounded-full bg-rose-500/10 p-1">
        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
      </div>
    );
  }

  if (trade.targetPrice && (
    (trade.direction === TradeDirection.LONG && trade.exitPrice >= trade.targetPrice) ||
    (trade.direction === TradeDirection.SHORT && trade.exitPrice <= trade.targetPrice)
  )) {
    return (
      <div title={`Target Hit! (${percentChange.toFixed(1)}%)`} className="flex items-center justify-center rounded-full bg-emerald-500/10 p-1">
        <PartyPopper className="h-3.5 w-3.5 text-emerald-500" />
      </div>
    );
  }

  if (percentChange >= -10 && percentChange <= 20) {
    return (
      <div title={`Neutral / Scratch Trade (${percentChange.toFixed(1)}%)`} className="flex items-center justify-center rounded-full bg-zinc-500/10 dark:bg-zinc-700/50 p-1">
        <ThumbsUp className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
      </div>
    );
  }

  return null;
};

const TradeDetailsModal: React.FC<{ 
  trade: Trade; 
  allTrades: Trade[]; 
  userSettings: UserSettings;
  initialCapital: number;
  onClose: () => void; 
  onUpdate: (trade: Trade) => void;
  onDelete: () => void; 
  initialIsEditing?: boolean;
}> = ({ trade, allTrades, userSettings, initialCapital, onClose, onUpdate, onDelete, initialIsEditing = false }) => {
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [editForm, setEditForm] = useState<Trade>(trade);
  
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quickExitPrice, setQuickExitPrice] = useState<string>('');

  const [checkingPrice, setCheckingPrice] = useState(false);
  const [marketData, setMarketData] = useState<{ text: string; price?: number; sources?: {title: string, uri: string}[] } | null>(null);

  const [setupSuggestions, setSetupSuggestions] = useState<string[]>([]);
  const [showSetupSuggestions, setShowSetupSuggestions] = useState(false);

  const availableSetups: string[] = Array.from(new Set([
    ...COMMON_SETUPS,
    ...allTrades.map(t => t.setup).filter((s): s is string => !!s)
  ])).sort();

  const checklistItems: { key: keyof DisciplineChecklist; label: string }[] = [
    { key: 'maxTradesRespected', label: 'Daily Trade Limit Respected' },
    { key: 'maxRiskRespected', label: 'Risk Limit Respected' },
    { key: 'strategyMatch', label: 'In Strategy Plan' },
    { key: 'riskDefined', label: 'Risk Defined' },
    { key: 'ivConditionsMet', label: 'IV Conditions Met' },
    { key: 'emotionalStateCheck', label: 'Emotionally Stable' },
  ];

  // Risk Violation Check
  const realizedPnL = useMemo(() => allTrades.reduce((sum, t) => sum + (t.pnl || 0), 0), [allTrades]);
  const currentBalance = initialCapital + realizedPnL;
  const maxRiskAmount = currentBalance * (userSettings.maxRiskPerTradePercent / 100);
  
  const tradeRiskPerShare = trade.stopLossPrice ? Math.abs(trade.entryPrice - trade.stopLossPrice) : 0;
  const tradeRiskTotal = tradeRiskPerShare * trade.quantity * 100; // Options multiplier
  const isRiskViolation = trade.stopLossPrice && tradeRiskTotal > maxRiskAmount;


  useEffect(() => {
    // Sync editForm with trade when trade updates (e.g. after save)
    setEditForm(trade);
  }, [trade]);

  useEffect(() => {
    if (isEditing && editForm.entryPrice) {
      const entry = editForm.entryPrice;
      const targetPct = userSettings.defaultTargetPercent / 100;
      const stopPct = userSettings.defaultStopLossPercent / 100;
      
      let target, stop;
      if (editForm.direction === TradeDirection.SHORT) {
        target = entry * (1 - targetPct);
        stop = entry * (1 + stopPct);
      } else {
        target = entry * (1 + targetPct);
        stop = entry * (1 - stopPct);
      }
      // Only set if not already set to avoid overwriting user manual edits during form interaction
      setEditForm(prev => ({
          ...prev,
          targetPrice: prev.targetPrice || parseFloat(target.toFixed(2)),
          stopLossPrice: prev.stopLossPrice || parseFloat(stop.toFixed(2))
      }));
    }
  }, [editForm.entryPrice, editForm.direction, isEditing, userSettings]);

  const getDailyActivityCount = (dateStr: string, excludeTradeId: string) => {
    const targetDate = new Date(dateStr).toDateString();
    let count = 0;
    allTrades.forEach(t => {
       if (t.id === excludeTradeId) return;
       if (new Date(t.entryDate).toDateString() === targetDate) count += 0.5;
       if (t.exitDate && new Date(t.exitDate).toDateString() === targetDate) count += 0.5;
    });
    return count;
  };

  const entryDateActivity = getDailyActivityCount(editForm.entryDate, trade.id);
  const exitDateActivity = editForm.exitDate ? getDailyActivityCount(editForm.exitDate, trade.id) : 0;
  
  const isEntryViolation = (entryDateActivity + 0.5) > userSettings.maxTradesPerDay;
  const isExitViolation = editForm.exitDate && (exitDateActivity + 0.5) > userSettings.maxTradesPerDay;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedTrade = { ...editForm };

    if (updatedTrade.status === TradeStatus.CLOSED) {
        // Validation: Exit Price is required for Closed trades
        if (updatedTrade.exitPrice === undefined || updatedTrade.exitPrice === null || Number.isNaN(updatedTrade.exitPrice)) {
            alert("Please enter an Exit Price to close this trade.");
            return;
        }

        // Force calculation if exit price is set
        if (updatedTrade.exitPrice !== undefined && updatedTrade.entryPrice !== undefined) {
             const directionMultiplier = updatedTrade.direction === TradeDirection.LONG ? 1 : -1;
             updatedTrade.pnl = (updatedTrade.exitPrice - updatedTrade.entryPrice) * updatedTrade.quantity * 100 * directionMultiplier;
        }
        // Ensure exit date exists
        if (!updatedTrade.exitDate) {
            updatedTrade.exitDate = new Date().toISOString();
        }
    } else {
        // Status is OPEN, clear exit data to ensure consistency
        updatedTrade.pnl = undefined;
        updatedTrade.exitPrice = undefined;
        updatedTrade.exitDate = undefined;
        updatedTrade.exitEmotion = undefined;
    }

    onUpdate(updatedTrade);
    setIsEditing(false);
  };

  const handleClosePosition = () => {
    setEditForm({
      ...editForm,
      status: TradeStatus.CLOSED,
      exitPrice: undefined, // Force user to enter
      exitDate: new Date().toISOString()
    });
    setIsEditing(true);
  };

  const handleStatusClick = () => {
    if (isEditing) return;
    setQuickExitPrice(trade.entryPrice ? trade.entryPrice.toString() : '');
    setShowStatusConfirm(true);
  };

  const confirmStatusChange = () => {
    const newStatus = trade.status === TradeStatus.OPEN ? TradeStatus.CLOSED : TradeStatus.OPEN;
    let updatedTrade = { ...trade, status: newStatus };

    if (newStatus === TradeStatus.CLOSED) {
      const exitPrice = parseFloat(quickExitPrice);
      if (isNaN(exitPrice)) {
        alert("Please enter a valid exit price.");
        return;
      }
      updatedTrade.exitPrice = exitPrice;
      updatedTrade.exitDate = new Date().toISOString();
      const directionMultiplier = trade.direction === TradeDirection.LONG ? 1 : -1;
      updatedTrade.pnl = (exitPrice - trade.entryPrice) * trade.quantity * 100 * directionMultiplier;
      updatedTrade.exitEmotion = trade.exitEmotion || Emotion.CALM;
    } else {
      updatedTrade.exitPrice = undefined;
      updatedTrade.exitDate = undefined;
      updatedTrade.pnl = undefined;
      updatedTrade.exitEmotion = undefined;
    }

    onUpdate(updatedTrade);
    setShowStatusConfirm(false);
    setEditForm(updatedTrade);
    onClose();
  };

  const handleCheckPrice = async () => {
    setCheckingPrice(true);
    setMarketData(null);
    try {
      const result = await getPriceEstimate(trade);
      setMarketData(result);
    } catch (e) {
      setMarketData({ text: "Error fetching data." });
    } finally {
      setCheckingPrice(false);
    }
  };

  const applyFoundPrice = () => {
    if (marketData?.price) {
       if (isEditing) {
         setEditForm({ ...editForm, exitPrice: marketData.price });
       } else {
         setQuickExitPrice(marketData.price.toString());
         setShowStatusConfirm(true);
       }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 relative text-zinc-900 dark:text-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Confirm Overlays */}
        {(showStatusConfirm || showDeleteConfirm) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur-sm p-4">
             <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl animate-in zoom-in-95">
                {showStatusConfirm ? (
                  <>
                     <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                      {trade.status === TradeStatus.OPEN ? 'Close Position?' : 'Re-open Position?'}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                      {trade.status === TradeStatus.OPEN 
                        ? "Confirming will calculate P&L based on the exit price below."
                        : "Re-opening this trade will clear the current P&L and Exit Price."}
                    </p>
                    {trade.status === TradeStatus.OPEN && (
                      <>
                        <div className="mb-4">
                          <label className="block text-xs text-zinc-500 mb-1">Exit Price</label>
                          <input 
                            type="number" step="0.01" autoFocus
                            value={quickExitPrice}
                            onChange={(e) => setQuickExitPrice(e.target.value)}
                            className="w-full rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        {(getDailyActivityCount(new Date().toISOString(), trade.id) + 0.5) > userSettings.maxTradesPerDay && (
                            <div className="mb-4 rounded border border-rose-500/20 bg-rose-500/10 p-2 text-xs text-rose-500 dark:text-rose-400 flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <span>Closing this now will exceed your daily limit.</span>
                            </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setShowStatusConfirm(false)} className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Cancel</button>
                      <button 
                        onClick={confirmStatusChange}
                        className={`rounded px-4 py-2 text-sm font-medium text-white transition-colors ${
                          trade.status === TradeStatus.OPEN ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'
                        }`}
                      >
                        Confirm
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                       <div className="p-2 rounded-full bg-rose-500/10 text-rose-500">
                         <Trash2 className="h-5 w-5" />
                       </div>
                       <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Delete Trade?</h3>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Are you sure? This cannot be undone.</p>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Cancel</button>
                      <button onClick={onDelete} className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/20">Delete Permanently</button>
                    </div>
                  </>
                )}
             </div>
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 px-6 py-6 backdrop-blur-sm">
          <div>
            {isEditing ? (
               <input 
                 type="text" 
                 value={editForm.ticker}
                 onChange={e => setEditForm({...editForm, ticker: e.target.value.toUpperCase()})}
                 className="bg-transparent text-3xl font-bold text-zinc-900 dark:text-white focus:outline-none border-b border-zinc-300 dark:border-zinc-700 w-32"
               />
            ) : (
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {formatContractName(trade.ticker, trade.strikePrice, trade.optionType, trade.expirationDate)}
                </h2>
                <button 
                  onClick={handleStatusClick}
                  className={`group relative flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-all hover:ring-2 hover:ring-offset-1 dark:hover:ring-offset-zinc-900 ${
                    trade.status === TradeStatus.OPEN 
                      ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:ring-blue-400' 
                      : 'bg-zinc-200 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-400 hover:ring-zinc-400'
                  }`}
                  title="Click to toggle status"
                >
                  {trade.status}
                  <RefreshCcw className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <div className="ml-2">{getOutcomeIcon(trade)}</div>
              </div>
            )}
            
            <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
              <span className={`rounded px-2 py-0.5 text-white dark:text-zinc-900 font-bold ${trade.direction === TradeDirection.LONG ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'}`}>
                {trade.direction.toUpperCase()}
              </span>
              <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-600 dark:text-zinc-300">{trade.optionType}</span>
              {trade.setup && (
                <span className="rounded bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 text-indigo-600 dark:text-indigo-300">{trade.setup}</span>
              )}
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(trade.entryDate).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                 {trade.status === TradeStatus.OPEN && (
                  <button onClick={handleClosePosition} className="flex items-center gap-2 rounded-lg bg-emerald-5 dark:bg-emerald-600/20 px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 transition-colors">
                    <StopCircle className="h-4 w-4" /> Close
                  </button>
                 )}
                 <button onClick={() => { setEditForm(trade); setIsEditing(true); }} className="flex items-center gap-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    <Edit2 className="h-4 w-4" /> Edit
                  </button>
              </>
            )}
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800 mx-2"></div>
            <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="p-6 space-y-6">
             {/* Violation Warnings */}
             {isEntryViolation && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 p-3 flex items-start gap-3">
                   <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                   <div>
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-500">Daily Trade Limit Violation (Entry)</p>
                      <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">Exceeds daily limit of {userSettings.maxTradesPerDay}.</p>
                   </div>
                </div>
             )}
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inputs for Edit Form */}
                <div>
                   <label className="mb-2 block text-xs text-zinc-500 dark:text-zinc-400">Status</label>
                   <select 
                      value={editForm.status} 
                      onChange={e => setEditForm({...editForm, status: e.target.value as TradeStatus})} 
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                   >
                       <option value={TradeStatus.OPEN}>Open</option>
                       <option value={TradeStatus.CLOSED}>Closed</option>
                   </select>
                </div>

                {['Direction', 'Option Type'].map((label, i) => (
                  <div key={label}>
                     <label className="mb-2 block text-xs text-zinc-500 dark:text-zinc-400">{label}</label>
                     <select 
                      value={i===0 ? editForm.direction : editForm.optionType}
                      onChange={e => i===0 ? setEditForm({...editForm, direction: e.target.value as TradeDirection}) : setEditForm({...editForm, optionType: e.target.value as OptionType})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                     >
                       {(i===0 ? DIRECTIONS : OPTION_TYPES).map(v => <option key={v} value={v}>{v}</option>)}
                     </select>
                  </div>
                ))}

                 <div>
                   <label className="mb-2 block text-xs text-zinc-500 dark:text-zinc-400">Setup / Pattern</label>
                   <div className="relative">
                      <input 
                        type="text"
                        value={editForm.setup || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setEditForm({...editForm, setup: val});
                          if(val) {
                             const filtered = availableSetups.filter(s => s.toLowerCase().includes(val.toLowerCase()));
                             setSetupSuggestions(filtered);
                             setShowSetupSuggestions(true);
                          } else {
                             setShowSetupSuggestions(false);
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowSetupSuggestions(false), 200)}
                        onFocus={() => {
                          setSetupSuggestions(availableSetups);
                          setShowSetupSuggestions(true);
                        }}
                        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                      />
                      {showSetupSuggestions && setupSuggestions.length > 0 && (
                          <div className="absolute z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl">
                              {setupSuggestions.map(s => (
                                <div key={s} onClick={() => { setEditForm({...editForm, setup: s}); setShowSetupSuggestions(false); }} className="cursor-pointer px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-600 hover:text-indigo-600 dark:hover:text-white">
                                  {s}
                                </div>
                              ))}
                          </div>
                      )}
                   </div>
                </div>

                {/* Standard Inputs */}
                {[
                  { l: 'Entry Date', t: 'datetime-local', k: 'entryDate', v: editForm.entryDate.slice(0, 16) },
                  { l: 'Entry Price', t: 'number', k: 'entryPrice', s: '0.01' },
                  { l: 'Quantity', t: 'number', k: 'quantity' },
                  { l: 'Strike Price', t: 'number', k: 'strikePrice', s: '0.5' },
                  { l: 'Expiration Date', t: 'date', k: 'expirationDate' }
                ].map((f: any) => (
                  <div key={f.l}>
                    <label className="mb-2 block text-xs text-zinc-500 dark:text-zinc-400">{f.l}</label>
                    <input 
                      required={f.k === 'strikePrice' || f.k === 'expirationDate'}
                      type={f.t} step={f.s}
                      value={f.v !== undefined ? f.v : (editForm as any)[f.k]}
                      onChange={e => setEditForm({...editForm, [f.k]: f.t === 'number' ? parseFloat(e.target.value) : e.target.value})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                ))}
                
                <div>
                   <label className="mb-2 block text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Target className="h-3 w-3" /> Target Price</label>
                   <input type="number" step="0.01" value={editForm.targetPrice || ''} onChange={e => setEditForm({...editForm, targetPrice: parseFloat(e.target.value)})} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                   <label className="mb-2 block text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Stop Loss Price</label>
                   <input type="number" step="0.01" value={editForm.stopLossPrice || ''} onChange={e => setEditForm({...editForm, stopLossPrice: parseFloat(e.target.value)})} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-white focus:border-rose-500 focus:outline-none" />
                </div>
             </div>

             {editForm.status === TradeStatus.CLOSED && (
               <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-900/10 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Exit Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="mb-2 block text-xs text-zinc-500 dark:text-zinc-400">Exit Price</label>
                       <input 
                         required
                         type="number" step="0.01" 
                         value={editForm.exitPrice ?? ''} 
                         onChange={e => setEditForm({...editForm, exitPrice: parseFloat(e.target.value)})} 
                         className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none" 
                        />
                    </div>
                    <div>
                       <label className="mb-2 block text-xs text-zinc-500 dark:text-zinc-400">Exit Date</label>
                       <input required type="datetime-local" value={editForm.exitDate ? editForm.exitDate.slice(0, 16) : ''} onChange={e => setEditForm({...editForm, exitDate: e.target.value})} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
                    </div>
                  </div>
               </div>
             )}

             <div className="pt-4">
               <label className="mb-2 block text-xs text-zinc-500 dark:text-zinc-400">Notes / Analysis</label>
               <textarea rows={4} value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" />
             </div>

             <div className="flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-6">
                <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Cancel</button>
                <button type="submit" className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500">Save Changes</button>
             </div>
          </form>
        ) : (
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
               {[
                 { l: 'P&L', v: trade.pnl ? `$${trade.pnl.toFixed(2)}` : '---', c: (trade.pnl||0)>0 ? 'text-emerald-500 dark:text-emerald-400' : (trade.pnl||0)<0 ? 'text-rose-500 dark:text-rose-400' : 'text-zinc-500', i: DollarSign },
                 { l: 'Entry Price', v: `$${trade.entryPrice.toFixed(2)}` },
                 { l: 'Exit Price', v: trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '---' },
                 { l: 'Quantity', v: trade.quantity, i: Hash },
                 { 
                   l: 'Target Price', 
                   v: trade.targetPrice ? `$${trade.targetPrice.toFixed(2)}` : '---', 
                   i: Target, 
                   c: 'text-zinc-900 dark:text-white', 
                   bg: 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-900/10' 
                 },
                 { 
                   l: 'Stop Loss', 
                   v: trade.stopLossPrice ? `$${trade.stopLossPrice.toFixed(2)}` : '---', 
                   i: ShieldAlert, 
                   c: 'text-zinc-900 dark:text-white', 
                   bg: 'border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-900/10' 
                 }
               ].map((item: any) => (
                 <div key={item.l} className={`rounded-xl border p-4 ${item.bg || 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30'}`}>
                   <p className={`text-xs mb-1 flex items-center gap-1 ${item.bg ? (item.bg.includes('rose') ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400') : 'text-zinc-500'}`}>
                     {item.i && <item.i className="h-3 w-3" />} {item.l}
                   </p>
                   <p className={`text-xl font-mono font-bold ${item.c || 'text-zinc-900 dark:text-zinc-200'}`}>{item.v}</p>
                 </div>
               ))}
            </div>

            {/* Risk Warning in Details */}
            {isRiskViolation && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 p-3 flex items-start gap-3">
                   <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
                   <div>
                      <p className="text-sm font-bold text-rose-600 dark:text-rose-500">Max Risk Violation</p>
                      <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1">
                        Risking <span className="font-mono">${tradeRiskTotal.toFixed(2)}</span> ({((tradeRiskTotal/currentBalance)*100).toFixed(1)}% of balance).
                        <br/>Limit is <span className="font-mono">${maxRiskAmount.toFixed(2)}</span> ({userSettings.maxRiskPerTradePercent}%).
                      </p>
                   </div>
                </div>
            )}

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300"><Activity className="h-4 w-4 text-indigo-500" /> Trade Logic & Notes</h3>
                 <div className="flex gap-4">
                    <button onClick={handleCheckPrice} className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1">
                      {checkingPrice ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Check Price
                    </button>
                 </div>
               </div>
               
               {marketData && (
                 <div className="mb-4 rounded-lg bg-zinc-50 dark:bg-zinc-950/50 p-3 border border-zinc-200 dark:border-zinc-800">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{marketData.text}</p>
                    {marketData.price && (
                      <div className="mt-2 flex items-center gap-3">
                         <span className="text-lg font-bold text-zinc-900 dark:text-white">${marketData.price}</span>
                         <button onClick={applyFoundPrice} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded">Use Price</button>
                      </div>
                    )}
                 </div>
               )}

               <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                 {trade.notes || "No notes recorded for this trade."}
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300"><Check className="h-4 w-4 text-emerald-500" /> Entry Checklist</h3>
                  <div className={`flex items-center gap-1 text-sm font-bold ${trade.disciplineScore === 100 ? 'text-emerald-500 dark:text-emerald-400' : trade.disciplineScore > 50 ? 'text-amber-500 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'}`}>
                    <span>{trade.disciplineScore}%</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {checklistItems.map((item) => (
                    <div key={item.key} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">{item.label}</span>
                      {trade.checklist[item.key] ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-500" />}
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
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300"><Brain className="h-4 w-4 text-purple-500" /> Psychology</h3>
                <div className="space-y-4">
                   <div>
                     <p className="text-xs text-zinc-500 mb-1">Entry State</p>
                     <div className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300">{trade.entryEmotion}</div>
                   </div>
                   {trade.exitEmotion && (
                      <div>
                       <p className="text-xs text-zinc-500 mb-1">Exit State</p>
                       <div className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300">{trade.exitEmotion}</div>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TradeJournal: React.FC<TradeJournalProps> = ({ trades, userSettings, initialCapital, onAddTrade, onUpdateTrade, onDeleteTrade }) => {
  const [showDisciplineGuard, setShowDisciplineGuard] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  
  const [vixData, setVixData] = useState<{value: number, timestamp: string} | null>(null);
  const [loadingVix, setLoadingVix] = useState(false);
  const [showVixWarning, setShowVixWarning] = useState(false);

  // New risk warning state
  const [showRiskWarning, setShowRiskWarning] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<Trade | null>(null);
  const [riskDetails, setRiskDetails] = useState<{riskAmount: number, maxAllowed: number, percent: number} | null>(null);
  const [pendingRiskRespected, setPendingRiskRespected] = useState(true);

  const [tickerSuggestions, setTickerSuggestions] = useState<string[]>([]);
  const [showTickerSuggestions, setShowTickerSuggestions] = useState(false);
  const [availableTickers, setAvailableTickers] = useState<string[]>(POPULAR_TICKERS);
  
  const [setupSuggestions, setSetupSuggestions] = useState<string[]>([]);
  const [showSetupSuggestions, setShowSetupSuggestions] = useState(false);
  const availableSetups: string[] = Array.from(new Set([
    ...COMMON_SETUPS, 
    ...trades.map(t => t.setup).filter((s): s is string => !!s)
  ])).sort();

  const [hideClosed, setHideClosed] = useState(false);

  const [newTrade, setNewTrade] = useState<Partial<Trade>>({
    direction: TradeDirection.LONG,
    optionType: OptionType.CALL,
    quantity: 1,
    status: TradeStatus.OPEN,
    entryEmotion: Emotion.CALM,
    checklist: {
      strategyMatch: false,
      riskDefined: false,
      ivConditionsMet: false,
      emotionalStateCheck: false,
      maxTradesRespected: false,
      maxRiskRespected: false
    }
  });
  
  const [currentDailyTrades, setCurrentDailyTrades] = useState(0);

  const displayedTrades = useMemo(() => {
    return hideClosed ? trades.filter(t => t.status === TradeStatus.OPEN) : trades;
  }, [trades, hideClosed]);

  // Calculate projected trades for the new trade entry date
  const projectedDailyActivity = useMemo(() => {
    if (!newTrade.entryDate) return 0.5; // Default to just the new trade if date undefined
    
    const targetDate = new Date(newTrade.entryDate).toDateString();
    let count = 0;
    trades.forEach(t => {
       if (new Date(t.entryDate).toDateString() === targetDate) count += 0.5;
       if (t.exitDate && new Date(t.exitDate).toDateString() === targetDate) count += 0.5;
    });
    return count + 0.5; // Add 0.5 for the new entry
  }, [trades, newTrade.entryDate]);

  const isProjectedViolation = projectedDailyActivity > userSettings.maxTradesPerDay;

  useEffect(() => {
    const fetchVix = async () => {
      setLoadingVix(true);
      const data = await getCurrentVix();
      setVixData(data);
      setLoadingVix(false);
    };
    fetchVix();
  }, []);

  // Sync selectedTrade with updated data source to reflect changes immediately
  useEffect(() => {
    if (selectedTrade) {
      const updatedTrade = trades.find(t => t.id === selectedTrade.id);
      if (updatedTrade) {
        setSelectedTrade(updatedTrade);
      }
    }
  }, [trades, selectedTrade]);

  const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setNewTrade({...newTrade, ticker: value});
    if (value.length > 0) {
      setTickerSuggestions(availableTickers.filter(t => t.startsWith(value)));
      setShowTickerSuggestions(true);
    } else {
      setShowTickerSuggestions(false);
    }
  };

  const handleStartAddTrade = () => {
    // Reset form and auto-populate entry date with current local time for fresh trade
    // Do this BEFORE any VIX checks so the state is ready even if warning is shown
    setNewTrade({
        direction: TradeDirection.LONG,
        optionType: OptionType.CALL,
        quantity: 1,
        status: TradeStatus.OPEN,
        entryEmotion: Emotion.CALM,
        ticker: '',
        strikePrice: undefined,
        entryPrice: undefined,
        notes: '',
        setup: '',
        checklist: {
            strategyMatch: false,
            riskDefined: false,
            ivConditionsMet: false,
            emotionalStateCheck: false,
            maxTradesRespected: false,
            maxRiskRespected: false
        },
        entryDate: toLocalISOString(new Date())
    });

    if (vixData && vixData.value > 17) {
      setShowVixWarning(true);
      return;
    }
    
    setShowAddModal(true);
  };

  const proceedToDisciplineGuard = (trade: Trade) => {
    setShowVixWarning(false);
    
    // Calculate current trades count based on the ENTRY date selected in the form, not just "today"
    const entryDateStr = new Date(trade.entryDate).toDateString();
    let count = 0;
    trades.forEach(t => {
       if (new Date(t.entryDate).toDateString() === entryDateStr) count += 0.5;
       if (t.exitDate && new Date(t.exitDate).toDateString() === entryDateStr) count += 0.5;
    });
    setCurrentDailyTrades(count);

    // Set pending trade for the guard
    setPendingTrade(trade);
    setShowDisciplineGuard(true);
  };

  const handleDisciplineProceed = (checklist: DisciplineChecklist, score: number) => {
    if (!pendingTrade) return;

    // Merge the checklist and score into the pending trade
    const finalTrade: Trade = {
       ...pendingTrade,
       checklist,
       disciplineScore: score
    };

    // Save to global state
    onAddTrade(finalTrade);
    
    // Reset Logic
    setShowDisciplineGuard(false);
    setShowRiskWarning(false);
    setPendingTrade(null);
    setNewTrade({
          direction: TradeDirection.LONG, 
          optionType: OptionType.CALL, 
          quantity: 1, 
          status: TradeStatus.OPEN,
          entryEmotion: Emotion.CALM,
          checklist: {
            strategyMatch: false,
            riskDefined: false,
            ivConditionsMet: false,
            emotionalStateCheck: false,
            maxTradesRespected: false,
            maxRiskRespected: false
          }
    });
  };

  const handleSubmitNewTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTrade.entryDate && new Date(newTrade.entryDate) > new Date()) {
      alert("Entry date cannot be in the future.");
      return;
    }
    if (!newTrade.ticker || !newTrade.entryPrice || !newTrade.strikePrice) return;

    // Update popular tickers list
    if (newTrade.ticker && !availableTickers.includes(newTrade.ticker)) {
      setAvailableTickers(prev => [...prev, newTrade.ticker!].sort());
    }

    // Auto-calculate targets if missing
    let target = newTrade.targetPrice;
    let stop = newTrade.stopLossPrice;
    if (!target || !stop) {
       const entry = newTrade.entryPrice;
       const targetPct = userSettings.defaultTargetPercent / 100;
       const stopPct = userSettings.defaultStopLossPercent / 100;
       if (newTrade.direction === TradeDirection.SHORT) {
         if (!target) target = entry * (1 - targetPct);
         if (!stop) stop = entry * (1 + stopPct);
       } else {
         if (!target) target = entry * (1 + targetPct);
         if (!stop) stop = entry * (1 - stopPct);
       }
    }

    // Calculate Risk
    const riskPerShare = Math.abs(newTrade.entryPrice - (stop || 0));
    const riskAmount = riskPerShare * (newTrade.quantity || 1) * 100; 
    const realizedPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalBalance = initialCapital + realizedPnL;
    const maxRiskPercent = userSettings.maxRiskPerTradePercent || 4; 
    const maxAllowedRisk = totalBalance * (maxRiskPercent / 100);
    const isRiskLimitRespected = riskAmount <= maxAllowedRisk;

    // Update checklist based on risk calculation
    const currentChecklist = {
        strategyMatch: false,
        riskDefined: false,
        ivConditionsMet: false,
        emotionalStateCheck: false,
        maxTradesRespected: false,
        maxRiskRespected: isRiskLimitRespected
    };

    setPendingRiskRespected(isRiskLimitRespected);

    const trade: Trade = {
      id: Date.now().toString(),
      ticker: newTrade.ticker.toUpperCase(),
      direction: newTrade.direction as TradeDirection,
      optionType: newTrade.optionType as OptionType,
      entryDate: newTrade.entryDate || toLocalISOString(new Date()),
      expirationDate: newTrade.expirationDate || new Date().toISOString().split('T')[0],
      status: TradeStatus.OPEN,
      entryPrice: newTrade.entryPrice,
      strikePrice: newTrade.strikePrice,
      quantity: newTrade.quantity || 1,
      targetPrice: parseFloat(target?.toFixed(2) || '0'),
      stopLossPrice: parseFloat(stop?.toFixed(2) || '0'),
      notes: newTrade.notes || '',
      setup: newTrade.setup || undefined,
      entryEmotion: newTrade.entryEmotion as Emotion,
      checklist: currentChecklist, // Temporary, will be updated by guard
      disciplineScore: 0, // Temporary
    };

    if (!isRiskLimitRespected) {
        setPendingTrade(trade);
        setRiskDetails({
            riskAmount,
            maxAllowed: maxAllowedRisk,
            percent: (riskAmount / totalBalance) * 100
        });
        setShowAddModal(false); // Close the form
        setShowRiskWarning(true); // Show warning (which leads to guard)
        return;
    }

    // No risk violation, proceed directly to Discipline Guard
    setShowAddModal(false);
    proceedToDisciplineGuard(trade);
  };

  const getVixStatus = (val: number) => {
    if (val <= 17) return { label: 'Favorable', color: 'emerald', desc: 'Market is calm.', icon: ThumbsUp };
    if (val <= 20) return { label: 'Caution', color: 'amber', desc: 'Volatility is rising.', icon: AlertTriangle };
    return { label: 'High Risk', color: 'rose', desc: 'Stop simple options.', icon: Zap };
  };

  return (
    <div className="space-y-6">
       
       {/* VIX Banner */}
       <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
         <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
               <Activity className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">CBOE Volatility Index</p>
              <div className="flex items-baseline gap-2">
                 <h3 className="text-2xl font-bold text-zinc-900 dark:text-white font-mono">
                   {loadingVix ? '...' : vixData ? vixData.value.toFixed(2) : '--.--'}
                 </h3>
                 <span className="text-xs text-zinc-500">VIX</span>
              </div>
            </div>
         </div>
         
         {vixData && (
           <div className={`flex-1 rounded-lg border px-4 py-2 flex items-center gap-3 ${
             vixData.value <= 17 ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 
             vixData.value <= 20 ? 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10' : 
             'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10'
           }`}>
              {(() => {
                 const status = getVixStatus(vixData.value);
                 const Icon = status.icon;
                 return (
                   <>
                     <Icon className={`h-5 w-5 shrink-0 text-${status.color}-500`} />
                     <div>
                       <p className={`text-sm font-bold text-${status.color}-600 dark:text-${status.color}-500`}>Condition: {status.label}</p>
                       <p className={`text-xs text-${status.color}-600/80 dark:text-${status.color}-400/80`}>{status.desc}</p>
                     </div>
                   </>
                 );
              })()}
           </div>
         )}
       </div>

       <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Trade History</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setHideClosed(!hideClosed)}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              {hideClosed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="hidden sm:inline">{hideClosed ? 'Show Closed' : 'Hide Closed'}</span>
            </button>
            <button 
              onClick={handleStartAddTrade}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" /> Log New Trade
            </button>
          </div>
       </div>

       {showVixWarning && vixData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95">
               <div className="flex flex-col items-center text-center mb-6">
                  <div className={`mb-4 rounded-full p-4 ${vixData.value > 20 ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500'}`}>
                    {vixData.value > 20 ? <Zap className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Market Volatility Warning</h3>
                  <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-white mb-1">VIX: {vixData.value.toFixed(2)}</p>
               </div>
               <div className="flex flex-col gap-3">
                 <button onClick={() => { setShowVixWarning(false); setShowAddModal(true); }} className={`w-full rounded-lg py-3 text-sm font-medium text-white shadow-lg transition-transform active:scale-95 ${vixData.value > 20 ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500'}`}>I Acknowledge & Want to Proceed</button>
                 <button onClick={() => setShowVixWarning(false)} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent py-3 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">Cancel Trade</button>
               </div>
            </div>
          </div>
       )}

        {/* Max Risk Warning Modal */}
        {showRiskWarning && riskDetails && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95">
               <div className="flex flex-col items-center text-center mb-6">
                  <div className="mb-4 rounded-full p-4 bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500">
                    <ShieldAlert className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">High Risk Alert</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                    This trade exceeds your maximum risk allowance of <span className="font-bold">{userSettings.maxRiskPerTradePercent}%</span> of your total balance.
                  </p>
                  
                  <div className="w-full space-y-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4 mb-4">
                      <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Risk Amount:</span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">${riskDetails.riskAmount.toFixed(2)}</span>
                      </div>
                       <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Max Allowed:</span>
                          <span className="font-mono font-bold text-zinc-900 dark:text-white">${riskDetails.maxAllowed.toFixed(2)}</span>
                      </div>
                      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex justify-between text-sm">
                          <span className="text-zinc-500">Risk %:</span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{riskDetails.percent.toFixed(2)}%</span>
                      </div>
                  </div>
               </div>
               <div className="flex flex-col gap-3">
                 <button onClick={() => { if(pendingTrade) { setShowRiskWarning(false); proceedToDisciplineGuard(pendingTrade); } }} className="w-full rounded-lg bg-rose-600 hover:bg-rose-500 py-3 text-sm font-medium text-white shadow-lg transition-transform active:scale-95">Proceed Anyway (High Risk)</button>
                 <button onClick={() => { setShowRiskWarning(false); setShowAddModal(true); }} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent py-3 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">Edit Trade</button>
               </div>
            </div>
          </div>
       )}

       {showDisciplineGuard && <DisciplineGuard onProceed={handleDisciplineProceed} onCancel={() => setShowDisciplineGuard(false)} currentDailyTrades={currentDailyTrades} maxDailyTrades={userSettings.maxTradesPerDay} isRiskRespected={pendingRiskRespected} />}

       {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
               <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">New Trade Entry</h3>
                  <button onClick={() => setShowAddModal(false)}><X className="h-5 w-5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white" /></button>
               </div>
               <form onSubmit={handleSubmitNewTrade} className="p-6 space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      {/* Form Fields for New Trade */}
                      <div className="relative">
                         <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Ticker</label>
                         <input 
                           required autoFocus
                           className="w-full rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-white uppercase focus:border-indigo-500 focus:outline-none"
                           value={newTrade.ticker || ''}
                           onChange={handleTickerChange}
                           onBlur={() => setTimeout(() => setShowTickerSuggestions(false), 200)}
                           onFocus={() => { if(newTrade.ticker || availableTickers.length) setShowTickerSuggestions(true); }}
                         />
                         {showTickerSuggestions && (
                            <div className="absolute z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl">
                               {tickerSuggestions.map(t => (
                                 <div key={t} onClick={() => { setNewTrade({...newTrade, ticker: t}); setShowTickerSuggestions(false); }} className="cursor-pointer px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-600 hover:text-indigo-600 dark:hover:text-white">{t}</div>
                               ))}
                            </div>
                         )}
                      </div>
                      <div>
                         <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Strike Price</label>
                         <input required type="number" step="0.5" className="w-full rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" value={newTrade.strikePrice || ''} onChange={e => setNewTrade({...newTrade, strikePrice: parseFloat(e.target.value)})} />
                      </div>
                      <div>
                         <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Direction</label>
                         <select className="w-full rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" value={newTrade.direction} onChange={e => setNewTrade({...newTrade, direction: e.target.value as TradeDirection})}>{DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}</select>
                      </div>
                      <div>
                         <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Type</label>
                         <select className="w-full rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" value={newTrade.optionType} onChange={e => setNewTrade({...newTrade, optionType: e.target.value as OptionType})}>{OPTION_TYPES.map(o => <option key={o} value={o}>{o}</option>)}</select>
                      </div>
                       <div>
                         <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Expiration</label>
                         <input required type="date" className="w-full rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" value={newTrade.expirationDate || ''} onChange={e => setNewTrade({...newTrade, expirationDate: e.target.value})} />
                      </div>
                      <div>
                         <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Entry Price</label>
                         <input required type="number" step="0.01" className="w-full rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" value={newTrade.entryPrice || ''} onChange={e => setNewTrade({...newTrade, entryPrice: parseFloat(e.target.value)})} />
                      </div>
                      <div>
                         <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Entry Date</label>
                         <input required type="datetime-local" className="w-full rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" value={newTrade.entryDate ? newTrade.entryDate.slice(0,16) : ''} onChange={e => setNewTrade({...newTrade, entryDate: e.target.value})} />
                         {/* Projected Activity Info */}
                         <div className={`mt-2 flex items-center gap-2 rounded px-3 py-2 text-xs font-medium border ${isProjectedViolation ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-500' : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400'}`}>
                            {isProjectedViolation ? <AlertTriangle className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                            <div className="flex-1">
                               <span>Projected Daily Trades: <span className="font-mono">{projectedDailyActivity}</span> / <span className="font-mono">{userSettings.maxTradesPerDay}</span></span>
                               {isProjectedViolation && <span className="block font-bold mt-0.5">Warning: This exceeds your daily limit!</span>}
                            </div>
                         </div>
                      </div>
                       <div>
                         <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Quantity</label>
                         <input required type="number" className="w-full rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" value={newTrade.quantity || ''} onChange={e => setNewTrade({...newTrade, quantity: parseInt(e.target.value)})} />
                      </div>
                      <div>
                         <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Emotion</label>
                         <select className="w-full rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" value={newTrade.entryEmotion} onChange={e => setNewTrade({...newTrade, entryEmotion: e.target.value as Emotion})}>{EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}</select>
                      </div>
                   </div>
                   
                   <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Setup / Pattern</label>
                      <div className="relative">
                        <input type="text" className="w-full rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" value={newTrade.setup || ''} onChange={e => {
                          const val = e.target.value;
                          setNewTrade({...newTrade, setup: val});
                          if(val) {
                             const filtered = availableSetups.filter(s => s.toLowerCase().includes(val.toLowerCase()));
                             setSetupSuggestions(filtered);
                             setShowSetupSuggestions(true);
                          } else setShowSetupSuggestions(false);
                        }} onBlur={() => setTimeout(() => setShowSetupSuggestions(false), 200)} onFocus={() => { if(availableSetups.length) { setSetupSuggestions(availableSetups); setShowSetupSuggestions(true); }}} placeholder="e.g. Bull Flag" />
                        {showSetupSuggestions && setupSuggestions.length > 0 && (
                            <div className="absolute z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl">
                               {setupSuggestions.map(s => (
                                 <div key={s} onClick={() => { setNewTrade({...newTrade, setup: s}); setShowSetupSuggestions(false); }} className="cursor-pointer px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-600 hover:text-indigo-600 dark:hover:text-white">{s}</div>
                               ))}
                            </div>
                         )}
                      </div>
                   </div>

                   <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Notes</label>
                      <textarea rows={3} className="w-full rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none" value={newTrade.notes || ''} onChange={e => setNewTrade({...newTrade, notes: e.target.value})} placeholder="Why this trade?" />
                   </div>

                   <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                      <button type="button" onClick={() => setShowAddModal(false)} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Cancel</button>
                      <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded text-sm font-medium">Log Trade</button>
                   </div>
               </form>
            </div>
          </div>
       )}

       {selectedTrade && (
          <TradeDetailsModal trade={selectedTrade} allTrades={trades} userSettings={userSettings} initialCapital={initialCapital} onClose={() => setSelectedTrade(null)} onUpdate={onUpdateTrade} onDelete={() => { onDeleteTrade(selectedTrade.id); setSelectedTrade(null); }} />
       )}

       <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
             <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase text-zinc-500">
               <tr>
                 <th className="px-6 py-4">Date</th>
                 <th className="px-6 py-4">Contract</th>
                 <th className="px-6 py-4">Side</th>
                 <th className="px-6 py-4">Status</th>
                 <th className="px-6 py-4">Discipline</th>
                 <th className="px-6 py-4 text-right">P&L</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
               {displayedTrades.length === 0 ? (
                 <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    {hideClosed && trades.length > 0 ? "No open trades found." : "No trades logged yet. Click \"Log New Trade\" to start."}
                 </td></tr>
               ) : (
                 displayedTrades.map(trade => (
                   <tr key={trade.id} onClick={() => setSelectedTrade(trade)} className="group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                     <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-300">{new Date(trade.entryDate).toLocaleDateString()}</td>
                     <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">
                       <div className="flex flex-col">
                         <span>{formatContractName(trade.ticker, trade.strikePrice, trade.optionType, trade.expirationDate)}</span>
                         <div className="flex gap-2">
                           {trade.setup && <span className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1 font-normal"><Tag className="h-3 w-3" /> {trade.setup}</span>}
                         </div>
                       </div>
                     </td>
                     <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                       <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${trade.direction === TradeDirection.LONG ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'}`}>{trade.direction.toUpperCase()}</span>
                     </td>
                     <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${trade.status === TradeStatus.OPEN ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-400'}`}>{trade.status}</span>
                          {getOutcomeIcon(trade)}
                       </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="h-1.5 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                              <div className={`h-full rounded-full ${trade.disciplineScore >= 80 ? 'bg-emerald-500' : trade.disciplineScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${trade.disciplineScore}%` }} />
                           </div>
                           <span className="text-xs text-zinc-500">{trade.disciplineScore}%</span>
                        </div>
                     </td>
                     <td className={`px-6 py-4 text-right font-mono font-medium ${(trade.pnl || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (trade.pnl || 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500'}`}>
                        {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '-'}
                      </td>
                   </tr>
                 ))
               )}
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default TradeJournal;
