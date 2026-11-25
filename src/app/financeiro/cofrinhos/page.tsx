'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { OmniStore } from '@/lib/store';
import {
  FinancialGoal,
  FinancialGoalContribution,
  ContributionType,
} from '@/lib/types';
import {
  formatBRL,
  GOAL_CATEGORIES,
  GOAL_COLOR_PALETTE,
} from '@/lib/finance';
import {
  PiggyBank,
  Plus,
  Minus,
  Target,
  Calendar,
  History,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  Sparkles,
  Clock,
  Award,
} from 'lucide-react';

function calculateMonthlySavingsNeeded(
  targetAmount: number,
  currentAmount: number,
  deadline?: string | null
): {
  remaining: number;
  monthsLeft: number | null;
  monthlyNeeded: number | null;
  isOverdue: boolean;
} {
  const remaining = Math.max(0, Number((targetAmount - currentAmount).toFixed(2)));
  if (!deadline || remaining <= 0) {
    return {
      remaining,
      monthsLeft: null,
      monthlyNeeded: null,
      isOverdue: false,
    };
  }

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(deadline + 'T12:00:00');
  const diffMs = targetDate.getTime() - todayMidnight.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      remaining,
      monthsLeft: 0,
      monthlyNeeded: remaining,
      isOverdue: true,
    };
  }

  const monthsLeft = Math.max(1, Math.ceil(diffDays / 30.4375));
  const monthlyNeeded = Number((remaining / monthsLeft).toFixed(2));

  return {
    remaining,
    monthsLeft,
    monthlyNeeded,
    isOverdue: false,
  };
}

