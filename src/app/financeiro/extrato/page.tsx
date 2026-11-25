'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { OmniStore } from '@/lib/store';
import { FinancialTransaction, FinancialTransactionType } from '@/lib/types';
import {
  formatBRL,
  ALL_FINANCIAL_CATEGORIES,
  PAYMENT_METHODS,
  CATEGORY_COLORS,
} from '@/lib/finance';
import { TransactionModal } from '@/components/financeiro/TransactionModal';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  CreditCard,
  Tag,
  Download,
  RotateCcw,
  Edit2,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Repeat,
  ReceiptText,
  CheckCircle2,
  Wallet,
} from 'lucide-react';

type DatePreset =
  | 'all'
  | 'today'
  | 'last7'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom';

export default function FinanceiroExtratoPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<FinancialTransaction | null>(null);
  const [defaultModalType, setDefaultModalType] =
    useState<FinancialTransactionType>('expense');

  // Combinable Advanced Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [onlyRecurring, setOnlyRecurring] = useState<boolean>(false);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await OmniStore.getFinancialTransactions();
      setTransactions(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Unique places registered by the user
  const existingPlaces = useMemo(() => {
    const places = transactions
      .map((t) => t.place?.trim())
      .filter((p): p is string => Boolean(p));
    return Array.from(new Set(places)).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  // Date preset range resolver
  const activeDateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (datePreset === 'all') {
      return { start: '', end: '' };
    }
    if (datePreset === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (datePreset === 'last7') {
      const d7 = new Date(now.getTime() - 6 * 86400 * 1000)
        .toISOString()
        .split('T')[0];
      return { start: d7, end: todayStr };
    }
    if (datePreset === 'thisMonth') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      return {
        start: `${y}-${m}-01`,
        end: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
      };
    }
    if (datePreset === 'lastMonth') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prev.getFullYear();
      const m = String(prev.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, prev.getMonth() + 1, 0).getDate();
      return {
        start: `${y}-${m}-01`,
        end: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
      };
    }
    if (datePreset === 'thisYear') {
      const y = now.getFullYear();
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
    return { start: customStartDate, end: customEndDate };
  }, [datePreset, customStartDate, customEndDate]);

  // Filtered Transactions (useMemo)
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const { start, end } = activeDateRange;

    return transactions.filter((tx) => {
      // Type filter
      if (selectedType !== 'all' && tx.type !== selectedType) return false;

      // Category filter
      if (selectedCategory !== 'all' && tx.category !== selectedCategory)
        return false;

      // Place filter
      if (selectedPlace !== 'all') {
        if ((tx.place || '').trim() !== selectedPlace) return false;
      }

      // Payment method filter
      if (
        selectedPaymentMethod !== 'all' &&
        tx.payment_method !== selectedPaymentMethod
      )
        return false;

      // Recurring filter
      if (onlyRecurring && !tx.is_recurring) return false;

      // Date range filter
      if (start && tx.transaction_date < start) return false;
      if (end && tx.transaction_date > end) return false;

      // Text search (description, notes, place, category)
      if (q) {
        const descMatch = tx.description.toLowerCase().includes(q);
        const notesMatch = (tx.notes || '').toLowerCase().includes(q);
        const placeMatch = (tx.place || '').toLowerCase().includes(q);
        const catMatch = tx.category.toLowerCase().includes(q);
        if (!descMatch && !notesMatch && !placeMatch && !catMatch) return false;
      }

      return true;
    });
  }, [
    transactions,
    selectedType,
    selectedCategory,
    selectedPlace,
    selectedPaymentMethod,
    onlyRecurring,
    activeDateRange,
    searchQuery,
  ]);

  // Real-time Dynamic Filter Summary
  const filterSummary = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const expense = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    return {
      income,
      expense,
      balance: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Grouped by transaction_date descending
  const groupedByDate = useMemo(() => {
    const map = new Map<string, FinancialTransaction[]>();
    filteredTransactions.forEach((tx) => {
      const d = tx.transaction_date;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(tx);
    });

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateStr, items]) => {
        const dayIncome = items
          .filter((i) => i.type === 'income')
          .reduce((acc, i) => acc + Number(i.amount || 0), 0);
        const dayExpense = items
          .filter((i) => i.type === 'expense')
          .reduce((acc, i) => acc + Number(i.amount || 0), 0);

        return {
          dateStr,
          items,
          dayNet: dayIncome - dayExpense,
        };
      });
  }, [filteredTransactions]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedPlace('all');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedPaymentMethod('all');
    setOnlyRecurring(false);
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      showToast('Não há lançamentos filtrados para exportar.');
      return;
    }

    const headers = [
      'Data',
      'Tipo',
      'Valor (R$)',
      'Descricao',
      'Lugar / Estabelecimento',
      'Categoria',
      'Forma de Pagamento',
      'Recorrente',
      'Observacoes',
    ];

    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;

    const rows = filteredTransactions.map((tx) => [
      tx.transaction_date,
      tx.type === 'income' ? 'Receita' : 'Despesa',
      tx.amount.toFixed(2).replace('.', ','),
      escapeCsv(tx.description),
      escapeCsv(tx.place || ''),
      escapeCsv(tx.category),
      escapeCsv(tx.payment_method),
      tx.is_recurring ? 'Sim' : 'Não',
      escapeCsv(tx.notes || ''),
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extrato_omnitrack_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Arquivo CSV exportado com ${filteredTransactions.length} lançamentos!`);
  };

  const handleOpenNewModal = (type: FinancialTransactionType = 'expense') => {
    setEditingTx(null);
    setDefaultModalType(type);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tx: FinancialTransaction) => {
    setEditingTx(tx);
    setDefaultModalType(tx.type);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (
    txData: Omit<FinancialTransaction, 'id' | 'user_id' | 'created_at'>,
    editingId?: string
  ) => {
    if (editingId) {
      await OmniStore.updateFinancialTransaction(editingId, txData);
      showToast(`Movimentação "${txData.description}" atualizada!`);
    } else {
      await OmniStore.addFinancialTransaction(txData);
      showToast(`Movimentação "${txData.description}" adicionada ao extrato!`);
    }
    await loadTransactions();
  };

  const handleDeleteTransaction = async (tx: FinancialTransaction) => {
    if (
      confirm(
        `Deseja realmente excluir "${tx.description}" (${formatBRL(tx.amount)})?`
      )
    ) {
      await OmniStore.deleteFinancialTransaction(tx.id);
      await loadTransactions();
      showToast('Movimentação excluída.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-cyan-400" />
            Extrato Completo de Receitas e Gastos
          </h2>
          <p className="text-xs text-slate-400">
            Filtre por estabelecimento, intervalo de datas, categoria ou forma de pagamento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenNewModal('income')}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition flex items-center gap-1.5"
          >
            <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
            + Nova Receita
          </button>
          <button
            type="button"
            onClick={() => handleOpenNewModal('expense')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-extrabold text-xs hover:opacity-95 transition shadow-lg shadow-rose-600/20 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            + Nova Despesa
          </button>
        </div>
      </div>

      {/* Advanced Combinable Filter Panel */}
      <div className="glass-card p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-extrabold text-white uppercase tracking-wider">
              Filtros Avançados Combináveis
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold transition flex items-center gap-1.5"
            >
              <RotateCcw className="h-3 w-3" />
              Limpar filtros
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download className="h-3 w-3" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Date Quick Shortcuts + Custom Date Range */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              Período:
            </span>
            {(
              [
                { id: 'all', label: 'Tudo' },
                { id: 'today', label: 'Hoje' },
                { id: 'last7', label: '7 dias' },
                { id: 'thisMonth', label: 'Este mês' },
                { id: 'lastMonth', label: 'Mês passado' },
                { id: 'thisYear', label: 'Este ano' },
                { id: 'custom', label: 'Personalizado' },
              ] as { id: DatePreset; label: string }[]
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDatePreset(preset.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  datePreset === preset.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-950/70 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Multi-column filter inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Text Search */}
          <div className="relative lg:col-span-1">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar descrição, nota ou local..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Filter by Place / Establishment */}
          <div>
            <select
              value={selectedPlace}
              onChange={(e) => setSelectedPlace(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">📍 Todos os Lugares ({existingPlaces.length})</option>
              {existingPlaces.map((place) => (
                <option key={place} value={place}>
                  📍 {place}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) =>
                setSelectedType(e.target.value as 'all' | 'income' | 'expense')
              }
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">🔄 Todos os Tipos</option>
              <option value="income">🟢 Apenas Receitas (Entradas)</option>
              <option value="expense">🔴 Apenas Despesas (Saídas)</option>
            </select>
          </div>

          {/* Filter by Category */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">🏷️ Todas as Categorias</option>
              {ALL_FINANCIAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Payment Method */}
          <div>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">💳 Todas as Formas de Pagto</option>
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Optional Recurring toggle chip */}
        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyRecurring}
              onChange={(e) => setOnlyRecurring(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500"
            />
            <span className="flex items-center gap-1">
              <Repeat className="h-3 w-3 text-cyan-400" />
              Mostrar apenas gastos/receitas recorrentes
            </span>
          </label>
        </div>
      </div>

      {/* Dynamic Filter Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              Entradas Filtradas
            </span>
            <span className="text-base sm:text-lg font-extrabold text-emerald-400">
              {formatBRL(filterSummary.income)}
            </span>
          </div>
          <ArrowUpCircle className="h-5 w-5 text-emerald-400/70 shrink-0" />
        </div>

        <div className="glass-panel p-3.5 border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              Saídas Filtradas
            </span>
            <span className="text-base sm:text-lg font-extrabold text-rose-400">
              {formatBRL(filterSummary.expense)}
            </span>
          </div>
          <ArrowDownCircle className="h-5 w-5 text-rose-400/70 shrink-0" />
        </div>

        <div className="glass-panel p-3.5 border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              Saldo do Recorte
            </span>
            <span
              className={`text-base sm:text-lg font-extrabold ${
                filterSummary.balance >= 0 ? 'text-cyan-400' : 'text-rose-400'
              }`}
            >
              {formatBRL(filterSummary.balance)}
            </span>
          </div>
          <Wallet className="h-5 w-5 text-cyan-400/70 shrink-0" />
        </div>

        <div className="glass-panel p-3.5 border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              Qtd. de Lançamentos
            </span>
            <span className="text-base sm:text-lg font-extrabold text-white">
              {filterSummary.count}{' '}
              <span className="text-xs font-normal text-slate-400">
                {filterSummary.count === 1 ? 'registro' : 'registros'}
              </span>
            </span>
          </div>
          <ReceiptText className="h-5 w-5 text-slate-400 shrink-0" />
        </div>
      </div>

      {/* Responsive Listing Grouped by Date */}
      {!isLoading && groupedByDate.length === 0 ? (
        <div className="glass-card p-10 rounded-2xl text-center space-y-3">
          <ReceiptText className="h-10 w-10 mx-auto text-slate-600" />
          <h3 className="text-base font-extrabold text-white">
            {transactions.length === 0
              ? 'Seu extrato está zerado'
              : 'Nenhuma movimentação corresponde aos filtros aplicados'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {transactions.length === 0
              ? 'Adicione sua primeira receita ou despesa clicando nos botões acima para iniciar seu controle financeiro.'
              : 'Tente limpar ou ajustar os filtros de período, local ou categoria.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            {transactions.length === 0 ? (
              <button
                type="button"
                onClick={() => handleOpenNewModal('expense')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-xs"
              >
                + Cadastrar Primeira Movimentação
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByDate.map((group) => {
            const formattedDate = new Date(
              group.dateStr + 'T12:00:00'
            ).toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            });

            return (
              <div
                key={group.dateStr}
                className="glass-card rounded-2xl overflow-hidden border border-slate-800/90"
              >
                {/* Date Group Header */}
                <div className="px-4 sm:px-5 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-xs font-extrabold text-slate-200 capitalize">
                      {formattedDate}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                      {group.items.length}{' '}
                      {group.items.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  <div className="text-xs font-bold">
                    <span className="text-slate-400 mr-1.5">Saldo do dia:</span>
                    <span
                      className={
                        group.dayNet >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {group.dayNet >= 0 ? '+' : ''}
                      {formatBRL(group.dayNet)}
                    </span>
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/60 text-[11px] font-bold text-slate-400 uppercase">
                        <th className="py-2.5 px-5">Descrição</th>
                        <th className="py-2.5 px-4">Lugar / Estabelecimento</th>
                        <th className="py-2.5 px-4">Categoria</th>
                        <th className="py-2.5 px-4">Pagamento</th>
                        <th className="py-2.5 px-4 text-right">Valor</th>
                        <th className="py-2.5 px-5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-xs">
                      {group.items.map((tx) => {
                        const catColor =
                          CATEGORY_COLORS[tx.category] || '#64748b';

                        return (
                          <tr
                            key={tx.id}
                            className="hover:bg-slate-900/50 transition"
                          >
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`p-1.5 rounded-lg shrink-0 ${
                                    tx.type === 'income'
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-rose-500/10 text-rose-400'
                                  }`}
                                >
                                  {tx.type === 'income' ? (
                                    <ArrowUpCircle className="h-4 w-4" />
                                  ) : (
                                    <ArrowDownCircle className="h-4 w-4" />
                                  )}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">
                                      {tx.description}
                                    </span>
                                    {tx.is_recurring && (
                                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1">
                                        <Repeat className="h-2.5 w-2.5" />
                                        Recorrente
                                      </span>
                                    )}
                                  </div>
                                  {tx.notes && (
                                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                      {tx.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              {tx.place ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPlace(tx.place!)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-medium transition"
                                  title="Filtrar por este local"
                                >
                                  <MapPin className="h-3 w-3 text-amber-400" />
                                  {tx.place}
                                </button>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 text-slate-200"
                              >
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: catColor }}
                                />
                                {tx.category}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 text-slate-300 border border-slate-800 text-xs">
                                <CreditCard className="h-3 w-3 text-cyan-400" />
                                {tx.payment_method}
                              </span>
                            </td>

                            <td
                              className={`py-3.5 px-4 text-right font-extrabold text-sm ${
                                tx.type === 'income'
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {tx.type === 'income' ? '+' : '-'}{' '}
                              {formatBRL(tx.amount)}
                            </td>

                            <td className="py-3.5 px-5 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(tx)}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 transition"
                                  title="Editar movimentação"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTransaction(tx)}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
                                  title="Excluir movimentação"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Compact Cards View */}
                <div className="md:hidden divide-y divide-slate-800/60">
                  {group.items.map((tx) => (
                    <div key={tx.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              tx.type === 'income'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {tx.type === 'income' ? (
                              <ArrowUpCircle className="h-4 w-4" />
                            ) : (
                              <ArrowDownCircle className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-white truncate">
                              {tx.description}
                            </p>
                            {tx.notes && (
                              <p className="text-[11px] text-slate-400 line-clamp-1">
                                {tx.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-xs font-extrabold shrink-0 ${
                            tx.type === 'income'
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}{' '}
                          {formatBRL(tx.amount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 flex items-center gap-1">
                            <Tag className="h-2.5 w-2.5 text-violet-400" />
                            {tx.category}
                          </span>
                          {tx.place && (
                            <button
                              type="button"
                              onClick={() => setSelectedPlace(tx.place!)}
                              className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-300 flex items-center gap-1"
                            >
                              <MapPin className="h-2.5 w-2.5 text-amber-400" />
                              {tx.place}
                            </button>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1">
                            <CreditCard className="h-2.5 w-2.5 text-cyan-400" />
                            {tx.payment_method}
                          </span>
                          {tx.is_recurring && (
                            <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 text-[10px] font-bold flex items-center gap-0.5">
                              <Repeat className="h-2.5 w-2.5" />
                              Fixo
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(tx)}
                            className="p-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(tx)}
                            className="p-1.5 rounded-lg bg-slate-900 text-rose-400 border border-slate-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Create & Edit */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        initialData={editingTx}
        existingPlaces={existingPlaces}
        defaultType={defaultModalType}
      />
    </div>
  );
}
