import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type AuthPageProps = {
  onAuthenticated: (payload: { token: string; user: { id: number; username: string; role: string } }) => void;
};

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/auth/${mode}`, {
        username,
        password
      });
      onAuthenticated(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${mode}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-start sm:items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hero-shell rounded-[2rem] p-5 sm:p-8">
            <div className="hero-kicker text-xs font-semibold uppercase tracking-[0.32em]">BudgetBuddy</div>
            <h1 className="hero-title mt-4 text-3xl sm:text-5xl font-black">Know where every rupee lives.</h1>
            <p className="hero-copy mt-4 max-w-xl text-sm">
              Track income, expenses, savings accounts, cash, wallets, investments, and monthly deficits in one place.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="panel rounded-2xl px-4 py-3">Separate accounts for bank, cash, wallet, and savings</div>
              <div className="panel rounded-2xl px-4 py-3">Month-wise budgets based on what you actually kept to spend</div>
              <div className="panel rounded-2xl px-4 py-3">Investment gains and losses tracked separately from cash</div>
            </div>
          </section>

          <section className="panel rounded-[2rem] p-5 sm:p-8">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold ${mode === 'login' ? 'bg-white text-slate-950 dark:bg-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}
              >
                Login
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold ${mode === 'signup' ? 'bg-white text-slate-950 dark:bg-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Username"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                required
              />
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </div>
              )}
              <button className="rounded-2xl bg-slate-950 px-4 py-4 text-sm font-semibold text-white dark:bg-cyan-400 dark:text-slate-950">
                {loading ? 'Working...' : mode === 'login' ? 'Login' : 'Create account'}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              BudgetBuddy admin account for your current imported data: <span className="font-semibold">ujjwalnepal</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