export default function FinanceiroCofrinhosPage() {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [contributions, setContributions] = useState<FinancialGoalContribution[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Create / Edit Goal Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [goalName, setGoalName] = useState<string>('');
  const [goalTargetStr, setGoalTargetStr] = useState<string>('');
  const [goalCurrentStr, setGoalCurrentStr] = useState<string>('0');
  const [goalDeadline, setGoalDeadline] = useState<string>('');
  const [goalCategory, setGoalCategory] = useState<string>(GOAL_CATEGORIES[0]);
  const [goalColor, setGoalColor] = useState<string>(GOAL_COLOR_PALETTE[0].value);
  const [goalNotes, setGoalNotes] = useState<string>('');
  const [isSubmittingGoal, setIsSubmittingGoal] = useState<boolean>(false);

  // Quick Deposit / Withdraw Modal State
  const [activeContributionGoal, setActiveContributionGoal] =
    useState<FinancialGoal | null>(null);
  const [contributionType, setContributionType] =
    useState<ContributionType>('deposit');
  const [contribAmountStr, setContribAmountStr] = useState<string>('');
  const [contribDate, setContribDate] = useState<string>(todayStr);
  const [contribNotes, setContribNotes] = useState<string>('');
  const [isSubmittingContrib, setIsSubmittingContrib] = useState<boolean>(false);

  // History Drawer / Modal State
  const [historyGoal, setHistoryGoal] = useState<FinancialGoal | null>(null);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [gData, cData] = await Promise.all([
        OmniStore.getFinancialGoals(),
        OmniStore.getFinancialGoalContributions(),
      ]);
      setGoals(gData);
      setContributions(cData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Summary Header Calculations (useMemo)
  const summaryStats = useMemo(() => {
    const totalAccumulated = goals.reduce(
      (acc, g) => acc + Number(g.current_amount || 0),
      0
    );
    const totalTarget = goals.reduce(
      (acc, g) => acc + Number(g.target_amount || 0),
      0
    );
    const overallPercentage =
      totalTarget > 0
        ? Math.min(100, Number(((totalAccumulated / totalTarget) * 100).toFixed(1)))
        : 0;
    const totalRemaining = Math.max(0, totalTarget - totalAccumulated);
    const completedGoalsCount = goals.filter(
      (g) => g.target_amount > 0 && g.current_amount >= g.target_amount
    ).length;

    return {
      totalAccumulated,
      totalTarget,
      overallPercentage,
      totalRemaining,
      completedGoalsCount,
    };
  }, [goals]);

  const handleOpenNewGoalModal = () => {
    setEditingGoal(null);
    setGoalName('');
    setGoalTargetStr('');
    setGoalCurrentStr('0');
    setGoalDeadline('');
    setGoalCategory(GOAL_CATEGORIES[0]);
    setGoalColor(GOAL_COLOR_PALETTE[0].value);
    setGoalNotes('');
    setIsGoalModalOpen(true);
  };

  const handleOpenEditGoalModal = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setGoalTargetStr(String(goal.target_amount));
    setGoalCurrentStr(String(goal.current_amount));
    setGoalDeadline(goal.deadline || '');
    setGoalCategory(goal.category || GOAL_CATEGORIES[0]);
    setGoalColor(goal.color || GOAL_COLOR_PALETTE[0].value);
    setGoalNotes(goal.notes || '');
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = Number(goalTargetStr.replace(',', '.'));
    const currentVal = Number(goalCurrentStr.replace(',', '.') || 0);

    if (!goalName.trim() || !Number.isFinite(targetVal) || targetVal <= 0) {
      return;
    }

    setIsSubmittingGoal(true);
    try {
      if (editingGoal) {
        await OmniStore.updateFinancialGoal(editingGoal.id, {
          name: goalName.trim(),
          target_amount: Number(targetVal.toFixed(2)),
          current_amount: Math.max(0, Number(currentVal.toFixed(2))),
          deadline: goalDeadline || null,
          category: goalCategory,
          color: goalColor,
          notes: goalNotes.trim() || null,
        });
        showToast(`Cofrinho "${goalName}" atualizado!`);
      } else {
        const created = await OmniStore.addFinancialGoal({
          name: goalName.trim(),
          target_amount: Number(targetVal.toFixed(2)),
          current_amount: Math.max(0, Number(currentVal.toFixed(2))),
          deadline: goalDeadline || null,
          category: goalCategory,
          color: goalColor,
          notes: goalNotes.trim() || null,
        });

        // If created with an initial amount > 0, record initial deposit contribution
        if (currentVal > 0) {
          await OmniStore.addFinancialGoalContribution({
            goal_id: created.id,
            type: 'deposit',
            amount: Number(currentVal.toFixed(2)),
            contribution_date: todayStr,
            notes: 'Saldo inicial do cofrinho',
          });
          await OmniStore.updateFinancialGoal(created.id, {
            current_amount: Number(currentVal.toFixed(2)),
          });
        }
        showToast(`Cofrinho "${goalName}" criado com sucesso!`);
      }

      setIsGoalModalOpen(false);
      await loadAll();
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  const handleDeleteGoal = async (goal: FinancialGoal) => {
    if (
      confirm(
        `Deseja excluir o cofrinho "${goal.name}" e todo o seu histórico de aportes?`
      )
    ) {
      await OmniStore.deleteFinancialGoal(goal.id);
      if (historyGoal?.id === goal.id) setHistoryGoal(null);
      await loadAll();
      showToast(`Cofrinho "${goal.name}" removido.`);
    }
  };

  const handleOpenContributionModal = (
    goal: FinancialGoal,
    type: ContributionType
  ) => {
    setActiveContributionGoal(goal);
    setContributionType(type);
    setContribAmountStr('');
    setContribDate(todayStr);
    setContribNotes('');
  };

  const handleSaveContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContributionGoal) return;

    const amountVal = Number(contribAmountStr.replace(',', '.'));
    if (!Number.isFinite(amountVal) || amountVal <= 0) return;

    setIsSubmittingContrib(true);
    try {
      await OmniStore.addFinancialGoalContribution({
        goal_id: activeContributionGoal.id,
        type: contributionType,
        amount: Number(amountVal.toFixed(2)),
        contribution_date: contribDate || todayStr,
        notes: contribNotes.trim() || null,
      });

      showToast(
        contributionType === 'deposit'
          ? `+ ${formatBRL(amountVal)} guardados em "${activeContributionGoal.name}"!`
          : `- ${formatBRL(amountVal)} resgatados de "${activeContributionGoal.name}".`
      );
      setActiveContributionGoal(null);
      await loadAll();
    } finally {
      setIsSubmittingContrib(false);
    }
  };

  const handleDeleteContribution = async (contrib: FinancialGoalContribution) => {
    if (
      confirm(
        `Deseja estornar este ${
          contrib.type === 'deposit' ? 'aporte' : 'resgate'
        } de ${formatBRL(contrib.amount)}? O saldo do cofrinho será recalculado.`
      )
    ) {
      await OmniStore.deleteFinancialGoalContribution(contrib.id);
      await loadAll();
      showToast('Lançamento estornado e saldo atualizado.');
    }
  };

  const historyGoalContributions = useMemo(() => {
    if (!historyGoal) return [];
    return contributions.filter((c) => c.goal_id === historyGoal.id);
  }, [contributions, historyGoal]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Summary Header Card */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-5 border-l-4 border-l-emerald-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-emerald-400" />
              Cofrinhos & Metas Financeiras
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Organize suas reservas por objetivo, acompanhe quanto guardar por mês e registre aportes e resgates.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenNewGoalModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-xs hover:opacity-95 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            + Novo Cofrinho
          </button>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">
              Total Acumulado nos Cofrinhos
            </span>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">
              {formatBRL(summaryStats.totalAccumulated)}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Distribuído em {goals.length}{' '}
              {goals.length === 1 ? 'cofrinho' : 'cofrinhos'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">
              Soma Total das Metas
            </span>
            <p className="text-2xl font-extrabold text-white mt-1">
              {formatBRL(summaryStats.totalTarget)}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Faltam {formatBRL(summaryStats.totalRemaining)} no total
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Progresso Geral Concluído
              </span>
              <span className="text-lg font-extrabold text-cyan-400">
                {summaryStats.overallPercentage}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden my-2 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${summaryStats.overallPercentage}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400">
              {summaryStats.completedGoalsCount} de {goals.length} metas 100% batidas
            </span>
          </div>
        </div>
      </div>

      {/* Cofrinhos Grid or Empty State */}
      {!isLoading && goals.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center space-y-4 border border-dashed border-slate-800">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <PiggyBank className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-extrabold text-white">
              Você ainda não criou nenhum Cofrinho
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Crie cofrinhos separados para sua Reserva de Emergência, viagens, carro, imóvel ou estudos. O OmniTrack calcula automaticamente quanto você precisa poupar por mês até o prazo!
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNewGoalModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-xs hover:opacity-95 transition shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Criar Primeiro Cofrinho
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((goal) => {
            const color = goal.color || '#06b6d4';
            const pct =
              goal.target_amount > 0
                ? Math.min(
                    100,
                    Number(((goal.current_amount / goal.target_amount) * 100).toFixed(1))
                  )
                : 0;
            const isCompleted =
              goal.target_amount > 0 && goal.current_amount >= goal.target_amount;

            const calc = calculateMonthlySavingsNeeded(
              goal.target_amount,
              goal.current_amount,
              goal.deadline
            );

            const goalContribsCount = contributions.filter(
              (c) => c.goal_id === goal.id
            ).length;

            return (
              <div
                key={goal.id}
                className="glass-card p-5 rounded-2xl flex flex-col justify-between space-y-4 border border-slate-800/90 hover:border-slate-700 transition relative overflow-hidden"
              >
                {/* Top Color Bar Accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: color }}
                />

                <div className="space-y-3 pt-1">
                  {/* Card Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `${color}18`,
                          borderColor: `${color}45`,
                          color,
                        }}
                      >
                        <PiggyBank className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                          {goal.category || 'Meta Financeira'}
                        </span>
                        <h3 className="text-base font-extrabold text-white truncate">
                          {goal.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setHistoryGoal(goal)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 transition"
                        title="Histórico de Aportes e Resgates"
                      >
                        <History className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditGoalModal(goal)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
                        title="Editar cofrinho"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
                        title="Excluir cofrinho"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Current vs Target Amount */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          Guardado Atual
                        </span>
                        <span className="text-xl font-extrabold text-white">
                          {formatBRL(goal.current_amount)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">
                          Meta Alvo
                        </span>
                        <span className="text-sm font-bold text-slate-300">
                          {formatBRL(goal.target_amount)}
                        </span>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isCompleted ? '#10b981' : color,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold" style={{ color }}>
                          {pct}% concluído
                        </span>
                        {isCompleted ? (
                          <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            Meta atingida!
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Faltam{' '}
                            <strong className="text-slate-200">
                              {formatBRL(calc.remaining)}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Intelligent Deadline & Monthly Savings Calculation */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1.5 text-xs">
                    {goal.deadline ? (
                      <>
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                            Prazo limite:
                          </span>
                          <span className="font-bold text-white text-[11px]">
                            {new Date(goal.deadline + 'T12:00:00').toLocaleDateString(
                              'pt-BR'
                            )}
                          </span>
                        </div>

                        {!isCompleted && calc.monthlyNeeded !== null && (
                          <div className="pt-1 border-t border-slate-800/70 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-amber-400" />
                              {calc.isOverdue
                                ? 'Prazo vencido:'
                                : `Ritmo (${calc.monthsLeft} ${
                                    calc.monthsLeft === 1 ? 'mês' : 'meses'
                                  }):`}
                            </span>
                            <span className="text-xs font-extrabold text-amber-300">
                              Guardar {formatBRL(calc.monthlyNeeded)}/mês
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-slate-500" />
                          Sem prazo fixo definido
                        </span>
                        <span>Livre acumulação</span>
                      </div>
                    )}

                    {goal.notes && (
                      <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 line-clamp-2">
                        {goal.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Action Buttons: + Guardar | - Resgatar | Histórico */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenContributionModal(goal, 'deposit')}
                      className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      + Guardar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenContributionModal(goal, 'withdraw')}
                      disabled={goal.current_amount <= 0}
                      className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5" />
                      - Resgatar
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setHistoryGoal(goal)}
                    className="w-full py-1.5 rounded-lg bg-slate-950/70 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <History className="h-3 w-3 text-cyan-400" />
                    Ver histórico ({goalContribsCount}{' '}
                    {goalContribsCount === 1 ? 'movimentação' : 'movimentações'})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Create / Edit Cofrinho */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-lg">
                  {editingGoal ? 'Editar Cofrinho / Meta' : 'Novo Cofrinho / Meta'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Nome do Cofrinho / Meta *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Reserva de Emergência (6 meses), Viagem, Entrada Apartamento..."
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Valor Alvo da Meta (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="10000.00"
                    value={goalTargetStr}
                    onChange={(e) => setGoalTargetStr(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {editingGoal ? 'Saldo Atual (R$)' : 'Saldo Inicial Já Guardado (R$)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={goalCurrentStr}
                    onChange={(e) => setGoalCurrentStr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {GOAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Data Limite / Prazo (opcional)
                  </label>
                  <input
                    type="date"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Color Palette */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Cor de Identificação
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {GOAL_COLOR_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setGoalColor(c.value)}
                      className={`h-8 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                        goalColor === c.value
                          ? 'border-white bg-slate-800 text-white scale-105'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: c.value }}
                      />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Observações / Onde está aplicado (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Aplicado no CDB 100% CDI do Itaú / Caixinha Nubank / Tesouro Selic..."
                  value={goalNotes}
                  onChange={(e) => setGoalNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGoal}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 text-xs font-extrabold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmittingGoal
                    ? 'Salvando...'
                    : editingGoal
                    ? 'Salvar Alterações'
                    : 'Criar Cofrinho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Quick Deposit (+ Guardar) or Withdraw (- Resgatar) */}
      {activeContributionGoal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {contributionType === 'deposit' ? (
                  <ArrowUpCircle className="h-5 w-5 text-emerald-400" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5 text-rose-400" />
                )}
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {contributionType === 'deposit'
                      ? 'Guardar no Cofrinho (Aporte)'
                      : 'Resgatar do Cofrinho (Saque)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeContributionGoal.name} • Saldo atual:{' '}
                    <strong className="text-slate-200">
                      {formatBRL(activeContributionGoal.current_amount)}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveContributionGoal(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContribution} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Valor do {contributionType === 'deposit' ? 'Aporte' : 'Resgate'} (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={
                    contributionType === 'withdraw'
                      ? activeContributionGoal.current_amount
                      : undefined
                  }
                  placeholder="0.00"
                  value={contribAmountStr}
                  onChange={(e) => setContribAmountStr(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base font-extrabold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={contribDate}
                  onChange={(e) => setContribDate(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Observação (opcional)
                </label>
                <input
                  type="text"
                  placeholder={
                    contributionType === 'deposit'
                      ? 'Ex: Aporte mensal do salário, 13º, economia extra...'
                      : 'Ex: Uso para pagamento à vista, emergência...'
                  }
                  value={contribNotes}
                  onChange={(e) => setContribNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveContributionGoal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingContrib}
                  className={`px-5 py-2 rounded-xl text-xs font-extrabold shadow-lg disabled:opacity-50 ${
                    contributionType === 'deposit'
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-rose-600/20'
                  }`}
                >
                  {isSubmittingContrib
                    ? 'Registrando...'
                    : contributionType === 'deposit'
                    ? 'Confirmar Aporte'
                    : 'Confirmar Resgate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Contribution History of Selected Cofrinho */}
      {historyGoal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl relative max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-cyan-400" />
                  Histórico: {historyGoal.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Saldo atual:{' '}
                  <strong className="text-emerald-400">
                    {formatBRL(
                      goals.find((g) => g.id === historyGoal.id)?.current_amount ??
                        historyGoal.current_amount
                    )}
                  </strong>{' '}
                  / Meta: {formatBRL(historyGoal.target_amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryGoal(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {historyGoalContributions.length === 0 ? (
                <div className="py-10 text-center text-slate-500 space-y-2">
                  <History className="h-8 w-8 mx-auto text-slate-700" />
                  <p className="text-xs">
                    Nenhum aporte ou resgate registrado neste cofrinho ainda.
                  </p>
                </div>
              ) : (
                historyGoalContributions.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`p-1.5 rounded-lg shrink-0 ${
                          c.type === 'deposit'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {c.type === 'deposit' ? (
                          <ArrowUpCircle className="h-4 w-4" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {c.type === 'deposit' ? 'Aporte (+ Guardar)' : 'Resgate (- Saque)'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(
                              c.contribution_date + 'T12:00:00'
                            ).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        {c.notes && (
                          <p className="text-[11px] text-slate-400 truncate">
                            {c.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-extrabold ${
                          c.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {c.type === 'deposit' ? '+' : '-'} {formatBRL(c.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteContribution(c)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition"
                        title="Estornar lançamento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryGoal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
