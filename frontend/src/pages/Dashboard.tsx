import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { QuickAddBar } from '../components/QuickAddBar';
import { useDashboard } from '../hooks/useDashboard';
import { useExpenseStore } from '../store/expenseStore';
import { formatMonthLabel, getCurrentMonthValue, toMonthDate } from '../utils/month';
import { chartTheme, formatCurrency } from '../utils/chartTheme';

import { API_URL } from '../lib/api';

export function Dashboard() {
  const { dashboard } = useDashboard();
  const { expenses, accounts, fetchExpenses, fetchIncome, fetchInvestments, fetchAccounts, income, investments } = useExpenseStore();
  const [month] = useState(getCurrentMonthValue());
  const [budgetPlan, setBudgetPlan] = useState<any>(null);

  useEffect(() => {
    const monthDate = toMonthDate(month);
    fetchExpenses({ month: monthDate });
    fetchIncome(monthDate);
    fetchInvestments();
    fetchAccounts();
    axios.get(`${API_URL}/budgets/plan?month=${monthDate}`).then((response) => setBudgetPlan(response.data));
  }, [fetchAccounts, fetchExpenses, fetchIncome, fetchInvestments, month]);

  const recentExpenses = expenses.slice(0, 5);
  const totalInvestmentValue = investments.reduce(
    (sum, investment) => sum + parseFloat((investment.current_value ?? investment.invested_amount).toString()),
    0
  );
  const totalIncome = income.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
  const cashflow = dashboard?.cashflow_summary;
  const monthLabel = formatMonthLabel(month);
  const savingsWarnings = useMemo(() => {
    const warnings: Array<{ title: string; detail: string }> = [];
    const available = Number(cashflow?.available_budget || 0);
    const spent = Number(dashboard?.total_spent || 0);
    const invested = Number(cashflow?.total_invested || 0);
    const categories = dashboard?.category_summary || [];

    if (available > 0 && spent / available > 0.75) {
      warnings.push({
        title: 'Spending is eating most of the month budget',
        detail: `You have already used ${Math.round((spent / available) * 100)}% of spendable cash for ${monthLabel}.`
      });
    }

    const bills = categories.find((item: any) => item.name === 'Bills');
    if (bills && available > 0 && Number(bills.total_spent) / available > 0.35) {
      warnings.push({
        title: 'Bills are taking too much room',
        detail: `Bills are Rs. ${Number(bills.total_spent).toFixed(2)} this month, which is heavy for your current budget.`
      });
    }

    const shopping = categories.find((item: any) => item.name === 'Shopping');
    const entertainment = categories.find((item: any) => item.name === 'Entertainment');
    const flexibleSpend = Number(shopping?.total_spent || 0) + Number(entertainment?.total_spent || 0);
    if (available > 0 && flexibleSpend / available > 0.2) {
      warnings.push({
        title: 'Shopping and entertainment are killing savings pace',
        detail: `Flexible spending has already reached Rs. ${flexibleSpend.toFixed(2)} this month.`
      });
    }

    if (invested <= 0 && available > 0) {
      warnings.push({
        title: 'No savings locked yet',
        detail: 'You have not moved any money into investment or protected savings this month.'
      });
    }

    return warnings.slice(0, 3);
  }, [cashflow?.available_budget, cashflow?.total_invested, dashboard?.category_summary, dashboard?.total_spent, monthLabel]);

  const cards = useMemo(
    () => [
      {
        label: 'Income loaded',
        value: `Rs. ${totalIncome.toFixed(2)}`
      },
      {
        label: 'Moved to investments',
        value: `Rs. ${Number(cashflow?.total_invested || 0).toFixed(2)}`
      },
      {
        label: 'Budget you can spend',
        value: `Rs. ${Number(cashflow?.available_budget || 0).toFixed(2)}`
      },
      {
        label: 'Investment value',
        value: `Rs. ${totalInvestmentValue.toFixed(2)}`
      }
    ],
    [cashflow?.available_budget, cashflow?.total_invested, totalIncome, totalInvestmentValue]
  );

  const allocationBars = useMemo(
    () => [
      { name: 'Spent', value: Number(dashboard?.total_spent || 0), fill: '#fb7185' },
      { name: 'Protected', value: Number(cashflow?.total_invested || 0), fill: '#22c55e' },
      { name: 'Remaining', value: Number(cashflow?.remaining_budget ?? cashflow?.available_budget ?? 0), fill: '#38bdf8' }
    ],
    [cashflow?.available_budget, cashflow?.remaining_budget, cashflow?.total_invested, dashboard?.total_spent]
  );

  return (
    <div className="min-h-screen pb-28">
      <QuickAddBar />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-8 pt-24">
        <section className="hero-shell rounded-[2rem] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="hero-kicker text-xs font-semibold uppercase tracking-[0.32em]">
                Savings first finance
              </div>
              <h1 className="hero-title mt-3 text-4xl font-black tracking-tight">
                {monthLabel} plan protects savings before you start spending.
              </h1>
              <p className="hero-copy mt-3 max-w-xl text-sm">
                Log salary, lock part of it into investments, and the app treats only the remainder as spendable.
                The goal is to help you save first and spend from what is left.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                to="/income"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                Protect savings
              </Link>
              <Link
                to="/budgets"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                Plan lean budget
              </Link>
              <Link
                to="/investments"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                Review returns
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="standard-metric rounded-[1.25rem] p-5"
            >
              <div className="metric-label text-xs font-semibold uppercase tracking-[0.24em]">{card.label}</div>
              <div className="metric-value mt-4 text-3xl font-black">{card.value}</div>
            </div>
          ))}
        </section>

        <section className="panel rounded-[2rem] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">
                Money location
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Where your money is sitting</h2>
            </div>
            <Link
              to="/accounts"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:text-white"
            >
              Manage accounts
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {account.type}
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  {account.icon ? `${account.icon} ` : ''}{account.name}
                </div>
                <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                  Rs. {Number(account.current_balance).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="panel rounded-[2rem] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">
                  This month
                </div>
                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Savings flow</h2>
              </div>
              <div className="rounded-2xl bg-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-700 dark:bg-slate-900 dark:text-cyan-200">
                {monthLabel}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] bg-slate-100 p-5 text-slate-900 dark:bg-slate-950 dark:text-white">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Spendable now</div>
                <div className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
                  Rs. {Number(cashflow?.remaining_budget ?? cashflow?.available_budget ?? 0).toFixed(2)}
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Remaining after expenses. If this number falls too fast, your savings plan is under pressure.
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-slate-100 p-5 text-slate-900 dark:bg-slate-800 dark:text-white">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Budget plan loaded
                </div>
                <div className="mt-3 text-4xl font-black">
                  Rs. {Number(budgetPlan?.total_budget || dashboard?.total_budget || 0).toFixed(2)}
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                  Category budgets allocated for {monthLabel}.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/50">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Spend vs save chart
              </div>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allocationBars} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartTheme.gridStroke} />
                    <XAxis type="number" tick={chartTheme.axisTick} />
                    <YAxis dataKey="name" type="category" tick={chartTheme.categoryTick} width={72} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Amount']}
                      contentStyle={chartTheme.tooltipStyle}
                    />
                    <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                      {allocationBars.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[
                { label: 'Income added', value: cashflow?.total_income || 0 },
                { label: 'Sent to investments', value: cashflow?.total_invested || 0 },
                { label: 'Pulled back from investments', value: cashflow?.total_withdrawn || 0 },
                { label: 'Spent so far', value: dashboard?.total_spent || 0 }
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/70"
                >
                  <span className="font-medium text-slate-500 dark:text-slate-300">{row.label}</span>
                  <span className="font-bold text-slate-900 dark:text-white">Rs. {Number(row.value).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-emerald-200/70 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">
                Save more signal
              </div>
              <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                Protected this month: Rs. {Number(cashflow?.total_invested || 0).toFixed(2)}
              </div>
              <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
                Money moved into investments is treated as protected savings until you deliberately withdraw it.
              </p>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5 dark:border-rose-500/20 dark:bg-rose-500/10">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700 dark:text-rose-300">
                What is hurting savings
              </div>
              <div className="mt-4 space-y-3">
                {savingsWarnings.length > 0 ? (
                  savingsWarnings.map((warning) => (
                    <div key={warning.title} className="rounded-2xl bg-white/70 px-4 py-3 dark:bg-slate-950/40">
                      <div className="font-semibold text-slate-900 dark:text-white">{warning.title}</div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{warning.detail}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
                    No major savings warning right now. Keep the savings transfer consistent.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="panel rounded-[2rem] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">
              Recent expenses
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Fast expense capture still works</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Use the top quick bar for entries like <span className="font-semibold">200 food</span> or switch to
              history if you need search and edits.
            </p>

            <div className="mt-6 space-y-3">
              {recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{expense.category_name}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{expense.description || 'No note'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 dark:text-white">Rs. {Number(expense.amount).toFixed(2)}</div>
                    <div className="text-xs text-slate-400">{new Date(expense.date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {recentExpenses.length === 0 && (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No expenses logged this month yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
