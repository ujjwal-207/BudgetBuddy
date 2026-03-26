import React, { useState } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import { useExpenseStore } from '../store/expenseStore';
import { QuickAddBar } from '../components/QuickAddBar';
import { ExpenseCard } from '../components/ExpenseCard';

export function History() {
  const { expenses, loading, error, filters, setFilter, deleteExpense } = useExpenses();
  const { categories } = useExpenseStore();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'quality'>('date');

  const filteredExpenses = expenses
    .filter((e) => {
      const searchLower = search.toLowerCase();
      return (
        e.description?.toLowerCase().includes(searchLower) ||
        e.category_name.toLowerCase().includes(searchLower) ||
        e.item_name?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'amount') {
        return parseFloat(b.amount.toString()) - parseFloat(a.amount.toString());
      } else {
        return b.quality_score - a.quality_score;
      }
    });

  return (
    <div className="min-h-screen pb-20">
      <QuickAddBar />
      
      <div className="pt-24 px-4 max-w-4xl mx-auto space-y-6 animate-slide-up">
        <div className="hero-shell rounded-[2rem] p-6">
          <h1 className="hero-title text-3xl font-bold">
            History
          </h1>
          <p className="hero-copy mt-1 text-sm">
            Search and filter all your expenses
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-700 space-y-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by description, category, or item name..."
              className="w-full pl-14 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white text-lg"
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            {/* Category Filter */}
            <select
              value={filters.category || ''}
              onChange={(e) => setFilter('category', e.target.value)}
              className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white font-medium"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white font-medium"
            >
              <option value="date">📅 By Date</option>
              <option value="amount">💰 By Amount</option>
              <option value="quality">⭐ By Quality</option>
            </select>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between">
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* Expense List */}
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onDelete={deleteExpense}
            />
          ))}
          {filteredExpenses.length === 0 && (
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-white/20 dark:border-gray-700 text-center">
              <span className="text-6xl mb-4 block">🔍</span>
              <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
                No expenses found
              </p>
              <p className="text-gray-400 dark:text-gray-500 mt-2">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
