import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, BookOpen, Settings, BarChart2, Menu, X, LogOut } from 'lucide-react';
import { Trade, Metrics, ArchivedSession, UserSettings, UserProfile } from './types';
import { INITIAL_TRADES } from './constants';
import Dashboard from './components/Dashboard';
import TradeJournal from './components/TradeJournal';
import Analytics from './components/Analytics';
import AICoach from './components/AICoach';
import SettingsPage from './components/Settings';
import AuthScreen from './components/AuthScreen';
import SplashScreen from './components/SplashScreen';

const STORAGE_KEY = 'trademind_data_v1';

const App: React.FC = () => {
  // --- Splash Screen State ---
  const [showSplash, setShowSplash] = useState(true);

  // --- User Management State ---
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (e) {
      console.error("Failed to load from local storage", e);
    }
    
    // Default initial state if no storage found
    return [
      {
        id: 'demo-user',
        name: 'Demo Trader',
        trades: INITIAL_TRADES,
        initialCapital: 10000,
        startDate: new Date('2024-05-01').toISOString(),
        archives: [],
        settings: {
          defaultTargetPercent: 40,
          defaultStopLossPercent: 20,
          maxTradesPerDay: 3
        }
      }
    ];
  });

  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal' | 'analytics' | 'settings'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Persistence Effect ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  // --- Splash Effect ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000); // Show splash for 3 seconds
    return () => clearTimeout(timer);
  }, []);

  // --- Derived Active User ---
  const activeUser = useMemo(() => 
    users.find(u => u.id === activeUserId) || null
  , [users, activeUserId]);

  // --- Helpers ---
  const updateActiveUser = (updater: (user: UserProfile) => UserProfile) => {
    if (!activeUserId) return;
    setUsers(prev => prev.map(u => u.id === activeUserId ? updater(u) : u));
  };

  // --- Calculate Metrics ---
  const metrics: Metrics = useMemo(() => {
    if (!activeUser) return {
      totalTrades: 0, winRate: 0, totalPnL: 0, averagePnL: 0, disciplineScore: 0, maxDrawdown: 0
    };

    const trades = activeUser.trades;
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
  }, [activeUser]);

  // --- Handlers ---
  
  const handleLogin = (userId: string) => {
    setActiveUserId(userId);
    setActiveTab('dashboard');
  };

  const handleCreateUser = (userData: { name: string; initialCapital: number; password?: string; securityQuestion?: string; securityAnswer?: string }) => {
    const newUser: UserProfile = {
      id: Date.now().toString(),
      name: userData.name,
      initialCapital: userData.initialCapital,
      startDate: new Date().toISOString(),
      trades: [],
      archives: [],
      settings: {
        defaultTargetPercent: 30,
        defaultStopLossPercent: 15,
        maxTradesPerDay: 5
      },
      password: userData.password,
      securityQuestion: userData.securityQuestion,
      securityAnswer: userData.securityAnswer
    };
    setUsers(prev => [...prev, newUser]);
    setActiveUserId(newUser.id);
    setActiveTab('dashboard');
  };

  const handleResetPassword = (userId: string, newPassword: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u));
  };

  const handleLogout = () => {
    setActiveUserId(null);
    setIsMobileMenuOpen(false);
  };

  const handleAddTrade = (newTrade: Trade) => {
    updateActiveUser(u => ({ ...u, trades: [newTrade, ...u.trades] }));
  };

  const handleUpdateTrade = (updatedTrade: Trade) => {
    updateActiveUser(u => ({
      ...u,
      trades: u.trades.map(t => t.id === updatedTrade.id ? updatedTrade : t)
    }));
  };

  const handleDeleteTrade = (tradeId: string) => {
    updateActiveUser(u => ({
      ...u,
      trades: u.trades.filter(t => t.id !== tradeId)
    }));
  };

  const handleUpdateSettings = (newSettings: UserSettings) => {
    updateActiveUser(u => ({ ...u, settings: newSettings }));
  };

  const handleResetAccount = (newCapital: number) => {
    if (!activeUser) return;

    // 1. Create Archive
    const newArchive: ArchivedSession = {
      id: Date.now().toString(),
      startDate: activeUser.startDate,
      endDate: new Date().toISOString(),
      initialCapital: activeUser.initialCapital,
      finalBalance: activeUser.initialCapital + metrics.totalPnL,
      totalPnL: metrics.totalPnL,
      tradeCount: activeUser.trades.length,
      trades: [...activeUser.trades]
    };

    // 2. Update User Profile
    updateActiveUser(u => ({
      ...u,
      archives: [newArchive, ...u.archives],
      trades: [],
      initialCapital: newCapital,
      startDate: new Date().toISOString()
    }));
    
    setActiveTab('dashboard');
  };

  const handleImportProfile = (importedProfile: UserProfile) => {
    if (!activeUserId) return;
    
    // Validate key fields
    if (!importedProfile.trades || !importedProfile.settings || !importedProfile.name) {
      alert("Invalid backup file. Missing required profile data.");
      return;
    }

    // Confirm overwrite
    if (window.confirm(`This will overwrite the current profile for "${activeUser?.name}" with data from "${importedProfile.name}". This cannot be undone. Are you sure?`)) {
       updateActiveUser(u => ({
         ...importedProfile,
         id: u.id, // Keep the current ID/auth reference
         password: u.password, // Keep current security credentials
         securityQuestion: u.securityQuestion,
         securityAnswer: u.securityAnswer
       }));
       alert("Profile restored successfully.");
       setActiveTab('dashboard');
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  // --- Render ---

  if (showSplash) {
    return <SplashScreen />;
  }

  if (!activeUser) {
    return (
      <AuthScreen 
        users={users} 
        onLogin={handleLogin} 
        onCreateUser={handleCreateUser} 
        onResetPassword={handleResetPassword}
      />
    );
  }

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

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex w-full flex-col gap-2 h-full">
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

          <div className="mt-auto pt-4 border-t border-zinc-800">
             <div className="px-4 py-3 mb-2 flex items-center gap-3 rounded-lg bg-zinc-900/50">
               <div className="h-8 w-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                 {activeUser.name.charAt(0).toUpperCase()}
               </div>
               <div className="overflow-hidden">
                 <p className="text-sm font-medium text-white truncate">{activeUser.name}</p>
                 <p className="text-[10px] text-zinc-500 truncate">Pro Plan</p>
               </div>
             </div>
             <button 
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-rose-400 transition-colors"
             >
                <LogOut size={20} />
                Sign Out
             </button>
          </div>
        </nav>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-zinc-950 pt-20 px-4 md:hidden animate-in slide-in-from-top-5 fade-in duration-200">
           <nav className="flex flex-col gap-2">
              <NavButton 
                active={activeTab === 'dashboard'} 
                onClick={() => handleTabChange('dashboard')} 
                icon={<LayoutDashboard size={20} />} 
                label="Dashboard" 
              />
              <NavButton 
                active={activeTab === 'journal'} 
                onClick={() => handleTabChange('journal')} 
                icon={<BookOpen size={20} />} 
                label="Journal" 
              />
              <div className="my-2 border-t border-zinc-800 mx-2"></div>
              <NavButton 
                active={activeTab === 'analytics'} 
                onClick={() => handleTabChange('analytics')} 
                icon={<BarChart2 size={20} />} 
                label="Analytics" 
              />
              <NavButton 
                active={activeTab === 'settings'} 
                onClick={() => handleTabChange('settings')} 
                icon={<Settings size={20} />} 
                label="Settings" 
              />
              <button 
                onClick={handleLogout}
                className="mt-4 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20"
             >
                <LogOut size={20} />
                Sign Out
             </button>
           </nav>
        </div>
      )}

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
                 ? "Manage account balance, risk defaults, and history." 
                 : <span>Welcome back, {activeUser.name}. Your current discipline score is <span className={metrics.disciplineScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{metrics.disciplineScore.toFixed(0)}%</span>.</span>}
            </p>
          </div>
        </header>

        {/* AI Coach Widget (Visible on main tabs) */}
        {activeTab !== 'settings' && (
          <div className="mb-8">
            <AICoach trades={activeUser.trades} />
          </div>
        )}

        {/* Content Switcher */}
        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' ? (
            <Dashboard trades={activeUser.trades} metrics={metrics} initialCapital={activeUser.initialCapital} />
          ) : activeTab === 'journal' ? (
            <TradeJournal 
              trades={activeUser.trades} 
              userSettings={activeUser.settings}
              onAddTrade={handleAddTrade} 
              onUpdateTrade={handleUpdateTrade}
              onDeleteTrade={handleDeleteTrade}
            />
          ) : activeTab === 'analytics' ? (
            <Analytics trades={activeUser.trades} />
          ) : (
            <SettingsPage 
              userProfile={activeUser}
              onUpdateSettings={handleUpdateSettings}
              onReset={handleResetAccount}
              onImportProfile={handleImportProfile}
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