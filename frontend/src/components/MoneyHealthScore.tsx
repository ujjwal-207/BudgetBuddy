import React from 'react';

interface MoneyHealthScoreProps {
  score: number;
  grade?: string;
  label?: string;
  emoji?: string;
}

export function MoneyHealthScore({ score, grade, label, emoji }: MoneyHealthScoreProps) {
  const circumference = 2 * Math.PI * 40;
  const percentage = score;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const color = getColor();

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Money Health
          </h3>
          <div className="flex items-center gap-3 mb-3">
            <span 
              className="text-5xl font-black"
              style={{ 
                background: `linear-gradient(135deg, ${color}, ${color}80)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {grade || calculateGrade(score).grade}
            </span>
            <span className="text-xl text-gray-700 dark:text-gray-200 font-bold">
              {label || calculateGrade(score).label}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            {getMotivationalText(score)}
          </p>
        </div>

        {/* Circular Score */}
        <div className="relative w-28 h-28 ml-4">
          <svg className="w-full h-full transform -rotate-90">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor={`${color}80`} />
              </linearGradient>
            </defs>
            <circle
              cx="56"
              cy="56"
              r="48"
              stroke="#e5e7eb"
              strokeWidth="10"
              fill="none"
              className="dark:stroke-gray-700"
            />
            <circle
              cx="56"
              cy="56"
              r="48"
              stroke="url(#scoreGradient)"
              strokeWidth="10"
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
              <div className="text-3xl">{emoji || calculateGrade(score).emoji}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateGrade(score: number) {
  if (score >= 80) return { grade: 'A', label: 'Excellent', emoji: '💚' };
  if (score >= 60) return { grade: 'B', label: 'Good', emoji: '🟢' };
  if (score >= 40) return { grade: 'C', label: 'Fair', emoji: '🟡' };
  return { grade: 'D', label: 'At Risk', emoji: '🔴' };
}

function getMotivationalText(score: number): string {
  if (score >= 80) return "🎉 You're crushing it! Your financial habits are excellent. Keep up the amazing work!";
  if (score >= 60) return "👍 Solid habits! You're on the right track with room to grow even more.";
  if (score >= 40) return "⚠️ Watch your spending. Small changes can make a big difference.";
  return "🚨 Time for a spending audit. Let's work on building better financial habits together.";
}
