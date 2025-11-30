import React, { useState } from 'react';
import { User, Plus, ShieldCheck, Wallet, ChevronRight, Lock, KeyRound, ArrowLeft } from 'lucide-react';
import { UserProfile } from '../types';
import Logo from './Logo';

interface AuthScreenProps {
  users: UserProfile[];
  onLogin: (userId: string) => void;
  onCreateUser: (userData: { name: string; initialCapital: number; password?: string; securityQuestion?: string; securityAnswer?: string }) => void;
  onResetPassword: (userId: string, newPassword: string) => void;
}

type AuthView = 'list' | 'login' | 'create' | 'forgot' | 'reset';

const AuthScreen: React.FC<AuthScreenProps> = ({ users, onLogin, onCreateUser, onResetPassword }) => {
  const [view, setView] = useState<AuthView>('list');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Forms
  const [loginPassword, setLoginPassword] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [createForm, setCreateForm] = useState({
    name: '',
    initialCapital: '10000',
    password: '',
    securityQuestion: '',
    securityAnswer: ''
  });

  const selectedUser = users.find(u => u.id === selectedUserId);

  // Handlers
  const handleUserSelect = (user: UserProfile) => {
    if (!user.password) {
      onLogin(user.id);
    } else {
      setSelectedUserId(user.id);
      setError(null);
      setLoginPassword('');
      setView('login');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser && selectedUser.password === loginPassword) {
      onLogin(selectedUser.id);
    } else {
      setError('Incorrect password');
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name) return;
    
    if (createForm.password && (!createForm.securityQuestion || !createForm.securityAnswer)) {
      setError('Security Question and Answer are required if setting a password.');
      return;
    }

    onCreateUser({
      name: createForm.name.trim(),
      initialCapital: parseFloat(createForm.initialCapital) || 10000,
      password: createForm.password || undefined,
      securityQuestion: createForm.securityQuestion || undefined,
      securityAnswer: createForm.securityAnswer || undefined
    });
    
    setCreateForm({ name: '', initialCapital: '10000', password: '', securityQuestion: '', securityAnswer: '' });
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?.securityAnswer) return;

    if (recoveryAnswer.trim().toLowerCase() === selectedUser.securityAnswer.trim().toLowerCase()) {
      setView('reset');
      setError(null);
    } else {
      setError('Incorrect answer.');
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newPassword) return;
    
    onResetPassword(selectedUserId, newPassword);
    onLogin(selectedUserId);
  };

  const goBack = () => {
    setError(null);
    if (view === 'login' || view === 'create') setView('list');
    else if (view === 'forgot') setView('login');
    else if (view === 'reset') setView('forgot');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 font-sans text-zinc-900 dark:text-zinc-200 transition-colors duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-2xl backdrop-blur-sm">
        {/* Background Gradients */}
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>

        <div className="relative z-10 p-8">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <Logo className="h-20 w-20 drop-shadow-xl" />
            </div>
            <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              TradeMind
              <span className="rounded-full bg-indigo-100 dark:bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-300">
                Public Beta
              </span>
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Disciplined Trading Journal & AI Coach</p>
          </div>

          {/* VIEW: USER LIST */}
          {view === 'list' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="space-y-2">
                <p className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Select Profile</p>
                <div className="grid gap-3">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className="group flex w-full items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 transition-all hover:border-indigo-500/50 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          <User className="h-5 w-5" />
                          {user.password && (
                            <div className="absolute -bottom-1 -right-1 rounded-full bg-white dark:bg-zinc-900 p-0.5 shadow-sm">
                              <Lock className="h-3 w-3 text-zinc-400 group-hover:text-indigo-500" />
                            </div>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-700 dark:group-hover:text-white">{user.name}</p>
                          <p className="text-xs text-zinc-500">
                            {user.trades.length} trades • ${user.trades.reduce((sum, t) => sum + (t.pnl || 0), user.initialCapital).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/50">
                <button
                  onClick={() => { setError(null); setView('create'); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent py-3 text-sm font-medium text-zinc-500 dark:text-zinc-400 transition-colors hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                  Create New Profile
                </button>
              </div>
            </div>
          )}

          {/* VIEW: LOGIN */}
          {view === 'login' && selectedUser && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="text-center">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Welcome back, {selectedUser.name}</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Enter your password to continue</p>
              </div>
              
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="relative">
                   <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                   <input 
                     type="password"
                     autoFocus
                     value={loginPassword}
                     onChange={(e) => setLoginPassword(e.target.value)}
                     className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 pl-9 pr-4 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                     placeholder="Password"
                   />
                </div>
                {error && <p className="text-xs text-rose-500 text-center">{error}</p>}
                
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95"
                >
                  Unlock Journal
                </button>
              </form>

              <div className="flex items-center justify-between text-xs">
                 <button onClick={goBack} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1">
                   <ArrowLeft className="h-3 w-3" /> Back
                 </button>
                 {selectedUser.securityQuestion && (
                   <button onClick={() => { setError(null); setView('forgot'); }} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                     Forgot Password?
                   </button>
                 )}
              </div>
            </div>
          )}

          {/* VIEW: CREATE USER */}
          {view === 'create' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">New Trader Profile</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Set up your workspace</p>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      autoFocus
                      type="text"
                      required
                      value={createForm.name}
                      onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                      placeholder="e.g. Alpha Trader"
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 pl-9 pr-4 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Initial Capital</label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="number"
                      required
                      min="0"
                      step="100"
                      value={createForm.initialCapital}
                      onChange={(e) => setCreateForm({...createForm, initialCapital: e.target.value})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 pl-9 pr-4 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800/50 pt-4">
                   <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                     <ShieldCheck className="h-3 w-3" /> Security (Optional)
                   </h3>
                   <div className="space-y-3">
                      <div>
                        <input
                          type="password"
                          value={createForm.password}
                          onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                          placeholder="Set a Password"
                          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      {createForm.password && (
                        <div className="animate-in fade-in space-y-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                           <div>
                              <label className="mb-1 block text-[10px] text-zinc-500">Security Question (for recovery)</label>
                              <input
                                required
                                type="text"
                                value={createForm.securityQuestion}
                                onChange={(e) => setCreateForm({...createForm, securityQuestion: e.target.value})}
                                placeholder="e.g. What was my first pet's name?"
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                              />
                           </div>
                           <div>
                              <label className="mb-1 block text-[10px] text-zinc-500">Answer</label>
                              <input
                                required
                                type="text"
                                value={createForm.securityAnswer}
                                onChange={(e) => setCreateForm({...createForm, securityAnswer: e.target.value})}
                                placeholder="Answer"
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                              />
                           </div>
                        </div>
                      )}
                   </div>
                </div>

                {error && <p className="text-xs text-rose-500 text-center">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95"
                  >
                    Create Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {view === 'forgot' && selectedUser && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="text-center">
                 <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                   <KeyRound className="h-6 w-6" />
                 </div>
                 <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Password Recovery</h2>
                 <p className="text-xs text-zinc-500 dark:text-zinc-400">Answer your security question to reset</p>
               </div>

               <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4 border border-zinc-200 dark:border-zinc-800">
                 <p className="text-xs text-zinc-500 mb-1">Security Question:</p>
                 <p className="text-sm text-zinc-800 dark:text-zinc-200 font-medium">{selectedUser.securityQuestion}</p>
               </div>

               <form onSubmit={handleRecoverySubmit} className="space-y-4">
                 <div>
                    <input
                      autoFocus
                      type="text"
                      value={recoveryAnswer}
                      onChange={(e) => setRecoveryAnswer(e.target.value)}
                      placeholder="Enter your answer"
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 px-4 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                    />
                 </div>
                 {error && <p className="text-xs text-rose-500 text-center">{error}</p>}
                 
                 <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500">
                   Verify Answer
                 </button>
               </form>
                <button onClick={goBack} className="w-full text-center text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Back</button>
             </div>
          )}

          {/* VIEW: RESET PASSWORD */}
          {view === 'reset' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                 <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Set New Password</h2>
                 <p className="text-xs text-zinc-500 dark:text-zinc-400">Identity Verified</p>
               </div>
               
               <form onSubmit={handleResetSubmit} className="space-y-4">
                 <div className="relative">
                   <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                   <input
                      type="password"
                      autoFocus
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New Password"
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 pl-9 pr-4 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                    />
                 </div>
                 <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500">
                   Update & Login
                 </button>
               </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthScreen;