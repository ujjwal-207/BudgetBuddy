import { useState, useMemo } from 'react';
import { useExpenseStore } from '../store/expenseStore';

export function useNLParser() {
  const [input, setInput] = useState('');
  const { categories } = useExpenseStore();

  const parsed = useMemo(() => {
    if (!input.trim()) return null;

    const normalized = input.toLowerCase().trim();
    let amount = 0;
    let categoryName = 'Other';
    let description = normalized;
    let date = new Date();

    // Extract amount
    const amountMatch = normalized.match(/(\d+(?:\.\d{1,2})?)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1]);
      description = description.replace(amountMatch[1], '').trim();
    }

    // Extract time words
    const timeWords = ['yesterday', 'today', 'now'];
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeMatch = [...timeWords, ...dayNames].find(word => 
      new RegExp(`\\b${word}\\b`).test(description)
    );

    if (timeMatch === 'yesterday') {
      date = new Date();
      date.setDate(date.getDate() - 1);
    } else if (timeMatch === 'today' || timeMatch === 'now') {
      date = new Date();
    } else if (timeMatch && dayNames.includes(timeMatch)) {
      // Find last occurrence of day
      const today = new Date();
      const targetDay = dayNames.indexOf(timeMatch);
      const currentDay = today.getDay();
      const daysBack = currentDay <= targetDay ? 7 + currentDay - targetDay : currentDay - targetDay;
      date = new Date(today);
      date.setDate(today.getDate() - daysBack);
      description = description.replace(new RegExp(`\\b${timeMatch}\\b`, 'i'), '').trim();
    }

    // Detect category from keywords
    const categoryKeywords: Record<string, string[]> = {
      Transport: ['uber', 'ola', 'auto', 'bus', 'metro', 'petrol', 'cab', 'taxi'],
      Food: ['food', 'lunch', 'dinner', 'zomato', 'swiggy', 'chai', 'coffee', 'breakfast'],
      Entertainment: ['movie', 'netflix', 'spotify', 'game', 'concert'],
      Health: ['medicine', 'doctor', 'hospital', 'gym', 'yoga', 'fitness'],
      Shopping: ['amazon', 'flipkart', 'shoes', 'clothes', 'bag', 'headphone'],
      Bills: ['rent', 'electricity', 'wifi', 'bill', 'recharge'],
    };

    let maxMatches = 0;
    for (const [catName, keywords] of Object.entries(categoryKeywords)) {
      const matches = keywords.filter(kw => new RegExp(`\\b${kw}\\b`).test(description));
      if (matches.length > maxMatches) {
        maxMatches = matches.length;
        categoryName = catName;
      }
    }

    // Find matching category
    const category = categories.find(c => c.name === categoryName) || 
                     categories.find(c => c.name === 'Other');

    description = description.replace(/\s+/g, ' ').trim();
    if (description) {
      description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    return {
      amount,
      category_name: categoryName,
      category_id: category?.id,
      category_icon: category?.icon || '📁',
      category_color: category?.color || '#999',
      description,
      date,
    };
  }, [input, categories]);

  return {
    input,
    setInput,
    parsed,
    isValid: parsed !== null && parsed.amount > 0,
  };
}
