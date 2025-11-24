import React, { useState, useEffect } from 'react';
import { Plus, X, DollarSign, Hash, Activity, Brain, Check, AlertTriangle, Clock, Edit2, Save, Trash2, StopCircle, RefreshCcw, Search, ExternalLink, Loader2, Target, ShieldAlert, PartyPopper, ThumbsUp, Layers } from 'lucide-react';
import { Trade, TradeDirection, OptionType, Emotion, DisciplineChecklist, TradeStatus, UserSettings } from '../types';
import { DIRECTIONS, OPTION_TYPES, EMOTIONS } from '../constants';
import DisciplineGuard from './DisciplineGuard';
import { getPriceEstimate } from '../services/geminiService';

interface TradeJournalProps {
  trades: Trade[];
  userSettings: UserSettings;
  onAddTrade: (trade: Trade) => void;
  onUpdateTrade: (trade: Trade) => void;
  onDeleteTrade: (tradeId: string) => void;
}

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

  // 1. Check Stop Loss Violation
  const isStopLossViolated = trade.stopLossPrice && (
    (trade.direction === TradeDirection.LONG && trade.exitPrice <= trade.stopLossPrice) ||
    (trade.direction === TradeDirection.SHORT && trade.exitPrice >= trade.stopLossPrice)
  );

  if (isStopLossViolated) {
    return (
      <span title="Stop Loss Hit">
        <AlertTriangle className="h-4 w-4 text-rose-500" />
      </span>
    );
  }

  // 2. Check Profit Target Hit
  const isTargetHit = trade.targetPrice && (
    (trade.direction === TradeDirection.LONG && trade.exitPrice >= trade.targetPrice) ||
    (trade.direction === TradeDirection.SHORT && trade.exitPrice <= trade.targetPrice)
  );

  if (isTargetHit) {
    return (
      <span title="Target Hit!">
        <PartyPopper className="h-4 w-4 text-emerald-500" />
      </span>
    );
  }

  // 3. Check Neutral Range (-10% to +20%)
  const directionMultiplier = trade.direction === TradeDirection.LONG ? 1 : -1;
  const percentChange = ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100 * directionMultiplier;
  
  if (percentChange >= -10 && percentChange <= 20) {
    return (
      <span title="Okay Trade">
        <ThumbsUp className="h-4 w-4 text-amber-500" />
      </span>
    );
  }

  return null;
};

