import React from 'react';
import { Insight } from '../store/expenseStore';

interface InsightsCardProps {
  insights: Insight[];
}

export function InsightsCard({ insights }: InsightsCardProps) {
  if (!insights || insights.length === 0) {
    return (
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <span>💡</span> Insights
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Start tracking your expenses to get personalized insights!
        </p>
      </div>
    );
  }

  const getGradientForType = (type: string) => {
    const gradients: Record<string, string> = {
      waste_detector: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
      impulse_report: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
      good_spend: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
      saving_opportunity: 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20',
      mood_spend: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
    };
    return gradients[type] || 'from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800';
  };

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-700">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <span>💡</span> Insights
      </h3>
      <div className="space-y-3">
        {insights.slice(0, 3).map((insight) => (
          <div
            key={insight.id}
            className={`p-4 bg-gradient-to-r ${getGradientForType(insight.type)} rounded-2xl border border-gray-100 dark:border-gray-600 card-hover`}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl animate-float">{insight.emoji}</span>
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 dark:text-white text-sm">
                  {insight.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                  {insight.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
