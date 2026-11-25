'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { OmniStore } from '@/lib/store';
import {
  FinancialVisionPlan,
  FinancialVisionHorizon,
  FinancialVisionStatus,
  FinancialGoal,
} from '@/lib/types';
import {
  formatBRL,
  VISION_HORIZONS,
  VISION_STATUS_META,
} from '@/lib/finance';
import {
  Compass,
  Plus,
  Target,
  Calendar,
  Award,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Sparkles,
  PiggyBank,
  TrendingUp,
  Flag,
  Clock,
  BookOpen,
} from 'lucide-react';

export default function FinanceiroVisaoFuturoPage() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const [plans, setPlans] = useState<FinancialVisionPlan[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filters
  const [selectedHorizon, setSelectedHorizon] = useState<
    'all' | FinancialVisionHorizon
  >('all');
  const [selectedStatus, setSelectedStatus] = useState<
    'all' | FinancialVisionStatus
  >('all');

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<FinancialVisionPlan | null>(null);
  const [title, setTitle] = useState<string>('');
  const [horizon, setHorizon] = useState<FinancialVisionHorizon>('short');
  const [targetYearStr, setTargetYearStr] = useState<string>(
    String(currentYear + 1)
  );
  const [targetAmountStr, setTargetAmountStr] = useState<string>('');
  const [status, setStatus] = useState<FinancialVisionStatus>('planning');
  const [content, setContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansData, goalsData] = await Promise.all([
        OmniStore.getFinancialVisionPlans(),
        OmniStore.getFinancialGoals(),
      ]);
      setPlans(plansData);
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

  // Patrimonial Milestones Comparison (Cofrinhos vs Next Big Vision Plan Target)
  const milestoneAnalysis = useMemo(() => {
    const totalSavedInCofrinhos = goals.reduce(
      (acc, g) => acc + Number(g.current_amount || 0),
      0
    );

    const plansWithAmount = plans
      .filter((p) => p.target_amount && Number(p.target_amount) > 0)
      .sort((a, b) => Number(a.target_amount || 0) - Number(b.target_amount || 0));

    // Next active milestone: first non-achieved plan with target_amount > totalSavedInCofrinhos, or first non-achieved plan with amount, or largest plan
    const nextBigMilestone =
      plansWithAmount.find(
        (p) =>
          p.status !== 'achieved' &&
          Number(p.target_amount || 0) > totalSavedInCofrinhos
      ) ||
      plansWithAmount.find((p) => p.status !== 'achieved') ||
      plansWithAmount[plansWithAmount.length - 1] ||
      null;

    const nextTargetVal = nextBigMilestone
      ? Number(nextBigMilestone.target_amount || 0)
      : 0;

    const progressToNextPct =
      nextTargetVal > 0
        ? Math.min(
            100,
            Number(((totalSavedInCofrinhos / nextTargetVal) * 100).toFixed(1))
          )
        : 0;

    const remainingToNext = Math.max(0, nextTargetVal - totalSavedInCofrinhos);

    return {
      totalSavedInCofrinhos,
      plansWithAmount,
      nextBigMilestone,
      nextTargetVal,
      progressToNextPct,
      remainingToNext,
    };
  }, [plans, goals]);

  // Filtered Plans
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (selectedHorizon !== 'all' && p.horizon !== selectedHorizon) return false;
      if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;
      return true;
    });
  }, [plans, selectedHorizon, selectedStatus]);

  const handleOpenNewModal = (defaultHorizon: FinancialVisionHorizon = 'short') => {
    setEditingPlan(null);
    setTitle('');
    setHorizon(defaultHorizon);
    setTargetYearStr(
      defaultHorizon === 'short'
        ? String(currentYear + 1)
        : defaultHorizon === 'medium'
        ? String(currentYear + 3)
        : String(currentYear + 8)
    );
    setTargetAmountStr('');
    setStatus('planning');
    setContent('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: FinancialVisionPlan) => {
    setEditingPlan(plan);
    setTitle(plan.title);
    setHorizon(plan.horizon);
    setTargetYearStr(plan.target_year ? String(plan.target_year) : '');
    setTargetAmountStr(
      plan.target_amount && plan.target_amount > 0
        ? String(plan.target_amount)
        : ''
    );
    setStatus(plan.status);
    setContent(plan.content);
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const parsedYear = targetYearStr ? Number(targetYearStr) : null;
    const parsedAmount = targetAmountStr
      ? Number(targetAmountStr.replace(',', '.'))
      : null;

    setIsSubmitting(true);
    try {
      if (editingPlan) {
        await OmniStore.updateFinancialVisionPlan(editingPlan.id, {
          title: title.trim(),
          horizon,
          target_year:
            parsedYear && Number.isFinite(parsedYear) ? parsedYear : null,
          target_amount:
            parsedAmount && Number.isFinite(parsedAmount) && parsedAmount > 0
              ? Number(parsedAmount.toFixed(2))
              : null,
          content: content.trim(),
          status,
        });
        showToast(`Plano "${title}" atualizado!`);
      } else {
        await OmniStore.addFinancialVisionPlan({
          title: title.trim(),
          horizon,
          target_year:
            parsedYear && Number.isFinite(parsedYear) ? parsedYear : null,
          target_amount:
            parsedAmount && Number.isFinite(parsedAmount) && parsedAmount > 0
              ? Number(parsedAmount.toFixed(2))
              : null,
          content: content.trim(),
          status,
        });
        showToast(`Visão de Futuro "${title}" registrada!`);
      }

      setIsModalOpen(false);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (
    plan: FinancialVisionPlan,
    newStatus: FinancialVisionStatus
  ) => {
    await OmniStore.updateFinancialVisionPlan(plan.id, { status: newStatus });
    await loadData();
    showToast(
      `Status de "${plan.title}" alterado para ${VISION_STATUS_META[newStatus].label}!`
    );
  };

  const handleDeletePlan = async (plan: FinancialVisionPlan) => {
    if (confirm(`Deseja excluir o plano "${plan.title}" da sua Visão de Futuro?`)) {
      await OmniStore.deleteFinancialVisionPlan(plan.id);
      await loadData();
      showToast('Plano removido.');
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

      {/* Painel de Marcos Patrimoniais: Comparação Cofrinhos vs Próxima Grande Meta */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border-l-4 border-l-violet-500 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[10px] font-extrabold uppercase">
                Painel de Marcos Patrimoniais
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Compass className="h-5 w-5 text-violet-400" />
              Onde Estou Hoje vs Onde Quero Chegar
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparação em tempo real entre o patrimônio guardado nos seus Cofrinhos e sua próxima grande meta estratégica.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenNewModal('short')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white font-extrabold text-xs hover:opacity-95 transition shadow-lg shadow-violet-500/20 flex items-center gap-2 self-start md:self-auto"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            + Novo Plano / Visão
          </button>
        </div>

        {/* Comparison Box */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
          {/* Current Patrimonio in Cofrinhos */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Patrimônio Guardado (Cofrinhos)
              </span>
              <PiggyBank className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-400 my-1.5">
              {formatBRL(milestoneAnalysis.totalSavedInCofrinhos)}
            </p>
            <Link
              href="/financeiro/cofrinhos"
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition"
            >
              Gerenciar aportes nos Cofrinhos →
            </Link>
          </div>

          {/* Next Big Target */}
          <div className="lg:col-span-2 p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between space-y-3">
            {milestoneAnalysis.nextBigMilestone ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block">
                      Próximo Grande Marco Patrimonial
                    </span>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Flag className="h-4 w-4 text-amber-400 shrink-0" />
                      {milestoneAnalysis.nextBigMilestone.title}
                      {milestoneAnalysis.nextBigMilestone.target_year && (
                        <span className="text-xs font-bold text-slate-400">
                          ({milestoneAnalysis.nextBigMilestone.target_year})
                        </span>
                      )}
                    </h3>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 block">
                      Alvo Patrimonial
                    </span>
                    <span className="text-lg font-extrabold text-white">
                      {formatBRL(milestoneAnalysis.nextTargetVal)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${milestoneAnalysis.progressToNextPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-cyan-400">
                      {milestoneAnalysis.progressToNextPct}% do caminho conquistado
                    </span>
                    <span className="text-slate-400">
                      Faltam{' '}
                      <strong className="text-slate-200">
                        {formatBRL(milestoneAnalysis.remainingToNext)}
                      </strong>
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    Defina seu próximo grande marco patrimonial
                  </h4>
                  <p className="text-xs text-slate-400">
                    Ao criar um plano na Visão de Futuro com &quot;Valor / Patrimônio Desejado&quot;, o OmniTrack compara automaticamente com a evolução dos seus Cofrinhos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenNewModal('medium')}
                  className="px-3.5 py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300 text-xs font-bold shrink-0"
                >
                  + Definir Marco
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Horizon Tabs & Status Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Horizon Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedHorizon('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 border transition ${
              selectedHorizon === 'all'
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
            }`}
          >
            Todos os Horizontes ({plans.length})
          </button>

          {VISION_HORIZONS.map((h) => {
            const count = plans.filter((p) => p.horizon === h.value).length;
            const isActive = selectedHorizon === h.value;

            return (
              <button
                key={h.value}
                type="button"
                onClick={() => setSelectedHorizon(h.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 border transition flex items-center gap-2 ${
                  isActive
                    ? h.badgeClass
                    : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
                }`}
              >
                <span>{h.label}</span>
                <span className="text-[10px] opacity-80">({h.subtitle})</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900/90 text-[10px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 self-start lg:self-auto">
          {(
            [
              { value: 'all', label: 'Todos Status' },
              { value: 'planning', label: 'Planejando' },
              { value: 'in_progress', label: 'Em andamento' },
              { value: 'achieved', label: 'Conquistado' },
            ] as { value: 'all' | FinancialVisionStatus; label: string }[]
          ).map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => setSelectedStatus(st.value)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                selectedStatus === st.value
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plans List or Empty State */}
      {!isLoading && filteredPlans.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center space-y-4 border border-dashed border-slate-800">
          <div className="h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto">
            <BookOpen className="h-7 w-7" />
          </div>
          <div className="max-w-lg mx-auto space-y-1.5">
            <h3 className="text-lg font-extrabold text-white">
              {plans.length === 0
                ? 'Seu Diário Estratégico & Visão de Futuro está em branco'
                : 'Nenhum plano encontrado neste filtro'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Escreva com clareza onde você quer chegar em 1 ano (Curto Prazo), de 1 a 5 anos (Médio Prazo), 5+ anos (Longo Prazo) e o seu plano de Independência Financeira.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            {VISION_HORIZONS.map((h) => (
              <button
                key={h.value}
                type="button"
                onClick={() => handleOpenNewModal(h.value)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:opacity-90 ${h.badgeClass}`}
              >
                <Plus className="h-3.5 w-3.5" />
                Criar em {h.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPlans.map((plan) => {
            const horizonMeta =
              VISION_HORIZONS.find((h) => h.value === plan.horizon) ||
              VISION_HORIZONS[0];
            const statusMeta = VISION_STATUS_META[plan.status];

            const hasTargetAmount =
              plan.target_amount !== null &&
              plan.target_amount !== undefined &&
              plan.target_amount > 0;
            const planTargetVal = Number(plan.target_amount || 0);
            const pctCoveredByCofrinhos = hasTargetAmount
              ? Math.min(
                  100,
                  Number(
                    (
                      (milestoneAnalysis.totalSavedInCofrinhos / planTargetVal) *
                      100
                    ).toFixed(1)
                  )
                )
              : 0;

            return (
              <div
                key={plan.id}
                className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between space-y-4 border border-slate-800/90 hover:border-slate-700 transition"
              >
                <div className="space-y-3.5">
                  {/* Top Badges & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider ${horizonMeta.badgeClass}`}
                      >
                        {horizonMeta.label} • {horizonMeta.subtitle}
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 ${statusMeta.badgeClass}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`}
                        />
                        {statusMeta.label}
                      </span>

                      {plan.target_year && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-cyan-400" />
                          Ano-Alvo: {plan.target_year}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(plan)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 transition"
                        title="Editar plano"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
                        title="Excluir plano"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-extrabold text-white leading-snug">
                    {plan.title}
                  </h3>

                  {/* Optional Target Patrimony Progress vs Cofrinhos */}
                  {hasTargetAmount && (
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-emerald-400" />
                          Patrimônio / Valor Alvo:
                        </span>
                        <span className="font-extrabold text-emerald-400 text-sm">
                          {formatBRL(planTargetVal)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${pctCoveredByCofrinhos}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          Cobertura atual pelos Cofrinhos: {pctCoveredByCofrinhos}%
                        </span>
                        <span>
                          Guardado: {formatBRL(milestoneAnalysis.totalSavedInCofrinhos)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Free-form Strategic Text Content */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                      {plan.content}
                    </p>
                  </div>
                </div>

                {/* Footer: Quick Status Switcher & Updated Date */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 mr-1">Status:</span>
                    {(
                      ['planning', 'in_progress', 'achieved'] as FinancialVisionStatus[]
                    ).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleQuickStatusChange(plan, st)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                          plan.status === st
                            ? VISION_STATUS_META[st].badgeClass + ' border'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {VISION_STATUS_META[st].label}
                      </button>
                    ))}
                  </div>

                  <span className="text-[10px] text-slate-500">
                    Atualizado em{' '}
                    {new Date(plan.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating / Editing Vision Plan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-violet-400" />
                <div>
                  <h3 className="font-extrabold text-white text-lg">
                    {editingPlan
                      ? 'Editar Plano & Visão de Futuro'
                      : 'Novo Plano na Visão de Futuro'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Escreva suas metas patrimoniais, estratégias de carreira/concurso, passos práticos e reflexões.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Título do Objetivo / Visão *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Atingir R$ 100 mil investidos, Posse no Concurso + Reserva Completa, Viver de Renda Passiva..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Horizonte de Tempo *
                  </label>
                  <select
                    value={horizon}
                    onChange={(e) =>
                      setHorizon(e.target.value as FinancialVisionHorizon)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    {VISION_HORIZONS.map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.label} ({h.subtitle})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Status Atual *
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as FinancialVisionStatus)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="planning">📋 Planejando</option>
                    <option value="in_progress">🚀 Em andamento</option>
                    <option value="achieved">🏆 Conquistado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Ano-Alvo (opcional)
                  </label>
                  <input
                    type="number"
                    min={currentYear}
                    max={currentYear + 60}
                    placeholder={String(currentYear + 2)}
                    value={targetYearStr}
                    onChange={(e) => setTargetYearStr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Valor / Patrimônio Desejado em R$ (opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 100000.00"
                    value={targetAmountStr}
                    onChange={(e) => setTargetAmountStr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Plano Estratégico, Passos Práticos, Reflexões & Motivação *
                </label>
                <textarea
                  rows={7}
                  placeholder={`Escreva livremente seu plano:\n1. Por que essa meta é importante para minha vida?\n2. Quanto vou aportar por mês e onde vou alocar?\n3. Quais hábitos financeiros preciso manter para chegar lá?`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white text-xs font-extrabold shadow-lg shadow-violet-500/20 disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Salvando...'
                    : editingPlan
                    ? 'Salvar Alterações'
                    : 'Registrar na Visão de Futuro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
