import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { History } from './pages/History';
import { Budgets } from './pages/Budgets';
import { ShoppingLog } from './pages/ShoppingLog';
import { Recurring } from './pages/Recurring';
import { Income } from './pages/Income';
import { Investments } from './pages/Investments';
import { MoneyMap } from './pages/MoneyMap';
import { Accounts } from './pages/Accounts';
import { AuthPage } from './pages/AuthPage';
import { useExpenseStore } from './store/expenseStore';
import { API_URL } from './lib/api';

function Navigation({ user, onLogout }: { user: { username: string; role: string }; onLogout: () => void }) {
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'true' : prefersDark;
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  const toggleDark = () => {
    const newValue = !isDark;
    setIsDark(newValue);
    localStorage.setItem('darkMode', newValue.toString());
    document.documentElement.classList.toggle('dark', newValue);
  };

  const navItems = [
    { path: '/', label: 'Overview', icon: '◎' },
    { path: '/history', label: 'Records', icon: '⋮' },
    { path: '/accounts', label: 'Accounts', icon: '▣' },
    { path: '/income', label: 'Cashflow', icon: '↗' },
    { path: '/budgets', label: 'Budget', icon: '◌' },
    { path: '/investments', label: 'Invest', icon: '◢' },
  ];

  return (
    <nav className="fixed bottom-3 left-0 right-0 z-40 px-2 sm:bottom-4 sm:px-3">
      <div className="panel relative mx-auto max-w-5xl overflow-x-auto rounded-[2rem] px-2 py-2 sm:px-3 sm:py-3">
        <div className="flex min-w-max items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex min-w-[4.2rem] flex-col items-center rounded-2xl px-2 py-2 transition-all duration-300 sm:min-w-[4.5rem] sm:px-3 ${
                  isActive
                    ? 'text-slate-950 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 -z-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                )}
                <span className="text-xl font-black">{item.icon}</span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] sm:text-[11px] sm:tracking-[0.18em]">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={toggleDark}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 transition-all hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 sm:p-3 sm:text-base"
          >
            {isDark ? 'Sun' : 'Moon'}
          </button>
          <button
            onClick={onLogout}
            className="rounded-2xl border border-slate-200 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700 dark:border-white/10 dark:text-slate-300 sm:px-3 sm:py-3 sm:text-xs sm:tracking-[0.18em]"
          >
            {user.username}
          </button>
        </div>
      </div>
    </nav>
  );
}

function App() {
  const { fetchCategories, fetchAccounts } = useExpenseStore();
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<{ id: number; username: string; role: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setAuthReady(true);
      return;
    }

    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    axios
      .get(`${API_URL}/auth/me`)
      .then((response) => setUser(response.data))
      .catch(() => {
        delete axios.defaults.headers.common.Authorization;
        localStorage.removeItem('authToken');
      })
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchCategories();
    fetchAccounts();
  }, [fetchAccounts, fetchCategories, user]);

  const handleAuthenticated = ({ token, user: nextUser }: { token: string; user: { id: number; username: string; role: string } }) => {
    localStorage.setItem('authToken', token);
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    setUser(nextUser);
    setAuthReady(true);
  };

  const handleLogout = () => {
    delete axios.defaults.headers.common.Authorization;
    localStorage.removeItem('authToken');
    setUser(null);
  };

  if (!authReady) {
    return <div className="min-h-screen" />;
  }

  if (!user) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <BrowserRouter>
      <div className="app-shell min-h-screen transition-colors duration-500">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/money-map" element={<MoneyMap />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/history" element={<History />} />
          <Route path="/income" element={<Income />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/shopping" element={<ShoppingLog />} />
          <Route path="/recurring" element={<Recurring />} />
        </Routes>
        <Navigation user={user} onLogout={handleLogout} />
      </div>
    </BrowserRouter>
  );
}

export default App;
