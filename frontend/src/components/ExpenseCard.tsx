import React, { useState } from 'react';
import { Expense } from '../store/expenseStore';

interface ExpenseCardProps {
  expense: Expense;
  onDelete?: (id: number) => void;
  onEdit?: (expense: Expense) => void;
}

export function ExpenseCard({ expense, onDelete, onEdit }: ExpenseCardProps) {
  const [showActions, setShowActions] = useState(false);

  const qualityLabel = getQualityLabel(expense.quality_score);
  const timeAgo = getTimeAgo(new Date(expense.date));
  const exactDate = new Date(expense.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  function getQualityLabel(score: number) {
    if (score >= 5) return { label: 'Smart Spend', emoji: '🟢', color: '#10b981' };
    if (score === 4) return { label: 'Good Buy', emoji: '🟢', color: '#34d399' };
    if (score === 3) return { label: 'Neutral', emoji: '🟡', color: '#fbbf24' };
    if (score === 2) return { label: 'Watch Out', emoji: '🔴', color: '#f87171' };
    return { label: 'Impulse', emoji: '⚡', color: '#fb923c' };
  }

  function getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div
      className="group relative bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-300 card-hover"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Left color stripe */}
      <div 
        className="absolute left-0 top-4 bottom-4 w-1.5 rounded-l-xl"
        style={{ backgroundColor: expense.category_color }}
      />

      <div className="flex items-start gap-4 pl-3">
        {/* Category Icon */}
        <div 
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md"
          style={{ 
            backgroundColor: `${expense.category_color}25`,
            transform: 'rotate(-5deg)'
          }}
        >
          {expense.category_icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Rs. {parseFloat(expense.amount.toString()).toFixed(2)}
            </span>
            {expense.is_impulse && (
              <span className="text-xs px-3 py-1 bg-gradient-to-r from-orange-400 to-red-400 text-white rounded-full font-semibold shadow-sm">
                ⚡ Impulse
              </span>
            )}
            <span 
              className="text-xs px-3 py-1 rounded-full text-white font-semibold shadow-sm"
              style={{ backgroundColor: qualityLabel.color }}
            >
              {qualityLabel.emoji} {qualityLabel.label}
            </span>
          </div>

          <div className="text-gray-700 dark:text-gray-200 font-medium mt-2">
            {expense.description || expense.item_name || expense.category_name}
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md font-medium">
              {expense.category_name}
            </span>
            {expense.account_name && (
              <>
                <span>•</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md font-medium text-gray-500 dark:text-gray-300">
                  {expense.account_icon ? `${expense.account_icon} ` : ''}{expense.account_name}
                </span>
              </>
            )}
            <span>•</span>
            <span>{timeAgo}</span>
            <span>•</span>
            <span>{exactDate}</span>
            {expense.mood && (
              <>
                <span>•</span>
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                  {getMoodEmoji(expense.mood)} {expense.mood}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-1 transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={() => onEdit?.(expense)}
            className="p-2.5 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 dark:hover:bg-purple-900/30 rounded-xl transition-all"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete?.(expense.id)}
            className="p-2.5 hover:bg-gradient-to-r hover:from-red-100 hover:to-orange-100 dark:hover:bg-red-900/30 rounded-xl transition-all"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

function getMoodEmoji(mood: string): string {
  const map: Record<string, string> = {
    happy: '😊',
    stressed: '😰',
    bored: '😴',
    celebrating: '🎉',
  };
  return map[mood.toLowerCase()] || '😐';
}
