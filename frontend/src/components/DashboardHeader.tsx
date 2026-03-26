import React from 'react';

interface DashboardHeaderProps {
  totalSpent: number;
  totalBudget: number;
  daysLeft: number;
}

export function DashboardHeader({ totalSpent, totalBudget, daysLeft }: DashboardHeaderProps) {
  const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const circumference = 2 * Math.PI * 56;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getStatus = () => {
    if (percentage < 50) {
      return { text: "You're on track 👍", color: '#10b981' };
    } else if (percentage < 80) {
      return { text: 'Spending steadily 🟡', color: '#f59e0b' };
    } else {
      return { text: `⚠️ Slow down, ${daysLeft} days left`, color: '#ef4444' };
    }
  };

  const status = getStatus();

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            This Month
          </h2>
          <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
            Rs. {totalSpent.toFixed(2)}
          </div>
          <div className="text-gray-600 dark:text-gray-300 mb-4">
            of Rs. {totalBudget.toFixed(2)} budget
          </div>
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ backgroundColor: `${status.color}20`, color: status.color }}
          >
            <span>{status.text}</span>
          </div>
        </div>

        {/* Circular Progress */}
        <div className="relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90">
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={status.color} />
                <stop offset="100%" stopColor={status.color} stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="#e5e7eb"
              strokeWidth="14"
              fill="none"
              className="dark:stroke-gray-700"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="url(#progressGradient)"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
                transition: 'stroke-dashoffset 0.5s ease',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800 dark:text-white">
                {Math.round(percentage)}%
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">used</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
