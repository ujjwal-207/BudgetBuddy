import React, { useState } from 'react';

interface ReflectionPromptProps {
  expense: {
    id: number;
    item_name: string | null;
    description: string | null;
    amount: number;
  };
  onSubmit: (verdict: 'worth_it' | 'okay' | 'regret') => void;
  onDismiss: () => void;
}

export function ReflectionPrompt({ expense, onSubmit, onDismiss }: ReflectionPromptProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (verdict: 'worth_it' | 'okay' | 'regret') => {
    onSubmit(verdict);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
        <div className="text-center">
          <span className="text-4xl mb-2 block">✅</span>
          <p className="text-green-800 dark:text-green-300 font-medium">
            Thanks for reflecting! Your insight has been saved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-white">
            🤔 Was it worth it?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            You bought{' '}
            <span className="font-medium">
              {expense.item_name || expense.description || 'this item'}
            </span>{' '}
            (Rs. {parseFloat(expense.amount.toString()).toFixed(2)}) a week ago.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleSubmit('worth_it')}
          className="flex-1 min-w-[100px] py-3 px-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
        >
          😍 Totally worth it
        </button>
        <button
          onClick={() => handleSubmit('okay')}
          className="flex-1 min-w-[100px] py-3 px-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-xl font-medium hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
        >
          😐 It's okay
        </button>
        <button
          onClick={() => handleSubmit('regret')}
          className="flex-1 min-w-[100px] py-3 px-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          😬 I regret it
        </button>
      </div>
    </div>
  );
}
