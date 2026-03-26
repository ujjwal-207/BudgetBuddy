import React, { useState, useEffect } from 'react';
import { useExpenseStore } from '../store/expenseStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface RecurringExpense {
  id: number;
  amount: number;
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  description: string | null;
  frequency: string;
}

interface MonthlySummary {
  from_daily: number;
  from_weekly: number;
  from_monthly: number;
  total: number;
}

export function Recurring() {
  const { categories } = useExpenseStore();
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category_id: '',
    description: '',
    frequency: 'monthly',
  });

  useEffect(() => {
    fetchRecurring();
    fetchSummary();
  }, []);

  const fetchRecurring = async () => {
    try {
      const response = await axios.get(`${API_URL}/recurring`);
      setRecurring(response.data);
    } catch (error) {
      console.error('Failed to fetch recurring expenses:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API_URL}/recurring/summary/monthly`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/recurring`, {
        amount: parseFloat(newExpense.amount),
        category_id: parseInt(newExpense.category_id),
        description: newExpense.description,
        frequency: newExpense.frequency,
      });
      setShowAddModal(false);
      setNewExpense({ amount: '', category_id: '', description: '', frequency: 'monthly' });
      fetchRecurring();
      fetchSummary();
    } catch (error) {
      console.error('Failed to add recurring expense:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/recurring/${id}`);
      fetchRecurring();
      fetchSummary();
    } catch (error) {
      console.error('Failed to delete recurring expense:', error);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="pt-8 px-4 max-w-4xl mx-auto space-y-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">
              🔄 Recurring Expenses
            </h1>
            <p className="text-white/80 text-sm mt-1">
              Manage your subscriptions and regular payments
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all btn-press shadow-lg"
          >
            + Add Recurring
          </button>
        </div>

        {/* Monthly Summary */}
        {summary && (
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-purple-200 dark:border-purple-800">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center gap-2">
              <span>📊</span> Monthly Commitment
            </h2>
            <div className="text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Rs. {summary.total.toFixed(2)}
            </div>
            <div className="grid grid-cols-3 gap-6 mt-6">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">From Daily</div>
                <div className="text-xl font-bold text-gray-800 dark:text-white">
                  Rs. {summary.from_daily.toFixed(2)}
                </div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">From Weekly</div>
                <div className="text-xl font-bold text-gray-800 dark:text-white">
                  Rs. {summary.from_weekly.toFixed(2)}
                </div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">From Monthly</div>
                <div className="text-xl font-bold text-gray-800 dark:text-white">
                  Rs. {summary.from_monthly.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recurring List */}
        <div className="space-y-3">
          {recurring.map((item) => (
            <div
              key={item.id}
              className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/20 dark:border-gray-700 flex items-center justify-between card-hover"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${item.category_color}25` }}
                >
                  {item.category_icon}
                </div>
                <div>
                  <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Rs. {parseFloat(item.amount.toString()).toFixed(2)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 font-medium">
                    {item.description || item.category_name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md font-semibold capitalize">
                      {item.frequency}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-400">{item.category_name}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-3 text-red-500 hover:bg-gradient-to-r hover:from-red-100 hover:to-orange-100 dark:hover:bg-red-900/30 rounded-xl transition-all"
              >
                🗑️
              </button>
            </div>
          ))}
          {recurring.length === 0 && (
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-white/20 dark:border-gray-700 text-center">
              <span className="text-6xl mb-4 block">📅</span>
              <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
                No recurring expenses yet
              </p>
              <p className="text-gray-400 dark:text-gray-500 mt-2">
                Add your subscriptions and regular payments above
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-slide-up">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <span>➕</span> Add Recurring Expense
            </h2>
            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white font-medium"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={newExpense.category_id}
                  onChange={(e) => setNewExpense({ ...newExpense, category_id: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white font-medium"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white font-medium"
                  placeholder="e.g., Netflix subscription"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Frequency
                </label>
                <select
                  value={newExpense.frequency}
                  onChange={(e) => setNewExpense({ ...newExpense, frequency: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white font-medium"
                >
                  <option value="daily">📅 Daily</option>
                  <option value="weekly">📆 Weekly</option>
                  <option value="monthly">🗓️ Monthly</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all btn-press shadow-lg"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
