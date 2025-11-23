import React, { useState } from 'react';
import { Plus, X, DollarSign, Hash, Activity, Brain, Check, AlertTriangle, Clock, Edit2, Save, Trash2, StopCircle, RefreshCcw, Calendar } from 'lucide-react';
import { Trade, TradeDirection, OptionType, Emotion, DisciplineChecklist, TradeStatus } from '../types';
import { DIRECTIONS, OPTION_TYPES, EMOTIONS, POPULAR_TICKERS } from '../constants';
import DisciplineGuard from './DisciplineGuard';

interface TradeJournalProps {
  trades: Trade[];
  onAddTrade: (trade: Trade) => void;
  onUpdateTrade: (trade: Trade) => void;
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

const TradeDetailsModal: React.FC<{ trade: Trade; onClose: () => void; onUpdate: (trade: Trade) => void }> = ({ trade, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Trade>(trade);
  
  // Quick Status Toggle State
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [quickExitPrice, setQuickExitPrice] = useState<string>(trade.entryPrice.toString());

  const checklistItems: { key: keyof DisciplineChecklist; label: string }[] = [
    { key: 'strategyMatch', label: 'In Strategy Plan' },
    { key: 'riskDefined', label: 'Risk Defined' },
    { key: 'sizeWithinLimits', label: 'Size Within Limits' },
    { key: 'ivConditionsMet', label: 'IV Conditions Met' },
    { key: 'emotionalStateCheck', label: 'Emotionally Stable' },
  ];

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
      exitPrice: editForm.exitPrice || 0
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
      // Calculate PnL: (Exit - Entry) * Qty * 100 * direction
      const directionMultiplier = trade.direction === TradeDirection.LONG ? 1 : -1;
      updatedTrade.pnl = (exitPrice - trade.entryPrice) * trade.quantity * 100 * directionMultiplier;
      updatedTrade.exitEmotion = trade.exitEmotion || Emotion.CALM; // Default if not set
    } else {
      // Re-opening: clear exit data
      updatedTrade.exitPrice = undefined;
      updatedTrade.pnl = undefined;
      updatedTrade.exitEmotion = undefined;
    }

    onUpdate(updatedTrade);
    setShowStatusConfirm(false);
    
    // Update local edit form copy in case user switches to edit mode next
    setEditForm(updatedTrade);
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
              onClick={onClose} 
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="p-6 space-y-6">
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
                     type="number" step="0.5"
                     value={editForm.strikePrice || ''}
                     onChange={e => setEditForm({...editForm, strikePrice: parseFloat(e.target.value)})}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                   />
                </div>
                 <div>
                   <label className="mb-2 block text-xs text-zinc-400">Expiration Date</label>
                   <input 
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
                      <label className="mb-2 block text-xs text-zinc-400">Exit Emotion</label>
                      <select 
                        value={editForm.exitEmotion || Emotion.CALM}
                        onChange={e => setEditForm({...editForm, exitEmotion: e.target.value as Emotion})}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                      >
                        {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>
               </div>
             )}

             <div>
                <label className="mb-2 block text-xs text-zinc-400">Notes</label>
                <textarea 
                  value={editForm.notes}
                  onChange={e => setEditForm({...editForm, notes: e.target.value})}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  rows={4}
                />
             </div>

