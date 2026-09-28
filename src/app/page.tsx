'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { OmniStore } from '@/lib/store';
import { Profile, NutritionLog, WorkoutSession, BodyMetric, WaterLog, SecondBrainNote } from '@/lib/types';
import {
  Flame,
  Droplets,
  Dumbbell,
  Plus,
  Brain,
  Scale,
  TrendingDown,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Apple,
} from 'lucide-react';

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetric[]>([]);
  const [notes, setNotes] = useState<SecondBrainNote[]>([]);
  const [waterAdding, setWaterAdding] = useState<boolean>(false);

  const loadData = async () => {
    const [p, n, w, wt, b, nt] = await Promise.all([
      OmniStore.getProfile(),
      OmniStore.getNutritionLogs(),
      OmniStore.getWorkoutSessions(),
      OmniStore.getWaterLogs(),
      OmniStore.getBodyMetrics(),
      OmniStore.getNotes(),
    ]);
    setProfile(p);
    setNutritionLogs(n);
    setWorkoutSessions(w);
    setWaterLogs(wt);
    setBodyMetrics(b);
    setNotes(nt);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddWater = async (amount: number) => {
    setWaterAdding(true);
    await OmniStore.addWaterLog(amount);
    await loadData();
    setWaterAdding(false);
  };

  // Calculations for Today's Stats
  const todayStr = new Date().toISOString().split('T')[0];

  const todayNutrition = nutritionLogs.filter(
    (l) => l.logged_at.split('T')[0] === todayStr
  );
  const totalCalories = todayNutrition.reduce((acc, curr) => acc + curr.calories, 0);
  const totalProtein = todayNutrition.reduce((acc, curr) => acc + Number(curr.protein_g), 0);
  const totalCarbs = todayNutrition.reduce((acc, curr) => acc + Number(curr.carbs_g), 0);
  const totalFats = todayNutrition.reduce((acc, curr) => acc + Number(curr.fats_g), 0);

  const targetCal = profile?.daily_calorie_target || 2500;
  const targetProt = profile?.daily_protein_target || 160;
  const targetCarbs = profile?.daily_carbs_target || 280;
  const targetFats = profile?.daily_fats_target || 70;
  const targetWater = profile?.daily_water_target || 3000;

  const calPercentage = Math.min(100, Math.round((totalCalories / targetCal) * 100));
  const protPercentage = Math.min(100, Math.round((totalProtein / targetProt) * 100));
  const carbsPercentage = Math.min(100, Math.round((totalCarbs / targetCarbs) * 100));
  const fatsPercentage = Math.min(100, Math.round((totalFats / targetFats) * 100));

  const todayWater = waterLogs
    .filter((w) => w.logged_at.split('T')[0] === todayStr)
    .reduce((acc, curr) => acc + curr.amount_ml, 0);
  const waterPercentage = Math.min(100, Math.round((todayWater / targetWater) * 100));

  const workoutToday = workoutSessions.some(
    (s) => s.session_date === todayStr || s.created_at.split('T')[0] === todayStr
  );

  const latestNote = notes[0];
  const latestWeight = bodyMetrics[bodyMetrics.length - 1];
  const prevWeight = bodyMetrics.length > 1 ? bodyMetrics[bodyMetrics.length - 2] : null;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
              Painel de Alta Performance
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Resumo do Seu Dia
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visão consolidada de nutrição, hidratação, sobrecarga de treino e notas ativas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/nutrition"
            className="px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/20 transition flex items-center gap-2"
          >
            <Apple className="h-4 w-4" />
            Registrar Refeição
          </Link>
          <Link
            href="/workout"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs hover:opacity-90 transition shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <Dumbbell className="h-4 w-4 text-slate-950" />
            Novo Treino
          </Link>
        </div>
      </div>

      {/* Primary Grid: Calories & Macros Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calories Progress Card */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Flame className="h-32 w-32 text-amber-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Flame className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-200 text-base">Balanço Calórico</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                Meta: {targetCal} kcal
              </span>
            </div>

            <div className="my-4 text-center">
              <span className="text-4xl font-extrabold text-white tracking-tight">
                {totalCalories}
              </span>
              <span className="text-slate-400 text-sm ml-1">/ {targetCal} kcal</span>
              <p className="text-xs text-slate-400 mt-1">
                Restam <strong className="text-amber-400">{Math.max(0, targetCal - totalCalories)} kcal</strong> hoje
              </p>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-xs text-slate-400 font-medium">
              <span>Progresso</span>
              <span className="text-amber-400 font-bold">{calPercentage}%</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${calPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Macronutrients Grid Card */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-200 text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              Macronutrientes
            </h3>
            <span className="text-xs text-slate-400">Total Diário</span>
          </div>

          <div className="space-y-4">
            {/* Protein */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-cyan-300">Proteínas ({totalProtein.toFixed(0)}g / {targetProt}g)</span>
                <span className="text-cyan-400 font-bold">{protPercentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${protPercentage}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-emerald-300">Carboidratos ({totalCarbs.toFixed(0)}g / {targetCarbs}g)</span>
                <span className="text-emerald-400 font-bold">{carbsPercentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${carbsPercentage}%` }}
                />
              </div>
            </div>

            {/* Fats */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-indigo-300">Gorduras ({totalFats.toFixed(0)}g / {targetFats}g)</span>
                <span className="text-indigo-400 font-bold">{fatsPercentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                  style={{ width: `${fatsPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 border-t border-slate-800 pt-3">
            Baseado no protocolo de precisão metabólica.
          </p>
        </div>

        {/* Water Intake Quick Card */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Droplets className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-200 text-base">Consumo de Água</h3>
              </div>
              <span className="text-xs font-bold text-cyan-400">{waterPercentage}%</span>
            </div>

            <div className="my-3 text-center">
              <span className="text-3xl font-extrabold text-cyan-300 tracking-tight">
                {todayWater} <span className="text-sm font-normal text-slate-400">ml</span>
              </span>
              <p className="text-xs text-slate-400">Meta: {targetWater} ml</p>
            </div>

            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${waterPercentage}%` }}
              />
            </div>
          </div>

          {/* Quick Add Water Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleAddWater(250)}
              disabled={waterAdding}
              className="py-2 px-3 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              +250 ml
            </button>
            <button
              onClick={() => handleAddWater(500)}
              disabled={waterAdding}
              className="py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition active:scale-95 shadow-md shadow-cyan-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              +500 ml
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Row: Workout Status & Quick Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workout Status Today Card */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Dumbbell className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-200 text-base">Treino Hoje</h3>
            </div>
            {workoutToday ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Registrado
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Pendente
              </span>
            )}
          </div>

          <div className="my-4">
            {workoutToday ? (
              <p className="text-xs text-slate-300">
                Sessão de treino concluída com sucesso! Volume registrado e analisado pelo Treinador IA.
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Nenhuma sessão registrada para hoje. Fale por voz ou digite para computar séries e cargas.
              </p>
            )}
          </div>

          <Link
            href="/workout"
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <span>Ir para Módulo de Treino</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Quick Widget: Latest Note from Second Brain */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                <Brain className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-200 text-base">Segundo Cérebro</h3>
            </div>
            {latestNote && (
              <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] font-semibold uppercase">
                {latestNote.category}
              </span>
            )}
          </div>

          {latestNote ? (
            <div className="my-2">
              <h4 className="text-sm font-semibold text-white line-clamp-1">
                {latestNote.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {latestNote.content}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 my-4">Nenhuma nota anotada ainda.</p>
          )}

          <Link
            href="/second-brain"
            className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 mt-2"
          >
            <span>Ver todas as notas</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Quick Widget: Latest Body Weight */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Scale className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-200 text-base">Última Pesagem</h3>
            </div>
            <span className="text-[10px] text-slate-400">
              {latestWeight ? new Date(latestWeight.logged_at).toLocaleDateString('pt-BR') : '-'}
            </span>
          </div>

          {latestWeight ? (
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {latestWeight.weight_kg} <span className="text-sm font-normal text-slate-400">kg</span>
              </span>
              {prevWeight && (
                <span className="text-xs text-emerald-400 font-medium flex items-center">
                  <TrendingDown className="h-3.5 w-3.5 mr-0.5" />
                  {(latestWeight.weight_kg - prevWeight.weight_kg).toFixed(1)} kg
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 my-4">Nenhum peso registrado.</p>
          )}

          <Link
            href="/physical"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 mt-2"
          >
            <span>Ver evolução física</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
