
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, DollarSign, Hash, Activity, Brain, Check, AlertTriangle, Clock, Edit2, Trash2, StopCircle, RefreshCcw, Search, Loader2, Target, ShieldAlert, PartyPopper, ThumbsUp, Tag, Zap, Eye, EyeOff, ArrowUp, ArrowDown, Receipt, Copy, Lock } from 'lucide-react';
import { Trade, TradeDirection, OptionType, Emotion, DisciplineChecklist, TradeStatus, UserSettings, SubscriptionTier } from '../types';
import { DIRECTIONS, OPTION_TYPES, EMOTIONS, POPULAR_TICKERS, COMMON_SETUPS } from '../constants';
import DisciplineGuard from './DisciplineGuard';
import { getPriceEstimate, getCurrentVix } from '../services/geminiService';

interface TradeJournalProps {
  trades: Trade[];
  userSettings: UserSettings;
  initialCapital: number;
  subscriptionTier: SubscriptionTier;
  onAddTrade: (trade: Trade) => void;
  onUpdateTrade: (trade: Trade) => void;
  onDeleteTrade: (tradeId: string) => void;
  onUpgradeClick: () => void;
}

// Consistent input styling for both Light and Dark modes
const inputClass = "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors placeholder-zinc-400 dark:placeholder-zinc-500";
const labelClass = "block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1";

const toLocalISOString = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000; 
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
};

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

