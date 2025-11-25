import React, { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell 
} from 'recharts';
import { TrendingUp, Activity, Target, Wallet } from 'lucide-react';
import { Trade, Metrics } from '../types';

interface DashboardProps {
  trades: Trade[];
  metrics: Metrics;
  initialCapital: number;
  isDarkMode?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ trades, metrics, initialCapital, isDarkMode = true }) => {
  
  // Theme-aware colors
  const chartGridColor = isDarkMode ? '#27272a' : '#e4e4e7';
  const chartTextColor = isDarkMode ? '#a1a1aa' : '#71717a';
  const tooltipBg = isDarkMode ? '#18181b' : '#ffffff';
  const tooltipBorder = isDarkMode ? '#3f3f46' : '#e4e4e7';
  const tooltipText = isDarkMode ? '#f4f4f5' : '#18181b';

  // Prepare chart data (Account Balance Curve)
  const equityData = useMemo(() => {
    let currentBalance = initialCapital;
    // Sort by date
    const sorted = [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    
    // Add initial point
    const dataPoints = [{
      date: 'Start',
      balance: initialCapital,
      pnl: 0
    }];

    sorted.forEach(t => {
      if (t.pnl !== undefined) {
        currentBalance += t.pnl;
        dataPoints.push({
          date: new Date(t.entryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          balance: currentBalance,
          pnl: t.pnl
        });
      }
    });

    return dataPoints;
  }, [trades, initialCapital]);

  const strategyPerformance = useMemo(() => {
    const stats: Record<string, number> = {};
    trades.forEach(t => {
      if (t.pnl) {
        const key = `${t.direction} ${t.optionType}`;
        stats[key] = (stats[key] || 0) + t.pnl;
      }
    });
    return Object.keys(stats).map(key => ({ name: key, value: stats[key] }));
  }, [trades]);

  const setupPerformance = useMemo(() => {
    const stats: Record<string, number> = {};
    trades.forEach(t => {
       if (t.pnl) {
         const key = t.setup || "No Setup";
         stats[key] = (stats[key] || 0) + t.pnl;
       }
    });
    return Object.keys(stats).map(key => ({ name: key, value: stats[key] }));
  }, [trades]);

  const currentBalance = initialCapital + metrics.totalPnL;
  const returnPercentage = ((currentBalance - initialCapital) / initialCapital) * 100;

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Account Balance Card */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 shadow-sm relative overflow-hidden group transition-colors">
          <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-500 to-indigo-600 opacity-50"></div>
          <div className="flex items-center gap-3 text-indigo-500 dark:text-indigo-400 mb-2">
            <Wallet className="h-5 w-5" />
            <p className="text-sm font-medium">Account Balance</p>
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
            ${currentBalance.toLocaleString()}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            <span className={returnPercentage >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}>
               {returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}%
            </span>
            <span className="text-zinc-500">all time</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 shadow-sm transition-colors">
          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
            <TrendingUp className="h-5 w-5" />
            <p className="text-sm font-medium">Total P&L</p>
          </div>
          <p className={`mt-2 text-2xl font-bold font-mono ${metrics.totalPnL >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toLocaleString()}
          </p>
        </div>
        
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 shadow-sm transition-colors">
          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
            <Target className="h-5 w-5" />
            <p className="text-sm font-medium">Win Rate</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
            {metrics.winRate.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 shadow-sm transition-colors">
          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
            <Activity className="h-5 w-5" />
            <p className="text-sm font-medium">Discipline Score</p>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className={`text-2xl font-bold font-mono ${metrics.disciplineScore >= 80 ? 'text-emerald-500 dark:text-emerald-400' : metrics.disciplineScore >= 50 ? 'text-amber-500 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'}`}>
              {metrics.disciplineScore.toFixed(0)}
            </p>
            <span className="text-xs text-zinc-500">/ 100</span>
          </div>
        </div>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Equity Curve - spans 2 cols */}
        <div className="col-span-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm lg:col-span-2 transition-colors">
          <h3 className="mb-6 text-sm font-semibold text-zinc-700 dark:text-zinc-200">Account Growth Curve</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke={chartTextColor} 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  stroke={chartTextColor} 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                  itemStyle={{ color: isDarkMode ? '#a1a1aa' : '#52525b' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#6366f1" 
                  strokeWidth={2} 
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} 
                  activeDot={{ r: 6, fill: '#818cf8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Strategy Performance */}
        <div className="col-span-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm transition-colors">
          <h3 className="mb-6 text-sm font-semibold text-zinc-700 dark:text-zinc-200">Strategy P&L</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={strategyPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  stroke={chartTextColor} 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                   contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                   cursor={{fill: 'transparent'}}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {strategyPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

         {/* Setup Performance */}
         <div className="col-span-1 lg:col-span-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm transition-colors">
          <h3 className="mb-6 text-sm font-semibold text-zinc-700 dark:text-zinc-200">P&L by Setup / Pattern</h3>
          {setupPerformance.length === 0 || (setupPerformance.length === 1 && setupPerformance[0].name === "No Setup") ? (
             <div className="flex h-[200px] items-center justify-center text-zinc-500">
               <p>Tag your trades with a "Setup" (e.g. Bull Flag) to see analytics here.</p>
             </div>
          ) : (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={setupPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke={chartTextColor} 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke={chartTextColor} 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                    cursor={{fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {setupPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;