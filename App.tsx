import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, BookOpen, Settings, BarChart2 } from 'lucide-react';
import { Trade, Metrics, ArchivedSession } from './types';
import { INITIAL_TRADES } from './constants';
import Dashboard from './components/Dashboard';
import TradeJournal from './components/TradeJournal';
import Analytics from './components/Analytics';
import AICoach from './components/AICoach';
import SettingsPage from './components/Settings';

const App: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>(INITIAL_TRADES);
  const [initialCapital, setInitialCapital] = useState(10000);
  const [sessionStartDate, setSessionStartDate] = useState(new Date('2024-05-01').toISOString());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal' | 'analytics' | 'settings'>('dashboard');
  
  // Historical sessions
  const [archives, setArchives] = useState<ArchivedSession[]>([]);

  // Calculate Metrics on the fly
  const metrics: Metrics = useMemo(() => {
    const closedTrades = trades.filter(t => t.pnl !== undefined);
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;
    const totalDiscipline = trades.reduce((sum, t) => sum + t.disciplineScore, 0);
    
    // Simple Drawdown Calc (peak to valley)
    let peak = 0;
    let currentEquity = 0;
    let maxDD = 0;
    
    // Sort for equity calculation
    const sortedTrades = [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    
    sortedTrades.forEach(t => {
       if (t.pnl) currentEquity += t.pnl;
       if (currentEquity > peak) peak = currentEquity;
       const dd = peak - currentEquity;
       if (dd > maxDD) maxDD = dd;
    });

    return {
      totalTrades: trades.length,
      winRate,
      totalPnL,
      averagePnL: closedTrades.length > 0 ? totalPnL / closedTrades.length : 0,
      disciplineScore: trades.length > 0 ? totalDiscipline / trades.length : 0,
      maxDrawdown: maxDD
    };
  }, [trades]);

  const handleAddTrade = (newTrade: Trade) => {
    setTrades(prev => [newTrade, ...prev]);
  };

  const handleUpdateTrade = (updatedTrade: Trade) => {
    setTrades(prev => prev.map(t => t.id === updatedTrade.id ? updatedTrade : t));
  };

  const handleResetAccount = (newCapital: number) => {
    // 1. Create Archive
    const newArchive: ArchivedSession = {
      id: Date.now().toString(),
      startDate: sessionStartDate,
      endDate: new Date().toISOString(),
      initialCapital: initialCapital,
      finalBalance: initialCapital + metrics.totalPnL,
      totalPnL: metrics.totalPnL,
      tradeCount: trades.length,
      trades: [...trades] // deep copy recommended in production, shallow fine here
    };

    // 2. Update State
    setArchives(prev => [newArchive, ...prev]);
    setTrades([]);
    setInitialCapital(newCapital);
    setSessionStartDate(new Date().toISOString());
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-indigo-500/30">
      
      {/* Sidebar (Desktop) / Topbar (Mobile) */}
      <div className="fixed left-0 top-0 z-40 flex h-16 w-full items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 md:flex-col md:h-full md:w-64 md:items-start md:justify-start md:border-b-0 md:border-r md:py-6">
        
        <div className="flex items-center gap-3 md:px-2 md:mb-10">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-600 font-bold text-white">
            T
          </div>
          <span className="text-lg font-bold tracking-tight text-white">TradeMind</span>
        </div>

        <nav className="hidden md:flex w-full flex-col gap-2">
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
          />
          <NavButton 
            active={activeTab === 'journal'} 
            onClick={() => setActiveTab('journal')} 
            icon={<BookOpen size={20} />} 
            label="Journal" 
          />
          <div className="my-4 border-t border-zinc-800 mx-2"></div>
          <NavButton 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')} 
            icon={<BarChart2 size={20} />} 
            label="Analytics" 
          />
           <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<Settings size={20} />} 
            label="Settings" 
          />
        </nav>

        {/* Mobile Menu Toggle would go here, kept simple for this demo */}
      </div>

      {/* Main Content */}
      <main className="pt-20 px-4 pb-10 md:pl-72 md:pt-8 md:pr-8">
        
        {/* Header Area */}
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {activeTab === 'dashboard' ? 'Performance Overview' : 
               activeTab === 'journal' ? 'Trading Journal' : 
               activeTab === 'analytics' ? 'Analytics & History' : 'Settings'}
            </h1>
            <p className="text-sm text-zinc-400">
               {activeTab === 'settings' 
                 ? "Manage your account balance and historical sessions." 
                 : <span>Welcome back. Your current discipline score is <span className={metrics.disciplineScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{metrics.disciplineScore.toFixed(0)}%</span>.</span>}
            </p>
          </div>
        </header>

        {/* AI Coach Widget (Visible on main tabs) */}
        {activeTab !== 'settings' && (
          <div className="mb-8">
            <AICoach trades={trades} />
          </div>
        )}

        {/* Content Switcher */}
        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' ? (
            <Dashboard trades={trades} metrics={metrics} initialCapital={initialCapital} />
          ) : activeTab === 'journal' ? (
            <TradeJournal 
              trades={trades} 
              onAddTrade={handleAddTrade} 
              onUpdateTrade={handleUpdateTrade}
            />
          ) : activeTab === 'analytics' ? (
            <Analytics trades={trades} />
          ) : (
            <SettingsPage 
              currentBalance={initialCapital + metrics.totalPnL}
              initialCapital={initialCapital}
              tradeCount={trades.length}
              startDate={sessionStartDate}
              archives={archives}
              onReset={handleResetAccount}
            />
          )}
        </div>

      </main>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }> = ({ active, onClick, icon, label, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
      active 
        ? 'bg-indigo-500/10 text-indigo-400' 
        : disabled 
          ? 'cursor-not-allowed opacity-50 text-zinc-600'
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default App;