'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { OmniStore } from '@/lib/store';
import { FinancialTransaction, FinancialGoal } from '@/lib/types';
import {
  formatBRL,
  CATEGORY_COLORS,
  MONTH_NAMES_PT,
  MONTH_SHORT_PT,
} from '@/lib/finance';
import { TransactionModal } from '@/components/financeiro/TransactionModal';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  BarChart3,
  PieChart as PieChartIcon,
  ReceiptText,
  Sparkles,
  CheckCircle2,
  CreditCard,
  Repeat,
} from 'lucide-react';

export default function FinanceiroDashboardPage() {
  const now = useMemo(() => new Date(), []);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Period filter states
  const [periodMode, setPeriodMode] = useState<'monthly' | 'annual'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [cashFlowMonthsRange, setCashFlowMonthsRange] = useState<6 | 12>(6);

  // Quick Transaction Modal
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [txData, goalsData] = await Promise.all([
        OmniStore.getFinancialTransactions(),
        OmniStore.getFinancialGoals(),
      ]);
      setTransactions(txData);
      setGoals(goalsData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleSaveTransaction = async (
    txInput: Omit<FinancialTransaction, 'id' | 'user_id' | 'created_at'>
  ) => {
    await OmniStore.addFinancialTransaction(txInput);
    await loadData();
    showToast(
      `${txInput.type === 'income' ? 'Receita' : 'Despesa'} "${txInput.description}" registrada com sucesso!`
    );
  };

  // Unique previously used places for autocomplete
  const existingPlaces = useMemo(() => {
    const places = transactions
      .map((t) => t.place?.trim())
      .filter((p): p is string => Boolean(p));
    return Array.from(new Set(places));
  }, [transactions]);

  // Available years in selector
  const availableYears = useMemo(() => {
    const currentY = now.getFullYear();
    const yearsSet = new Set<number>([currentY - 1, currentY, currentY + 1]);
    transactions.forEach((t) => {
      const y = Number(t.transaction_date.slice(0, 4));
      if (Number.isFinite(y) && y > 2000) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions, now]);

  const handlePrevPeriod = () => {
    if (periodMode === 'annual') {
      setSelectedYear((y) => y - 1);
    } else {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear((y) => y - 1);
      } else {
        setSelectedMonth((m) => m - 1);
      }
    }
  };

  const handleNextPeriod = () => {
    if (periodMode === 'annual') {
      setSelectedYear((y) => y + 1);
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear((y) => y + 1);
      } else {
        setSelectedMonth((m) => m + 1);
      }
    }
  };

  // Core KPIs & Period Filtering (useMemo)
  const {
    periodTransactions,
    totalIncome,
    totalExpense,
    periodBalance,
    savingsRatePct,
    incomeChangePct,
    expenseChangePct,
    totalSavedInGoals,
    totalGoalsTarget,
    categoryChartData,
    topPlacesData,
  } = useMemo(() => {
    const currentPrefix =
      periodMode === 'monthly'
        ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
        : `${selectedYear}`;

    const prevMonthDate = new Date(selectedYear, selectedMonth - 1, 1);
    const prevPrefix =
      periodMode === 'monthly'
        ? `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`
        : `${selectedYear - 1}`;

    const currentTxs = transactions.filter((t) =>
      t.transaction_date.startsWith(currentPrefix)
    );
    const prevTxs = transactions.filter((t) =>
      t.transaction_date.startsWith(prevPrefix)
    );

    const inc = currentTxs
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const exp = currentTxs
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const prevInc = prevTxs
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const prevExp = prevTxs
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const balance = inc - exp;
    const savRate = inc > 0 ? Number((((inc - exp) / inc) * 100).toFixed(1)) : 0;

    const incDiffPct =
      prevInc > 0
        ? Number((((inc - prevInc) / prevInc) * 100).toFixed(1))
        : inc > 0
        ? 100
        : 0;

    const expDiffPct =
      prevExp > 0
        ? Number((((exp - prevExp) / prevExp) * 100).toFixed(1))
        : exp > 0
        ? 100
        : 0;

    const savedInGoals = goals.reduce(
      (acc, g) => acc + Number(g.current_amount || 0),
      0
    );
    const goalsTarget = goals.reduce(
      (acc, g) => acc + Number(g.target_amount || 0),
      0
    );

    // Expenses by Category
    const catMap = new Map<string, number>();
    currentTxs
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'Outros';
        catMap.set(cat, (catMap.get(cat) || 0) + Number(t.amount || 0));
      });

    const catData = Array.from(catMap.entries())
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
        percentage: exp > 0 ? Number(((value / exp) * 100).toFixed(1)) : 0,
        color: CATEGORY_COLORS[name] || '#64748b',
      }))
      .sort((a, b) => b.value - a.value);

    // Top 5 Places / Establishments (for expenses in period)
    const placeMap = new Map<string, { total: number; count: number; category: string }>();
    currentTxs
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const placeName = t.place?.trim() || 'Não informado';
        const prev = placeMap.get(placeName) || {
          total: 0,
          count: 0,
          category: t.category || 'Outros',
        };
        placeMap.set(placeName, {
          total: prev.total + Number(t.amount || 0),
          count: prev.count + 1,
          category: prev.category,
        });
      });

    const topPlaces = Array.from(placeMap.entries())
      .map(([placeName, info]) => ({
        place: placeName,
        total: Number(info.total.toFixed(2)),
        count: info.count,
        category: info.category,
        percentage: exp > 0 ? Number(((info.total / exp) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      periodTransactions: currentTxs,
      totalIncome: inc,
      totalExpense: exp,
      periodBalance: balance,
      savingsRatePct: savRate,
      incomeChangePct: incDiffPct,
      expenseChangePct: expDiffPct,
      totalSavedInGoals: savedInGoals,
      totalGoalsTarget: goalsTarget,
      categoryChartData: catData,
      topPlacesData: topPlaces,
    };
  }, [transactions, goals, periodMode, selectedMonth, selectedYear]);

  // Monthly Cash Flow History (Last 6 or 12 months ending at selectedMonth/selectedYear)
  const cashFlowHistoryData = useMemo(() => {
    const anchorYear = selectedYear;
    const anchorMonth = periodMode === 'monthly' ? selectedMonth : 11;
    const result: {
      monthKey: string;
      label: string;
      Receitas: number;
      Despesas: number;
      Saldo: number;
    }[] = [];

    for (let i = cashFlowMonthsRange - 1; i >= 0; i--) {
      const d = new Date(anchorYear, anchorMonth - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;

      const monthTxs = transactions.filter((t) =>
        t.transaction_date.startsWith(prefix)
      );
      const inc = monthTxs
        .filter((t) => t.type === 'income')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const exp = monthTxs
        .filter((t) => t.type === 'expense')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      result.push({
        monthKey: prefix,
        label: `${MONTH_SHORT_PT[m]}/${String(y).slice(-2)}`,
        Receitas: Number(inc.toFixed(2)),
        Despesas: Number(exp.toFixed(2)),
        Saldo: Number((inc - exp).toFixed(2)),
      });
    }

    return result;
  }, [transactions, selectedYear, selectedMonth, periodMode, cashFlowMonthsRange]);

  const hasAnyTransactions = transactions.length > 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top Controls Bar: Period Filter & "+ Nova Movimentação" */}
      <div className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switch: Mensal vs Anual */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setPeriodMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                periodMode === 'monthly'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Por Mês/Ano
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('annual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                periodMode === 'annual'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Visão Anual
            </button>
          </div>

          {/* Month & Year Navigation Controls */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-xl px-2 py-1">
            <button
              type="button"
              onClick={handlePrevPeriod}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Período anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <Calendar className="h-3.5 w-3.5 text-cyan-400 ml-1" />

            {periodMode === 'monthly' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-white px-1.5 py-1 focus:outline-none cursor-pointer"
              >
                {MONTH_NAMES_PT.map((mName, idx) => (
                  <option key={mName} value={idx} className="bg-slate-900 text-white">
                    {mName}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-white px-1.5 py-1 focus:outline-none cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} className="bg-slate-900 text-white">
                  {yr}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleNextPeriod}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Próximo período"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Exibindo:{' '}
            <strong className="text-slate-200">
              {periodMode === 'monthly'
                ? `${MONTH_NAMES_PT[selectedMonth]} de ${selectedYear}`
                : `Ano Completo de ${selectedYear}`}
            </strong>{' '}
            ({periodTransactions.length} lançamentos)
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/financeiro/extrato"
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <ReceiptText className="h-4 w-4 text-cyan-400" />
            Ver Extrato
          </Link>
          <button
            type="button"
            onClick={() => setIsTxModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-xs hover:opacity-95 transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            + Nova Movimentação
          </button>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Saldo do Período */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-cyan-500 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Saldo do Período
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p
              className={`text-2xl font-extrabold tracking-tight ${
                periodBalance > 0
                  ? 'text-emerald-400'
                  : periodBalance < 0
                  ? 'text-rose-400'
                  : 'text-white'
              }`}
            >
              {formatBRL(periodBalance)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Receitas menos despesas em{' '}
              {periodMode === 'monthly'
                ? `${MONTH_SHORT_PT[selectedMonth]}/${selectedYear}`
                : selectedYear}
            </p>
          </div>
        </div>

        {/* KPI 2: Total de Receitas */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total de Receitas
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white tracking-tight">
              {formatBRL(totalIncome)}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  incomeChangePct >= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {incomeChangePct >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {incomeChangePct >= 0 ? `+${incomeChangePct}%` : `${incomeChangePct}%`}
              </span>
              <span className="text-[11px] text-slate-400">
                vs {periodMode === 'monthly' ? 'mês anterior' : 'ano anterior'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Total de Despesas */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-rose-500 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total de Despesas
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white tracking-tight">
              {formatBRL(totalExpense)}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  expenseChangePct <= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {expenseChangePct >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {expenseChangePct >= 0 ? `+${expenseChangePct}%` : `${expenseChangePct}%`}
              </span>
              <span className="text-[11px] text-slate-400">
                vs {periodMode === 'monthly' ? 'mês anterior' : 'ano anterior'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Taxa de Economia (%) & Total Guardado nos Cofrinhos */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-violet-500 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Taxa de Economia & Cofrinhos
            </span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span
                className={`text-2xl font-extrabold ${
                  savingsRatePct >= 20
                    ? 'text-emerald-400'
                    : savingsRatePct > 0
                    ? 'text-cyan-400'
                    : savingsRatePct < 0
                    ? 'text-rose-400'
                    : 'text-white'
                }`}
              >
                {savingsRatePct}%
              </span>
              <span className="text-[11px] text-slate-400">da renda poupada</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Nos Cofrinhos:</span>
              <Link
                href="/financeiro/cofrinhos"
                className="font-extrabold text-violet-300 hover:text-violet-200 transition"
              >
                {formatBRL(totalSavedInGoals)}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State if user has zero transactions */}
      {!isLoading && !hasAnyTransactions ? (
        <div className="glass-card p-10 sm:p-12 rounded-2xl text-center space-y-4 border border-dashed border-slate-800">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Wallet className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-lg font-extrabold text-white">
              Seu Painel Financeiro está pronto para começar
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Nenhuma movimentação registrada ainda. Cadastre sua primeira receita ou despesa para destravar os gráficos de fluxo de caixa, categorias e ranking de estabelecimentos.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsTxModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-xs hover:opacity-95 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Registrar Primeira Movimentação
            </button>
            <Link
              href="/financeiro/cofrinhos"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-2"
            >
              <PiggyBank className="h-4 w-4 text-violet-400" />
              Criar Cofrinho / Meta
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Charts Grid: Monthly Cash Flow (2 cols) + Expenses by Category Donut (1 col) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Fluxo de Caixa Mensal (Barras/Linhas) */}
            <div className="lg:col-span-2 glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-extrabold text-white text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-cyan-400" />
                    Fluxo de Caixa Mensal (Receitas vs Despesas vs Saldo)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Evolução comparativa mês a mês nos últimos {cashFlowMonthsRange} meses
                  </p>
                </div>

                {/* 6M / 12M Toggle */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCashFlowMonthsRange(6)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      cashFlowMonthsRange === 6
                        ? 'bg-slate-800 text-cyan-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    6 Meses
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashFlowMonthsRange(12)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      cashFlowMonthsRange === 12
                        ? 'bg-slate-800 text-cyan-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    12 Meses
                  </button>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={cashFlowHistoryData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 || v <= -1000
                          ? `R$${(v / 1000).toFixed(0)}k`
                          : `R$${v}`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                      formatter={(value: any) => [formatBRL(Number(value)), '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                      dataKey="Receitas"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="Despesas"
                      fill="#f43f5e"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                    />
                    <Line
                      type="monotone"
                      dataKey="Saldo"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#06b6d4' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Despesas por Categoria (Donut/Pizza) */}
            <div className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <h2 className="font-extrabold text-white text-base flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-amber-400" />
                  Despesas por Categoria
                </h2>
                <p className="text-xs text-slate-400">
                  Distribuição percentual dos gastos no período
                </p>
              </div>

              {categoryChartData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-slate-500 space-y-2">
                  <PieChartIcon className="h-10 w-10 text-slate-700" />
                  <p className="text-xs">
                    Nenhuma despesa registrada neste período.
                  </p>
                </div>
              ) : (
                <>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={75}
                          paddingAngle={3}
                        >
                          {categoryChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#1e293b',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                            color: '#f8fafc',
                          }}
                          formatter={(val: any, name: any) => [
                            formatBRL(Number(val)),
                            String(name),
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category Breakdown List */}
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {categoryChartData.map((cat) => (
                      <div
                        key={cat.name}
                        className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-none"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-slate-200 font-medium truncate">
                            {cat.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-white">
                            {formatBRL(cat.value)}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 w-12 text-right">
                            {cat.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Row: Top 5 Lugares / Estabelecimentos + Últimas Movimentações do Período */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking Horizontal: Top 5 Lugares / Estabelecimentos */}
            <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-extrabold text-white text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-400" />
                    Top 5 Lugares / Estabelecimentos
                  </h2>
                  <p className="text-xs text-slate-400">
                    Locais onde mais houve gastos no período selecionado
                  </p>
                </div>
                <Link
                  href="/financeiro/extrato"
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
                >
                  Filtrar por local →
                </Link>
              </div>

              {topPlacesData.length === 0 ? (
                <div className="py-10 text-center text-slate-500 space-y-2">
                  <MapPin className="h-9 w-9 mx-auto text-slate-700" />
                  <p className="text-xs">
                    Nenhum gasto com local registrado neste período.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {topPlacesData.map((item, idx) => {
                    const maxTotal = topPlacesData[0]?.total || 1;
                    const barWidth = Math.max(8, Math.round((item.total / maxTotal) * 100));

                    return (
                      <div
                        key={item.place}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="h-6 w-6 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-extrabold flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-white truncate">
                                {item.place}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {item.count}{' '}
                                {item.count === 1 ? 'lançamento' : 'lançamentos'} •{' '}
                                {item.category}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-xs font-extrabold text-rose-400">
                              {formatBRL(item.total)}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {item.percentage}% das despesas
                            </p>
                          </div>
                        </div>

                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Últimas Movimentações do Período */}
            <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-extrabold text-white text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                      Últimos Lançamentos do Período
                    </h2>
                    <p className="text-xs text-slate-400">
                      Movimentações mais recentes registradas neste recorte
                    </p>
                  </div>
                  <Link
                    href="/financeiro/extrato"
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
                  >
                    Extrato completo →
                  </Link>
                </div>

                {periodTransactions.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 space-y-2">
                    <ReceiptText className="h-9 w-9 mx-auto text-slate-700" />
                    <p className="text-xs">
                      Nenhuma movimentação encontrada em{' '}
                      {periodMode === 'monthly'
                        ? `${MONTH_NAMES_PT[selectedMonth]}/${selectedYear}`
                        : selectedYear}
                      .
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {periodTransactions.slice(0, 5).map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                tx.type === 'income' ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                            <p className="text-xs font-bold text-white truncate">
                              {tx.description}
                            </p>
                            {tx.is_recurring && (
                              <span
                                title="Recorrente"
                                className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[9px] font-bold flex items-center gap-0.5 shrink-0"
                              >
                                <Repeat className="h-2.5 w-2.5" />
                                Fixo
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400">
                            <span>
                              {new Date(tx.transaction_date + 'T12:00:00').toLocaleDateString(
                                'pt-BR'
                              )}
                            </span>
                            <span>•</span>
                            <span className="text-slate-300 font-medium">{tx.category}</span>
                            {tx.place && (
                              <>
                                <span>•</span>
                                <span className="text-amber-300 flex items-center gap-0.5">
                                  <MapPin className="h-2.5 w-2.5" />
                                  {tx.place}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <CreditCard className="h-2.5 w-2.5" />
                              {tx.payment_method}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-extrabold shrink-0 ${
                            tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'} {formatBRL(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {totalGoalsTarget > 0 && (
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Progresso total dos Cofrinhos ({goals.length}):
                  </span>
                  <span className="font-bold text-cyan-400">
                    {formatBRL(totalSavedInGoals)} / {formatBRL(totalGoalsTarget)} (
                    {Math.min(100, Math.round((totalSavedInGoals / totalGoalsTarget) * 100))}
                    %)
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Transaction Creation Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSave={handleSaveTransaction}
        existingPlaces={existingPlaces}
      />
    </div>
  );
}
