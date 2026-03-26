import { useEffect, useState } from 'react';
import { useExpenseStore } from '../store/expenseStore';

export function useExpenses() {
  const { expenses, loading, error, fetchExpenses, addExpense, updateExpense, deleteExpense } = useExpenseStore();
  const [filters, setFilters] = useState<{ month?: string; category?: string }>({});

  useEffect(() => {
    fetchExpenses(filters);
  }, [filters]);

  const setFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return {
    expenses,
    loading,
    error,
    filters,
    setFilter,
    addExpense,
    updateExpense,
    deleteExpense,
    refresh: () => fetchExpenses(filters),
  };
}
