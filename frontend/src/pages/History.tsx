import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  useExpenseStore,
  type Expense,
  type Income,
  type Investment,
  type Loan,
  type Transfer
} from '../store/expenseStore';
import { formatMonthLabel, getCurrentMonthValue, toMonthDate } from '../utils/month';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type LedgerRecord = {
  id: string;
  date: string;
  amount: number;
  kind: 'income' | 'expense' | 'transfer_in' | 'transfer_out' | 'loan' | 'investment';
  accountKey: string;
  accountLabel: string;
  description: string;
};

type Totals = {
  incoming: number;
  outgoing: number;
  net: number;
  records: number;
};

const isWithinMonth = (dateValue: string | null | undefined, month: string) => {
  if (!dateValue) return false;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().startsWith(`${month}-`);
};

const getKindLabel = (kind: LedgerRecord['kind']) => {
  if (kind === 'income') return 'Income';
  if (kind === 'expense') return 'Expense';
  if (kind === 'transfer_in') return 'Transfer in';
  if (kind === 'transfer_out') return 'Transfer out';
  if (kind === 'loan') return 'Loan';
  return 'Investment';
};

const isOutgoingRecord = (record: LedgerRecord) => (
  record.kind === 'expense' ||
  record.kind === 'transfer_out' ||
  record.kind === 'investment' ||
  (record.kind === 'loan' && record.description.startsWith('Lent'))
);

const isIncomingRecord = (record: LedgerRecord) => !isOutgoingRecord(record);

