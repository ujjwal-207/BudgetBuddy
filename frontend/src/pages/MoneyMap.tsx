import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useExpenseStore } from '../store/expenseStore';
import { chartTheme, formatCurrency } from '../utils/chartTheme';

import { API_URL } from '../lib/api';

type MonthlySummary = {
  month: string;
  total_income: number | string;
  total_invested: number | string;
  total_withdrawn: number | string;
  total_spent: number | string;
  spendable_budget: number | string;
  month_balance: number | string;
};

type Movement = {
  movement_type: string;
  title: string;
  detail: string;
  amount: number | string;
  movement_date: string;
};

export function MoneyMap() {
  const { accounts, fetchAccounts } = useExpenseStore();
  const [data, setData] = useState<{ monthly_summary: MonthlySummary[]; recent_movements: Movement[] }>({
    monthly_summary: [],
    recent_movements: []
  });

  useEffect(() => {
    axios.get(`${API_URL}/dashboard/money-map`).then((response) => setData(response.data));
    fetchAccounts();
  }, [fetchAccounts]);

  const totals = useMemo(() => {
    return data.monthly_summary.reduce(
      (acc, month) => ({
        income: acc.income + Number(month.total_income),
        invested: acc.invested + Number(month.total_invested),
        withdrawn: acc.withdrawn + Number(month.total_withdrawn),
        spent: acc.spent + Number(month.total_spent)
      }),
      { income: 0, invested: 0, withdrawn: 0, spent: 0 }
    );
  }, [data.monthly_summary]);
  const trendData = useMemo(
    () =>
      data.monthly_summary
        .slice()
        .reverse()
        .map((month) => ({
          month: new Date(month.month).toLocaleDateString('en-US', { month: 'short' }),
          balance: Number(month.month_balance),
          income: Number(month.total_income),
          spent: Number(month.total_spent)
        })),
    [data.monthly_summary]
  );

  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-8 pt-8">
        <section className="hero-shell rounded-[2rem] p-6">
          <div className="hero-kicker text-xs font-semibold uppercase tracking-[0.32em]">Money map</div>
          <h1 className="hero-title mt-3 text-4xl font-black">See exactly where your money is moving.</h1>
          <p className="hero-copy mt-2 max-w-3xl text-sm">
            This view combines salary, expenses, investment moves, and withdrawals into one place so you can trace the full path of your money.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Income tracked', value: totals.income },
            { label: 'Spent', value: totals.spent },
            { label: 'Moved to investments', value: totals.invested },
            { label: 'Returned from investments', value: totals.withdrawn }
          ].map((item) => (
            <div key={item.label} className="standard-metric rounded-[1.25rem] p-5">
              <div className="metric-label text-xs font-semibold uppercase tracking-[0.24em]">{item.label}</div>
              <div className="metric-value mt-4 text-3xl font-black">Rs. {item.value.toFixed(2)}</div>
            </div>
          ))}
        </section>

        <section className="panel rounded-[2rem] p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Account balances
          </div>
          <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Where money lives right now</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {account.icon ? `${account.icon} ` : ''}{account.name}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {account.type}
                </div>
                <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                  Rs. {Number(account.current_balance).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="panel rounded-[2rem] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Trend chart
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Month balance trend</h2>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.gridStroke} />
                  <XAxis dataKey="month" tick={chartTheme.axisTick} />
                  <YAxis tick={chartTheme.axisTick} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={chartTheme.tooltipStyle} />
                  <Line type="monotone" dataKey="balance" stroke={chartTheme.colors.emerald} strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel rounded-[2rem] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Flow chart
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Income vs spending by month</h2>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.gridStroke} />
                  <XAxis dataKey="month" tick={chartTheme.axisTick} />
                  <YAxis tick={chartTheme.axisTick} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={chartTheme.tooltipStyle} />
                  <Bar dataKey="income" fill={chartTheme.colors.cyan} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="spent" fill={chartTheme.colors.rose} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="panel rounded-[2rem] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Monthly picture
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Last 12 months</h2>
            <div className="mt-6 grid gap-3">
              {data.monthly_summary.map((month) => {
                const balance = Number(month.month_balance);
                return (
                  <div key={month.month} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {new Date(month.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                          <div>Income: Rs. {Number(month.total_income).toFixed(2)}</div>
                          <div>Spent: Rs. {Number(month.total_spent).toFixed(2)}</div>
                          <div>Invested: Rs. {Number(month.total_invested).toFixed(2)}</div>
                          <div>Withdrawn: Rs. {Number(month.total_withdrawn).toFixed(2)}</div>
                        </div>
                      </div>
                      <div className={`rounded-2xl px-4 py-2 text-sm font-semibold ${balance >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'}`}>
                        {balance >= 0 ? 'Leftover' : 'Negative'} Rs. {Math.abs(balance).toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel rounded-[2rem] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Recent movement feed
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Latest money events</h2>
            <div className="mt-6 grid gap-3">
              {data.recent_movements.map((movement, index) => {
                const isExpense = movement.movement_type === 'expense';
                const isInvestmentMove =
                  movement.movement_type === 'investment_contribution' ||
                  movement.movement_type === 'investment_withdrawal';
                const amount = Number(movement.amount);

                return (
                  <div key={`${movement.movement_type}-${movement.movement_date}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{movement.title}</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{movement.detail}</div>
                        <div className="mt-2 text-xs text-slate-400">
                          {new Date(movement.movement_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
                          isExpense
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                            : isInvestmentMove
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        }`}
                      >
                        Rs. {amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