const TradeDetailsModal: React.FC<{ 
  trade: Trade; 
  allTrades: Trade[]; // needed for history validation
  userSettings: UserSettings;
  onClose: () => void; 
  onUpdate: (trade: Trade) => void;
  onDelete: () => void; 
  initialIsEditing?: boolean;
}> = ({ trade, allTrades, userSettings, onClose, onUpdate, onDelete, initialIsEditing = false }) => {
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [editForm, setEditForm] = useState<Trade>(trade);
  
  // Quick Status Toggle State
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [quickExitPrice, setQuickExitPrice] = useState<string>(trade.entryPrice.toString());

  // Market Data Check State
  const [checkingPrice, setCheckingPrice] = useState(false);
  const [marketData, setMarketData] = useState<{ text: string; price?: number; sources?: {title: string, uri: string}[] } | null>(null);

  const checklistItems: { key: keyof DisciplineChecklist; label: string }[] = [
    { key: 'strategyMatch', label: 'In Strategy Plan' },
    { key: 'riskDefined', label: 'Risk Defined' },
    { key: 'sizeWithinLimits', label: 'Size Within Limits' },
    { key: 'ivConditionsMet', label: 'IV Conditions Met' },
    { key: 'emotionalStateCheck', label: 'Emotionally Stable' },
  ];

  // Auto-calculate targets in Edit mode when Entry Price changes
  useEffect(() => {
    if (isEditing && editForm.entryPrice) {
      const entry = editForm.entryPrice;
      const targetPct = userSettings.defaultTargetPercent / 100;
      const stopPct = userSettings.defaultStopLossPercent / 100;
      
      let target, stop;
      
      if (editForm.direction === TradeDirection.SHORT) {
        // Short: Target is lower, Stop is higher
        target = entry * (1 - targetPct);
        stop = entry * (1 + stopPct);
      } else {
        // Long: Target is higher, Stop is lower
        target = entry * (1 + targetPct);
        stop = entry * (1 - stopPct);
      }

      setEditForm(prev => {
        return {
          ...prev,
          targetPrice: parseFloat(target.toFixed(2)),
          stopLossPrice: parseFloat(stop.toFixed(2))
        };
      });
    }
  }, [editForm.entryPrice, editForm.direction, isEditing, userSettings]);

  // Max Trades per Day logic
  const getDailyActivityCount = (dateStr: string, excludeTradeId: string) => {
    const targetDate = new Date(dateStr).toDateString();
    let count = 0;
    allTrades.forEach(t => {
       if (t.id === excludeTradeId) return;
       // Count entry (0.5)
       if (new Date(t.entryDate).toDateString() === targetDate) count += 0.5;
       // Count exit (0.5)
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
    
    // Auto calculate PnL if closed and exit price exists
    let finalPnl = editForm.pnl;
    if (editForm.status === TradeStatus.CLOSED && editForm.exitPrice !== undefined && editForm.entryPrice !== undefined) {
      // Assuming 100 multiplier for options
      const directionMultiplier = editForm.direction === TradeDirection.LONG ? 1 : -1;
      finalPnl = (editForm.exitPrice - editForm.entryPrice) * editForm.quantity * 100 * directionMultiplier;
    } else if (editForm.status === TradeStatus.OPEN) {
      finalPnl = undefined;
    }

    onUpdate({ ...editForm, pnl: finalPnl });
    setIsEditing(false);
  };

  const handleClosePosition = () => {
    setEditForm({
      ...editForm,
      status: TradeStatus.CLOSED,
      exitPrice: editForm.exitPrice || 0,
      exitDate: new Date().toISOString()
    });
    setIsEditing(true);
  };

  const handleStatusClick = () => {
    if (isEditing) return;
    setQuickExitPrice(trade.entryPrice.toString());
    setShowStatusConfirm(true);
  };

  const confirmStatusChange = () => {
    const newStatus = trade.status === TradeStatus.OPEN ? TradeStatus.CLOSED : TradeStatus.OPEN;
    
    let updatedTrade = { ...trade, status: newStatus };

    if (newStatus === TradeStatus.CLOSED) {
      const exitPrice = parseFloat(quickExitPrice);
      updatedTrade.exitPrice = exitPrice;
      // Set Exit Date to NOW
      updatedTrade.exitDate = new Date().toISOString();
      // Calculate PnL: (Exit - Entry) * Qty * 100 * direction
      const directionMultiplier = trade.direction === TradeDirection.LONG ? 1 : -1;
      updatedTrade.pnl = (exitPrice - trade.entryPrice) * trade.quantity * 100 * directionMultiplier;
      updatedTrade.exitEmotion = trade.exitEmotion || Emotion.CALM; // Default if not set
    } else {
      // Re-opening: clear exit data
      updatedTrade.exitPrice = undefined;
      updatedTrade.exitDate = undefined;
      updatedTrade.pnl = undefined;
      updatedTrade.exitEmotion = undefined;
    }

    onUpdate(updatedTrade);
    setShowStatusConfirm(false);
    
    // Update local edit form copy in case user switches to edit mode next
    setEditForm(updatedTrade);
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
         // If not editing, assume we want to close/update status via modal
         setQuickExitPrice(marketData.price.toString());
         setShowStatusConfirm(true);
       }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl scrollbar-thin scrollbar-thumb-zinc-700 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Status Confirmation Modal Overlay */}
        {showStatusConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
             <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95">
                <h3 className="text-lg font-bold text-white mb-2">
                  {trade.status === TradeStatus.OPEN ? 'Close Position?' : 'Re-open Position?'}
                </h3>
                
                <p className="text-sm text-zinc-400 mb-4">
                  {trade.status === TradeStatus.OPEN 
                    ? "Confirming will calculate P&L based on the exit price below."
                    : "Re-opening this trade will clear the current P&L and Exit Price."}
                </p>

                {trade.status === TradeStatus.OPEN && (
                   <>
                    <div className="mb-4">
                      <label className="block text-xs text-zinc-500 mb-1">Exit Price</label>
                      <input 
                        type="number" 
                        step="0.01"
                        autoFocus
                        value={quickExitPrice}
                        onChange={(e) => setQuickExitPrice(e.target.value)}
                        className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    {/* Quick Warning Check */}
                    {(getDailyActivityCount(new Date().toISOString(), trade.id) + 0.5) > userSettings.maxTradesPerDay && (
                        <div className="mb-4 rounded border border-rose-500/20 bg-rose-500/10 p-2 text-xs text-rose-400 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Closing this now will exceed your daily limit of {userSettings.maxTradesPerDay} trades.</span>
                        </div>
                    )}
                  </>
                )}

                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setShowStatusConfirm(false)}
                    className="px-3 py-2 text-sm text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmStatusChange}
                    className={`rounded px-4 py-2 text-sm font-medium text-white transition-colors ${
                      trade.status === TradeStatus.OPEN 
                        ? 'bg-emerald-600 hover:bg-emerald-500' 
                        : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                  >
                    Confirm {trade.status === TradeStatus.OPEN ? 'Close' : 'Re-open'}
                  </button>
                </div>
             </div>
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-800 bg-zinc-900/95 px-6 py-6 backdrop-blur-sm">
          <div>
            {isEditing ? (
               <input 
                 type="text" 
                 value={editForm.ticker}
                 onChange={e => setEditForm({...editForm, ticker: e.target.value.toUpperCase()})}
                 className="bg-transparent text-3xl font-bold text-white focus:outline-none border-b border-zinc-700 w-32"
               />
            ) : (
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-white">
                  {formatContractName(trade.ticker, trade.strikePrice, trade.optionType, trade.expirationDate)}
                </h2>
                <button 
                  onClick={handleStatusClick}
                  className={`group relative flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-all hover:ring-2 hover:ring-offset-1 hover:ring-offset-zinc-900 ${
                    trade.status === TradeStatus.OPEN 
                      ? 'bg-blue-500/10 text-blue-400 hover:ring-blue-500/50' 
                      : 'bg-zinc-700/50 text-zinc-400 hover:ring-zinc-600'
                  }`}
                  title="Click to toggle status"
                >
                  {trade.status}
                  <RefreshCcw className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <div className="ml-2">
                  {getOutcomeIcon(trade)}
                </div>
              </div>
            )}
            
            <div className="mt-2 flex items-center gap-3 text-sm text-zinc-400">
              <span className={`rounded px-2 py-0.5 text-zinc-900 font-bold ${trade.direction === TradeDirection.LONG ? 'bg-emerald-400' : 'bg-rose-400'}`}>
                {trade.direction.toUpperCase()}
              </span>
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{trade.optionType}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(trade.entryDate).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                 {trade.status === TradeStatus.OPEN && (
                  <button 
                    onClick={handleClosePosition}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600/20 px-3 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                  >
                    <StopCircle className="h-4 w-4" />
                    Close Position
                  </button>
                 )}
                 <button 
                    onClick={() => {
                      setEditForm(trade);
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
              </>
            )}
            <button
               onClick={onDelete}
               className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-900/30 hover:text-rose-300 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              {isEditing && "Delete"}
            </button>
            <div className="w-px h-8 bg-zinc-800 mx-2"></div>
            <button 
              onClick={onClose} 
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="p-6 space-y-6">
             
             {/* Limit Violation Warnings */}
             {isEntryViolation && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 flex items-start gap-3">
                   <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                   <div>
                      <p className="text-sm font-bold text-amber-500">Daily Trade Limit Violation (Entry)</p>
                      <p className="text-xs text-amber-400/80 mt-1">
                        Opening this trade on {new Date(editForm.entryDate).toLocaleDateString()} exceeds your daily limit of {userSettings.maxTradesPerDay} trades.
                      </p>
                   </div>
                </div>
             )}
             {isExitViolation && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 flex items-start gap-3">
                   <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                   <div>
                      <p className="text-sm font-bold text-amber-500">Daily Trade Limit Violation (Exit)</p>
                      <p className="text-xs text-amber-400/80 mt-1">
                        Closing this trade on {editForm.exitDate ? new Date(editForm.exitDate).toLocaleDateString() : ''} exceeds your daily limit of {userSettings.maxTradesPerDay} trades.
                      </p>
                   </div>
                </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="mb-2 block text-xs text-zinc-400">Direction</label>
                   <select 
                    value={editForm.direction}
                    onChange={e => setEditForm({...editForm, direction: e.target.value as TradeDirection})}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                   >
                     {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                </div>
                <div>
                   <label className="mb-2 block text-xs text-zinc-400">Option Type</label>
                   <select 
                    value={editForm.optionType}
                    onChange={e => setEditForm({...editForm, optionType: e.target.value as OptionType})}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                   >
                     {OPTION_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                   </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs text-zinc-400">Entry Date</label>
                  <input 
                    type="datetime-local" 
                    value={editForm.entryDate.slice(0, 16)}
                    onChange={e => setEditForm({...editForm, entryDate: e.target.value})}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                   <label className="mb-2 block text-xs text-zinc-400">Entry Price</label>
                   <input 
                     type="number" step="0.01"
                     value={editForm.entryPrice}
                     onChange={e => setEditForm({...editForm, entryPrice: parseFloat(e.target.value)})}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                   />
                </div>

                <div>
                   <label className="mb-2 block text-xs text-emerald-400 flex items-center gap-1">
                     <Target className="h-3 w-3" /> Target Price
                   </label>
                   <input 
                     type="number" step="0.01"
                     value={editForm.targetPrice || ''}
                     onChange={e => setEditForm({...editForm, targetPrice: parseFloat(e.target.value)})}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                   />
                </div>
                <div>
                   <label className="mb-2 block text-xs text-rose-400 flex items-center gap-1">
                     <ShieldAlert className="h-3 w-3" /> Stop Loss Price
                   </label>
                   <input 
                     type="number" step="0.01"
                     value={editForm.stopLossPrice || ''}
                     onChange={e => setEditForm({...editForm, stopLossPrice: parseFloat(e.target.value)})}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-rose-500 focus:outline-none"
                   />
                </div>

                <div>
                   <label className="mb-2 block text-xs text-zinc-400">Quantity</label>
                   <input 
                     type="number"
                     value={editForm.quantity}
                     onChange={e => setEditForm({...editForm, quantity: parseInt(e.target.value)})}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                   />
                </div>
                <div>
                   <label className="mb-2 block text-xs text-zinc-400">Strike Price</label>
                   <input 
                     required
                     type="number" step="0.5"
                     value={editForm.strikePrice || ''}
                     onChange={e => setEditForm({...editForm, strikePrice: parseFloat(e.target.value)})}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                   />
                </div>
                 <div>
                   <label className="mb-2 block text-xs text-zinc-400">Expiration Date</label>
                   <input 
                     required
                     type="date"
                     value={editForm.expirationDate || ''}
                     onChange={e => setEditForm({...editForm, expirationDate: e.target.value})}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                   />
                </div>
                <div>
                  <label className="mb-2 block text-xs text-zinc-400">Status</label>
                  <select 
                    value={editForm.status}
                    onChange={e => setEditForm({...editForm, status: e.target.value as TradeStatus})}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value={TradeStatus.OPEN}>Open</option>
                    <option value={TradeStatus.CLOSED}>Closed</option>
                  </select>
                </div>
             </div>

             {editForm.status === TradeStatus.CLOSED && (
               <div className="rounded-xl border border-emerald-500/20 bg-emerald-900/10 p-4 animate-in fade-in">
                  <h4 className="mb-3 text-sm font-semibold text-emerald-400">Exit Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="mb-2 block text-xs text-zinc-400">Exit Price</label>
                       <input 
                         required
                         type="number" step="0.01"
                         value={editForm.exitPrice || ''}
                         onChange={e => setEditForm({...editForm, exitPrice: parseFloat(e.target.value)})}
                         className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                       />
                    </div>
                    <div>
                       <label className="mb-2 block text-xs text-zinc-400">Exit Date</label>
                       <input 
                         type="datetime-local"
                         value={editForm.exitDate ? editForm.exitDate.slice(0, 16) : ''}
                         onChange={e => setEditForm({...editForm, exitDate: e.target.value})}
                         className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                       />
                    </div>
                  </div>
               </div>
             )}

             <div className="pt-4">
               <label className="mb-2 block text-xs text-zinc-400">Notes / Analysis</label>
               <textarea 
                 rows={4}
                 value={editForm.notes}
                 onChange={e => setEditForm({...editForm, notes: e.target.value})}
                 className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
               />
             </div>

             <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-6">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Save Changes
                </button>
             </div>
          </form>
        ) : (
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
               <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                 <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3" /> P&L</p>
                 <p className={`text-xl font-mono font-bold ${
                   (trade.pnl || 0) > 0 ? 'text-emerald-400' : (trade.pnl || 0) < 0 ? 'text-rose-400' : 'text-zinc-400'
                 }`}>
                   {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '---'}
                 </p>
               </div>
               <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                 <p className="text-xs text-zinc-500 mb-1">Entry Price</p>
                 <p className="text-xl font-mono font-bold text-zinc-200">${trade.entryPrice.toFixed(2)}</p>
               </div>
               <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                 <p className="text-xs text-zinc-500 mb-1">Exit Price</p>
                 <p className="text-xl font-mono font-bold text-zinc-200">
                   {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '---'}
                 </p>
               </div>
               <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                 <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><Hash className="h-3 w-3" /> Quantity</p>
                 <p className="text-xl font-mono font-bold text-zinc-200">{trade.quantity}</p>
               </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                   <Activity className="h-4 w-4 text-indigo-400" /> 
                   Trade Logic & Notes
                 </h3>
                 <button 
                   onClick={handleCheckPrice}
                   className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                 >
                   {checkingPrice ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                   Check Market Data
                 </button>
               </div>
               
               {marketData && (
                 <div className="mb-4 rounded-lg bg-zinc-950/50 p-3 border border-zinc-800">
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{marketData.text}</p>
                    {marketData.price && (
                      <div className="mt-2 flex items-center gap-3">
                         <span className="text-lg font-bold text-white">${marketData.price}</span>
                         <button 
                           onClick={applyFoundPrice}
                           className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded"
                         >
                           Use Price
                         </button>
                      </div>
                    )}
                    {marketData.sources && marketData.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500 mb-1">Sources:</p>
                        <ul className="space-y-1">
                          {marketData.sources.map((source, i) => (
                             <li key={i}>
                               <a href={source.uri} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                                 <ExternalLink className="h-3 w-3" /> {source.title}
                               </a>
                             </li>
                          ))}
                        </ul>
                      </div>
                    )}
                 </div>
               )}

               <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                 {trade.notes || "No notes recorded for this trade."}
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-400" /> 
                    Entry Checklist
                  </h3>
                  <div className={`flex items-center gap-1 text-sm font-bold ${
                    trade.disciplineScore === 100 ? 'text-emerald-400' : trade.disciplineScore > 50 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    <span>{trade.disciplineScore}%</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {checklistItems.map((item) => (
                    <div key={item.key} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">{item.label}</span>
                      {trade.checklist[item.key] ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <X className="h-4 w-4 text-rose-500" />
                      )}
                    </div>
                  ))}
                </div>
                {trade.violationReason && (
                   <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3">
                      <div className="flex items-start gap-2 text-xs text-rose-400">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p>{trade.violationReason}</p>
                      </div>
                   </div>
                )}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                  <Brain className="h-4 w-4 text-purple-400" /> 
                  Psychology
                </h3>
                <div className="space-y-4">
                   <div>
                     <p className="text-xs text-zinc-500 mb-1">Entry State</p>
                     <div className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                       {trade.entryEmotion}
                     </div>
                   </div>
                   {trade.exitEmotion && (
                      <div>
                       <p className="text-xs text-zinc-500 mb-1">Exit State</p>
                       <div className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                         {trade.exitEmotion}
                       </div>
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

const TradeJournal: React.FC<TradeJournalProps> = ({ 
  trades, 
  userSettings,
  onAddTrade, 
  onUpdateTrade, 
  onDeleteTrade 
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showDisciplineGuard, setShowDisciplineGuard] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New Trade Form State
  const [newTrade, setNewTrade] = useState<Partial<Trade>>({
    direction: TradeDirection.LONG,
    optionType: OptionType.CALL,
    entryEmotion: Emotion.CALM,
    quantity: 1,
    entryDate: new Date().toISOString(),
    status: TradeStatus.OPEN
  });

  // Calculate daily trade count for warning in Add Modal
  const getDailyTradeCount = (dateStr?: string) => {
     if (!dateStr) return 0;
     const targetDate = new Date(dateStr).toDateString();
     let count = 0;
     trades.forEach(t => {
        if (new Date(t.entryDate).toDateString() === targetDate) count += 0.5;
        if (t.exitDate && new Date(t.exitDate).toDateString() === targetDate) count += 0.5;
     });
     return count;
  };
  
  const currentDailyCount = getDailyTradeCount(newTrade.entryDate);
  const willExceedLimit = (currentDailyCount + 0.5) > userSettings.maxTradesPerDay;

  // Auto-calculate Targets for New Trade
  useEffect(() => {
    if (newTrade.entryPrice) {
      const entry = newTrade.entryPrice;
      const targetPct = userSettings.defaultTargetPercent / 100;
      const stopPct = userSettings.defaultStopLossPercent / 100;
      
      let target, stop;
      if (newTrade.direction === TradeDirection.SHORT) {
        target = entry * (1 - targetPct);
        stop = entry * (1 + stopPct);
      } else {
        target = entry * (1 + targetPct);
        stop = entry * (1 - stopPct);
      }

      setNewTrade(prev => ({
        ...prev,
        targetPrice: parseFloat(target.toFixed(2)),
        stopLossPrice: parseFloat(stop.toFixed(2))
      }));
    }
  }, [newTrade.entryPrice, newTrade.direction, userSettings]);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate Entry Date
    if (newTrade.entryDate) {
      const entryDate = new Date(newTrade.entryDate);
      const now = new Date();
      if (entryDate > now) {
        setError("Future entry dates are not allowed. Please check the date and time.");
        return;
      }
    }

    setShowDisciplineGuard(true);
  };

  const handleDisciplineConfirmed = (checklist: DisciplineChecklist, score: number) => {
    const trade: Trade = {
      id: Date.now().toString(),
      ticker: newTrade.ticker || 'UNKNOWN',
      direction: newTrade.direction as TradeDirection,
      optionType: newTrade.optionType as OptionType,
      entryDate: newTrade.entryDate || new Date().toISOString(),
      status: TradeStatus.OPEN,
      entryPrice: newTrade.entryPrice || 0,
      strikePrice: newTrade.strikePrice,
      expirationDate: newTrade.expirationDate,
      quantity: newTrade.quantity || 1,
      targetPrice: newTrade.targetPrice,
      stopLossPrice: newTrade.stopLossPrice,
      notes: newTrade.notes || '',
      entryEmotion: newTrade.entryEmotion as Emotion,
      checklist,
      disciplineScore: score,
      violationReason: score < 100 ? 'Checklist items unchecked' : undefined
    };

    onAddTrade(trade);
    setShowDisciplineGuard(false);
    setIsAddModalOpen(false);
    setError(null);
    // Reset form
    setNewTrade({
      direction: TradeDirection.LONG,
      optionType: OptionType.CALL,
      entryEmotion: Emotion.CALM,
      quantity: 1,
      entryDate: new Date().toISOString(),
      status: TradeStatus.OPEN
    });
  };

  return (
    <div>
       <div className="mb-6 flex items-center justify-between">
         <h2 className="text-lg font-semibold text-white">Recent Trade Log</h2>
         <button 
           onClick={() => {
             setIsAddModalOpen(true);
             setError(null);
           }}
           className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20"
         >
           <Plus className="h-4 w-4" />
           Log New Trade
         </button>
       </div>

       {/* Trades Grid */}
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {trades.map((trade) => (
             <div 
               key={trade.id}
               onClick={() => setSelectedTrade(trade)}
               className="group relative cursor-pointer overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-all hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/50"
             >
                {/* Status Indicator Bar */}
                <div className={`absolute left-0 top-0 h-full w-1 ${
                  trade.status === TradeStatus.OPEN ? 'bg-blue-500' : 
                  (trade.pnl || 0) > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}></div>

                <div className="mb-3 flex items-start justify-between">
                   <div>
                      <h3 className="font-bold text-white text-lg">
                        {formatContractName(trade.ticker, trade.strikePrice, trade.optionType, trade.expirationDate)}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        {new Date(trade.entryDate).toLocaleDateString()}
                      </p>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        trade.direction === 'Long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {trade.direction}
                      </span>
                      {getOutcomeIcon(trade)}
                   </div>
                </div>

                <div className="mb-4 flex items-center gap-4 text-sm">
                   <div>
                     <p className="text-[10px] text-zinc-500">Entry</p>
                     <p className="font-mono text-zinc-300">${trade.entryPrice.toFixed(2)}</p>
                   </div>
                   {trade.status === TradeStatus.CLOSED ? (
                      <div>
                        <p className="text-[10px] text-zinc-500">P&L</p>
                        <p className={`font-mono font-bold ${
                           (trade.pnl || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                           {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '-'}
                        </p>
                      </div>
                   ) : (
                      <div>
                        <p className="text-[10px] text-zinc-500">Target</p>
                        <p className="font-mono text-zinc-300">${trade.targetPrice ? trade.targetPrice.toFixed(2) : '-'}</p>
                      </div>
                   )}
                </div>

                <div className="flex items-center justify-between border-t border-zinc-800 pt-3 text-xs">
                   <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${trade.disciplineScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      <span className="text-zinc-400">Score: {trade.disciplineScore}</span>
                   </div>
                   <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                      trade.status === TradeStatus.OPEN ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-800 text-zinc-500'
                   }`}>
                      {trade.status}
                   </span>
                </div>
             </div>
          ))}
       </div>

       {/* Add Trade Modal */}
       {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 p-6">
              <h2 className="text-xl font-bold text-white">Log New Trade</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleInitialSubmit} className="p-6 space-y-6">
              
              {willExceedLimit && (
                 <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-500">Daily Trade Limit Warning</p>
                      <p className="text-xs text-amber-400/80 mt-1">
                        You have already used {currentDailyCount} trade slots for this day. 
                        Opening this trade (0.5 cost) will exceed your limit of {userSettings.maxTradesPerDay}.
                        <br/>
                        <span className="opacity-70 italic">Discipline is choosing what you want most over what you want now.</span>
                      </p>
                    </div>
                 </div>
              )}
              
              {error && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 flex items-start gap-2 text-rose-400">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="mb-2 block text-xs text-zinc-400">Ticker Symbol</label>
                   <input 
                     required
                     type="text" 
                     placeholder="e.g. SPY"
                     value={newTrade.ticker || ''}
                     onChange={e => setNewTrade({...newTrade, ticker: e.target.value.toUpperCase()})}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none placeholder-zinc-600"
                   />
                </div>
                 <div>
                   <label className="mb-2 block text-xs text-zinc-400">Entry Date & Time</label>
                   <input 
                     required
                     type="datetime-local" 
                     value={newTrade.entryDate?.slice(0, 16)}
                     onChange={e => setNewTrade({...newTrade, entryDate: e.target.value})}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                   />
                </div>
                <div>
                   <label className="mb-2 block text-xs text-zinc-400">Direction</label>
                   <div className="flex rounded-lg bg-zinc-800 p-1 border border-zinc-700">
                      {DIRECTIONS.map(d => (
                        <button
                          type="button"
                          key={d}
                          onClick={() => setNewTrade({...newTrade, direction: d})}
                          className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${
                            newTrade.direction === d ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                   </div>
                </div>
                <div>
                   <label className="mb-2 block text-xs text-zinc-400">Option Type</label>
                    <div className="flex rounded-lg bg-zinc-800 p-1 border border-zinc-700">
                      {OPTION_TYPES.map(o => (
                        <button
                          type="button"
                          key={o}
                          onClick={() => setNewTrade({...newTrade, optionType: o})}
                          className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${
                            newTrade.optionType === o ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                   </div>
                </div>
                <div>
                   <label className="mb-2 block text-xs text-zinc-400">Entry Price</label>
                   <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input 
                        required
                        type="number" step="0.01"
                        placeholder="0.00"
                        value={newTrade.entryPrice || ''}
                        onChange={e => setNewTrade({...newTrade, entryPrice: parseFloat(e.target.value)})}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                      />
                   </div>
                </div>
                <div>
                   <label className="mb-2 block text-xs text-zinc-400">Quantity</label>
                   <input 
                     required
                     type="number"
                     min="1"
                     value={newTrade.quantity}
                     onChange={e => setNewTrade({...newTrade, quantity: parseInt(e.target.value)})}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                   />
                </div>
                
                 <div>
                   <label className="mb-2 block text-xs text-emerald-400 flex items-center gap-1">
                     <Target className="h-3 w-3" /> Target Price
                   </label>
                   <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input 
                        type="number" step="0.01"
                        value={newTrade.targetPrice || ''}
                        onChange={e => setNewTrade({...newTrade, targetPrice: parseFloat(e.target.value)})}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                      />
                   </div>
                   <p className="text-[10px] text-zinc-500 mt-1">Default: {userSettings.defaultTargetPercent}% gain</p>
                </div>
                <div>
                   <label className="mb-2 block text-xs text-rose-400 flex items-center gap-1">
                     <ShieldAlert className="h-3 w-3" /> Stop Loss Price
                   </label>
                   <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input 
                        type="number" step="0.01"
                        value={newTrade.stopLossPrice || ''}
                        onChange={e => setNewTrade({...newTrade, stopLossPrice: parseFloat(e.target.value)})}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-4 py-2 text-white focus:border-rose-500 focus:outline-none"
                      />
                   </div>
                    <p className="text-[10px] text-zinc-500 mt-1">Default: {userSettings.defaultStopLossPercent}% loss</p>
                </div>

                <div>
                   <label className="mb-2 block text-xs text-zinc-400">Strike Price</label>
                   <input 
                     required
                     type="number" step="0.5"
                     value={newTrade.strikePrice || ''}
                     onChange={e => setNewTrade({...newTrade, strikePrice: parseFloat(e.target.value)})}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                   />
                </div>
                 <div>
                   <label className="mb-2 block text-xs text-zinc-400">Expiration Date</label>
                   <input 
                     required
                     type="date"
                     value={newTrade.expirationDate || ''}
                     onChange={e => setNewTrade({...newTrade, expirationDate: e.target.value})}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                   />
                </div>
                
                <div className="md:col-span-2">
                   <label className="mb-2 block text-xs text-zinc-400">Current Emotion</label>
                   <div className="flex flex-wrap gap-2">
                      {EMOTIONS.map(em => (
                        <button
                          type="button"
                          key={em}
                          onClick={() => setNewTrade({...newTrade, entryEmotion: em})}
                          className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                             newTrade.entryEmotion === em 
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="md:col-span-2">
                   <label className="mb-2 block text-xs text-zinc-400">Notes / Strategy</label>
                   <textarea 
                     rows={3}
                     placeholder="Why did you take this trade? What did you see?"
                     value={newTrade.notes || ''}
                     onChange={e => setNewTrade({...newTrade, notes: e.target.value})}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                   />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                 <button 
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-8 py-3 font-semibold text-white transition-transform hover:scale-105 hover:bg-indigo-500"
                 >
                   Review Checklist & Save
                 </button>
              </div>
            </form>
          </div>
        </div>
       )}

       {/* Discipline Guard Overlay */}
       {showDisciplineGuard && (
         <DisciplineGuard 
           onProceed={handleDisciplineConfirmed}
           onCancel={() => setShowDisciplineGuard(false)}
         />
       )}

       {/* Trade Details Modal */}
       {selectedTrade && (
         <TradeDetailsModal 
           trade={selectedTrade} 
           allTrades={trades}
           userSettings={userSettings}
           onClose={() => setSelectedTrade(null)} 
           onUpdate={onUpdateTrade}
           onDelete={() => {
             onDeleteTrade(selectedTrade.id);
             setSelectedTrade(null);
           }}
         />
       )}
    </div>
  );
};

export default TradeJournal;