import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useExpenseStore } from '../store/expenseStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const defaultForm = {
  name: '',
  type: 'bank',
  account_role: 'flow',
  icon: '',
  color: '#38bdf8',
  current_balance: ''
};

export function Accounts() {
  const { accounts, fetchAccounts, addTransfer } = useExpenseStore();
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [transferForm, setTransferForm] = useState({
    amount: '',
    from_account_id: '',
    to_account_id: '',
    description: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const totalCash = useMemo(
    () => accounts.reduce((sum, account) => sum + Number(account.current_balance), 0),
    [accounts]
  );

  const submitAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      name: form.name,
      type: form.type,
      account_role: form.account_role,
      icon: form.icon || null,
      color: form.color || null,
      current_balance: Number(form.current_balance || 0)
    };

    if (editingId) {
      await axios.put(`${API_URL}/accounts/${editingId}`, payload);
    } else {
      await axios.post(`${API_URL}/accounts`, payload);
    }

    setForm(defaultForm);
    setEditingId(null);
    await fetchAccounts();
  };

  const submitTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transferForm.amount || !transferForm.from_account_id || !transferForm.to_account_id) return;

    await addTransfer({
      from_account: accounts.find((account) => account.id === Number(transferForm.from_account_id))?.name || 'Account',
      to_account: accounts.find((account) => account.id === Number(transferForm.to_account_id))?.name || 'Account',
      from_account_id: Number(transferForm.from_account_id),
      to_account_id: Number(transferForm.to_account_id),
      amount: Number(transferForm.amount),
      description: transferForm.description || 'Internal money move',
      transfer_type: 'internal_transfer'
    });

    setTransferForm({
      amount: '',
      from_account_id: '',
      to_account_id: '',
      description: ''
    });
    await fetchAccounts();
  };

  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-8 pt-8">
        <section className="hero-shell rounded-[2rem] p-6">
          <div className="hero-kicker text-xs font-semibold uppercase tracking-[0.32em]">Accounts</div>
          <h1 className="hero-title mt-3 text-4xl font-black">Track where your money is sitting right now.</h1>
          <p className="hero-copy mt-2 max-w-3xl text-sm">
            Keep separate balances for bank, cash, and e-wallet. Every salary, expense, and transfer can point to a real account.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="standard-metric rounded-[1.25rem] p-5 md:col-span-2">
            <div className="metric-label text-xs font-semibold uppercase tracking-[0.24em]">Total liquid money</div>
            <div className="metric-value mt-4 text-3xl font-black">Rs. {totalCash.toFixed(2)}</div>
          </div>
          <div className="standard-metric rounded-[1.25rem] p-5">
            <div className="metric-label text-xs font-semibold uppercase tracking-[0.24em]">Tracked accounts</div>
            <div className="metric-value mt-4 text-3xl font-black">{accounts.length}</div>
          </div>
          <div className="standard-metric rounded-[1.25rem] p-5">
            <div className="metric-label text-xs font-semibold uppercase tracking-[0.24em]">Biggest balance</div>
            <div className="metric-value mt-4 text-3xl font-black">
              Rs. {Math.max(0, ...accounts.map((account) => Number(account.current_balance))).toFixed(2)}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4">
            {accounts.map((account) => (
              <div key={account.id} className="panel rounded-[2rem] p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      {account.type} • {account.account_role}
                    </div>
                    <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {account.icon ? `${account.icon} ` : ''}{account.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: account.color || '#334155' }}>
                      Rs. {Number(account.current_balance).toFixed(2)}
                    </div>
                    <button
                      onClick={() => {
                        setEditingId(account.id);
                        setForm({
                          name: account.name,
                          type: account.type,
                          account_role: account.account_role,
                          icon: account.icon || '',
                          color: account.color || '#38bdf8',
                          current_balance: Number(account.current_balance).toString()
                        });
                      }}
                      className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:text-white"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6">
            <form onSubmit={submitAccount} className="panel rounded-[2rem] p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {editingId ? 'Edit account' : 'New account'}
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {editingId ? 'Update balance bucket' : 'Add another money bucket'}
              </h2>
              <div className="mt-5 grid gap-4">
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Account name"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                  required
                />
                <select
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="bank">Bank</option>
                  <option value="cash">Cash</option>
                  <option value="ewallet">E-Wallet</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={form.account_role}
                  onChange={(event) => setForm({ ...form, account_role: event.target.value })}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="flow">Flow account</option>
                  <option value="saving">Saving account</option>
                  <option value="other">Other role</option>
                </select>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(event) => setForm({ ...form, icon: event.target.value })}
                    placeholder="Icon"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                  />
                  <input
                    type="color"
                    value={form.color}
                    onChange={(event) => setForm({ ...form, color: event.target.value })}
                    className="h-[58px] w-full rounded-2xl border border-slate-200 bg-white px-2 py-2 outline-none dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={form.current_balance}
                  onChange={(event) => setForm({ ...form, current_balance: event.target.value })}
                  placeholder="Current balance"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                  required
                />
                <button className="rounded-2xl bg-slate-950 px-4 py-4 text-sm font-semibold text-white dark:bg-cyan-400 dark:text-slate-950">
                  {editingId ? 'Save account' : 'Create account'}
                </button>
              </div>
            </form>

            <form onSubmit={submitTransfer} className="panel rounded-[2rem] p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Move money
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Shift money between accounts</h2>
              <div className="mt-5 grid gap-4">
                <input
                  type="number"
                  step="0.01"
                  value={transferForm.amount}
                  onChange={(event) => setTransferForm({ ...transferForm, amount: event.target.value })}
                  placeholder="Amount"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                  required
                />
                <select
                  value={transferForm.from_account_id}
                  onChange={(event) => setTransferForm({ ...transferForm, from_account_id: event.target.value })}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                  required
                >
                  <option value="">Move from</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.icon ? `${account.icon} ` : ''}{account.name} ({account.account_role})
                    </option>
                  ))}
                </select>
                <select
                  value={transferForm.to_account_id}
                  onChange={(event) => setTransferForm({ ...transferForm, to_account_id: event.target.value })}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                  required
                >
                  <option value="">Move to</option>
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
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                />
                <button className="rounded-2xl bg-cyan-400 px-4 py-4 text-sm font-semibold text-slate-950">
                  Save account transfer
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
