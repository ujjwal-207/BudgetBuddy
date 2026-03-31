import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../lib/api';

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const toMonthStart = (dateValue?: string | null) => {
  if (!dateValue) return undefined;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

export interface Expense {
  id: number;
  amount: number;
  account_id?: number | null;
  account_name?: string | null;
  account_icon?: string | null;
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  description: string | null;
  item_name: string | null;
  item_type: string | null;
  is_need: boolean | null;
  longevity: string | null;
  mood: string | null;
  quality_score: number;
  is_impulse: boolean;
  date: string;
  payment_method: string | null;
  created_at: string;
}

export interface Income {
  id: number;
  amount: number;
  account_id?: number | null;
  source: string;
  category: string | null;
  description: string | null;
  date: string;
  allocation_month: string;
  is_regular: boolean;
  created_at: string;
}

export interface Investment {
  id: number;
  name: string;
  type: string | null;
  invested_amount: number;
  current_value: number | null;
  units: number | null;
  buy_price: number | null;
  current_price: number | null;
  profit_loss: number;
  return_percentage: number;
  purchase_date: string;
  notes: string | null;
  created_at: string;
}

export interface Transfer {
  id: number;
  from_account: string;
  to_account: string;
  from_account_id?: number | null;
  to_account_id?: number | null;
  amount: number;
  description: string | null;
  transfer_type: string | null;
  investment_id: number | null;
  transfer_date: string;
  effective_month: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  monthly_budget: number;
  spent_this_month?: number;
}

export interface Account {
  id: number;
  name: string;
  type: string;
  account_role: string;
  icon: string | null;
  color: string | null;
  current_balance: number;
  created_at: string;
}

export interface Loan {
  id: number;
  account_id: number | null;
  account_name?: string | null;
  account_icon?: string | null;
  principal_amount: number;
  repaid_amount: number;
  outstanding_amount: number;
  status: string;
  counterparty_name: string;
  direction: 'incoming' | 'outgoing';
  description: string | null;
  lent_date: string;
  expected_repayment_date: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface DashboardData {
  category_summary: any[];
  daily_spending: any[];
  total_spent: number;
  total_budget: number;
  days_left: number;
  budget_percentage: number;
  top_keywords: any[];
  cashflow_summary?: {
    total_income: number;
    total_invested: number;
    total_withdrawn: number;
    available_budget: number;
    remaining_budget: number;
  };
}

export interface Insight {
  id: number;
  type: string;
  title: string;
  message: string;
  emoji: string;
  data?: any;
}

interface ExpenseState {
  expenses: Expense[];
  categories: Category[];
  accounts: Account[];
  income: Income[];
  investments: Investment[];
  transfers: Transfer[];
  loans: Loan[];
  dashboard: DashboardData | null;
  insights: Insight[];
  loading: boolean;
  error: string | null;
  
  // Expense Actions
  fetchExpenses: (filters?: { month?: string; category?: string }) => Promise<void>;
  addExpense: (expense: Partial<Expense> & { natural_input?: string }) => Promise<Expense>;
  updateExpense: (id: number, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
  
  // Income Actions
  fetchIncome: (month?: string) => Promise<void>;
  addIncome: (income: Partial<Income>) => Promise<Income>;
  deleteIncome: (id: number) => Promise<void>;
  
  // Investment Actions
  fetchInvestments: () => Promise<void>;
  addInvestment: (investment: Partial<Investment>) => Promise<Investment>;
  updateInvestment: (id: number, investment: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: number) => Promise<void>;
  addInvestmentTransaction: (investmentId: number, transaction: any) => Promise<void>;
  
  // Transfer Actions
  fetchTransfers: (month?: string) => Promise<void>;
  addTransfer: (transfer: Partial<Transfer>) => Promise<Transfer>;

  // Loan Actions
  fetchLoans: () => Promise<void>;
  addLoan: (loan: Partial<Loan>) => Promise<Loan>;
  repayLoan: (id: number, repayment: { amount: number; account_id?: number | null; repayment_date?: string }) => Promise<Loan>;
  
  // Common Actions
  fetchCategories: (month?: string) => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
  fetchInsights: () => Promise<void>;
  clearError: () => void;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  categories: [],
  accounts: [],
  income: [],
  investments: [],
  transfers: [],
  loans: [],
  dashboard: null,
  insights: [],
  loading: false,
  error: null,

  fetchExpenses: async (filters) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters?.month) params.append('month', filters.month);
      if (filters?.category) params.append('category', filters.category);
      
      const response = await axios.get(`${API_URL}/expenses?${params}`);
      set({ expenses: toArray<Expense>(response.data), loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  addExpense: async (expense) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/expenses`, expense);
      set((state) => ({ 
        expenses: [response.data, ...state.expenses],
        loading: false 
      }));
      const expenseMonth = toMonthStart(response.data?.date);
      if (expenseMonth) {
        get().fetchCategories(expenseMonth);
      } else {
        get().fetchCategories();
      }
      get().fetchDashboard();
      get().fetchAccounts();
      return response.data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateExpense: async (id, expense) => {
    set({ loading: true, error: null });
    try {
      const previousExpense = get().expenses.find((e) => e.id === id);
      const response = await axios.patch(`${API_URL}/expenses/${id}`, expense);
      set((state) => ({
        expenses: state.expenses.map((e) => (e.id === id ? response.data : e)),
        loading: false
      }));
      const previousMonth = toMonthStart(previousExpense?.date);
      const updatedMonth = toMonthStart(response.data?.date);
      if (previousMonth) {
        get().fetchCategories(previousMonth);
      }
      if (updatedMonth && updatedMonth !== previousMonth) {
        get().fetchCategories(updatedMonth);
      }
      if (!previousMonth && !updatedMonth) {
        get().fetchCategories();
      }
      get().fetchDashboard();
      get().fetchAccounts();
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteExpense: async (id) => {
    set({ loading: true, error: null });
    try {
      const deletedExpense = get().expenses.find((e) => e.id === id);
      await axios.delete(`${API_URL}/expenses/${id}`);
      set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id),
        loading: false
      }));
      const deletedMonth = toMonthStart(deletedExpense?.date);
      if (deletedMonth) {
        get().fetchCategories(deletedMonth);
      } else {
        get().fetchCategories();
      }
      get().fetchDashboard();
      get().fetchAccounts();
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchCategories: async (month) => {
    try {
      const params = month ? `?month=${encodeURIComponent(month)}` : '';
      const response = await axios.get(`${API_URL}/categories${params}`);
      set({ categories: toArray<Category>(response.data) });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchAccounts: async () => {
    try {
      const response = await axios.get(`${API_URL}/accounts`);
      set({ accounts: toArray<Account>(response.data) });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchDashboard: async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard`);
      set({ dashboard: response.data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchInsights: async () => {
    try {
      const response = await axios.get(`${API_URL}/insights/weekly`);
      set({ insights: toArray<Insight>(response.data) });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Income Actions
  fetchIncome: async (month) => {
    try {
      const params = month ? `?month=${encodeURIComponent(month)}` : '';
      const response = await axios.get(`${API_URL}/income${params}`);
      set({ income: toArray<Income>(response.data) });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addIncome: async (income) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/income`, income);
      set((state) => ({
        income: [response.data, ...state.income],
        loading: false
      }));
      get().fetchDashboard();
      get().fetchAccounts();
      return response.data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteIncome: async (id) => {
    try {
      await axios.delete(`${API_URL}/income/${id}`);
      set((state) => ({
        income: state.income.filter((i) => i.id !== id)
      }));
      get().fetchAccounts();
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Investment Actions
  fetchInvestments: async () => {
    try {
      const response = await axios.get(`${API_URL}/investments`);
      set({ investments: toArray<Investment>(response.data) });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addInvestment: async (investment) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/investments`, investment);
      set((state) => ({
        investments: [response.data, ...state.investments],
        loading: false
      }));
      get().fetchDashboard();
      return response.data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateInvestment: async (id, investment) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.put(`${API_URL}/investments/${id}`, investment);
      set((state) => ({
        investments: state.investments.map((i) => (i.id === id ? response.data : i)),
        loading: false
      }));
      get().fetchDashboard();
      return response.data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteInvestment: async (id) => {
    try {
      await axios.delete(`${API_URL}/investments/${id}`);
      set((state) => ({
        investments: state.investments.filter((i) => i.id !== id)
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addInvestmentTransaction: async (investmentId, transaction) => {
    try {
      await axios.post(`${API_URL}/investments/${investmentId}/transaction`, transaction);
      get().fetchInvestments();
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Transfer Actions
  fetchTransfers: async (month) => {
    try {
      const params = month ? `?month=${encodeURIComponent(month)}` : '';
      const response = await axios.get(`${API_URL}/transfers${params}`);
      set({ transfers: toArray<Transfer>(response.data) });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addTransfer: async (transfer) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/transfers`, transfer);
      set((state) => ({
        transfers: [response.data, ...state.transfers],
        loading: false
      }));
      get().fetchInvestments();
      get().fetchDashboard();
      get().fetchAccounts();
      return response.data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchLoans: async () => {
    try {
      const response = await axios.get(`${API_URL}/loans`);
      set({ loans: toArray<Loan>(response.data) });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addLoan: async (loan) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/loans`, loan);
      set((state) => ({
        loans: [response.data, ...state.loans],
        loading: false
      }));
      get().fetchAccounts();
      return response.data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  repayLoan: async (id, repayment) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/loans/${id}/repay`, repayment);
      set((state) => ({
        loans: state.loans.map((loan) => (loan.id === id ? response.data : loan)),
        loading: false
      }));
      get().fetchAccounts();
      return response.data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
