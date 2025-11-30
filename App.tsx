import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, BookOpen, Settings, BarChart2, Menu, X, LogOut, Sun, Moon, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { Trade, Metrics, ArchivedSession, UserSettings, UserProfile } from './types';
import Dashboard from './components/Dashboard';
import TradeJournal from './components/TradeJournal';
import Analytics from './components/Analytics';
import AICoach from './components/AICoach';
import SettingsPage from './components/Settings';
import AuthScreen from './components/AuthScreen';
import SplashScreen from './components/SplashScreen';
import PricingModal from './components/PricingModal';
import Logo from './components/Logo';
import { dataService } from './services/dataService';
import { paymentService } from './services/paymentService';

const THEME_KEY = 'trademind_theme';

const App: React.FC = () => {
  // --- Splash Screen State ---
  const [showSplash, setShowSplash] = useState(true);

  // --- Theme State ---
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'dark';
    }
  });

  const isDarkMode = theme === 'dark';

  // --- User Management State ---
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal' | 'analytics' | 'settings'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  // --- Initial Data Load ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedUsers = await dataService.loadUsers();
        setUsers(loadedUsers);
      } catch (e) {
        console.error("Failed to load users", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // --- Theme Effect ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // --- Splash Effect ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000); // Show splash for 3 seconds
    return () => clearTimeout(timer);
  }, []);

  // --- Check for Payment Success (Redirect) ---
  useEffect(() => {
    if (paymentService.checkPaymentSuccess() && activeUserId) {
      updateActiveUser(u => ({ ...u, subscriptionTier: 'pro' }));
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      alert("Payment successful! Pro features unlocked.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  // --- Derived Active User ---
  const activeUser = useMemo(() => 
    users.find(u => u.id === activeUserId) || null
  , [users, activeUserId]);

  // --- Helpers ---
  const updateActiveUser = async (updater: (user: UserProfile) => UserProfile) => {
    if (!activeUserId) return;
    const currentUser = users.find(u => u.id === activeUserId);
    if (!currentUser) return;
    const updatedUser = updater(currentUser);
    setUsers(prev => prev.map(u => u.id === activeUserId ? updatedUser : u));
    await dataService.saveUser(updatedUser);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // --- Calculate Metrics ---
  const metrics: Metrics = useMemo(() => {
    if (!activeUser) return { totalTrades: 0, winRate: 0, totalPnL: 0, averagePnL: 0, disciplineScore: 0, maxDrawdown: 0 };
    const trades = activeUser.trades;
    const closedTrades = trades.filter(t => t.pnl !== undefined);
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;
    const totalDiscipline = trades.reduce((sum, t) => sum + t.disciplineScore, 0);
    
    let peak = 0; let currentEquity = 0; let maxDD = 0;
    const sortedTrades = [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    sortedTrades.forEach(t => { if (t.pnl) currentEquity += t.pnl; if (currentEquity > peak) peak = currentEquity; const dd = peak - currentEquity; if (dd > maxDD) maxDD = dd; });

    return { totalTrades: trades.length, winRate, totalPnL, averagePnL: closedTrades.length > 0 ? totalPnL / closedTrades.length : 0, disciplineScore: trades.length > 0 ? totalDiscipline / trades.length : 0, maxDrawdown: maxDD };
  }, [activeUser]);

  // --- Handlers ---
  
  const handleLogin = (userId: string) => { setActiveUserId(userId); setActiveTab('dashboard'); };

  const handleCreateUser = async (userData: { name: string; initialCapital: number; password?: string; securityQuestion?: string; securityAnswer?: string }) => {
    const newUser: UserProfile = {
      id: Date.now().toString(), name: userData.name, initialCapital: userData.initialCapital, startDate: new Date().toISOString(), trades: [], archives: [],
      settings: { defaultTargetPercent: 30, defaultStopLossPercent: 15, maxTradesPerDay: 5, maxRiskPerTradePercent: 4, checklistConfig: [] },
      password: userData.password, securityQuestion: userData.securityQuestion, securityAnswer: userData.securityAnswer,
      // SOFT LAUNCH: Give everyone PRO access by default during beta
      subscriptionTier: 'pro'
    };
    setUsers(prev => [...prev, newUser]); await dataService.saveUser(newUser); setActiveUserId(newUser.id); setActiveTab('dashboard');
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    const user = users.find(u => u.id === userId); if (!user) return;
    const updatedUser = { ...user, password: newPassword };
    setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u)); await dataService.saveUser(updatedUser);
  };

  const handleLogout = () => { setActiveUserId(null); setIsMobileMenuOpen(false); };
  const handleAddTrade = (newTrade: Trade) => { updateActiveUser(u => ({ ...u, trades: [newTrade, ...u.trades] })); };
  const handleUpdateTrade = (updatedTrade: Trade) => { updateActiveUser(u => ({ ...u, trades: u.trades.map(t => t.id === updatedTrade.id ? updatedTrade : t) })); };
  const handleDeleteTrade = (tradeId: string) => { updateActiveUser(u => ({ ...u, trades: u.trades.filter(t => t.id !== tradeId) })); };
  const handleUpdateSettings = (newSettings: UserSettings) => { updateActiveUser(u => ({ ...u, settings: newSettings })); };

  const handleResetAccount = (newCapital: number) => {
    if (!activeUser) return;
    const newArchive: ArchivedSession = { id: Date.now().toString(), startDate: activeUser.startDate, endDate: new Date().toISOString(), initialCapital: activeUser.initialCapital, finalBalance: activeUser.initialCapital + metrics.totalPnL, totalPnL: metrics.totalPnL, tradeCount: activeUser.trades.length, trades: [...activeUser.trades] };
    updateActiveUser(u => ({ ...u, archives: [newArchive, ...u.archives], trades: [], initialCapital: newCapital, startDate: new Date().toISOString() }));
    setActiveTab('dashboard');
  };

  const handleImportProfile = async (importedProfile: UserProfile) => {
    if (!activeUserId) return;
    if (!importedProfile.trades || !importedProfile.settings || !importedProfile.name) { alert("Invalid backup file."); return; }
    if (window.confirm(`Overwrite current profile with data from "${importedProfile.name}"?`)) {
       await updateActiveUser(u => ({ ...importedProfile, id: u.id, password: u.password, securityQuestion: u.securityQuestion, securityAnswer: u.securityAnswer }));
       alert("Profile restored successfully."); setActiveTab('dashboard');
    }
  };

  const handleTabChange = (tab: typeof activeTab) => { setActiveTab(tab); setIsMobileMenuOpen(false); };

  const handleUpgrade = async () => {
    // SOFT LAUNCH: Just toggle for now if testing manually
    // In production, this would call paymentService.initiateCheckout(activeUser)
    
    // For Beta feedback loop
    alert("During the Beta period, all Pro features are free! Enjoy.");
    if (activeUser?.subscriptionTier === 'free') {
       await updateActiveUser(u => ({ ...u, subscriptionTier: 'pro' }));
    }
    setShowPricing(false);
  };

  // --- Render ---

  if (showSplash) return <SplashScreen />;
  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"><div className="flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /><p>Loading Journal Database...</p></div></div>;
  if (!activeUser) return <AuthScreen users={users} onLogin={handleLogin} onCreateUser={handleCreateUser} onResetPassword={handleResetPassword} />;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} onUpgrade={handleUpgrade} />}

      {/* Sidebar (Desktop) */}
      <div className="fixed left-0 top-0 z-40 flex h-16 w-full items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 md:flex-col md:h-full md:w-64 md:items-start md:justify-start md:border-b-0 md:border-r md:py-6 transition-colors duration-300">
        <div className="flex items-center gap-3 md:px-2 md:mb-10">
          <Logo className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">TradeMind</span>
        </div>
        
        {/* Mobile Toggles */}
        <div className="flex items-center gap-2 md:hidden">
          <button onClick={toggleTheme} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">{isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
          <button className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>{isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
        </div>

        <nav className="hidden md:flex w-full flex-col gap-2 h-full">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavButton active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} icon={<BookOpen size={20} />} label="Journal" />
          <div className="my-4 border-t border-zinc-200 dark:border-zinc-800 mx-2"></div>
          <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart2 size={20} />} label="Analytics" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label="Settings" />

          {/* Upgrade Button Hidden During Beta or if already Pro */}
          {activeUser.subscriptionTier === 'free' && (
             <div className="mt-4 px-2">
                <button 
                  onClick={() => setShowPricing(true)}
                  className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100"></div>
                  <Sparkles size={16} className="text-yellow-300" />
                  Upgrade to Pro
                </button>
             </div>
          )}
          
          <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800 w-full">
             {/* Feedback Link for Soft Launch */}
             <a href="mailto:by.business@outlook.com?subject=TradeMind Beta Feedback" target="_blank" className="mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
               <MessageSquare size={18} /> Give Feedback
             </a>
             <button onClick={toggleTheme} className="mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}{isDarkMode ? 'Light Mode' : 'Dark Mode'}</button>
             <div className="px-4 py-3 mb-2 flex items-center gap-3 rounded-lg bg-zinc-100 dark:bg-zinc-900/50">
               <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">{activeUser.name.charAt(0).toUpperCase()}</div>
               <div className="overflow-hidden"><p className="text-sm font-medium truncate">{activeUser.name}</p><p className="text-[10px] text-zinc-500 truncate capitalize">Beta User</p></div>
             </div>
             <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-rose-500"><LogOut size={20} /> Sign Out</button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-zinc-50 dark:bg-zinc-950 pt-20 px-4 md:hidden animate-in slide-in-from-top-5 fade-in duration-200">
           <nav className="flex flex-col gap-2">
              <NavButton active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
              <NavButton active={activeTab === 'journal'} onClick={() => handleTabChange('journal')} icon={<BookOpen size={20} />} label="Journal" />
              <div className="my-2 border-t border-zinc-200 dark:border-zinc-800 mx-2"></div>
              <NavButton active={activeTab === 'analytics'} onClick={() => handleTabChange('analytics')} icon={<BarChart2 size={20} />} label="Analytics" />
              <NavButton active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} icon={<Settings size={20} />} label="Settings" />
              
              <a href="mailto:by.business@outlook.com?subject=TradeMind Beta Feedback" target="_blank" className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 py-3 text-sm font-bold text-emerald-600">
                  <MessageSquare size={16} /> Give Feedback
              </a>

               {activeUser.subscriptionTier === 'free' && (
                <button onClick={() => { setIsMobileMenuOpen(false); setShowPricing(true); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white">
                  <Sparkles size={16} /> Upgrade to Pro
                </button>
              )}

              <button onClick={handleLogout} className="mt-4 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-rose-500 bg-rose-50 dark:bg-rose-500/10 border border-rose-200"><LogOut size={20} /> Sign Out</button>
           </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-20 px-4 pb-10 md:pl-72 md:pt-8 md:pr-8 transition-colors duration-300">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{activeTab === 'dashboard' ? 'Performance Overview' : activeTab === 'journal' ? 'Trading Journal' : activeTab === 'analytics' ? 'Analytics & History' : 'Settings'}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{activeTab === 'settings' ? "Manage account balance, risk defaults, and history." : <span>Welcome back, {activeUser.name}. Your current discipline score is <span className={metrics.disciplineScore >= 80 ? 'text-emerald-500' : 'text-amber-500'}>{metrics.disciplineScore.toFixed(0)}%</span>.</span>}</p>
          </div>
        </header>

        {activeTab !== 'settings' && <div className="mb-8"><AICoach trades={activeUser.trades} subscriptionTier={activeUser.subscriptionTier} onUpgradeClick={() => setShowPricing(true)} /></div>}

        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' ? <Dashboard trades={activeUser.trades} metrics={metrics} initialCapital={activeUser.initialCapital} isDarkMode={isDarkMode} /> : 
           activeTab === 'journal' ? <TradeJournal trades={activeUser.trades} userSettings={activeUser.settings} initialCapital={activeUser.initialCapital} subscriptionTier={activeUser.subscriptionTier} onAddTrade={handleAddTrade} onUpdateTrade={handleUpdateTrade} onDeleteTrade={handleDeleteTrade} onUpgradeClick={() => setShowPricing(true)} /> : 
           activeTab === 'analytics' ? <Analytics trades={activeUser.trades} isDarkMode={isDarkMode} /> : 
           <SettingsPage userProfile={activeUser} onUpdateSettings={handleUpdateSettings} onReset={handleResetAccount} onImportProfile={handleImportProfile} />}
        </div>
      </main>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }> = ({ active, onClick, icon, label, disabled }) => (
  <button onClick={onClick} disabled={disabled} className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${active ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' : disabled ? 'cursor-not-allowed opacity-50' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 dark:text-zinc-400'}`}>{icon}{label}</button>
);

export default App;