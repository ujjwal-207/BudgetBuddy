import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useExpenseStore } from '../store/expenseStore';
import { formatMonthLabel, getCurrentMonthValue, toMonthDate } from '../utils/month';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function Income() {
  const {
    income,
    investments,
    transfers,
    accounts,
    fetchIncome,
    addIncome,
    fetchInvestments,
    fetchTransfers,
    fetchAccounts,
    addTransfer
  } = useExpenseStore();
  const [month, setMonth] = useState(getCurrentMonthValue());
  const initialMonthDate = toMonthDate(getCurrentMonthValue());
  const [budgetSummary, setBudgetSummary] = useState<any>(null);
  const [incomeForm, setIncomeForm] = useState({
    amount: '',
    source: 'Salary',
    category: 'Salary',
    description: '',
    account_id: '',
    received_date: initialMonthDate,
    is_regular: true
  });
  const [transferForm, setTransferForm] = useState({
    amount: '',
    investment_id: '',
    from_account_id: '',
    description: '',
    transfer_date: initialMonthDate
  });

  const monthDate = toMonthDate(month);

  const refreshMonth = async () => {
    await Promise.all([
      fetchIncome(monthDate),
      fetchTransfers(monthDate),
      fetchInvestments(),
      fetchAccounts(),
      axios.get(`${API_URL}/budgets/ratio?month=${monthDate}`).then((response) => setBudgetSummary(response.data))
    ]);
  };

  useEffect(() => {
    refreshMonth();
  }, [month]);

  const totals = useMemo(() => {
    const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
    const investedThisMonth = transfers
      .filter((item) => item.transfer_type === 'investment_contribution')
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const withdrawnThisMonth = transfers
      .filter((item) => item.transfer_type === 'investment_withdrawal')
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return { totalIncome, investedThisMonth, withdrawnThisMonth };
  }, [income, transfers]);

  const handleIncomeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await addIncome({
      amount: parseFloat(incomeForm.amount),
      source: incomeForm.source,
      category: incomeForm.category,
      description: incomeForm.description || null,
      account_id: incomeForm.account_id ? Number(incomeForm.account_id) : null,
      allocation_month: monthDate,
      date: incomeForm.received_date,
      is_regular: incomeForm.is_regular
    });
    setIncomeForm({
      amount: '',
      source: 'Salary',
      category: 'Salary',
      description: '',
      account_id: '',
      received_date: monthDate,
      is_regular: true
    });
    await refreshMonth();
  };

  const handleTransferSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const investmentId = Number(transferForm.investment_id);
    if (!investmentId) return;

    await addTransfer({
      from_account: transferForm.from_account_id
        ? accounts.find((account) => account.id === Number(transferForm.from_account_id))?.name || 'Account'
        : 'income',
      to_account: `investment:${investmentId}`,
      investment_id: investmentId,
      amount: parseFloat(transferForm.amount),
      from_account_id: transferForm.from_account_id ? Number(transferForm.from_account_id) : null,
      description: transferForm.description || 'Monthly investment move',
      transfer_type: 'investment_contribution',
      transfer_date: transferForm.transfer_date,
      effective_month: monthDate
    });

    setTransferForm({ amount: '', investment_id: '', from_account_id: '', description: '', transfer_date: monthDate });
    await refreshMonth();
  };

  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-8 pt-8">
        <section className="hero-shell rounded-[2rem] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="hero-kicker text-xs font-semibold uppercase tracking-[0.32em]">
                Income and cashflow
              </div>
              <h1 className="hero-title mt-3 text-4xl font-black">Pay yourself first, then spend from what remains.</h1>
              <p className="hero-copy mt-2 max-w-2xl text-sm">
                Example: salary Rs. 10,000 in {formatMonthLabel(month)}, move Rs. 5,000 to investment, and the app
                keeps only Rs. 5,000 as the month&apos;s available budget. That makes saving the default behavior.
              </p>
            </div>

            <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Month</span>
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="bg-transparent outline-none"
              />
            </label>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Income recorded', value: totals.totalIncome },
            { label: 'Moved to investment', value: totals.investedThisMonth },
            { label: 'Returned to budget', value: totals.withdrawnThisMonth },
            { label: 'Budget available', value: budgetSummary?.available_budget || 0 }
          ].map((item) => (
            <div key={item.label} className="standard-metric rounded-[1.25rem] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {item.label}
              </div>
              <div className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
                Rs. {Number(item.value).toFixed(2)}
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr_0.9fr]">
          <form onSubmit={handleIncomeSubmit} className="panel rounded-[2rem] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Step 1
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Upload income</h2>
            <div className="mt-5 grid gap-4">
              <input
                type="number"
                step="0.01"
                value={incomeForm.amount}
                onChange={(event) => setIncomeForm({ ...incomeForm, amount: event.target.value })}
                placeholder="Amount"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900"
                required
              />
              <input
                type="text"
                value={incomeForm.source}
                onChange={(event) => setIncomeForm({ ...incomeForm, source: event.target.value })}
                placeholder="Source"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900"
                required
              />
              <input
                type="text"
                value={incomeForm.description}
                onChange={(event) => setIncomeForm({ ...incomeForm, description: event.target.value })}
                placeholder="Optional note"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900"
              />
              <select
                value={incomeForm.account_id}
                onChange={(event) => setIncomeForm({ ...incomeForm, account_id: event.target.value })}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900"
                required
              >
                <option value="">Choose where this income arrived</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.icon ? `${account.icon} ` : ''}{account.name} ({account.account_role})
                  </option>
                ))}
              </select>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Income received on
                </label>
                <input
                  type="date"
                  value={incomeForm.received_date}
                  onChange={(event) => setIncomeForm({ ...incomeForm, received_date: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900"
                  required
                />
              </div>
              <label className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={incomeForm.is_regular}
                  onChange={(event) => setIncomeForm({ ...incomeForm, is_regular: event.target.checked })}
                />
                Mark as regular income
              </label>
              <button className="rounded-2xl bg-slate-950 px-4 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-cyan-400 dark:text-slate-950">
                Save income for {formatMonthLabel(month)}
              </button>
            </div>
          </form>

          <form onSubmit={handleTransferSubmit} className="panel rounded-[2rem] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Step 2
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Move part to investment</h2>
            <div className="mt-5 grid gap-4">
              <input
                type="number"
                step="0.01"
                value={transferForm.amount}
                onChange={(event) => setTransferForm({ ...transferForm, amount: event.target.value })}
                placeholder="Amount to invest"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900"
                required
              />
              <select
                value={transferForm.investment_id}
                onChange={(event) => setTransferForm({ ...transferForm, investment_id: event.target.value })}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900"
                required
              >
                <option value="">Choose investment account</option>
                {investments.map((investment) => (
                  <option key={investment.id} value={investment.id}>
                    {investment.name}
                  </option>
                ))}
              </select>
              <select
                value={transferForm.from_account_id}
                onChange={(event) => setTransferForm({ ...transferForm, from_account_id: event.target.value })}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900"
                required
              >
                <option value="">Choose which account sends the money</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.icon ? `${account.icon} ` : ''}{account.name} ({account.account_role})
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={transferForm.description}
                onChange={(event) => setTransferForm({ ...transferForm, description: event.target.value })}
                placeholder="Optional note"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900"
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Transfer happened on
                </label>
                <input
                  type="date"
                  value={transferForm.transfer_date}
                  onChange={(event) => setTransferForm({ ...transferForm, transfer_date: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900"
                  required
                />
              </div>
              <button className="rounded-2xl bg-cyan-400 px-4 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
                Move into investment account
              </button>
            </div>
          </form>

          <div className="panel rounded-[2rem] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Result
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">What you can spend</h2>
            <div className="mt-5 rounded-[1.5rem] bg-slate-950 p-5 text-white">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Spendable budget</div>
              <div className="mt-3 text-4xl font-black">Rs. {Number(budgetSummary?.available_budget || 0).toFixed(2)}</div>
              <p className="mt-2 text-sm text-slate-300">
                This is income minus investment contributions plus any money withdrawn back from investments.
              </p>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { label: 'Income this month', value: budgetSummary?.total_income || 0 },
                { label: 'Invested this month', value: budgetSummary?.total_invested || 0 },
                { label: 'Back from investments', value: budgetSummary?.total_withdrawn || 0 },
                { label: 'Category budgets set', value: budgetSummary?.total_budget || 0 }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-300">{item.label}</span>
                  <span className="font-bold text-slate-900 dark:text-white">Rs. {Number(item.value).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="panel rounded-[2rem] p-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Income history</h2>
            <div className="mt-5 space-y-3">
              {income.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{item.source}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{item.description || 'No note'}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        Received on {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-right font-bold text-slate-900 dark:text-white">Rs. {Number(item.amount).toFixed(2)}</div>
                  </div>
                </div>
              ))}
              {income.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No income saved for this month.
                </div>
              )}
            </div>
          </div>

          <div className="panel rounded-[2rem] p-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Transfers affecting budget</h2>
            <div className="mt-5 space-y-3">
              {transfers.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{item.transfer_type || 'Transfer'}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{item.description || `${item.from_account} → ${item.to_account}`}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        On {new Date(item.transfer_date || item.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-right font-bold text-slate-900 dark:text-white">Rs. {Number(item.amount).toFixed(2)}</div>
                  </div>
                </div>
              ))}
              {transfers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No investment transfers for this month.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
