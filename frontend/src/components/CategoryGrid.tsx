import React from 'react';
import { Category } from '../store/expenseStore';

interface CategoryGridProps {
  categories: Category[];
  onCategoryClick?: (category: Category) => void;
}

export function CategoryGrid({ categories, onCategoryClick }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {categories.map((category) => {
        const spent = parseFloat(category.spent_this_month?.toString() || '0');
        const budget = parseFloat(category.monthly_budget?.toString() || '0');
        const percentage = budget > 0 ? (spent / budget) * 100 : 0;

        return (
          <div
            key={category.id}
            onClick={() => onCategoryClick?.(category)}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer card-hover"
          >
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-3 shadow-md group-hover:scale-110 transition-transform"
              style={{ 
                backgroundColor: `${category.color}25`,
                transform: 'rotate(-5deg)'
              }}
            >
              {category.icon}
            </div>
            <div className="font-bold text-gray-800 dark:text-white text-sm truncate">
              {category.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
              Rs. {spent.toFixed(0)} / Rs. {budget.toFixed(0)}
            </div>
            {/* Mini progress bar */}
            <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(percentage, 100)}%`,
                  background: percentage > 100 
                    ? 'linear-gradient(90deg, #ef4444, #f87171)' 
                    : percentage > 80
                    ? `linear-gradient(90deg, #f59e0b, #fbbf24)`
                    : `linear-gradient(90deg, ${category.color}, ${category.color}80)`,
                }}
              />
            </div>
            {percentage > 100 && (
              <div className="text-xs text-red-500 mt-2 font-bold flex items-center gap-1">
                <span>⚠️</span> Over budget!
              </div>
            )}
            {percentage <= 50 && percentage > 0 && (
              <div className="text-xs text-green-500 mt-2 font-bold flex items-center gap-1">
                <span>✅</span> On track
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
