import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar as CalendarIcon, Target, DollarSign } from 'lucide-react';
import { Trade } from '../types';

interface AnalyticsProps {
  trades: Trade[];
}

const Analytics: React.FC<AnalyticsProps> = ({ trades }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

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
      days.push(<div key={`empty-${i}`} className="min-h-[100px] border-r border-b border-zinc-800 bg-zinc-900/30"></div>);
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
          className={`group relative flex min-h-[100px] flex-col justify-between border-r border-b border-zinc-800 p-3 transition-all hover:bg-zinc-800/50 
            ${isProfitable ? 'bg-emerald-900/5' : ''} 
            ${isLoss ? 'bg-rose-900/5' : ''}
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
                data.pnl > 0 ? 'text-emerald-400' : data.pnl < 0 ? 'text-rose-400' : 'text-zinc-400'
              }`}>
                {data.pnl > 0 ? '+' : ''}${data.pnl.toLocaleString()}
              </span>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
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
        <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-2">
              <button onClick={() => navigateMonth('prev')} className="rounded-lg border border-zinc-700 p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => navigateMonth('next')} className="rounded-lg border border-zinc-700 p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white">
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
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Net P&L</span>
            </div>
            <span className={`text-2xl font-bold font-mono ${monthData.stats.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {monthData.stats.pnl >= 0 ? '+' : ''}${monthData.stats.pnl.toLocaleString()}
            </span>
          </div>
          
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">Win Rate</span>
            </div>
            <span className="text-2xl font-bold font-mono text-zinc-200">
              {monthData.stats.winRate.toFixed(1)}%
            </span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Total Trades</span>
            </div>
            <span className="text-2xl font-bold font-mono text-zinc-200">
              {monthData.stats.trades}
            </span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-950/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-semibold uppercase text-zinc-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days Grid */}
        <div className="grid grid-cols-7 bg-zinc-900">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-6 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-emerald-900/50 border border-emerald-500/20"></div>
          <span>Profitable Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-rose-900/50 border border-rose-500/20"></div>
          <span>Loss Day</span>
        </div>
      </div>
    </div>
  );
};

export default Analytics;