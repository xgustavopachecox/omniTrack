'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FinancialTransaction,
  FinancialTransactionType,
} from '@/lib/types';
import {
  getCategoriesForType,
  PAYMENT_METHODS,
} from '@/lib/finance';
import {
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  MapPin,
  Calendar,
  CreditCard,
  Tag,
  Repeat,
  FileText,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: Omit<FinancialTransaction, 'id' | 'user_id' | 'created_at'>,
    editingId?: string
  ) => Promise<void>;
  initialData?: FinancialTransaction | null;
  existingPlaces: string[];
  defaultType?: FinancialTransactionType;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingPlaces,
  defaultType = 'expense',
}: TransactionModalProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [type, setType] = useState<FinancialTransactionType>(defaultType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [place, setPlace] = useState<string>('');
  const [category, setCategory] = useState<string>('Alimentação');
  const [paymentMethod, setPaymentMethod] = useState<string>('Pix');
  const [transactionDate, setTransactionDate] = useState<string>(todayStr);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState<boolean>(false);

  const availableCategories = useMemo(() => getCategoriesForType(type), [type]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);

    if (initialData) {
      setType(initialData.type);
      setAmountStr(String(initialData.amount));
      setDescription(initialData.description);
      setPlace(initialData.place || '');
      setCategory(initialData.category || getCategoriesForType(initialData.type)[0]);
      setPaymentMethod(initialData.payment_method || 'Pix');
      setTransactionDate(initialData.transaction_date || todayStr);
      setIsRecurring(Boolean(initialData.is_recurring));
      setNotes(initialData.notes || '');
    } else {
      setType(defaultType);
      setAmountStr('');
      setDescription('');
      setPlace('');
      setCategory(getCategoriesForType(defaultType)[0]);
      setPaymentMethod('Pix');
      setTransactionDate(todayStr);
      setIsRecurring(false);
      setNotes('');
    }
  }, [isOpen, initialData, defaultType, todayStr]);

  const handleTypeChange = (newType: FinancialTransactionType) => {
    setType(newType);
    const cats = getCategoriesForType(newType);
    if (!cats.includes(category)) {
      setCategory(cats[0]);
    }
  };

  const filteredPlaceSuggestions = useMemo(() => {
    const q = place.trim().toLowerCase();
    const unique = Array.from(new Set(existingPlaces.filter(Boolean)));
    if (!q) return unique.slice(0, 8);
    return unique
      .filter((p) => p.toLowerCase().includes(q) && p.toLowerCase() !== q)
      .slice(0, 6);
  }, [existingPlaces, place]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmount = Number(amountStr.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Informe uma descrição para a movimentação.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(
        {
          type,
          amount: Number(parsedAmount.toFixed(2)),
          description: description.trim(),
          category,
          place: place.trim() || null,
          payment_method: paymentMethod,
          transaction_date: transactionDate || todayStr,
          is_recurring: isRecurring,
          notes: notes.trim() || null,
        },
        initialData?.id
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao salvar movimentação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div>
            <h3 className="font-extrabold text-white text-lg">
              {initialData ? 'Editar Movimentação' : 'Nova Movimentação Financeira'}
            </h3>
            <p className="text-xs text-slate-400">
              Registre receitas ou despesas detalhando local, categoria e forma de pagamento.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Switcher: Despesa vs Receita */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                type === 'expense'
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" />
              Despesa (Saída)
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                type === 'income'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpCircle className="h-4 w-4" />
              Receita (Entrada)
            </button>
          </div>

          {/* Valor (R$) & Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                Valor (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  required
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                Data da Movimentação *
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3.5 w-3.5 text-cyan-400" />
              Descrição *
            </label>
            <input
              type="text"
              placeholder={
                type === 'expense'
                  ? 'Ex: Compras da semana, Almoço executivo, Mensalidade academia...'
                  : 'Ex: Salário mensal, Projeto freelance, Dividendos...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
            />
          </div>

          {/* Lugar / Estabelecimento com Autocomplete Inteligente */}
          <div className="relative">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-amber-400" />
                {type === 'expense'
                  ? 'Lugar / Estabelecimento onde gastou'
                  : 'Origem / Pagador da Receita'}
              </span>
              {existingPlaces.length > 0 && (
                <span className="text-[10px] text-slate-400 font-normal">
                  Autocomplete ativo ({existingPlaces.length} locais salvos)
                </span>
              )}
            </label>
            <input
              type="text"
              list="financial-places-datalist"
              placeholder={
                type === 'expense'
                  ? 'Ex: Supermercado Assaí, Posto Shell, Amazon, iFood, Farmácia...'
                  : 'Ex: Empresa X, Cliente Consultoria, Banco Inter...'
              }
              value={place}
              onFocus={() => setShowPlaceSuggestions(true)}
              onBlur={() => setTimeout(() => setShowPlaceSuggestions(false), 180)}
              onChange={(e) => setPlace(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
            />
            <datalist id="financial-places-datalist">
              {existingPlaces.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>

            {/* Quick Interactive Chips of Previously Used Places */}
            {showPlaceSuggestions && filteredPlaceSuggestions.length > 0 && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Lugares usados anteriormente:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {filteredPlaceSuggestions.map((suggestedPlace) => (
                    <button
                      key={suggestedPlace}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setPlace(suggestedPlace);
                        setShowPlaceSuggestions(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 text-xs text-slate-300 hover:text-amber-300 transition flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3 text-amber-400" />
                      {suggestedPlace}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Categoria & Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Tag className="h-3.5 w-3.5 text-violet-400" />
                Categoria *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                Forma de Pagamento *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recorrência Checkbox */}
          <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 cursor-pointer hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
            />
            <div className="flex-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5 text-cyan-400" />
                {type === 'expense' ? 'Gasto Fixo / Recorrente' : 'Receita Fixa / Recorrente'}
              </span>
              <span className="text-[11px] text-slate-400 block">
                Marque se essa movimentação se repete todos os meses (ex: aluguel, assinatura, salário).
              </span>
            </div>
          </label>

          {/* Observações */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Observações (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Detalhes adicionais, número de parcelas, motivo ou contexto..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none placeholder-slate-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-extrabold flex items-center gap-2 transition shadow-lg disabled:opacity-50 ${
                type === 'expense'
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 shadow-rose-600/20 hover:opacity-95'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-emerald-500/20 hover:opacity-95'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting
                ? 'Salvando...'
                : initialData
                ? 'Salvar Alterações'
                : type === 'expense'
                ? 'Registrar Despesa'
                : 'Registrar Receita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
