import React, { useEffect, useMemo, useState } from 'react';
import { useExpenseStore } from '../store/expenseStore';
import { formatMonthLabel, getCurrentMonthValue, toMonthDate } from '../utils/month';

export function Investments() {
  const { investments, accounts, fetchInvestments, addInvestment, updateInvestment, fetchTransfers, fetchAccounts, addTransfer } = useExpenseStore();
  const [month, setMonth] = useState(getCurrentMonthValue());
  const initialMonthDate = toMonthDate(getCurrentMonthValue());
  const [newInvestment, setNewInvestment] = useState({
    name: '',
    type: '',
    invested_amount: '',
    notes: '',
    purchase_date: initialMonthDate
  });
  const [returnForms, setReturnForms] = useState<Record<number, string>>({});
  const [withdrawForms, setWithdrawForms] = useState<Record<number, string>>({});
  const [withdrawAccounts, setWithdrawAccounts] = useState<Record<number, string>>({});
  const [editingInvestmentId, setEditingInvestmentId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    type: '',
    notes: '',
    purchase_date: initialMonthDate
  });

  useEffect(() => {
    fetchInvestments();
    fetchAccounts();
  }, [fetchAccounts, fetchInvestments]);

  const monthDate = toMonthDate(month);

  const totals = useMemo(() => {
    const totalInvested = investments.reduce((sum, item) => sum + Number(item.invested_amount), 0);
    const totalCurrentValue = investments.reduce(
      (sum, item) => sum + Number(item.current_value ?? item.invested_amount),
      0
    );
    return {
      totalInvested,
      totalCurrentValue,
      totalProfitLoss: totalCurrentValue - totalInvested
    };
  }, [investments]);

  const handleAddInvestment = async (event: React.FormEvent) => {
    event.preventDefault();
    await addInvestment({
      name: newInvestment.name,
      type: newInvestment.type || null,
      invested_amount: parseFloat(newInvestment.invested_amount),
      current_value: parseFloat(newInvestment.invested_amount),
      notes: newInvestment.notes || null,
      purchase_date: newInvestment.purchase_date
    });
    setNewInvestment({ name: '', type: '', invested_amount: '', notes: '', purchase_date: monthDate });
    await fetchInvestments();
  };

  const handleUpdateReturn = async (investmentId: number) => {
    const currentValue = returnForms[investmentId];
    if (!currentValue) return;
    await updateInvestment(investmentId, {
      current_value: parseFloat(currentValue)
    });
    setReturnForms((state) => ({ ...state, [investmentId]: '' }));
    await fetchInvestments();
  };

  const handleWithdraw = async (investmentId: number) => {
    const amount = withdrawForms[investmentId];
    if (!amount) return;
    await addTransfer({
      from_account: `investment:${investmentId}`,
      to_account: withdrawAccounts[investmentId]
        ? accounts.find((account) => account.id === Number(withdrawAccounts[investmentId]))?.name || 'budget'
        : 'budget',
      investment_id: investmentId,
      amount: parseFloat(amount),
      to_account_id: withdrawAccounts[investmentId] ? Number(withdrawAccounts[investmentId]) : null,
      transfer_type: 'investment_withdrawal',
      description: 'Withdraw back to budget',
      transfer_date: monthDate,
      effective_month: monthDate
    });
    setWithdrawForms((state) => ({ ...state, [investmentId]: '' }));
    setWithdrawAccounts((state) => ({ ...state, [investmentId]: '' }));
    await Promise.all([fetchInvestments(), fetchTransfers(monthDate)]);
  };

  const startEditingInvestment = (investment: (typeof investments)[number]) => {
    setEditingInvestmentId(investment.id);
    setEditForm({
      name: investment.name,
      type: investment.type || '',
      notes: investment.notes || '',
      purchase_date: investment.purchase_date?.slice(0, 10) || initialMonthDate
    });
  };

  const handleSaveInvestmentBucket = async (investmentId: number) => {
    await updateInvestment(investmentId, {
      name: editForm.name,
      type: editForm.type || null,
      notes: editForm.notes || null,
      purchase_date: editForm.purchase_date
    });
    setEditingInvestmentId(null);
    setEditForm({
      name: '',
      type: '',
      notes: '',
      purchase_date: initialMonthDate
    });
    await fetchInvestments();
  };

  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-8 pt-8">
        <section className="hero-shell rounded-[2rem] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="hero-kicker text-xs font-semibold uppercase tracking-[0.32em]">Investments</div>
              <h1 className="hero-title mt-3 text-4xl font-black">Returns stay here until you withdraw them.</h1>
              <p className="hero-copy mt-2 max-w-2xl text-sm">
                Update current value whenever the market moves. Profit or loss changes investment value only; it does
                not increase monthly budget until you move money back to budget.
              </p>
            </div>

            <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Withdrawal month</span>
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="bg-transparent outline-none"
              />
            </label>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Principal invested', value: totals.totalInvested },
            { label: 'Current investment value', value: totals.totalCurrentValue },
            { label: 'Unrealized profit / loss', value: totals.totalProfitLoss }
          ].map((item) => (
            <div key={item.label} className="standard-metric rounded-[1.25rem] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {item.label}
              </div>
              <div className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
                {item.value >= 0 ? '' : '-'}Rs. {Math.abs(Number(item.value)).toFixed(2)}
              </div>
            </div>
          ))}
        </section>

        {totals.totalProfitLoss < 0 && (
          <section className="panel rounded-[2rem] border border-rose-200 p-6 dark:border-rose-500/20">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700 dark:text-rose-300">
              Loss tracking
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              Portfolio is down Rs. {Math.abs(totals.totalProfitLoss).toFixed(2)}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Investments do not always go up. This app tracks negative return too, and that loss stays inside the investment account until you withdraw.
            </p>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={handleAddInvestment} className="panel rounded-[2rem] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              New account
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Create investment bucket</h2>
            <div className="mt-5 grid gap-4">
              <input
                type="text"
                value={newInvestment.name}
                onChange={(event) => setNewInvestment({ ...newInvestment, name: event.target.value })}
                placeholder="Investment name"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-900"
                required
              />
              <input
                type="text"
                value={newInvestment.type}
                onChange={(event) => setNewInvestment({ ...newInvestment, type: event.target.value })}
                placeholder="Type: mutual fund, stock, crypto..."
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-900"
              />
              <input
                type="number"
                step="0.01"
                value={newInvestment.invested_amount}
                onChange={(event) => setNewInvestment({ ...newInvestment, invested_amount: event.target.value })}
                placeholder="Opening amount"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-900"
                required
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Bought on
                </label>
                <input
                  type="date"
                  value={newInvestment.purchase_date}
                  onChange={(event) => setNewInvestment({ ...newInvestment, purchase_date: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-900"
                  required
                />
              </div>
              <textarea
                value={newInvestment.notes}
                onChange={(event) => setNewInvestment({ ...newInvestment, notes: event.target.value })}
                placeholder="Optional notes"
                className="min-h-[120px] rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-900"
              />
              <button className="rounded-2xl bg-fuchsia-400 px-4 py-4 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-300">
                Add investment account
              </button>
            </div>
          </form>

          <div className="grid gap-4">
            {investments.map((investment) => {
              const currentValue = Number(investment.current_value ?? investment.invested_amount);
              const profitLoss = currentValue - Number(investment.invested_amount);
              return (
                <div
                  key={investment.id}
                  className="panel rounded-[2rem] p-6"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                        {investment.type || 'Investment'}
                      </div>
                      <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{investment.name}</h2>
                      <div className="mt-1 text-xs text-slate-400">
                        Started on {new Date(investment.purchase_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div className={`rounded-2xl px-4 py-2 text-sm font-semibold ${profitLoss >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'}`}>
                      {profitLoss >= 0 ? '+' : '-'}Rs. {Math.abs(profitLoss).toFixed(2)}
                    </div>
                  </div>

                  {editingInvestmentId === investment.id ? (
                    <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-slate-200 p-4 dark:border-slate-700">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">Edit investment bucket</div>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                        placeholder="Investment name"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950"
                      />
                      <input
                        type="text"
                        value={editForm.type}
                        onChange={(event) => setEditForm({ ...editForm, type: event.target.value })}
                        placeholder="Type"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950"
                      />
                      <input
                        type="date"
                        value={editForm.purchase_date}
                        onChange={(event) => setEditForm({ ...editForm, purchase_date: event.target.value })}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950"
                      />
                      <textarea
                        value={editForm.notes}
                        onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })}
                        placeholder="Notes"
                        className="min-h-[96px] rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950"
                      />
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => handleSaveInvestmentBucket(investment.id)}
                          className="w-full rounded-2xl bg-fuchsia-400 px-4 py-3 text-sm font-semibold text-slate-950 sm:w-auto"
                        >
                          Save bucket
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingInvestmentId(null)}
                          className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:w-auto"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => startEditingInvestment(investment)}
                        className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:w-auto"
                      >
                        Edit bucket
                      </button>
                    </div>
                  )}

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Principal</div>
                      <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Rs. {Number(investment.invested_amount).toFixed(2)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Current value</div>
                      <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Rs. {currentValue.toFixed(2)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Return %</div>
                      <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{Number(investment.return_percentage).toFixed(2)}%</div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-slate-200 p-4 dark:border-slate-700">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">Update current value</div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                        <input
                          type="number"
                          step="0.01"
                          value={returnForms[investment.id] || ''}
                          onChange={(event) =>
                            setReturnForms((state) => ({ ...state, [investment.id]: event.target.value }))
                          }
                          placeholder="Latest value"
                          className="w-full flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateReturn(investment.id)}
                          className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-fuchsia-400 dark:text-slate-950 sm:w-auto"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 p-4 dark:border-slate-700">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        Withdraw to {formatMonthLabel(month)} budget
                      </div>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                        <input
                          type="number"
                          step="0.01"
                          value={withdrawForms[investment.id] || ''}
                          onChange={(event) =>
                            setWithdrawForms((state) => ({ ...state, [investment.id]: event.target.value }))
                          }
                          placeholder="Amount"
                          className="w-full flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950"
                        />
                        <select
                          value={withdrawAccounts[investment.id] || ''}
                          onChange={(event) =>
                            setWithdrawAccounts((state) => ({ ...state, [investment.id]: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950"
                        >
                          <option value="">Return into account</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.icon ? `${account.icon} ` : ''}{account.name} ({account.account_role})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleWithdraw(investment.id)}
                          className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 sm:w-auto"
                        >
                          Withdraw
                        </button>
                      </div>
                    </div>
                  </div>

                  {investment.notes && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{investment.notes}</p>}
                </div>
              );
            })}

            {investments.length === 0 && (
              <div className="panel rounded-[2rem] p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No investment accounts yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
