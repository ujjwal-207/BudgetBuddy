import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useExpenseStore } from '../store/expenseStore';
import { formatMonthLabel, getCurrentMonthValue, toMonthDate } from '../utils/month';
import { getNepalBudgetGuidance, NEPAL_MINIMUM_MONTHLY_WAGE } from '../utils/budgetGuidance';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function Budgets() {
  const { categories, fetchCategories } = useExpenseStore();
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [distributionType, setDistributionType] = useState('balanced');
  const [budgetSummary, setBudgetSummary] = useState<any>(null);
  const [budgetHistory, setBudgetHistory] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const monthDate = toMonthDate(month);

  const refreshBudgetData = async () => {
    await Promise.all([
      fetchCategories(monthDate),
      axios.get(`${API_URL}/budgets/ratio?month=${monthDate}`).then((response) => setBudgetSummary(response.data)),
      axios.get(`${API_URL}/budgets/history`).then((response) => setBudgetHistory(response.data))
    ]);
  };

  useEffect(() => {
    refreshBudgetData();
  }, [month]);

  const totalSpent = useMemo(
    () => categories.reduce((sum, category) => sum + Number(category.spent_this_month || 0), 0),
    [categories]
  );
  const totalIncome = Number(budgetSummary?.total_income || 0);
  const availableBudget = Number(budgetSummary?.available_budget || 0);
  const guidance = getNepalBudgetGuidance(totalIncome || availableBudget || NEPAL_MINIMUM_MONTHLY_WAGE);

  const handleDistribute = async () => {
    await axios.post(`${API_URL}/budgets/distribute`, {
      month: monthDate,
      distribution_type: distributionType
    });
    await refreshBudgetData();
  };

  const handleSaveCategoryBudget = async (categoryId: number) => {
    await axios.put(`${API_URL}/categories/${categoryId}/budget`, {
      month: monthDate,
      monthly_budget: parseFloat(editingValue)
    });
    setEditingId(null);
    setEditingValue('');
    await refreshBudgetData();
  };

  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-8 pt-8">
        <section className="hero-shell rounded-[2rem] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="hero-kicker text-xs font-semibold uppercase tracking-[0.32em]">Monthly budgets</div>
              <h1 className="hero-title mt-3 text-4xl font-black">Map only the money that is actually available this month.</h1>
              <p className="hero-copy mt-2 max-w-2xl text-sm">
                If you invest part of the salary, that part is removed from the month&apos;s spendable budget. Budget
                allocations are now stored month by month.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Month</span>
                <input
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="bg-transparent outline-none"
                />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Preset</span>
                <select
                  value={distributionType}
                  onChange={(event) => setDistributionType(event.target.value)}
                  className="bg-transparent outline-none"
                >
                  <option value="balanced" className="text-slate-900">Balanced</option>
                  <option value="conservative" className="text-slate-900">Conservative</option>
                  <option value="lifestyle" className="text-slate-900">Lifestyle</option>
                </select>
              </label>
              <button
                onClick={handleDistribute}
                className="rounded-2xl bg-amber-300 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
              >
                Auto-allocate {formatMonthLabel(month)}
              </button>
            </div>
          </div>
        </section>

        <section className="panel rounded-[2rem] p-6">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                What auto-allocate does
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Why that button exists</h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                It takes the month&apos;s spendable budget, not just salary, and spreads it across categories using your selected preset.
                If you earn Rs. 10,000 and move Rs. 5,000 to investments, it allocates from the remaining Rs. 5,000.
              </p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                It exists so category budgets stay realistic instead of drifting above what you can safely spend.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Nepal benchmark
              </div>
              <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-white">{guidance.bandLabel}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{guidance.profile}</p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Anchor for low-income budgeting: Nepal&apos;s monthly minimum wage was raised to about Rs. 19,550 in July 2025.
              </p>
            </div>
          </div>
        </section>

        <section className="panel rounded-[2rem] p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Surplus and deficit record
          </div>
          <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Months where money went negative are kept too</h2>
          <div className="mt-6 grid gap-3">
            {budgetHistory.length > 0 ? (
              budgetHistory.map((item) => {
                const delta = Number(item.surplus_or_deficit || 0);
                return (
                  <div key={item.month} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900/60 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {new Date(item.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Available Rs. {Number(item.available_budget).toFixed(2)} / Planned Rs. {Number(item.total_budget).toFixed(2)}
                      </div>
                    </div>
                    <div className={`rounded-2xl px-4 py-2 text-sm font-semibold ${delta >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'}`}>
                      {delta >= 0 ? 'Surplus' : 'Deficit'} Rs. {Math.abs(delta).toFixed(2)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No monthly history yet.
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Income', value: budgetSummary?.total_income || 0 },
            { label: 'Sent to investment', value: budgetSummary?.total_invested || 0 },
            { label: 'Spendable budget', value: budgetSummary?.available_budget || 0 },
            { label: 'Still unallocated', value: budgetSummary?.unallocated_budget || 0 }
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

        <section className="panel rounded-[2rem] p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Suggested split for Nepal
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                Monthly income around Rs. {(totalIncome || availableBudget || 0).toFixed(2)}
              </h2>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Spendable budget used: Rs. {availableBudget.toFixed(2)}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              { label: 'Essentials', pct: guidance.allocation.essentials },
              { label: 'Lifestyle', pct: guidance.allocation.lifestyle },
              { label: 'Savings / invest', pct: guidance.allocation.savings },
              { label: 'Buffer', pct: guidance.allocation.buffer }
            ].map((item) => (
              <div key={item.label} className="standard-metric rounded-[1.25rem] p-5">
                <div className="metric-label text-xs font-semibold uppercase tracking-[0.24em]">{item.label}</div>
                <div className="metric-value mt-3 text-2xl font-black">{item.pct}% </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Rs. {((availableBudget * item.pct) / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {guidance.categoryTargets.map((target) => (
              <div key={target.key} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="font-semibold text-slate-900 dark:text-white">{target.label}</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {target.minPct}% to {target.maxPct}% of spendable budget
                </div>
                <div className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Rs. {((availableBudget * target.minPct) / 100).toFixed(2)} to Rs. {((availableBudget * target.maxPct) / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel rounded-[2rem] p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {formatMonthLabel(month)}
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Category budget map</h2>
            </div>
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-amber-200">
              Spent so far: Rs. {totalSpent.toFixed(2)}
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {categories.map((category) => {
              const spent = Number(category.spent_this_month || 0);
              const budget = Number(category.monthly_budget || 0);
              const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

              return (
                <div
                  key={category.id}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                        style={{ backgroundColor: `${category.color}25` }}
                      >
                        {category.icon}
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">{category.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Spent Rs. {spent.toFixed(2)} / Budget Rs. {budget.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {editingId === category.id ? (
                      <div className="flex flex-wrap gap-3">
                        <input
                          type="number"
                          step="0.01"
                          value={editingValue}
                          onChange={(event) => setEditingValue(event.target.value)}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-950"
                        />
                        <button
                          onClick={() => handleSaveCategoryBudget(category.id)}
                          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-cyan-400 dark:text-slate-950"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(category.id);
                          setEditingValue(String(budget));
                        }}
                        className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        Edit month budget
                      </button>
                    )}
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percent}%`,
                        background: percent > 85 ? 'linear-gradient(90deg, #fb7185, #f97316)' : category.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
