'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { OmniStore } from '@/lib/store';
import {
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSet,
  UserPR,
  GeminiWorkoutSessionResponse,
} from '@/lib/types';
import { VoiceTextInput } from '@/components/ui/VoiceTextInput';
import { BodyHeatmap } from '@/components/ui/BodyHeatmap';
import { calculateWeeklyStreak } from '@/lib/consistency';
import { computeMuscleHeatmap } from '@/lib/heatmap';
import {
  Dumbbell,
  Sparkles,
  Trophy,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Bot,
  Search,
  Layers,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  X,
  MoreVertical,
  SlidersHorizontal,
  Flame,
  Zap,
  Activity,
} from 'lucide-react';

const muscleGroups = ['Todos', 'Peito', 'Costas', 'Pernas', 'Ombros', 'Braços'];

// Week Calculation Helpers
function getISOWeekDetails(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // ISO Week Number
  const jan1 = new Date(monday.getFullYear(), 0, 1);
  const days = Math.floor((monday.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);

  const formatShort = (dt: Date) =>
    dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return {
    weekNum,
    year: monday.getFullYear(),
    rangeStr: `${formatShort(monday)} a ${formatShort(sunday)}`,
    mondayTimestamp: monday.getTime(),
  };
}

interface DynamicExerciseInput {
  exercise_name: string;
  muscle_group: string;
  sets: { set: number; reps: number; weight_each_side_kg: number; total_weight_kg: number }[];
  observation: string;
}

export default function WorkoutPage() {
  const [activeTab, setActiveTab] = useState<'sessions' | 'prs'>('sessions');
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [prs, setPrs] = useState<UserPR[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Accordion state for expanded sessions
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});

  // PR Filters
  const [prSearchQuery, setPrSearchQuery] = useState<string>('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('Todos');

  // Manual Session Modal State
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualExercises, setManualExercises] = useState<DynamicExerciseInput[]>([]);

  // PR Modal State
  const [isPrModalOpen, setIsPrModalOpen] = useState<boolean>(false);
  const [editingPrId, setEditingPrId] = useState<string | null>(null);
  const [prExerciseName, setPrExerciseName] = useState<string>('');
  const [prMuscleGroup, setPrMuscleGroup] = useState<string>('Peito');
  const [prWeight, setPrWeight] = useState<number>(100);
  const [prReps, setPrReps] = useState<number>(8);
  const [prDate, setPrDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    const [sList, prList] = await Promise.all([
      OmniStore.getWorkoutSessions(),
      OmniStore.getUserPRs(),
    ]);
    setSessions(sList);
    setPrs(prList);
    if (sList.length > 0 && Object.keys(expandedSessionIds).length === 0) {
      setExpandedSessionIds({ [sList[0].id]: true });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const toggleSessionExpand = (id: string) => {
    setExpandedSessionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // AI Workout Voice/Text Logger
  const handleProcessInput = async (bodyData: FormData | { text: string }) => {
    setIsLoading(true);
    showToast('Treinador IA Gemini 2.5 Flash analisando sessão de treino...');

    try {
      let res: Response;
      if (bodyData instanceof FormData) {
        res = await fetch('/api/gemini/workout', {
          method: 'POST',
          body: bodyData,
        });
      } else {
        res = await fetch('/api/gemini/workout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });
      }

      if (!res.ok) {
        throw new Error('Falha ao processar treino.');
      }

      const data: GeminiWorkoutSessionResponse = await res.json();

      await OmniStore.addWorkoutSession({
        title: data.workout_title,
        total_session_volume_kg: data.total_session_volume_kg,
        coach_feedback: data.coach_feedback,
        exercises: data.exercises,
      });

      await loadData();
      showToast('Sessão de treino e recordes salvos com sucesso!');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao processar treino. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Session Modal Openers
  const openNewSessionModal = () => {
    setEditingSessionId(null);
    setSessionTitle('Treino de Força');
    setSessionDate(new Date().toISOString().split('T')[0]);
    setManualExercises([
      {
        exercise_name: 'Supino Reto com Barra',
        muscle_group: 'Peito',
        sets: [
          { set: 1, reps: 10, weight_each_side_kg: 30, total_weight_kg: 80 },
          { set: 2, reps: 8, weight_each_side_kg: 35, total_weight_kg: 90 },
        ],
        observation: '',
      },
    ]);
    setIsSessionModalOpen(true);
  };

  const openEditSessionModal = (session: WorkoutSession) => {
    setEditingSessionId(session.id);
    setSessionTitle(session.title);
    setSessionDate(session.session_date);
    setManualExercises(
      session.exercises?.map((ex) => ({
        exercise_name: ex.exercise_name,
        muscle_group: ex.muscle_group,
        sets: ex.sets.map((s) => ({ ...s })),
        observation: ex.observation || '',
      })) || []
    );
    setIsSessionModalOpen(true);
  };

  const handleAddExerciseToManual = () => {
    setManualExercises((prev) => [
      ...prev,
      {
        exercise_name: '',
        muscle_group: 'Peito',
        sets: [{ set: 1, reps: 10, weight_each_side_kg: 20, total_weight_kg: 60 }],
        observation: '',
      },
    ]);
  };

  const handleRemoveExerciseFromManual = (index: number) => {
    setManualExercises((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddSetToExercise = (exIndex: number) => {
    setManualExercises((prev) => {
      const updated = [...prev];
      const ex = updated[exIndex];
      const nextSetNum = ex.sets.length + 1;
      const lastSet = ex.sets[ex.sets.length - 1] || { weight_each_side_kg: 0, total_weight_kg: 60, reps: 10 };
      ex.sets.push({
        set: nextSetNum,
        reps: lastSet.reps,
        weight_each_side_kg: lastSet.weight_each_side_kg,
        total_weight_kg: lastSet.total_weight_kg,
      });
      return updated;
    });
  };

  const handleRemoveSetFromExercise = (exIndex: number, setIndex: number) => {
    setManualExercises((prev) => {
      const updated = [...prev];
      updated[exIndex].sets = updated[exIndex].sets.filter((_, idx) => idx !== setIndex);
      // Re-number sets
      updated[exIndex].sets.forEach((s, idx) => (s.set = idx + 1));
      return updated;
    });
  };

  const handleSaveManualSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim() || manualExercises.length === 0) return;

    try {
      let sessionTotalVolume = 0;
      const formattedExercises = manualExercises.map((ex) => {
        const exVol = ex.sets.reduce((acc, s) => acc + s.total_weight_kg * s.reps, 0);
        const maxWeight = Math.max(...ex.sets.map((s) => s.total_weight_kg), 0);
        sessionTotalVolume += exVol;

        return {
          exercise_name: ex.exercise_name || 'Exercício sem nome',
          muscle_group: ex.muscle_group,
          sets: ex.sets,
          best_weight_kg: maxWeight,
          exercise_volume_kg: exVol,
          observation: ex.observation,
        };
      });

      if (editingSessionId) {
        await OmniStore.updateWorkoutSession(editingSessionId, {
          title: sessionTitle,
          session_date: sessionDate,
          total_session_volume_kg: sessionTotalVolume,
          exercises: formattedExercises,
        });
        showToast('Sessão de treino atualizada com sucesso!');
      } else {
        await OmniStore.addWorkoutSession({
          title: sessionTitle,
          session_date: sessionDate,
          total_session_volume_kg: sessionTotalVolume,
          coach_feedback: 'Treino manual registrado com sucesso. Manutenção constante de volume!',
          exercises: formattedExercises,
        });
        showToast('Nova sessão de treino registrada!');
      }

      setIsSessionModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar treino.');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta sessão de treino?')) {
      await OmniStore.deleteWorkoutSession(id);
      await loadData();
      showToast('Sessão excluída com sucesso.');
    }
  };

  // PR Modal Handlers
  const openNewPrModal = () => {
    setEditingPrId(null);
    setPrExerciseName('');
    setPrMuscleGroup('Peito');
    setPrWeight(100);
    setPrReps(8);
    setPrDate(new Date().toISOString().split('T')[0]);
    setIsPrModalOpen(true);
  };

  const openEditPrModal = (pr: UserPR) => {
    setEditingPrId(pr.id);
    setPrExerciseName(pr.exercise_name);
    setPrMuscleGroup(pr.muscle_group);
    setPrWeight(pr.weight_kg);
    setPrReps(pr.reps);
    setPrDate(pr.achieved_at);
    setIsPrModalOpen(true);
  };

  const handleSavePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prExerciseName.trim()) return;

    try {
      if (editingPrId) {
        await OmniStore.updatePR(editingPrId, {
          exercise_name: prExerciseName,
          muscle_group: prMuscleGroup,
          weight_kg: prWeight,
          reps: prReps,
          achieved_at: prDate,
        });
        showToast('Recorde Pessoal (PR) atualizado!');
      } else {
        await OmniStore.addPR({
          exercise_name: prExerciseName,
          muscle_group: prMuscleGroup,
          weight_kg: prWeight,
          reps: prReps,
          achieved_at: prDate,
        });
        showToast('Novo Recorde Pessoal registrado! 🏆');
      }

      setIsPrModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar PR.');
    }
  };

  const handleDeletePR = async (id: string) => {
    if (confirm('Deseja excluir este registro de PR?')) {
      await OmniStore.deletePR(id);
      await loadData();
      showToast('Recorde excluído.');
    }
  };

  // Group Sessions by ISO Week (Timeline)
  const groupedWeeklySessions = useMemo(() => {
    const map = new Map<
      string,
      {
        weekNum: number;
        year: number;
        rangeStr: string;
        mondayTimestamp: number;
        sessions: WorkoutSession[];
        totalVolume: number;
      }
    >();

    sessions.forEach((sess) => {
      const details = getISOWeekDetails(sess.session_date);
      const key = `${details.year}-W${details.weekNum}`;

      if (!map.has(key)) {
        map.set(key, {
          weekNum: details.weekNum,
          year: details.year,
          rangeStr: details.rangeStr,
          mondayTimestamp: details.mondayTimestamp,
          sessions: [],
          totalVolume: 0,
        });
      }

      const group = map.get(key)!;
      group.sessions.push(sess);
      group.totalVolume += Number(sess.total_session_volume_kg || 0);
    });

    // Sort weeks descending
    return Array.from(map.values()).sort((a, b) => b.mondayTimestamp - a.mondayTimestamp);
  }, [sessions]);

  // Filtered PRs
  const filteredPRs = useMemo(() => {
    return prs.filter((pr) => {
      const matchesGroup =
        selectedMuscleGroup === 'Todos' ||
        pr.muscle_group.toLowerCase().includes(selectedMuscleGroup.toLowerCase());

      const q = prSearchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        pr.exercise_name.toLowerCase().includes(q) ||
        pr.muscle_group.toLowerCase().includes(q);

      return matchesGroup && matchesSearch;
    });
  }, [prs, selectedMuscleGroup, prSearchQuery]);

  const getMuscleBadgeColor = (group: string) => {
    const g = group.toLowerCase();
    if (g.includes('peito')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    if (g.includes('costas')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    if (g.includes('perna') || g.includes('quadríceps')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (g.includes('ombro')) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (g.includes('braço') || g.includes('bíceps') || g.includes('tríceps')) return 'bg-violet-500/10 text-violet-400 border-violet-500/30';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const weeklyStreakData = useMemo(() => {
    return calculateWeeklyStreak(sessions, 4);
  }, [sessions]);

  const heatmapData = useMemo(() => {
    return computeMuscleHeatmap(sessions, 7);
  }, [sessions]);

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Dumbbell className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Treinador de Força de Elite IA
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Módulo de Treino & Quadro de PRs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Registre sessões por voz/IA ou manualmente e acompanhe o volume acumulado por blocos semanais.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Weekly Streak Badge */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-amber-500/40 shadow-lg shadow-amber-500/10">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Zap className="h-4 w-4 fill-amber-400 animate-pulse" />
            </div>
            <div className="text-left">
              <span className="text-xs font-black text-white block tracking-tight">
                ⚡ {weeklyStreakData.currentStreak} Semanas Seguidas
              </span>
              <span className="text-[10px] text-amber-400 font-bold block">
                {weeklyStreakData.currentWeekWorkouts}/{weeklyStreakData.targetWorkoutsPerWeek} treinos na semana {weeklyStreakData.isCurrentWeekGoalMet ? '✓ Goal!' : ''}
              </span>
            </div>
          </div>

          {/* Tab Switcher Buttons */}
          <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'sessions'
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="h-4 w-4" />
              Sessões ({sessions.length})
            </button>
            <button
              onClick={() => setActiveTab('prs')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'prs'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="h-4 w-4" />
              Vitrine de PRs ({prs.length})
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {statusMessage && (
        <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-2 animate-bounce shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-cyan-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ABA 1: HISTÓRICO DE SESSÕES (AGRUPADAS POR SEMANAS) */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          {/* Actions Bar: AI Voice/Text Logger + Manual Entry Button */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                Registrar Treino (Voz ou Formulário Manual)
              </label>

              <button
                onClick={openNewSessionModal}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 hover:opacity-90 transition shadow-md shadow-cyan-500/20"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                + Treino Manual
              </button>
            </div>

            <VoiceTextInput
              placeholder="Ex: Fiz treino de Peito e Tríceps: Supino Reto com Barra 10x80kg, 8x90kg e 6x100kg. Depois Tríceps Corda 12x25kg..."
              onSendText={(text) => handleProcessInput({ text })}
              onSendAudio={(blob) => {
                const formData = new FormData();
                formData.append('audio', blob, 'workout.webm');
                return handleProcessInput(formData);
              }}
              isLoading={isLoading}
            />
          </div>

          {/* MAPA DE CALOR MUSCULAR POR VOLUME SEMANAL (BODY HEATMAP) */}
          <BodyHeatmap data={heatmapData} />

          {/* Timeline: Weekly Blocks */}
          <div className="space-y-8">
            {groupedWeeklySessions.length === 0 ? (
              <div className="glass-card p-10 rounded-2xl text-center text-slate-500 space-y-2">
                <Dumbbell className="h-10 w-10 mx-auto text-slate-600 opacity-50" />
                <p className="text-sm font-medium">Nenhuma sessão de treino registrada ainda.</p>
                <p className="text-xs">Use a gravação por voz ou o botão "+ Treino Manual" para computar suas séries.</p>
              </div>
            ) : (
              groupedWeeklySessions.map((weekGroup) => (
                <div key={`${weekGroup.year}-W${weekGroup.weekNum}`} className="space-y-4">
                  {/* Weekly Consolidated Header */}
                  <div className="glass-panel p-4 rounded-2xl border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold text-xs">
                        Semana {weekGroup.weekNum}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-sm sm:text-base">
                          Semana {weekGroup.weekNum} ({weekGroup.rangeStr})
                        </h4>
                        <p className="text-xs text-slate-400">
                          {weekGroup.sessions.length} {weekGroup.sessions.length === 1 ? 'treino concluído' : 'treinos concluídos'} nesta semana
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-extrabold">
                        Volume Semanal: {weekGroup.totalVolume.toLocaleString('pt-BR')} kg
                      </span>
                    </div>
                  </div>

                  {/* Sessions list inside week */}
                  <div className="space-y-3 pl-0 sm:pl-2">
                    {weekGroup.sessions.map((session) => {
                      const isExpanded = Boolean(expandedSessionIds[session.id]);
                      const exercisesCount = session.exercises?.length || 0;

                      return (
                        <div
                          key={session.id}
                          className="glass-card rounded-2xl overflow-hidden border-l-4 border-l-cyan-500 transition duration-200"
                        >
                          {/* Session Header Card (Closed State) */}
                          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <button
                              onClick={() => toggleSessionExpand(session.id)}
                              className="flex-1 text-left space-y-1 hover:opacity-90 transition"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="px-2.5 py-0.5 rounded font-bold text-[11px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                  {new Date(session.session_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </span>
                                <h4 className="font-extrabold text-white text-base sm:text-lg">{session.title}</h4>
                              </div>
                              <p className="text-xs text-slate-400 flex items-center gap-3">
                                <span>{exercisesCount} {exercisesCount === 1 ? 'exercício' : 'exercícios'}</span>
                                <span>•</span>
                                <span className="text-slate-300 font-medium">
                                  Volume: <strong className="text-cyan-400">{session.total_session_volume_kg.toLocaleString('pt-BR')} kg</strong>
                                </span>
                              </p>
                            </button>

                            {/* Session Quick Actions (Edit, Delete, Expand) */}
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <button
                                onClick={() => openEditSessionModal(session)}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                title="Editar treino"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition"
                                title="Excluir treino"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => toggleSessionExpand(session.id)}
                                className="p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white transition ml-1"
                              >
                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Accordion Details */}
                          {isExpanded && (
                            <div className="p-5 pt-0 border-t border-slate-800/80 space-y-4 bg-slate-950/40 animate-fadeIn">
                              <div className="space-y-4 pt-4">
                                {session.exercises &&
                                  session.exercises.map((ex, idx) => (
                                    <div
                                      key={ex.id || idx}
                                      className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3"
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                                        <div className="flex items-center gap-2">
                                          <h5 className="font-bold text-white text-sm">{ex.exercise_name}</h5>
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getMuscleBadgeColor(ex.muscle_group)}`}>
                                            {ex.muscle_group}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs font-semibold">
                                          <span className="text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                                            Carga Máx: {ex.best_weight_kg} kg
                                          </span>
                                          <span className="text-slate-400">
                                            Vol: {ex.exercise_volume_kg} kg
                                          </span>
                                        </div>
                                      </div>

                                      {/* Sets Table */}
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                          <thead>
                                            <tr className="text-slate-400 border-b border-slate-800/60 uppercase">
                                              <th className="py-1.5 px-2">Série</th>
                                              <th className="py-1.5 px-2">Repetições</th>
                                              <th className="py-1.5 px-2">Peso / Lado (kg)</th>
                                              <th className="py-1.5 px-2">Carga Total (kg)</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-800/40 text-slate-200">
                                            {ex.sets.map((s, sIdx) => (
                                              <tr key={sIdx} className="hover:bg-slate-800/30">
                                                <td className="py-2 px-2 font-bold text-cyan-400">Set #{s.set}</td>
                                                <td className="py-2 px-2 font-medium">{s.reps} reps</td>
                                                <td className="py-2 px-2 text-slate-400">
                                                  {s.weight_each_side_kg ? `${s.weight_each_side_kg} kg` : '-'}
                                                </td>
                                                <td className="py-2 px-2 font-bold text-white">
                                                  {s.total_weight_kg} kg
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>

                                      {ex.observation && (
                                        <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                                          Obs: &quot;{ex.observation}&quot;
                                        </p>
                                      )}
                                    </div>
                                  ))}
                              </div>

                              {session.coach_feedback && (
                                <div className="bg-slate-900/90 p-4 rounded-xl border border-cyan-500/30 space-y-1.5">
                                  <div className="flex items-center gap-2 font-bold text-cyan-300 text-xs">
                                    <Bot className="h-4 w-4 text-cyan-400" />
                                    <span>Feedback do Treinador IA:</span>
                                  </div>
                                  <p className="text-xs text-slate-300 leading-relaxed pl-6">
                                    {session.coach_feedback}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ABA 2: QUADRO DE RECORDES (PRs) */}
      {activeTab === 'prs' && (
        <div className="space-y-6 animate-fadeIn">
          {/* PR Header Banner & Actions */}
          <div className="glass-card p-6 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20">
                <Trophy className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg">Quadro de Cargas Máximas (PRs)</h3>
                <p className="text-xs text-slate-400">
                  Gerencie ou cadastre diretamente seus recordes pessoais históricos.
                </p>
              </div>
            </div>

            <button
              onClick={openNewPrModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 hover:opacity-90 transition shadow-lg shadow-amber-500/20"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              + Novo PR Manual
            </button>
          </div>

          {/* Search Bar & Muscle Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {muscleGroups.map((group) => {
                const isActive = selectedMuscleGroup === group;
                return (
                  <button
                    key={group}
                    onClick={() => setSelectedMuscleGroup(group)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {group}
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[220px]">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar exercício..."
                value={prSearchQuery}
                onChange={(e) => setPrSearchQuery(e.target.value)}
                className="w-full bg-slate-900 text-xs text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-4 py-2 border border-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* PR Grid Cards */}
          {filteredPRs.length === 0 ? (
            <div className="glass-card p-10 rounded-2xl text-center text-slate-500 space-y-2">
              <Trophy className="h-10 w-10 mx-auto text-slate-600 opacity-40" />
              <p className="text-sm font-medium">Nenhum recorde encontrado para este filtro.</p>
              <p className="text-xs">Clique em "+ Novo PR Manual" para cadastrar um recorde diretamente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPRs.map((pr) => (
                <div
                  key={pr.id}
                  className="glass-card p-6 rounded-2xl border border-amber-500/20 hover:border-amber-500/50 transition relative overflow-hidden flex flex-col justify-between group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition pointer-events-none">
                    <Trophy className="h-28 w-28 text-amber-500" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${getMuscleBadgeColor(pr.muscle_group)}`}>
                        {pr.muscle_group}
                      </span>

                      {/* PR Options Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditPrModal(pr)}
                          className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition"
                          title="Editar PR"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePR(pr.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                          title="Excluir PR"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-extrabold text-white text-base leading-snug line-clamp-1">{pr.exercise_name}</h4>

                    <div className="my-4 text-center">
                      <span className="text-4xl font-black text-amber-400 tracking-tight">
                        {pr.weight_kg} <span className="text-sm font-normal text-slate-400">kg</span>
                      </span>
                      <p className="text-xs text-slate-300 font-semibold mt-1">
                        Marca para <strong className="text-white">{pr.reps} reps</strong>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Batido em:</span>
                    <span className="font-semibold text-slate-200">
                      {new Date(pr.achieved_at + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: INSERÇÃO / EDIÇÃO MANUAL DE TREINO */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl relative animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-cyan-400" />
                <h3 className="font-extrabold text-white text-lg">
                  {editingSessionId ? 'Editar Sessão de Treino' : 'Lançar Treino Manual'}
                </h3>
              </div>
              <button
                onClick={() => setIsSessionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualSession} className="space-y-6">
              {/* Header Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Título do Treino</label>
                  <input
                    type="text"
                    placeholder="Ex: Treino A - Peito, Ombro e Tríceps"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Data da Sessão</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Dynamic Exercises List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">Exercícios do Treino</h4>
                  <button
                    type="button"
                    onClick={handleAddExerciseToManual}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-cyan-400 hover:bg-slate-700 text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Adicionar Exercício
                  </button>
                </div>

                {manualExercises.map((ex, exIdx) => (
                  <div key={exIdx} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-4 relative">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-extrabold text-cyan-400">Exercício #{exIdx + 1}</span>
                      {manualExercises.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExerciseFromManual(exIdx)}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover Exercício
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] text-slate-400 block mb-1">Nome do Exercício</label>
                        <input
                          type="text"
                          placeholder="Ex: Supino Inclinado com Halteres"
                          value={ex.exercise_name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualExercises((prev) => {
                              const updated = [...prev];
                              updated[exIdx].exercise_name = val;
                              return updated;
                            });
                          }}
                          required
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Grupo Muscular</label>
                        <select
                          value={ex.muscle_group}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualExercises((prev) => {
                              const updated = [...prev];
                              updated[exIdx].muscle_group = val;
                              return updated;
                            });
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="Peito">Peito</option>
                          <option value="Costas">Costas</option>
                          <option value="Pernas">Pernas</option>
                          <option value="Ombros">Ombros</option>
                          <option value="Braços">Braços</option>
                          <option value="Core">Core / Abdômen</option>
                        </select>
                      </div>
                    </div>

                    {/* Sets Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400">Séries e Cargas</span>
                        <button
                          type="button"
                          onClick={() => handleAddSetToExercise(exIdx)}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          + Série
                        </button>
                      </div>

                      <div className="space-y-2">
                        {ex.sets.map((s, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-2 text-xs">
                            <span className="w-12 text-slate-400 font-bold">Set #{s.set}</span>
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <div>
                                <input
                                  type="number"
                                  placeholder="Peso Lado"
                                  value={s.weight_each_side_kg || ''}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setManualExercises((prev) => {
                                      const updated = [...prev];
                                      updated[exIdx].sets[sIdx].weight_each_side_kg = val;
                                      return updated;
                                    });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-center text-slate-200"
                                />
                              </div>
                              <div>
                                <input
                                  type="number"
                                  placeholder="Carga Total"
                                  value={s.total_weight_kg || ''}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setManualExercises((prev) => {
                                      const updated = [...prev];
                                      updated[exIdx].sets[sIdx].total_weight_kg = val;
                                      return updated;
                                    });
                                  }}
                                  required
                                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-center text-white font-bold"
                                />
                              </div>
                              <div>
                                <input
                                  type="number"
                                  placeholder="Reps"
                                  value={s.reps || ''}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setManualExercises((prev) => {
                                      const updated = [...prev];
                                      updated[exIdx].sets[sIdx].reps = val;
                                      return updated;
                                    });
                                  }}
                                  required
                                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-center text-cyan-400 font-bold"
                                />
                              </div>
                            </div>
                            {ex.sets.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSetFromExercise(exIdx, sIdx)}
                                className="p-1 text-slate-500 hover:text-red-400"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Observação do Exercício</label>
                      <input
                        type="text"
                        placeholder="Ex: Falha na última rep, ótima simetria..."
                        value={ex.observation}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualExercises((prev) => {
                            const updated = [...prev];
                            updated[exIdx].observation = val;
                            return updated;
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs hover:opacity-90 transition shadow-lg shadow-cyan-500/20"
                >
                  Salvar Sessão de Treino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO / EDIÇÃO DE PR MANUAL */}
      {isPrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl relative animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h3 className="font-extrabold text-white text-lg">
                  {editingPrId ? 'Editar Recorde Pessoal' : 'Novo PR Manual'}
                </h3>
              </div>
              <button
                onClick={() => setIsPrModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePR} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nome do Exercício</label>
                <input
                  type="text"
                  placeholder="Ex: Agachamento Livre com Barra"
                  value={prExerciseName}
                  onChange={(e) => setPrExerciseName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Grupo Muscular</label>
                  <select
                    value={prMuscleGroup}
                    onChange={(e) => setPrMuscleGroup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Peito">Peito</option>
                    <option value="Costas">Costas</option>
                    <option value="Pernas">Pernas</option>
                    <option value="Ombros">Ombros</option>
                    <option value="Braços">Braços</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Carga Recorde (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={prWeight}
                    onChange={(e) => setPrWeight(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Repetições Atingidas</label>
                  <input
                    type="number"
                    value={prReps}
                    onChange={(e) => setPrReps(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Data da Conquista</label>
                  <input
                    type="date"
                    value={prDate}
                    onChange={(e) => setPrDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPrModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs hover:opacity-90 transition shadow-lg shadow-amber-500/20"
                >
                  Salvar Recorde Pessoal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