const getOutcomeIcon = (trade: Trade) => {
  if (trade.status === TradeStatus.OPEN || !trade.exitPrice || !trade.entryPrice) return null;
  const directionMultiplier = trade.direction === TradeDirection.LONG ? 1 : -1;
  const percentChange = ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100 * directionMultiplier;
  if (trade.stopLossPrice && ((trade.direction === TradeDirection.LONG && trade.exitPrice <= trade.stopLossPrice) || (trade.direction === TradeDirection.SHORT && trade.exitPrice >= trade.stopLossPrice))) return <div title={`Stop Loss Violation (${percentChange.toFixed(1)}%)`} className="flex items-center justify-center rounded-full bg-rose-500/10 p-1"><AlertTriangle className="h-3.5 w-3.5 text-rose-500" /></div>;
  if (trade.targetPrice && ((trade.direction === TradeDirection.LONG && trade.exitPrice >= trade.targetPrice) || (trade.direction === TradeDirection.SHORT && trade.exitPrice <= trade.targetPrice))) return <div title={`Target Hit! (${percentChange.toFixed(1)}%)`} className="flex items-center justify-center rounded-full bg-emerald-500/10 p-1"><PartyPopper className="h-3.5 w-3.5 text-emerald-500" /></div>;
  if (percentChange >= -10 && percentChange <= 20) return <div title={`Neutral / Scratch Trade (${percentChange.toFixed(1)}%)`} className="flex items-center justify-center rounded-full bg-zinc-500/10 dark:bg-zinc-700/50 p-1"><ThumbsUp className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" /></div>;
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
  onDuplicate: (trade: Trade) => void;
  initialIsEditing?: boolean;
}> = ({ trade, allTrades, userSettings, initialCapital, onClose, onUpdate, onDelete, onDuplicate, initialIsEditing = false }) => {
    const [isEditing, setIsEditing] = useState(initialIsEditing);
    const [editForm, setEditForm] = useState<Trade>(trade);
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [quickExitPrice, setQuickExitPrice] = useState<string>('');
    const [checkingPrice, setCheckingPrice] = useState(false);
    const [marketData, setMarketData] = useState<{ text: string; price?: number; sources?: {title: string, uri: string}[] } | null>(null);
    const [setupSuggestions, setSetupSuggestions] = useState<string[]>([]);
    const [showSetupSuggestions, setShowSetupSuggestions] = useState(false);
    const availableSetups: string[] = Array.from(new Set([...COMMON_SETUPS, ...allTrades.map(t => t.setup).filter((s): s is string => !!s)])).sort();
    const checklistItems: { key: keyof DisciplineChecklist; label: string }[] = userSettings.checklistConfig ? userSettings.checklistConfig.filter(i => i.isEnabled).map(i => ({ key: i.id as keyof DisciplineChecklist, label: i.label })) : [];
    
    const realizedPnL = useMemo(() => allTrades.reduce((sum, t) => sum + (t.pnl || 0), 0), [allTrades]);
    const currentBalance = initialCapital + realizedPnL;
    const maxRiskAmount = currentBalance * (userSettings.maxRiskPerTradePercent / 100);
    const tradeRiskPerShare = trade.stopLossPrice ? Math.abs(trade.entryPrice - trade.stopLossPrice) : 0;
    const tradeRiskTotal = tradeRiskPerShare * trade.quantity * 100; 
    const isRiskViolation = trade.stopLossPrice && tradeRiskTotal > maxRiskAmount;

    useEffect(() => { setEditForm(trade); }, [trade]);
    
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

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedTrade = { ...editForm };
        if (updatedTrade.status === TradeStatus.CLOSED) {
            if (updatedTrade.exitPrice === undefined || updatedTrade.exitPrice === null || Number.isNaN(updatedTrade.exitPrice)) { alert("Please enter an Exit Price."); return; }
            if (updatedTrade.exitPrice !== undefined && updatedTrade.entryPrice !== undefined) {
                 const directionMultiplier = updatedTrade.direction === TradeDirection.LONG ? 1 : -1;
                 const grossPnL = (updatedTrade.exitPrice - updatedTrade.entryPrice) * updatedTrade.quantity * 100 * directionMultiplier;
                 updatedTrade.pnl = grossPnL - (updatedTrade.fees || 0);
            }
            if (!updatedTrade.exitDate) updatedTrade.exitDate = new Date().toISOString();
        } else { updatedTrade.pnl = undefined; updatedTrade.exitPrice = undefined; updatedTrade.exitDate = undefined; updatedTrade.exitEmotion = undefined; }
        onUpdate(updatedTrade); setIsEditing(false);
    };

    const handleClosePosition = () => { setEditForm({ ...editForm, status: TradeStatus.CLOSED, exitPrice: undefined, exitDate: new Date().toISOString() }); setIsEditing(true); };
    const handleStatusClick = () => { if (isEditing) return; setQuickExitPrice(trade.entryPrice ? trade.entryPrice.toString() : ''); setShowStatusConfirm(true); };
    
    const confirmStatusChange = () => {
        const newStatus = trade.status === TradeStatus.OPEN ? TradeStatus.CLOSED : TradeStatus.OPEN;
        let updatedTrade = { ...trade, status: newStatus };
        if (newStatus === TradeStatus.CLOSED) {
          const exitPrice = parseFloat(quickExitPrice);
          if (isNaN(exitPrice)) { alert("Invalid exit price."); return; }
          updatedTrade.exitPrice = exitPrice; updatedTrade.exitDate = new Date().toISOString();
          const directionMultiplier = trade.direction === TradeDirection.LONG ? 1 : -1;
          const grossPnL = (exitPrice - trade.entryPrice) * trade.quantity * 100 * directionMultiplier;
          updatedTrade.pnl = grossPnL - (trade.fees || 0); updatedTrade.exitEmotion = trade.exitEmotion || Emotion.CALM;
        } else { updatedTrade.exitPrice = undefined; updatedTrade.exitDate = undefined; updatedTrade.pnl = undefined; updatedTrade.exitEmotion = undefined; }
        onUpdate(updatedTrade); setShowStatusConfirm(false); setEditForm(updatedTrade); onClose();
    };

    const handleCheckPrice = async () => { setCheckingPrice(true); setMarketData(null); try { const result = await getPriceEstimate(trade); setMarketData(result); } catch (e) { setMarketData({ text: "Error." }); } finally { setCheckingPrice(false); } };
    const applyFoundPrice = () => { if (marketData?.price) { if (isEditing) { setEditForm({ ...editForm, exitPrice: marketData.price }); } else { setQuickExitPrice(marketData.price.toString()); setShowStatusConfirm(true); } } };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4" onClick={onClose}>
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl relative text-zinc-900 dark:text-zinc-200" onClick={e => e.stopPropagation()}>
            {(showStatusConfirm || showDeleteConfirm) && (
                 <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur-sm p-4">
                     <div className="w-full max-w-sm rounded-xl border bg-white dark:bg-zinc-900 p-6 shadow-xl">
                        {showStatusConfirm ? (
                           <>
                             <h3 className="text-lg font-bold mb-2 text-zinc-900 dark:text-white">{trade.status === TradeStatus.OPEN ? 'Close Position?' : 'Re-open Position?'}</h3>
                             {trade.status === TradeStatus.OPEN && <input type="number" step="0.01" autoFocus value={quickExitPrice} onChange={(e) => setQuickExitPrice(e.target.value)} className={inputClass} placeholder="Exit Price" />}
                             <div className="flex justify-end gap-3"><button onClick={() => setShowStatusConfirm(false)} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Cancel</button><button onClick={confirmStatusChange} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Confirm</button></div>
                           </>
                        ) : (
                           <>
                             <h3 className="text-lg font-bold mb-2 text-rose-600 dark:text-rose-500">Delete Trade?</h3>
                             <p className="text-sm text-zinc-500 mb-4">This action cannot be undone.</p>
                             <div className="flex justify-end gap-3"><button onClick={() => setShowDeleteConfirm(false)} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Cancel</button><button onClick={onDelete} className="bg-rose-600 text-white px-4 py-2 rounded-lg">Delete</button></div>
                           </>
                        )}
                     </div>
                 </div>
            )}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 px-6 py-6 backdrop-blur-sm">
                <div>
                   {isEditing ? <input type="text" value={editForm.ticker} onChange={e => setEditForm({...editForm, ticker: e.target.value.toUpperCase()})} className="bg-transparent text-3xl font-bold w-32 border-b border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-indigo-500 text-zinc-900 dark:text-white" /> : <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">{formatContractName(trade.ticker, trade.strikePrice, trade.optionType, trade.expirationDate)}</h2>}
                   <div className="mt-2 flex gap-2"><span className={`rounded px-2 ${trade.direction === TradeDirection.LONG ? 'bg-emerald-500' : 'bg-rose-500'} text-white text-sm font-bold`}>{trade.direction}</span><span className="text-zinc-500 dark:text-zinc-400">{trade.optionType}</span></div>
                </div>
                <div className="flex items-center gap-2">
                   {!isEditing && (
                     <>
                        {trade.status === TradeStatus.OPEN && <button onClick={handleClosePosition} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-3 py-2 rounded-lg font-medium transition-colors"><StopCircle className="h-4 w-4"/> Close</button>}
                        <button onClick={() => { setEditForm(trade); setIsEditing(true); }} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-2 rounded-lg font-medium transition-colors"><Edit2 className="h-4 w-4"/> Edit</button>
                        <button onClick={() => onDuplicate(trade)} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-2 rounded-lg font-medium transition-colors"><Copy className="h-4 w-4"/> Dup</button>
                     </>
                   )}
                   <button onClick={() => setShowDeleteConfirm(true)} className="px-3 py-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"><Trash2 className="h-4 w-4"/></button>
                   <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><X className="h-6 w-6"/></button>
                </div>
            </div>
            {isEditing ? (
                 <form onSubmit={handleSave} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className={labelClass}>Entry Price</label><input type="number" value={editForm.entryPrice} onChange={e => setEditForm({...editForm, entryPrice: parseFloat(e.target.value)})} className={inputClass} /></div>
                       <div><label className={labelClass}>Target Price</label><input type="number" value={editForm.targetPrice} onChange={e => setEditForm({...editForm, targetPrice: parseFloat(e.target.value)})} className={inputClass} /></div>
                       <div><label className={labelClass}>Stop Loss</label><input type="number" value={editForm.stopLossPrice} onChange={e => setEditForm({...editForm, stopLossPrice: parseFloat(e.target.value)})} className={inputClass} /></div>
                       {editForm.status === TradeStatus.CLOSED && <div><label className={labelClass}>Exit Price</label><input type="number" value={editForm.exitPrice} onChange={e => setEditForm({...editForm, exitPrice: parseFloat(e.target.value)})} className={inputClass} /></div>}
                       <div><label className={labelClass}>Quantity</label><input type="number" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: parseFloat(e.target.value)})} className={inputClass} /></div>
                       <div><label className={labelClass}>Fees</label><input type="number" value={editForm.fees} onChange={e => setEditForm({...editForm, fees: parseFloat(e.target.value)})} className={inputClass} /></div>
                       <div className="col-span-2">
                         <label className={labelClass}>Status</label>
                         <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as TradeStatus})} className={inputClass}>
                            <option value={TradeStatus.OPEN}>Open</option>
                            <option value={TradeStatus.CLOSED}>Closed</option>
                         </select>
                       </div>
                       <div className="col-span-2 relative">
                         <label className={labelClass}>Setup / Pattern</label>
                         <input type="text" value={editForm.setup || ''} onFocus={() => setShowSetupSuggestions(true)} onChange={e => { setEditForm({...editForm, setup: e.target.value}); setSetupSuggestions(availableSetups.filter(s => s.toLowerCase().includes(e.target.value.toLowerCase()))); setShowSetupSuggestions(true); }} className={inputClass} placeholder="e.g. Bull Flag" />
                         {showSetupSuggestions && (
                            <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl">
                              {setupSuggestions.map(s => (
                                <div key={s} onClick={() => { setEditForm({...editForm, setup: s}); setShowSetupSuggestions(false); }} className="cursor-pointer px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700">
                                  {s}
                                </div>
                              ))}
                            </div>
                         )}
                       </div>
                    </div>
                    <div><label className={labelClass}>Notes</label><textarea rows={3} value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className={inputClass} /></div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800"><button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Cancel</button><button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium">Save Changes</button></div>
                 </form>
            ) : (
                <div className="p-6 space-y-6">
                    {/* Risk & Top Stats */}
                     {isRiskViolation && (
                        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-900/20 p-3 text-rose-600 dark:text-rose-400 mb-4">
                           <ShieldAlert className="h-5 w-5 shrink-0" />
                           <p className="text-sm font-medium">Warning: Trade risk exceeded maximum allowed limit ({userSettings.maxRiskPerTradePercent}% of balance).</p>
                        </div>
                     )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Net P&L</p>
                            <p className={`text-2xl font-mono font-bold ${trade.pnl && trade.pnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : trade.pnl && trade.pnl < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white'}`}>{trade.pnl ? `$${trade.pnl.toFixed(2)}` : '---'}</p>
                        </div>
                        <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Entry Price</p>
                            <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-white">${trade.entryPrice}</p>
                        </div>
                        <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Exit Price</p>
                            <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-white">{trade.exitPrice ? `$${trade.exitPrice}` : '---'}</p>
                        </div>
                        <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Quantity</p>
                            <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-white">{trade.quantity}</p>
                        </div>
                        <div className="p-4 border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl">
                             <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1 flex items-center gap-1"><Target className="h-3 w-3"/> Target</p>
                             <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-white">{trade.targetPrice || '---'}</p>
                        </div>
                        <div className="p-4 border border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10 rounded-xl">
                             <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mb-1 flex items-center gap-1"><ShieldAlert className="h-3 w-3"/> Stop</p>
                             <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-white">{trade.stopLossPrice || '---'}</p>
                        </div>
                        {/* Fees Card */}
                        <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl col-span-2 md:col-span-1">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1"><Receipt className="h-3 w-3" /> Fees</p>
                            <p className="text-lg font-mono font-bold text-zinc-900 dark:text-white">${(trade.fees || 0).toFixed(2)}</p>
                        </div>
                    </div>
                    
                    {/* Real-time Price Check */}
                    {trade.status === TradeStatus.OPEN && (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-900/30 dark:bg-indigo-900/10 p-4">
                        <div className="flex items-center justify-between mb-2">
                           <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2"><Zap className="h-4 w-4"/> Real-time Price Check</h4>
                           <button onClick={handleCheckPrice} disabled={checkingPrice} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500 disabled:opacity-50">{checkingPrice ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Check Price'}</button>
                        </div>
                        {marketData && (
                           <div className="mt-2 text-sm bg-white dark:bg-zinc-900 p-3 rounded border border-indigo-100 dark:border-indigo-900/50">
                             <pre className="whitespace-pre-wrap font-sans text-zinc-700 dark:text-zinc-300">{marketData.text}</pre>
                             {marketData.price && (
                                <button onClick={applyFoundPrice} className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Use ${marketData.price} as Exit Price</button>
                             )}
                             {marketData.sources && marketData.sources.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400">
                                   Source: {marketData.sources.map((s,i) => <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 underline ml-1">{s.title}</a>)}
                                </div>
                             )}
                           </div>
                        )}
                      </div>
                    )}

                    <div><p className="font-bold mb-2 text-zinc-900 dark:text-white">Notes</p><p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{trade.notes}</p></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                          <h4 className="text-sm font-bold mb-3 text-zinc-700 dark:text-zinc-300">Discipline Checklist</h4>
                          <div className="space-y-2">
                             {checklistItems.map((item) => (
                                <div key={item.key} className="flex justify-between text-sm">
                                   <span className="text-zinc-500 dark:text-zinc-400">{item.label}</span>
                                   {trade.checklist[item.key] ? <Check className="h-4 w-4 text-emerald-500"/> : <X className="h-4 w-4 text-rose-500"/>}
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                </div>
            )}
          </div>
        </div>
    );
};

const TradeJournal: React.FC<TradeJournalProps> = ({ trades, userSettings, initialCapital, subscriptionTier, onAddTrade, onUpdateTrade, onDeleteTrade, onUpgradeClick }) => {
  const [showDisciplineGuard, setShowDisciplineGuard] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  
  const [vixData, setVixData] = useState<{value: number, timestamp: string} | null>(null);
  const [loadingVix, setLoadingVix] = useState(false);
  const [showVixWarning, setShowVixWarning] = useState(false);

  const [showRiskWarning, setShowRiskWarning] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<Trade | null>(null);
  const [riskDetails, setRiskDetails] = useState<{riskAmount: number, maxAllowed: number, percent: number} | null>(null);
  const [pendingRiskRespected, setPendingRiskRespected] = useState(true);

  const [tickerSuggestions, setTickerSuggestions] = useState<string[]>([]);
  const [showTickerSuggestions, setShowTickerSuggestions] = useState(false);
  const [availableTickers, setAvailableTickers] = useState<string[]>(POPULAR_TICKERS);
  
  const [setupSuggestions, setSetupSuggestions] = useState<string[]>([]);
  const [showSetupSuggestions, setShowSetupSuggestions] = useState(false);
  const availableSetups: string[] = Array.from(new Set([ ...COMMON_SETUPS, ...trades.map(t => t.setup).filter((s): s is string => !!s) ])).sort();

  const [hideClosed, setHideClosed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'entryDate', direction: 'desc' });

  const [newTrade, setNewTrade] = useState<Partial<Trade>>({
    direction: TradeDirection.LONG, optionType: OptionType.CALL, quantity: 1, status: TradeStatus.OPEN, entryEmotion: Emotion.CALM,
    checklist: { strategyMatch: false, ivConditionsMet: false, emotionalStateCheck: false, maxTradesRespected: false, maxRiskRespected: false }
  });
  
  const [currentDailyTrades, setCurrentDailyTrades] = useState(0);

  const displayedTrades = useMemo(() => {
    let filtered = trades;
    if (hideClosed) filtered = filtered.filter(t => t.status === TradeStatus.OPEN);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.ticker.toLowerCase().includes(query) || (t.notes || '').toLowerCase().includes(query) || (t.setup || '').toLowerCase().includes(query));
    }
    return [...filtered].sort((a, b) => {
      let aValue: any = (a as any)[sortConfig.key];
      let bValue: any = (b as any)[sortConfig.key];
      if (sortConfig.key === 'pnl') { aValue = a.pnl ?? -Infinity; bValue = b.pnl ?? -Infinity; }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [trades, hideClosed, searchQuery, sortConfig]);

  const handleSort = (key: string) => { setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' })); };

  useEffect(() => { const fetchVix = async () => { setLoadingVix(true); const data = await getCurrentVix(); setVixData(data); setLoadingVix(false); }; fetchVix(); }, []);
  useEffect(() => { if (selectedTrade) { const updatedTrade = trades.find(t => t.id === selectedTrade.id); if (updatedTrade) setSelectedTrade(updatedTrade); } }, [trades, selectedTrade]);

  const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase(); setNewTrade({...newTrade, ticker: value});
    if (value.length > 0) { setTickerSuggestions(availableTickers.filter(t => t.startsWith(value))); setShowTickerSuggestions(true); } else { setShowTickerSuggestions(false); }
  };

  const handleStartAddTrade = () => {
    if (subscriptionTier === 'free' && trades.length >= 30) {
      onUpgradeClick();
      return;
    }

    setNewTrade({
        direction: TradeDirection.LONG, optionType: OptionType.CALL, quantity: 1, status: TradeStatus.OPEN, entryEmotion: Emotion.CALM,
        ticker: '', strikePrice: undefined, entryPrice: undefined, notes: '', setup: '', fees: undefined,
        checklist: { strategyMatch: false, ivConditionsMet: false, emotionalStateCheck: false, maxTradesRespected: false, maxRiskRespected: false },
        entryDate: toLocalISOString(new Date())
    });
    if (vixData && vixData.value > 17) { setShowVixWarning(true); return; }
    setShowAddModal(true);
  };

  const handleDuplicateTrade = (tradeToDuplicate: Trade) => {
    if (subscriptionTier === 'free' && trades.length >= 30) {
        setSelectedTrade(null);
        onUpgradeClick();
        return;
    }

    setSelectedTrade(null); 
    setNewTrade({
      ticker: tradeToDuplicate.ticker, direction: tradeToDuplicate.direction, optionType: tradeToDuplicate.optionType,
      strikePrice: tradeToDuplicate.strikePrice, expirationDate: tradeToDuplicate.expirationDate, setup: tradeToDuplicate.setup,
      quantity: tradeToDuplicate.quantity, entryPrice: tradeToDuplicate.entryPrice, targetPrice: tradeToDuplicate.targetPrice,
      stopLossPrice: tradeToDuplicate.stopLossPrice, fees: tradeToDuplicate.fees, notes: tradeToDuplicate.notes,
      status: TradeStatus.OPEN, entryEmotion: Emotion.CALM, entryDate: toLocalISOString(new Date()),
      checklist: { strategyMatch: false, ivConditionsMet: false, emotionalStateCheck: false, maxTradesRespected: false, maxRiskRespected: false }
    });
    if (vixData && vixData.value > 17) { setShowVixWarning(true); } else { setShowAddModal(true); }
  };

  const proceedToDisciplineGuard = (trade: Trade) => {
    setShowVixWarning(false);
    const entryDateStr = new Date(trade.entryDate).toDateString();
    let count = 0;
    trades.forEach(t => { if (new Date(t.entryDate).toDateString() === entryDateStr) count += 0.5; if (t.exitDate && new Date(t.exitDate).toDateString() === entryDateStr) count += 0.5; });
    setCurrentDailyTrades(count);
    setPendingTrade(trade); setShowDisciplineGuard(true);
  };

  const handleDisciplineProceed = (checklist: DisciplineChecklist, score: number) => {
    if (!pendingTrade) return;
    const finalTrade: Trade = { ...pendingTrade, checklist, disciplineScore: score };
    onAddTrade(finalTrade);
    setShowDisciplineGuard(false); setShowRiskWarning(false); setPendingTrade(null);
  };

  const handleSubmitNewTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTrade.entryDate && new Date(newTrade.entryDate) > new Date()) { alert("Entry date cannot be in the future."); return; }
    if (!newTrade.ticker || !newTrade.entryPrice || !newTrade.strikePrice) return;
    if (newTrade.ticker && !availableTickers.includes(newTrade.ticker)) { setAvailableTickers(prev => [...prev, newTrade.ticker!].sort()); }

    let target = newTrade.targetPrice; let stop = newTrade.stopLossPrice;
    if (!target || !stop) {
       const entry = newTrade.entryPrice; const targetPct = userSettings.defaultTargetPercent / 100; const stopPct = userSettings.defaultStopLossPercent / 100;
       if (newTrade.direction === TradeDirection.SHORT) { if (!target) target = entry * (1 - targetPct); if (!stop) stop = entry * (1 + stopPct); } 
       else { if (!target) target = entry * (1 + targetPct); if (!stop) stop = entry * (1 - stopPct); }
    }

    const riskPerShare = Math.abs(newTrade.entryPrice - (stop || 0)); const riskAmount = riskPerShare * (newTrade.quantity || 1) * 100; 
    const realizedPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0); const totalBalance = initialCapital + realizedPnL;
    const maxAllowedRisk = totalBalance * (userSettings.maxRiskPerTradePercent / 100); const isRiskLimitRespected = riskAmount <= maxAllowedRisk;

    const currentChecklist = { strategyMatch: false, ivConditionsMet: false, emotionalStateCheck: false, maxTradesRespected: false, maxRiskRespected: isRiskLimitRespected };
    setPendingRiskRespected(isRiskLimitRespected);

    const trade: Trade = {
      id: Date.now().toString(), ticker: newTrade.ticker.toUpperCase(), direction: newTrade.direction as TradeDirection, optionType: newTrade.optionType as OptionType,
      entryDate: newTrade.entryDate || toLocalISOString(new Date()), expirationDate: newTrade.expirationDate || new Date().toISOString().split('T')[0],
      status: TradeStatus.OPEN, entryPrice: newTrade.entryPrice, strikePrice: newTrade.strikePrice, quantity: newTrade.quantity || 1,
      targetPrice: parseFloat(target?.toFixed(2) || '0'), stopLossPrice: parseFloat(stop?.toFixed(2) || '0'), fees: newTrade.fees,
      notes: newTrade.notes || '', setup: newTrade.setup || undefined, entryEmotion: newTrade.entryEmotion as Emotion, checklist: currentChecklist, disciplineScore: 0,
    };

    if (!isRiskLimitRespected) {
        setPendingTrade(trade); setRiskDetails({ riskAmount, maxAllowed: maxAllowedRisk, percent: (riskAmount / totalBalance) * 100 });
        setShowAddModal(false); setShowRiskWarning(true); return;
    }
    setShowAddModal(false); proceedToDisciplineGuard(trade);
  };

  return (
    <div className="space-y-6">
       {/* VIX Banner */}
       <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
         <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"><Activity className="h-5 w-5 text-indigo-500" /></div>
            <div><p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider">CBOE Volatility Index</p><h3 className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">{loadingVix ? '...' : vixData ? vixData.value.toFixed(2) : '--.--'} <span className="text-xs text-zinc-500 dark:text-zinc-400 font-sans font-normal">VIX</span></h3></div>
         </div>
       </div>

       {subscriptionTier === 'free' && (
         <div className="rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-900/10 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300">
               <Lock className="h-4 w-4" />
               <span>Free Plan Limit: <strong>{trades.length} / 30</strong> trades used.</span>
            </div>
            {trades.length >= 25 && <button onClick={onUpgradeClick} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Upgrade Now</button>}
         </div>
       )}

       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Trade History</h2>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-48 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-400 dark:placeholder-zinc-500" />
            </div>
            <button onClick={() => setHideClosed(!hideClosed)} className="flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">{hideClosed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}<span className="hidden sm:inline">{hideClosed ? 'Show Closed' : 'Hide Closed'}</span></button>
            <button onClick={handleStartAddTrade} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"><Plus className="h-4 w-4" /> Log New Trade</button>
          </div>
       </div>

       {showVixWarning && vixData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border bg-white dark:bg-zinc-900 p-6 shadow-2xl">
               <div className="text-center mb-6"><h3 className="text-xl font-bold text-zinc-900 dark:text-white">Volatility Warning</h3><p className="text-zinc-500 dark:text-zinc-400">VIX is high ({vixData.value}). Proceed with caution.</p></div>
               <div className="flex flex-col gap-3">
                 <button onClick={() => { setShowVixWarning(false); setShowAddModal(true); }} className="w-full rounded-lg bg-amber-600 py-3 text-white">Proceed</button>
                 <button onClick={() => setShowVixWarning(false)} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 py-3 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800">Cancel</button>
               </div>
            </div>
          </div>
       )}

        {showRiskWarning && riskDetails && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95">
               <div className="text-center mb-6"><h3 className="text-xl font-bold text-rose-500">High Risk Alert</h3><p className="text-zinc-600 dark:text-zinc-300">Risk: {riskDetails.percent.toFixed(2)}% of balance.</p></div>
               <div className="flex flex-col gap-3">
                 <button onClick={() => { if(pendingTrade) { setShowRiskWarning(false); proceedToDisciplineGuard(pendingTrade); } }} className="w-full rounded-lg bg-rose-600 py-3 text-white hover:bg-rose-500">Proceed Anyway</button>
                 <button onClick={() => { setShowRiskWarning(false); setShowAddModal(true); }} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 py-3 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">Edit Trade</button>
               </div>
            </div>
          </div>
       )}

       {showDisciplineGuard && <DisciplineGuard onProceed={handleDisciplineProceed} onCancel={() => setShowDisciplineGuard(false)} currentDailyTrades={currentDailyTrades} maxDailyTrades={userSettings.maxTradesPerDay} isRiskRespected={pendingRiskRespected} />}

       {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto text-zinc-900 dark:text-white">
               <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center bg-white dark:bg-zinc-900 sticky top-0 z-10"><h3 className="text-lg font-bold">New Trade Entry</h3><button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"><X className="h-5 w-5"/></button></div>
               <form onSubmit={handleSubmitNewTrade} className="p-6 space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                         <label className={labelClass}>Ticker</label>
                         <input required autoFocus className={`${inputClass} uppercase`} value={newTrade.ticker || ''} onChange={handleTickerChange} />
                         {showTickerSuggestions && (<div className="absolute z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl">{tickerSuggestions.map(t => (<div key={t} onClick={() => { setNewTrade({...newTrade, ticker: t}); setShowTickerSuggestions(false); }} className="cursor-pointer px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700">{t}</div>))}</div>)}
                      </div>
                      <div>
                        <label className={labelClass}>Strike</label>
                        <input required type="number" step="0.5" className={inputClass} value={newTrade.strikePrice || ''} onChange={e => setNewTrade({...newTrade, strikePrice: parseFloat(e.target.value)})} />
                      </div>
                      <div>
                        <label className={labelClass}>Direction</label>
                        <select className={inputClass} value={newTrade.direction} onChange={e => setNewTrade({...newTrade, direction: e.target.value as TradeDirection})}>{DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}</select>
                      </div>
                      <div>
                        <label className={labelClass}>Option Type</label>
                        <select className={inputClass} value={newTrade.optionType} onChange={e => setNewTrade({...newTrade, optionType: e.target.value as OptionType})}>{OPTION_TYPES.map(o => <option key={o} value={o}>{o}</option>)}</select>
                      </div>
                      <div>
                        <label className={labelClass}>Expiration</label>
                        <input required type="date" className={inputClass} value={newTrade.expirationDate || ''} onChange={e => setNewTrade({...newTrade, expirationDate: e.target.value})} />
                      </div>
                      <div>
                        <label className={labelClass}>Entry Price</label>
                        <input required type="number" step="0.01" className={inputClass} value={newTrade.entryPrice || ''} onChange={e => setNewTrade({...newTrade, entryPrice: parseFloat(e.target.value)})} />
                      </div>
                      <div>
                        <label className={labelClass}>Entry Date & Time</label>
                        <input required type="datetime-local" className={inputClass} value={newTrade.entryDate ? newTrade.entryDate.slice(0,16) : ''} onChange={e => setNewTrade({...newTrade, entryDate: e.target.value})} />
                      </div>
                      <div>
                        <label className={labelClass}>Quantity</label>
                        <input required type="number" className={inputClass} value={newTrade.quantity || ''} onChange={e => setNewTrade({...newTrade, quantity: parseInt(e.target.value)})} />
                      </div>
                      <div>
                        <label className={labelClass}>Entry Emotion</label>
                        <select className={inputClass} value={newTrade.entryEmotion} onChange={e => setNewTrade({...newTrade, entryEmotion: e.target.value as Emotion})}>{EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}</select>
                      </div>
                      <div>
                        <label className={labelClass}>Fees</label>
                        <input type="number" step="0.01" className={inputClass} value={newTrade.fees || ''} onChange={e => setNewTrade({...newTrade, fees: parseFloat(e.target.value)})} />
                      </div>
                      <div className="col-span-2 relative">
                         <label className={labelClass}>Setup / Pattern</label>
                         <input type="text" value={newTrade.setup || ''} onFocus={() => setShowSetupSuggestions(true)} onChange={e => { setNewTrade({...newTrade, setup: e.target.value}); setSetupSuggestions(availableSetups.filter(s => s.toLowerCase().includes(e.target.value.toLowerCase()))); setShowSetupSuggestions(true); }} className={inputClass} placeholder="e.g. Bull Flag" />
                         {showSetupSuggestions && (
                            <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl">
                              {setupSuggestions.map(s => (
                                <div key={s} onClick={() => { setNewTrade({...newTrade, setup: s}); setShowSetupSuggestions(false); }} className="cursor-pointer px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700">
                                  {s}
                                </div>
                              ))}
                            </div>
                         )}
                       </div>
                   </div>
                   <div>
                     <label className={labelClass}>Notes</label>
                     <textarea rows={2} className={inputClass} value={newTrade.notes || ''} onChange={e => setNewTrade({...newTrade, notes: e.target.value})} placeholder="Why are you taking this trade?" />
                   </div>
                   <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800"><button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Cancel</button><button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium">Log Trade</button></div>
               </form>
            </div>
          </div>
       )}

       {selectedTrade && <TradeDetailsModal trade={selectedTrade} allTrades={trades} userSettings={userSettings} initialCapital={initialCapital} onClose={() => setSelectedTrade(null)} onUpdate={onUpdateTrade} onDelete={() => { onDeleteTrade(selectedTrade.id); setSelectedTrade(null); }} onDuplicate={handleDuplicateTrade} />}

       <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
             <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase text-zinc-500 dark:text-zinc-400">
               <tr>
                 {[{k:'entryDate',l:'Date'},{k:'contract',l:'Contract'},{k:'direction',l:'Side'},{k:'status',l:'Status'},{k:'disciplineScore',l:'Discipline'},{k:'pnl',l:'P&L',align:'right'}].map((col) => (
                   <th key={col.k} className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => handleSort(col.k)}>{col.l}</th>
                 ))}
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
               {displayedTrades.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">No trades found.</td></tr> : displayedTrades.map(trade => (
                   <tr key={trade.id} onClick={() => setSelectedTrade(trade)} className="group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                     <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">{new Date(trade.entryDate).toLocaleDateString()}</td>
                     <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{formatContractName(trade.ticker, trade.strikePrice, trade.optionType, trade.expirationDate)}</td>
                     <td className="px-6 py-4"><span className={`rounded px-2 py-1 text-xs font-bold ${trade.direction === TradeDirection.LONG ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'}`}>{trade.direction}</span></td>
                     <td className="px-6 py-4"><span className="rounded bg-zinc-200 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-300 px-2 py-1 text-xs">{trade.status}</span></td>
                     <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-16 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden"><div className={`h-full ${trade.disciplineScore>=80?'bg-emerald-500':trade.disciplineScore>=50?'bg-amber-500':'bg-rose-500'}`} style={{width:`${trade.disciplineScore}%`}}/></div><span className="text-xs text-zinc-500 dark:text-zinc-400">{trade.disciplineScore}%</span></div></td>
                     <td className={`px-6 py-4 text-right font-mono font-medium ${(trade.pnl||0)>0?'text-emerald-600 dark:text-emerald-400':(trade.pnl||0)<0?'text-rose-600 dark:text-rose-400':'text-zinc-500 dark:text-zinc-500'}`}><div className="flex justify-end gap-2">{getOutcomeIcon(trade)}<span>{trade.pnl?`${trade.pnl>0?'+':''}$${trade.pnl.toFixed(2)}`: '-'}</span></div></td>
                   </tr>
               ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default TradeJournal;
