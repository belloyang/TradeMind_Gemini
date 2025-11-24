import React, { useState } from 'react';
import { User, Plus, ArrowRight, ShieldCheck, Wallet, ChevronRight } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthScreenProps {
  users: UserProfile[];
  onLogin: (userId: string) => void;
  onCreateUser: (name: string, initialCapital: number) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ users, onLogin, onCreateUser }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCapital, setNewCapital] = useState('10000');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onCreateUser(newName.trim(), parseFloat(newCapital) || 10000);
      setNewName('');
      setNewCapital('10000');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-2xl backdrop-blur-sm">
        {/* Background Gradients */}
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl"></div>

        <div className="relative z-10 p-8">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-lg shadow-indigo-900/20">
                <span className="font-mono text-3xl font-bold text-white">T</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">TradeMind</h1>
            <p className="mt-2 text-sm text-zinc-400">Disciplined Trading Journal & AI Coach</p>
          </div>

          {!isCreating ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="space-y-2">
                <p className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Select Profile</p>
                <div className="grid gap-3">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => onLogin(user.id)}
                      className="group flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-indigo-500/50 hover:bg-zinc-800"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-zinc-200 group-hover:text-white">{user.name}</p>
                          <p className="text-xs text-zinc-500">
                            {user.trades.length} trades • ${user.trades.reduce((sum, t) => sum + (t.pnl || 0), user.initialCapital).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/50">
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-transparent py-3 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                  Create New Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white">New Trader Profile</h2>
                <p className="text-xs text-zinc-400">Set up your workspace</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      autoFocus
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Alpha Trader"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Initial Capital</label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="number"
                      required
                      min="0"
                      step="100"
                      value={newCapital}
                      onChange={(e) => setNewCapital(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 rounded-lg border border-zinc-700 bg-transparent py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-900/20 transition-all hover:bg-indigo-500 active:scale-95"
                  >
                    Create Profile
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;