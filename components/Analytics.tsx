import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, Calendar as CalendarIcon, Target, DollarSign, X } from 'lucide-react';
import { Trade, TradeStatus } from '../types';

// Helper to format contract name (reused)
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

interface AnalyticsProps {
  trades: Trade[];
  isDarkMode?: boolean;
}

const Analytics: React.FC<AnalyticsProps> = ({ trades, isDarkMode = true }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayDetails, setSelectedDayDetails] = useState<{date: Date, trades: Trade[]} | null>(null);

  // Helper to get days in month
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Helper to get start day of week (0-6)
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), 1));
  };

  const handleDayClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayTrades = trades.filter(t => {
      const tDate = new Date(t.entryDate);
      return tDate.getDate() === day && 
             tDate.getMonth() === currentDate.getMonth() && 
             tDate.getFullYear() === currentDate.getFullYear();
    });
    
    // Sort trades by time (descending)
    dayTrades.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());

    setSelectedDayDetails({ date, trades: dayTrades });
  };

  // Aggregate data for the current month
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const dailyData: Record<number, { pnl: number; count: number; wins: number }> = {};

    let totalMonthPnL = 0;
    let totalMonthTrades = 0;
    let totalMonthWins = 0;

    trades.forEach(trade => {
      const tDate = new Date(trade.entryDate);
      if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        const day = tDate.getDate();
        
        if (!dailyData[day]) {
          dailyData[day] = { pnl: 0, count: 0, wins: 0 };
        }

        dailyData[day].count += 1;
        
        if (trade.pnl !== undefined) {
          dailyData[day].pnl += trade.pnl;
          totalMonthPnL += trade.pnl;
          if (trade.pnl > 0) {
            dailyData[day].wins += 1;
            totalMonthWins += 1;
          }
        }
        
        totalMonthTrades += 1;
      }
    });

    return { 
      dailyData, 
      daysInMonth, 
      stats: {
        pnl: totalMonthPnL,
        trades: totalMonthTrades,
        winRate: totalMonthTrades > 0 ? (totalMonthWins / totalMonthTrades) * 100 : 0
      }
    };
  }, [trades, currentDate]);

  const renderCalendarDays = () => {
    const days = [];
    const firstDay = getFirstDayOfMonth(currentDate);
    const { dailyData, daysInMonth } = monthData;

    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[100px] border-r border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30"></div>);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const data = dailyData[day];
      const hasTrades = data && data.count > 0;
      const isProfitable = data && data.pnl > 0;
      const isLoss = data && data.pnl < 0;

      days.push(
        <div 
          key={`day-${day}`} 
          onClick={() => handleDayClick(day)}
          className={`group relative flex min-h-[100px] cursor-pointer flex-col justify-between border-r border-b border-zinc-200 dark:border-zinc-800 p-3 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800/50 
            ${isProfitable ? 'bg-emerald-50 dark:bg-emerald-900/5' : ''} 
            ${isLoss ? 'bg-rose-50 dark:bg-rose-900/5' : 'bg-white dark:bg-zinc-900'}
          `}
        >
          <span className={`text-sm font-medium ${
            new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString() 
              ? 'flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white' 
              : 'text-zinc-500'
          }`}>
            {day}
          </span>

          {hasTrades && (
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs font-semibold ${
                data.pnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : data.pnl < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400'
              }`}>
                {data.pnl > 0 ? '+' : ''}${data.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                {data.count} trade{data.count !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Month Selector */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-2">
              <button onClick={() => navigateMonth('prev')} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => navigateMonth('next')} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
            <CalendarIcon className="h-4 w-4" />
            <span>Monthly Overview</span>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Net P&L</span>
            </div>
            <span className={`text-2xl font-bold font-mono ${monthData.stats.pnl >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
              {monthData.stats.pnl >= 0 ? '+' : ''}${monthData.stats.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">Win Rate</span>
            </div>
            <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-200">
              {monthData.stats.winRate.toFixed(1)}%
            </span>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Total Trades</span>
            </div>
            <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-200">
              {monthData.stats.trades}
            </span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-semibold uppercase text-zinc-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days Grid */}
        <div className="grid grid-cols-7 bg-zinc-200 dark:bg-zinc-900 gap-px">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-6 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-500/20"></div>
          <span>Profitable Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-rose-100 dark:bg-rose-900/50 border border-rose-500/20"></div>
          <span>Loss Day</span>
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDayDetails && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedDayDetails(null)}
        >
          <div 
            className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {selectedDayDetails.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button 
                onClick={() => setSelectedDayDetails(null)}
                className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
              {selectedDayDetails.trades.length === 0 ? (
                <div className="py-8 text-center text-zinc-500">
                  <p>No trades recorded on this day.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayDetails.trades.map(trade => (
                    <div key={trade.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 p-3">
                       <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-zinc-900 dark:text-white">
                            {formatContractName(trade.ticker, trade.strikePrice, trade.optionType, trade.expirationDate)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${trade.direction === 'Long' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                            {trade.direction.toUpperCase()}
                          </span>
                       </div>
                       <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500">
                             {new Date(trade.entryDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs ${trade.status === TradeStatus.OPEN ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500'}`}>
                              {trade.status}
                            </span>
                            <span className={`font-mono font-medium ${
                              (trade.pnl || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (trade.pnl || 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400'
                            }`}>
                              {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---'}
                            </span>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 text-center">
               <p className="text-xs text-zinc-500">
                 Total Day P&L: <span className={`font-mono font-bold ${
                   (selectedDayDetails.trades.reduce((sum, t) => sum + (t.pnl || 0), 0)) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                 }`}>
                   {(selectedDayDetails.trades.reduce((sum, t) => sum + (t.pnl || 0), 0)) >= 0 ? '+' : ''}
                   ${selectedDayDetails.trades.reduce((sum, t) => sum + (t.pnl || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </span>
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;