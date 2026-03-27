import React, { useState, useEffect } from 'react';
import { useExpenseStore } from '../store/expenseStore';
import { QuickAddBar } from '../components/QuickAddBar';
import { ExpenseCard } from '../components/ExpenseCard';
import { ReflectionPrompt } from '../components/ReflectionPrompt';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface ShoppingStats {
  total_items: number;
  total_spent: number;
  breakdown: {
    necessity: number;
    investment: number;
    luxury: number;
    impulse: number;
  };
  reflections: {
    worth_it: number;
    okay: number;
    regret: number;
    total: number;
  };
  regret_rate: number;
  impulse_regret_rate: number;
}

export function ShoppingLog() {
  const { deleteExpense } = useExpenseStore();
  const [shoppingItems, setShoppingItems] = useState<any[]>([]);
  const [stats, setStats] = useState<ShoppingStats | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [pendingReflections, setPendingReflections] = useState<any[]>([]);
  const [activeReflection, setActiveReflection] = useState<any | null>(null);

  useEffect(() => {
    fetchShoppingItems();
    fetchStats();
    fetchPendingReflections();
  }, []);

  const fetchShoppingItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/shopping/items`);
      setShoppingItems(response.data);
    } catch (error) {
      console.error('Failed to fetch shopping items:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const [statsRes, reflectionStatsRes] = await Promise.all([
        axios.get(`${API_URL}/shopping/stats`),
        axios.get(`${API_URL}/expenses/reflection-stats`)
      ]);
      
      setStats({
        ...statsRes.data,
        impulse_regret_rate: reflectionStatsRes.data.impulse_regret_rate
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchPendingReflections = async () => {
    try {
      const response = await axios.get(`${API_URL}/expenses/pending-reflections`);
      setPendingReflections(response.data);
    } catch (error) {
      console.error('Failed to fetch pending reflections:', error);
    }
  };

  const handleReflection = async (expenseId: number, verdict: 'worth_it' | 'okay' | 'regret') => {
    try {
      await axios.post(`${API_URL}/expenses/${expenseId}/reflect`, { verdict });
      setActiveReflection(null);
      setPendingReflections(prev => prev.filter(p => p.id !== expenseId));
      fetchStats();
    } catch (error) {
      console.error('Failed to submit reflection:', error);
    }
  };

  const filteredItems = filter === 'all'
    ? shoppingItems
    : filter === 'regretted'
    ? shoppingItems.filter(item => item.reflection_verdict === 'regret')
    : shoppingItems.filter((item) => item.item_type?.toLowerCase() === filter.toLowerCase());

  // Calculate breakdown percentages
  const totalSpent = stats?.total_spent || 0;
  const breakdown = stats?.breakdown || { necessity: 0, investment: 0, luxury: 0, impulse: 0 };

  return (
    <div className="min-h-screen pb-28">
      <QuickAddBar />
      
      <div className="pt-24 px-4 max-w-6xl mx-auto space-y-6 animate-slide-up">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
            🛒 Shopping Log
          </h1>
          <p className="text-white/80 text-sm mt-1">
            Track your shopping purchases and reflect on them
          </p>
        </div>

        {/* Pending Reflections - Highlighted Section */}
        {pendingReflections.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">👆</span>
              <div>
                <h3 className="font-bold text-yellow-700 dark:text-yellow-400">
                  {pendingReflections.length} purchase{pendingReflections.length > 1 ? 's' : ''} need your reflection
                </h3>
                <p className="text-sm text-yellow-600 dark:text-yellow-500">
                  You bought these items a week ago. Were they worth it?
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {pendingReflections.slice(0, 3).map((item) => (
                <ReflectionPrompt
                  key={item.id}
                  expense={item}
                  onSubmit={(verdict) => handleReflection(item.id, verdict)}
                  onDismiss={() => setActiveReflection(null)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/20 dark:border-gray-700">
              <div className="text-3xl mb-2">📦</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {stats.total_items}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Items</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-5 shadow-xl border border-purple-200 dark:border-purple-800">
              <div className="text-3xl mb-2">💸</div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Rs. {stats.total_spent.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Spent</div>
            </div>
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/20 dark:border-gray-700">
              <div className="text-3xl mb-2">💭</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {stats.reflections.total}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Reflections</div>
            </div>
            <div className={`rounded-2xl p-5 shadow-xl border ${
              stats.impulse_regret_rate > 30 
                ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-200 dark:border-red-800'
                : 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-200 dark:border-green-800'
            }`}>
              <div className="text-3xl mb-2">{stats.impulse_regret_rate > 30 ? '😬' : '😊'}</div>
              <div className={`text-2xl font-bold ${stats.impulse_regret_rate > 30 ? 'text-red-500' : 'text-green-500'}`}>
                {stats.impulse_regret_rate}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Impulse Regret Rate</div>
            </div>
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/20 dark:border-gray-700">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {stats.reflections.worth_it}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Worth It</div>
            </div>
          </div>
        )}

        {/* Breakdown Bar */}
        {totalSpent > 0 && (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/20 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
              Purchase Type Breakdown
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { type: 'necessity', label: 'Necessity', color: 'green', emoji: '✅' },
                { type: 'investment', label: 'Investment', color: 'blue', emoji: '📈' },
                { type: 'luxury', label: 'Luxury', color: 'purple', emoji: '💎' },
                { type: 'impulse', label: 'Impulse', color: 'orange', emoji: '⚡' },
              ].map((item) => {
                const value = breakdown[item.type as keyof typeof breakdown] || 0;
                const percentage = totalSpent > 0 ? (value / totalSpent) * 100 : 0;
                return (
                  <div key={item.type} className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {item.emoji} {item.label}
                      </span>
                      <span className="text-xs font-bold text-gray-800 dark:text-white">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 bg-${item.color}-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: '📋 All', color: 'gray' },
            { value: 'necessity', label: '✅ Necessity', color: 'green' },
            { value: 'investment', label: '📈 Investment', color: 'blue' },
            { value: 'luxury', label: '💎 Luxury', color: 'purple' },
            { value: 'impulse', label: '⚡ Impulse', color: 'orange' },
            { value: 'regretted', label: '😬 Regretted', color: 'red' },
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => setFilter(pill.value)}
              className={`px-5 py-3 rounded-xl text-sm font-bold transition-all card-hover ${
                filter === pill.value
                  ? `bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105`
                  : 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Shopping Items */}
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="relative space-y-2 sm:space-y-0">
              <ExpenseCard
                expense={item}
                onDelete={deleteExpense}
              />
              {/* Item name badge */}
              {item.item_name && (
                <div className="text-xs px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-700 dark:text-purple-300 font-semibold sm:absolute sm:top-4 sm:right-20">
                  {item.item_name}
                </div>
              )}
              {/* Reflection verdict badge */}
              {item.reflection_verdict && (
                <div className={`text-xs px-3 py-1.5 rounded-lg font-bold sm:absolute sm:top-4 sm:right-4 ${
                  item.reflection_verdict === 'worth_it'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : item.reflection_verdict === 'okay'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {item.reflection_verdict === 'worth_it' ? '😍 Worth it' : 
                   item.reflection_verdict === 'okay' ? '😐 Okay' : '😬 Regret'}
                </div>
              )}
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-white/20 dark:border-gray-700 text-center">
              <span className="text-6xl mb-4 block">🛒</span>
              <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
                No shopping items found
              </p>
              <p className="text-gray-400 dark:text-gray-500 mt-2">
                {filter !== 'all' ? 'Try a different filter' : 'Start tracking your shopping purchases'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
