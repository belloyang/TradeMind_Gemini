import React, { useState } from 'react';
import { Lock, Mail, UserPlus, LogIn, Loader2, Wallet } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (name: string, email: string, password: string, initialCapital: number) => Promise<void>;
  loading?: boolean;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onSignup, loading }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', initialCapital: '10000' });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'login') {
        await onLogin(form.email.trim(), form.password);
      } else {
        await onSignup(form.name.trim(), form.email.trim(), form.password, parseFloat(form.initialCapital) || 10000);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 font-sans text-zinc-900 dark:text-zinc-200 transition-colors duration-300">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold">TradeMind</h1>
          <p className="text-sm text-zinc-500">Sign in to sync your trading journal</p>
        </div>

        <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-sm">
          <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-lg ${mode === 'login' ? 'bg-white dark:bg-zinc-900 shadow-sm font-semibold' : 'text-zinc-500'}`}>Login</button>
          <button onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-lg ${mode === 'signup' ? 'bg-white dark:bg-zinc-900 shadow-sm font-semibold' : 'text-zinc-500'}`}>Create Account</button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Name</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 pl-10 pr-3 text-sm" placeholder="Your name" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 pl-10 pr-3 text-sm" placeholder="you@example.com" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 pl-10 pr-3 text-sm" placeholder="••••••••" />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Initial Capital</label>
              <input type="number" value={form.initialCapital} onChange={e => setForm({ ...form, initialCapital: e.target.value })} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 px-3 text-sm" />
            </div>
          )}

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