             <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
               <button 
                 type="button"
                 onClick={() => setIsEditing(false)}
                 className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
               >
                 Cancel
               </button>
               <button 
                 type="submit"
                 className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500"
               >
                 <Save className="h-4 w-4" />
                 Save Changes
               </button>
             </div>
          </form>
        ) : (
          <div className="p-6 space-y-8">
            {/* Read-Only View */}
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
              
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                 <p className="text-xs text-zinc-500 mb-1">Strike Price</p>
                 <p className="text-lg font-mono font-bold text-zinc-200">
                   {trade.strikePrice ? `$${trade.strikePrice}` : '---'}
                 </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                 <p className="text-xs text-zinc-500 mb-1">Expiration</p>
                 <p className="text-lg font-mono font-bold text-zinc-200">
                   {trade.expirationDate ? new Date(trade.expirationDate).toLocaleDateString() : '---'}
                 </p>
              </div>
            </div>

            {/* Notes Section */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <Activity className="h-4 w-4 text-indigo-400" /> 
                Trade Logic & Notes
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                {trade.notes || "No notes recorded for this trade."}
              </p>
            </div>

            {/* Discipline & Psychology Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Discipline Score Card */}
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

              {/* Psychology Card */}
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

                  {!trade.exitEmotion && trade.status === TradeStatus.OPEN && (
                     <div className="text-xs text-zinc-500 italic">
                       Psychology update available upon closing.
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

const TradeJournal: React.FC<TradeJournalProps> = ({ trades, onAddTrade, onUpdateTrade }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showGuard, setShowGuard] = useState(false);
  const [checklistResult, setChecklistResult] = useState<{checks: DisciplineChecklist, score: number} | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showTickerSuggestions, setShowTickerSuggestions] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Trade>>({
    ticker: '',
    direction: TradeDirection.LONG,
    optionType: OptionType.CALL,
    entryDate: new Date().toISOString().slice(0, 16),
    quantity: 1,
    notes: '',
    entryEmotion: Emotion.CALM,
    status: TradeStatus.OPEN,
  });

  const startAddTrade = () => {
    setShowGuard(true);
  };

  const handleGuardProceed = (checklist: DisciplineChecklist, score: number) => {
    setChecklistResult({ checks: checklist, score });
    setShowGuard(false);
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklistResult) return;
    
    const directionMultiplier = formData.direction === TradeDirection.LONG ? 1 : -1;
    const calcPnL = formData.status === TradeStatus.CLOSED && formData.exitPrice 
      ? (Number(formData.exitPrice) - Number(formData.entryPrice)) * Number(formData.quantity) * 100 * directionMultiplier
      : undefined;

    const newTrade: Trade = {
      id: Date.now().toString(),
      ticker: formData.ticker!.toUpperCase(),
      direction: formData.direction!,
      optionType: formData.optionType!,
      entryDate: formData.entryDate!,
      expirationDate: formData.expirationDate,
      status: formData.status!,
      entryPrice: Number(formData.entryPrice),
      exitPrice: formData.exitPrice ? Number(formData.exitPrice) : undefined,
      strikePrice: formData.strikePrice ? Number(formData.strikePrice) : undefined,
      quantity: Number(formData.quantity),
      pnl: calcPnL,
      notes: formData.notes || '',
      entryEmotion: formData.entryEmotion!,
      checklist: checklistResult.checks,
      disciplineScore: checklistResult.score,
      violationReason: checklistResult.score < 100 ? 'Pre-trade checklist violation' : undefined
    };

    onAddTrade(newTrade);
    setIsAdding(false);
    setFormData({ ...formData, ticker: '', notes: '', strikePrice: undefined, expirationDate: undefined }); 
    setChecklistResult(null);
  };

  const tickerSuggestions = POPULAR_TICKERS.filter(t => 
    formData.ticker && t.startsWith(formData.ticker.toUpperCase()) && t !== formData.ticker
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Trade Journal</h2>
        <button 
          onClick={startAddTrade}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          New Trade
        </button>
      </div>

      {showGuard && (
        <DisciplineGuard 
          onProceed={handleGuardProceed} 
          onCancel={() => setShowGuard(false)} 
        />
      )}

      {selectedTrade && (
        <TradeDetailsModal 
          trade={selectedTrade} 
          onClose={() => setSelectedTrade(null)} 
          onUpdate={onUpdateTrade}
        />
      )}

      {isAdding && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 animate-in fade-in slide-in-from-top-4">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Log Trade Details</h3>
            <button onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="relative">
              <label className="mb-2 block text-xs text-zinc-400">Ticker</label>
              <input 
                required
                type="text" 
                value={formData.ticker}
                onChange={e => {
                  setFormData({...formData, ticker: e.target.value.toUpperCase()});
                  setShowTickerSuggestions(true);
                }}
                onFocus={() => setShowTickerSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTickerSuggestions(false), 200)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                placeholder="e.g. SPY"
              />
              {showTickerSuggestions && tickerSuggestions.length > 0 && (
                <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl">
                  {tickerSuggestions.map(t => (
                      <div 
                        key={t}
                        onClick={() => {
                          setFormData({...formData, ticker: t});
                          setShowTickerSuggestions(false);
                        }}
                        className="cursor-pointer px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                      >
                        {t}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            <div>
               <label className="mb-2 block text-xs text-zinc-400">Direction</label>
               <select 
                value={formData.direction}
                onChange={e => setFormData({...formData, direction: e.target.value as TradeDirection})}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
               >
                 {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
               </select>
            </div>

             <div>
               <label className="mb-2 block text-xs text-zinc-400">Option Type</label>
               <select 
                value={formData.optionType}
                onChange={e => setFormData({...formData, optionType: e.target.value as OptionType})}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
               >
                 {OPTION_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
               </select>
            </div>

            <div>
              <label className="mb-2 block text-xs text-zinc-400">Entry Date</label>
              <input 
                type="datetime-local" 
                value={formData.entryDate}
                onChange={e => setFormData({...formData, entryDate: e.target.value})}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            
            <div>
               <label className="mb-2 block text-xs text-zinc-400">Strike Price</label>
               <input 
                 type="number" step="0.5"
                 value={formData.strikePrice || ''}
                 onChange={e => setFormData({...formData, strikePrice: parseFloat(e.target.value)})}
                 className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
               />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs text-zinc-400">Entry Price</label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  value={formData.entryPrice || ''}
                  onChange={e => setFormData({...formData, entryPrice: parseFloat(e.target.value)})}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs text-zinc-400">Qty</label>
                <input 
                  required
                  type="number" 
                  value={formData.quantity}
                  onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
               <label className="mb-2 block text-xs text-zinc-400">Expiration Date</label>
               <input 
                 type="date"
                 value={formData.expirationDate || ''}
                 onChange={e => setFormData({...formData, expirationDate: e.target.value})}
                 className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
               />
            </div>

            <div>
               <label className="mb-2 block text-xs text-zinc-400">Emotional State</label>
               <select 
                value={formData.entryEmotion}
                onChange={e => setFormData({...formData, entryEmotion: e.target.value as Emotion})}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
               >
                 {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
               </select>
            </div>

            <div>
              <label className="mb-2 block text-xs text-zinc-400">Status</label>
               <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as TradeStatus})}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
               >
                 <option value={TradeStatus.OPEN}>Open</option>
                 <option value={TradeStatus.CLOSED}>Closed</option>
               </select>
            </div>

            {formData.status === TradeStatus.CLOSED && (
               <div>
                <label className="mb-2 block text-xs text-zinc-400">Exit Price</label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  value={formData.exitPrice || ''}
                  onChange={e => setFormData({...formData, exitPrice: parseFloat(e.target.value)})}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs text-zinc-400">Notes & Reasoning</label>
              <textarea 
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                rows={3}
                placeholder="Why did you take this trade?"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3">
               <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
               <button type="submit" className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500">Save Trade</button>
            </div>
          </form>
        </div>
      )}

      {/* List View */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Contract / Ticker</th>
              <th className="px-6 py-4">Side</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Disc. Score</th>
              <th className="px-6 py-4 text-right">P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No trades logged yet.</td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr 
                  key={trade.id} 
                  onClick={() => setSelectedTrade(trade)}
                  className="cursor-pointer hover:bg-zinc-800/50 transition-colors group"
                >
                  <td className="px-6 py-4 text-zinc-400 group-hover:text-zinc-300">
                    {new Date(trade.entryDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-bold text-white">
                     {formatContractName(trade.ticker, trade.strikePrice, trade.optionType, trade.expirationDate)}
                  </td>
                  <td className="px-6 py-4 text-zinc-300">
                    <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${trade.direction === TradeDirection.LONG ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${trade.status === TradeStatus.OPEN ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-700/50 text-zinc-400'}`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-zinc-800 overflow-hidden">
                        <div 
                          className={`h-full ${trade.disciplineScore === 100 ? 'bg-emerald-500' : trade.disciplineScore > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                          style={{width: `${trade.disciplineScore}%`}}
                        />
                      </div>
                      <span className="text-xs text-zinc-500">{trade.disciplineScore}%</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-medium ${
                    (trade.pnl || 0) > 0 ? 'text-emerald-400' : (trade.pnl || 0) < 0 ? 'text-rose-400' : 'text-zinc-500'
                  }`}>
                    {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
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