const getPreviousMonthValue = (monthValue: string) => {
  const monthDate = new Date(`${monthValue}-01T00:00:00`);
  monthDate.setMonth(monthDate.getMonth() - 1);
  const year = monthDate.getFullYear();
  const month = String(monthDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const escapeCsvValue = (value: string | number) => {
  const normalized = String(value ?? '');
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildLedgerRecords = (
  input: {
    expenses: Expense[];
    income: Income[];
    transfers: Transfer[];
    loans: Loan[];
    investments: Investment[];
    month: string;
  },
  accountById: Record<number, { id: number; name: string; icon: string | null }>
) => {
  const expenseRecords: LedgerRecord[] = input.expenses.map((item) => {
    const account = item.account_id ? accountById[item.account_id] : null;
    return {
      id: `expense-${item.id}`,
      date: item.date,
      amount: Number(item.amount),
      kind: 'expense',
      accountKey: item.account_id ? `account-${item.account_id}` : 'unassigned',
      accountLabel: account ? `${account.icon ? `${account.icon} ` : ''}${account.name}` : 'Unassigned account',
      description: `${item.category_name}${item.description ? ` - ${item.description}` : ''}`
    };
  });

  const incomeRecords: LedgerRecord[] = input.income.map((item) => {
    const account = item.account_id ? accountById[item.account_id] : null;
    return {
      id: `income-${item.id}`,
      date: item.date,
      amount: Number(item.amount),
      kind: 'income',
      accountKey: item.account_id ? `account-${item.account_id}` : 'income-pool',
      accountLabel: account ? `${account.icon ? `${account.icon} ` : ''}${account.name}` : 'Income pool',
      description: `${item.source}${item.description ? ` - ${item.description}` : ''}`
    };
  });

  const transferRecords: LedgerRecord[] = input.transfers.flatMap((item) => {
    const fromAccount = item.from_account_id ? accountById[item.from_account_id] : null;
    const toAccount = item.to_account_id ? accountById[item.to_account_id] : null;
    const transferDate = item.transfer_date || item.created_at;

    const outgoing: LedgerRecord = {
      id: `transfer-out-${item.id}`,
      date: transferDate,
      amount: Number(item.amount),
      kind: 'transfer_out',
      accountKey: item.from_account_id ? `account-${item.from_account_id}` : `virtual-from-${item.from_account}`,
      accountLabel: fromAccount
        ? `${fromAccount.icon ? `${fromAccount.icon} ` : ''}${fromAccount.name}`
        : item.from_account || 'Transfer source',
      description: `To ${toAccount ? toAccount.name : item.to_account || 'destination'}${item.description ? ` - ${item.description}` : ''}`
    };

    const incoming: LedgerRecord = {
      id: `transfer-in-${item.id}`,
      date: transferDate,
      amount: Number(item.amount),
      kind: 'transfer_in',
      accountKey: item.to_account_id ? `account-${item.to_account_id}` : `virtual-to-${item.to_account}`,
      accountLabel: toAccount
        ? `${toAccount.icon ? `${toAccount.icon} ` : ''}${toAccount.name}`
        : item.to_account || 'Transfer destination',
      description: `From ${fromAccount ? fromAccount.name : item.from_account || 'source'}${item.description ? ` - ${item.description}` : ''}`
    };

    return [outgoing, incoming];
  });

  const monthLoans = input.loans.filter((loan) => isWithinMonth(loan.lent_date, input.month));
  const loanRecords: LedgerRecord[] = monthLoans.map((loan) => {
    const account = loan.account_id ? accountById[loan.account_id] : null;
    const isOutgoing = loan.direction !== 'incoming';
    return {
      id: `loan-${loan.id}`,
      date: loan.lent_date,
      amount: Number(loan.principal_amount),
      kind: 'loan',
      accountKey: loan.account_id ? `account-${loan.account_id}` : 'loan-pool',
      accountLabel: account ? `${account.icon ? `${account.icon} ` : ''}${account.name}` : 'Loan pool',
      description: `${isOutgoing ? 'Lent to' : 'Borrowed from'} ${loan.counterparty_name}`
    };
  });

  const monthInvestments = input.investments.filter((investment) => isWithinMonth(investment.purchase_date, input.month));
  const investmentRecords: LedgerRecord[] = monthInvestments.map((investment) => ({
    id: `investment-${investment.id}`,
    date: investment.purchase_date,
    amount: Number(investment.invested_amount),
    kind: 'investment',
    accountKey: `investment-${investment.id}`,
    accountLabel: `Investment - ${investment.name}`,
    description: investment.type || 'Investment account opened'
  }));

  return [...expenseRecords, ...incomeRecords, ...transferRecords, ...loanRecords, ...investmentRecords];
};

const computeTotals = (records: LedgerRecord[]): Totals => {
  const incoming = records.filter(isIncomingRecord).reduce((sum, record) => sum + record.amount, 0);
  const outgoing = records.filter(isOutgoingRecord).reduce((sum, record) => sum + record.amount, 0);
  return {
    incoming,
    outgoing,
    net: incoming - outgoing,
    records: records.length
  };
};

export function History() {
  const {
    expenses,
    income,
    transfers,
    accounts,
    loans,
    investments,
    fetchExpenses,
    fetchIncome,
    fetchTransfers,
    fetchAccounts,
    fetchLoans,
    fetchInvestments
  } = useExpenseStore();
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [search, setSearch] = useState('');
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [previousTotals, setPreviousTotals] = useState<Totals>({
    incoming: 0,
    outgoing: 0,
    net: 0,
    records: 0
  });
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(null);

  const monthDate = toMonthDate(month);
  const previousMonth = useMemo(() => getPreviousMonthValue(month), [month]);
  const previousMonthDate = useMemo(() => toMonthDate(previousMonth), [previousMonth]);

  const refreshRecords = async () => {
    setLoadingRecords(true);
    try {
      const [prevExpenses, prevIncome, prevTransfers, prevLoans, prevInvestments] = await Promise.all([
        axios.get<Expense[]>(`${API_URL}/expenses?month=${previousMonthDate}`),
        axios.get<Income[]>(`${API_URL}/income?month=${previousMonthDate}`),
        axios.get<Transfer[]>(`${API_URL}/transfers?month=${previousMonthDate}`),
        axios.get<Loan[]>(`${API_URL}/loans`),
        axios.get<Investment[]>(`${API_URL}/investments`)
      ]);

      await Promise.all([
        fetchExpenses({ month: monthDate }),
        fetchIncome(monthDate),
        fetchTransfers(monthDate),
        fetchAccounts(),
        fetchLoans(),
        fetchInvestments()
      ]);

      const previousRecords = buildLedgerRecords(
        {
          expenses: prevExpenses.data,
          income: prevIncome.data,
          transfers: prevTransfers.data,
          loans: prevLoans.data,
          investments: prevInvestments.data,
          month: previousMonth
        },
        {}
      );
      setPreviousTotals(computeTotals(previousRecords));
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    refreshRecords();
  }, [month]);

  const accountById = useMemo(
    () => Object.fromEntries(accounts.map((account) => [account.id, account])),
    [accounts]
  );

  const records = useMemo(
    () => buildLedgerRecords({ expenses, income, transfers, loans, investments, month }, accountById),
    [accountById, expenses, income, transfers, loans, investments, month]
  );

  const monthTotals = useMemo(() => computeTotals(records), [records]);

  const filteredRecords = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const items = records.filter((record) => {
      if (!searchValue) return true;
      return (
        record.accountLabel.toLowerCase().includes(searchValue) ||
        record.description.toLowerCase().includes(searchValue) ||
        record.kind.toLowerCase().includes(searchValue)
      );
    });
    return items.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [records, search]);

  const groupedByAccount = useMemo(() => {
    const groups = new Map<string, { accountLabel: string; records: LedgerRecord[] }>();
    filteredRecords.forEach((record) => {
      if (!groups.has(record.accountKey)) {
        groups.set(record.accountKey, { accountLabel: record.accountLabel, records: [] });
      }
      groups.get(record.accountKey)!.records.push(record);
    });

    return Array.from(groups.entries())
      .map(([accountKey, value]) => {
        const incomingTotal = value.records.filter(isIncomingRecord).reduce((sum, record) => sum + record.amount, 0);
        const outgoingTotal = value.records.filter(isOutgoingRecord).reduce((sum, record) => sum + record.amount, 0);

        return {
          accountKey,
          accountLabel: value.accountLabel,
          records: value.records,
          incomingTotal,
          outgoingTotal,
          net: incomingTotal - outgoingTotal
        };
      })
      .sort((left, right) => Math.abs(right.net) - Math.abs(left.net));
  }, [filteredRecords]);

  const selectedAccount = useMemo(
    () => groupedByAccount.find((group) => group.accountKey === selectedAccountKey) || null,
    [groupedByAccount, selectedAccountKey]
  );

  useEffect(() => {
    if (!selectedAccountKey) return;
    if (!groupedByAccount.some((group) => group.accountKey === selectedAccountKey)) {
      setSelectedAccountKey(null);
    }
  }, [groupedByAccount, selectedAccountKey]);

  const comparison = useMemo(() => ({
    incomingDelta: monthTotals.incoming - previousTotals.incoming,
    outgoingDelta: monthTotals.outgoing - previousTotals.outgoing,
    netDelta: monthTotals.net - previousTotals.net,
    recordsDelta: monthTotals.records - previousTotals.records
  }), [monthTotals, previousTotals]);

  const exportCsv = () => {
    const header = ['Date', 'Type', 'Account', 'Description', 'Direction', 'Amount'];
    const rows = records.map((record) => [
      new Date(record.date).toISOString().slice(0, 10),
      getKindLabel(record.kind),
      record.accountLabel,
      record.description,
      isOutgoingRecord(record) ? 'outgoing' : 'incoming',
      record.amount.toFixed(2)
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `budgetbuddy-records-${month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const rows = records
      .map((record) => `
        <tr>
          <td>${escapeHtml(new Date(record.date).toLocaleDateString('en-US'))}</td>
          <td>${escapeHtml(getKindLabel(record.kind))}</td>
          <td>${escapeHtml(record.accountLabel)}</td>
          <td>${escapeHtml(record.description)}</td>
          <td>${escapeHtml(isOutgoingRecord(record) ? 'outgoing' : 'incoming')}</td>
          <td style="text-align:right;">Rs. ${record.amount.toFixed(2)}</td>
        </tr>
      `)
      .join('');

    const popup = window.open('', '_blank', 'width=1024,height=700');
    if (!popup) return;

    popup.document.write(`
      <html>
        <head>
          <title>BudgetBuddy Records ${month}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px 0; }
            p { margin: 0 0 18px 0; color: #475569; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; }
            th { background: #f1f5f9; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Monthly Records - ${escapeHtml(formatMonthLabel(month))}</h1>
          <p>Total records: ${records.length} | Incoming: Rs. ${monthTotals.incoming.toFixed(2)} | Outgoing: Rs. ${monthTotals.outgoing.toFixed(2)} | Net: Rs. ${monthTotals.net.toFixed(2)}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Account</th>
                <th>Description</th>
                <th>Direction</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-8 pt-8">
        <section className="hero-shell rounded-[2rem] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="hero-kicker text-xs font-semibold uppercase tracking-[0.32em]">Monthly records</div>
              <h1 className="hero-title mt-3 text-4xl font-black">Everything in one month, account by account.</h1>
              <p className="hero-copy mt-2 max-w-2xl text-sm">
                Income, expenses, transfers, loans, and investment events are shown in a single month-wise ledger.
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
          <div className="standard-metric rounded-[1.25rem] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Records in {formatMonthLabel(month)}
            </div>
            <div className="mt-4 text-3xl font-black text-slate-900 dark:text-white">{monthTotals.records}</div>
          </div>
          <div className="standard-metric rounded-[1.25rem] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Incoming</div>
            <div className="mt-4 text-3xl font-black text-emerald-600 dark:text-emerald-300">Rs. {monthTotals.incoming.toFixed(2)}</div>
          </div>
          <div className="standard-metric rounded-[1.25rem] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Outgoing</div>
            <div className="mt-4 text-3xl font-black text-rose-600 dark:text-rose-300">Rs. {monthTotals.outgoing.toFixed(2)}</div>
          </div>
          <div className="standard-metric rounded-[1.25rem] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Net movement</div>
            <div className={`mt-4 text-3xl font-black ${monthTotals.net >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
              Rs. {monthTotals.net.toFixed(2)}
            </div>
          </div>
        </section>

        <section className="panel rounded-[2rem] p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Comparison
          </div>
          <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {formatMonthLabel(month)} vs {formatMonthLabel(previousMonth)}
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-100 px-4 py-4 dark:bg-slate-800">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Incoming delta</div>
              <div className={`mt-2 text-xl font-black ${comparison.incomingDelta >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                {comparison.incomingDelta >= 0 ? '+' : '-'} Rs. {Math.abs(comparison.incomingDelta).toFixed(2)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-4 dark:bg-slate-800">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Outgoing delta</div>
              <div className={`mt-2 text-xl font-black ${comparison.outgoingDelta <= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                {comparison.outgoingDelta >= 0 ? '+' : '-'} Rs. {Math.abs(comparison.outgoingDelta).toFixed(2)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-4 dark:bg-slate-800">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Net delta</div>
              <div className={`mt-2 text-xl font-black ${comparison.netDelta >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                {comparison.netDelta >= 0 ? '+' : '-'} Rs. {Math.abs(comparison.netDelta).toFixed(2)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-4 dark:bg-slate-800">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Record count delta</div>
              <div className={`mt-2 text-xl font-black ${comparison.recordsDelta >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                {comparison.recordsDelta >= 0 ? '+' : ''}{comparison.recordsDelta}
              </div>
            </div>
          </div>
        </section>

        <section className="panel rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search account, description, or record type"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900 lg:max-w-lg"
            />
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportCsv}
                className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                Export CSV
              </button>
              <button
                onClick={exportPdf}
                className="rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
              >
                Export PDF
              </button>
              <button
                onClick={refreshRecords}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-cyan-400 dark:text-slate-950"
              >
                Refresh month
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="panel rounded-[2rem] p-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Account-wise monthly record</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Click an account card for full details.</p>
            <div className="mt-5 space-y-4">
              {groupedByAccount.map((group) => (
                <button
                  key={group.accountKey}
                  onClick={() => setSelectedAccountKey(group.accountKey)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-cyan-300 dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{group.accountLabel}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                        {group.records.length} record{group.records.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-300">+Rs. {group.incomingTotal.toFixed(2)}</span>
                      <span className="mx-2 text-slate-300">/</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-300">-Rs. {group.outgoingTotal.toFixed(2)}</span>
                      <span className={`ml-2 font-bold ${group.net >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                        Net Rs. {group.net.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
              {groupedByAccount.length === 0 && !loadingRecords && (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No records found for this month.
                </div>
              )}
            </div>
          </div>

          <div className="panel rounded-[2rem] p-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Month timeline</h2>
            <div className="mt-5 space-y-3">
              {filteredRecords.map((record) => {
                const outgoing = isOutgoingRecord(record);
                return (
                  <div key={record.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{record.description}</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {record.accountLabel} - {getKindLabel(record.kind)}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className={`text-right font-bold ${outgoing ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                        {outgoing ? '-' : '+'} Rs. {record.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredRecords.length === 0 && !loadingRecords && (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No timeline entries for this month.
                </div>
              )}
              {loadingRecords && (
                <div className="rounded-2xl border border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Loading monthly records...
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Account details
                </div>
                <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{selectedAccount.accountLabel}</h3>
                <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{formatMonthLabel(month)}</div>
              </div>
              <button
                onClick={() => setSelectedAccountKey(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/15">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Incoming</div>
                <div className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-300">Rs. {selectedAccount.incomingTotal.toFixed(2)}</div>
              </div>
              <div className="rounded-2xl bg-rose-50 px-4 py-3 dark:bg-rose-500/15">
                <div className="text-xs uppercase tracking-[0.2em] text-rose-700 dark:text-rose-300">Outgoing</div>
                <div className="mt-1 text-lg font-black text-rose-700 dark:text-rose-300">Rs. {selectedAccount.outgoingTotal.toFixed(2)}</div>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">Net</div>
                <div className={`mt-1 text-lg font-black ${selectedAccount.net >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                  Rs. {selectedAccount.net.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {selectedAccount.records.map((record) => {
                const outgoing = isOutgoingRecord(record);
                return (
                  <div key={record.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{record.description}</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{getKindLabel(record.kind)}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className={`text-right font-bold ${outgoing ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                        {outgoing ? '-' : '+'} Rs. {record.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
