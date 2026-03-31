import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useExpenseStore } from '../store/expenseStore';
import { chartTheme, formatCurrency } from '../utils/chartTheme';

import { API_URL } from '../lib/api';

const defaultForm = {
  name: '',
  type: 'bank',
  account_role: 'flow',
  icon: '',
  color: '#38bdf8',
  current_balance: ''
};

export function Accounts() {
  const { accounts, loans, fetchAccounts, fetchLoans, addTransfer, addLoan, repayLoan } = useExpenseStore();
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [transferForm, setTransferForm] = useState({
    amount: '',
    from_account_id: '',
    to_account_id: '',
    description: ''
  });
  const [loanForm, setLoanForm] = useState<{
    counterparty_name: string;
    principal_amount: string;
    account_id: string;
    description: string;
    lent_date: string;
    expected_repayment_date: string;
    direction: 'incoming' | 'outgoing';
  }>({
    counterparty_name: '',
    principal_amount: '',
    account_id: '',
    description: '',
    lent_date: new Date().toISOString().slice(0, 10),
    expected_repayment_date: '',
    direction: 'outgoing'
  });
  const [repaymentForm, setRepaymentForm] = useState<Record<number, { amount: string; account_id: string }>>({});

  useEffect(() => {
    fetchAccounts();
    fetchLoans();
  }, [fetchAccounts, fetchLoans]);

  const totalCash = useMemo(
    () => accounts.reduce((sum, account) => sum + Number(account.current_balance), 0),
    [accounts]
  );

  const outgoingLoans = useMemo(
    () => loans.filter((loan) => loan.direction === 'outgoing'),
    [loans]
  );

  const incomingLoans = useMemo(
    () => loans.filter((loan) => loan.direction === 'incoming'),
    [loans]
  );

  const outstandingLoans = useMemo(
    () => loans.filter((loan) => loan.status === 'open'),
    [loans]
  );

  const totalLent = useMemo(
    () => outgoingLoans.reduce((sum, loan) => sum + Number(loan.principal_amount), 0),
    [outgoingLoans]
  );

  const totalBorrowed = useMemo(
    () => incomingLoans.reduce((sum, loan) => sum + Number(loan.principal_amount), 0),
    [incomingLoans]
  );

  const totalOutstandingLent = useMemo(
    () => outgoingLoans.reduce((sum, loan) => sum + Number(loan.outstanding_amount || 0), 0),
    [outgoingLoans]
  );

  const totalOutstandingBorrowed = useMemo(
    () => incomingLoans.reduce((sum, loan) => sum + Number(loan.outstanding_amount || 0), 0),
    [incomingLoans]
  );

  const totalRepaid = useMemo(
    () => outgoingLoans.reduce((sum, loan) => sum + Number(loan.repaid_amount || 0), 0),
    [outgoingLoans]
  );
  const accountBalanceData = useMemo(
    () => accounts.map((account) => ({ name: account.name, balance: Number(account.current_balance) })),
    [accounts]
  );
  const loanExposurePie = useMemo(
    () => [
      { name: 'Outstanding lent', value: totalOutstandingLent, color: chartTheme.colors.amber },
      { name: 'Outstanding owed', value: totalOutstandingBorrowed, color: chartTheme.colors.rose },
      { name: 'Recovered', value: totalRepaid, color: chartTheme.colors.emerald }
    ].filter((entry) => entry.value > 0),
    [totalOutstandingBorrowed, totalOutstandingLent, totalRepaid]
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

  const submitLoan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!loanForm.counterparty_name || !loanForm.principal_amount) return;

    await addLoan({
      counterparty_name: loanForm.counterparty_name,
      principal_amount: Number(loanForm.principal_amount),
      account_id: loanForm.account_id ? Number(loanForm.account_id) : null,
      description: loanForm.description || null,
      lent_date: loanForm.lent_date,
      expected_repayment_date: loanForm.expected_repayment_date || null,
      direction: loanForm.direction
    });

    setLoanForm({
      counterparty_name: '',
      principal_amount: '',
      account_id: '',
      description: '',
      lent_date: new Date().toISOString().slice(0, 10),
      expected_repayment_date: '',
      direction: 'outgoing'
    });
  };

  const submitRepayment = async (loanId: number) => {
    const current = repaymentForm[loanId];
    if (!current?.amount) return;

    await repayLoan(loanId, {
      amount: Number(current.amount),
      account_id: current.account_id ? Number(current.account_id) : null
    });

    setRepaymentForm((state) => ({
      ...state,
      [loanId]: { amount: '', account_id: current.account_id || '' }
    }));
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

        <section className="grid gap-4 md:grid-cols-4">
          <div className="standard-metric rounded-[1.25rem] p-5">
            <div className="metric-label text-xs font-semibold uppercase tracking-[0.24em]">Outstanding lent</div>
            <div className="metric-value mt-4 text-3xl font-black">Rs. {totalOutstandingLent.toFixed(2)}</div>
          </div>
          <div className="standard-metric rounded-[1.25rem] p-5">
            <div className="metric-label text-xs font-semibold uppercase tracking-[0.24em]">Outstanding owed</div>
            <div className="metric-value mt-4 text-3xl font-black">Rs. {totalOutstandingBorrowed.toFixed(2)}</div>
          </div>
          <div className="standard-metric rounded-[1.25rem] p-5">
            <div className="metric-label text-xs font-semibold uppercase tracking-[0.24em]">Total lent</div>
            <div className="metric-value mt-4 text-3xl font-black">Rs. {totalLent.toFixed(2)}</div>
            <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400 mt-2">
              Recovered Rs. {totalRepaid.toFixed(2)}
            </div>
          </div>
          <div className="standard-metric rounded-[1.25rem] p-5">
            <div className="metric-label text-xs font-semibold uppercase tracking-[0.24em]">Total borrowed</div>
            <div className="metric-value mt-4 text-3xl font-black">Rs. {totalBorrowed.toFixed(2)}</div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="panel rounded-[2rem] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Balance chart
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Account balance comparison</h2>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accountBalanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.gridStroke} />
                  <XAxis dataKey="name" tick={chartTheme.axisTick} />
                  <YAxis tick={chartTheme.axisTick} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={chartTheme.tooltipStyle} />
                  <Bar dataKey="balance" fill={chartTheme.colors.cyan} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel rounded-[2rem] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Loan chart
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Loan exposure at a glance</h2>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={loanExposurePie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {loanExposurePie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={chartTheme.tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
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

            <form onSubmit={submitLoan} className="panel rounded-[2rem] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Owed money
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Log anyone you lent or borrowed with</h2>
              <div className="mt-5 grid gap-4">
                <input
                  type="text"
                  value={loanForm.counterparty_name}
                  onChange={(event) => setLoanForm({ ...loanForm, counterparty_name: event.target.value })}
                  placeholder="Counterparty name"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                  required
                />
                <select
                  value={loanForm.direction}
                  onChange={(event) =>
                    setLoanForm({
                      ...loanForm,
                      direction: event.target.value as 'incoming' | 'outgoing'
                    })
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="outgoing">You lent money</option>
                  <option value="incoming">You borrowed</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={loanForm.principal_amount}
                  onChange={(event) => setLoanForm({ ...loanForm, principal_amount: event.target.value })}
                  placeholder="Amount lent"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                  required
                />
                <select
                  value={loanForm.account_id}
                  onChange={(event) => setLoanForm({ ...loanForm, account_id: event.target.value })}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="">Money came from an untracked source</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.icon ? `${account.icon} ` : ''}{account.name}
                    </option>
                  ))}
                </select>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span>Lent on</span>
                    <input
                      type="date"
                      value={loanForm.lent_date}
                      onChange={(event) => setLoanForm({ ...loanForm, lent_date: event.target.value })}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span>Expected back</span>
                    <input
                      type="date"
                      value={loanForm.expected_repayment_date}
                      onChange={(event) => setLoanForm({ ...loanForm, expected_repayment_date: event.target.value })}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={loanForm.description}
                  onChange={(event) => setLoanForm({ ...loanForm, description: event.target.value })}
                  placeholder="Optional note"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                />
                <button className="rounded-2xl bg-amber-300 px-4 py-4 text-sm font-semibold text-slate-950">
                  Save loan
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="panel rounded-[2rem] p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Lending tracker
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">People who owe you money</h2>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Outstanding receivables are separate from spending, so they do not distort expense history.
            </div>
          </div>
          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {outstandingLoans.length} open loans • Recovered Rs. {totalRepaid.toFixed(2)}
          </div>

          <div className="mt-6 grid gap-4">
            {loans.map((loan) => {
              const currentRepayment = repaymentForm[loan.id] || { amount: '', account_id: loan.account_id ? String(loan.account_id) : '' };
              const outstandingAmount = Number(loan.outstanding_amount || 0);
              const progress = loan.principal_amount > 0
                ? Math.min(100, (Number(loan.repaid_amount) / Number(loan.principal_amount)) * 100)
                : 0;
              const isOutgoing = loan.direction === 'outgoing';

              const accountLine = loan.account_name
                ? `${isOutgoing ? ' from' : ' into'} ${loan.account_icon ? `${loan.account_icon} ` : ''}${loan.account_name}`
                : '';

              return (
                <div key={loan.id} className="rounded-[1.5rem] border border-slate-200/80 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{loan.counterparty_name}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                          loan.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
                        }`}>
                          {loan.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {isOutgoing ? 'Lent' : 'Borrowed'} Rs. {Number(loan.principal_amount).toFixed(2)}{accountLine}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {isOutgoing ? 'Lent on' : 'Borrowed on'} {new Date(loan.lent_date).toLocaleDateString()}
                        {loan.expected_repayment_date ? ` • ${isOutgoing ? 'expected back' : 'expected to repay by'} ${new Date(loan.expected_repayment_date).toLocaleDateString()}` : ''}
                      </div>
                      {loan.description && (
                        <div className="text-sm text-slate-600 dark:text-slate-300">{loan.description}</div>
                      )}
                    </div>

                    <div className="min-w-[16rem] rounded-[1.25rem] bg-slate-100/80 p-4 dark:bg-slate-800/80">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Outstanding</div>
                      <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Rs. {outstandingAmount.toFixed(2)}</div>
                      <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Repaid Rs. {Number(loan.repaid_amount).toFixed(2)} of Rs. {Number(loan.principal_amount).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {loan.status === 'open' && (
                    <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <input
                        type="number"
                        step="0.01"
                        value={currentRepayment.amount}
                        onChange={(event) =>
                          setRepaymentForm((state) => ({
                            ...state,
                            [loan.id]: { ...currentRepayment, amount: event.target.value }
                          }))
                        }
                        placeholder="Repayment amount"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                      />
                      <select
                        value={currentRepayment.account_id}
                        onChange={(event) =>
                          setRepaymentForm((state) => ({
                            ...state,
                            [loan.id]: { ...currentRepayment, account_id: event.target.value }
                          }))
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none dark:border-slate-700 dark:bg-slate-900"
                      >
                        <option value="">Repayment goes to original account</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.icon ? `${account.icon} ` : ''}{account.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => submitRepayment(loan.id)}
                        className="rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-semibold text-slate-950"
                      >
                        Record repayment
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {loans.length === 0 && (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No loans tracked yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
