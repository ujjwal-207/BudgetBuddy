import { useEffect } from 'react';
import { useExpenseStore } from '../store/expenseStore';

export function useDashboard() {
  const { dashboard, fetchDashboard, fetchInsights, insights } = useExpenseStore();

  useEffect(() => {
    fetchDashboard();
    fetchInsights();
  }, []);

  return {
    dashboard,
    insights,
    refresh: () => {
      fetchDashboard();
      fetchInsights();
    },
  };
}
