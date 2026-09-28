'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { OmniStore } from '@/lib/store';
import { NutritionLog, Profile, WaterLog, GeminiNutritionResponse } from '@/lib/types';
import { VoiceTextInput } from '@/components/ui/VoiceTextInput';
import {
  Utensils,
  Flame,
  Apple,
  Sparkles,
  Bot,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  Plus,
  Droplets,
  ChevronDown,
  ChevronUp,
  Calendar,
  X,
  AlertCircle,
  TrendingUp,
  Award,
  Layers,
} from 'lucide-react';

const mealTypeOptions = ['Café da Manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia', 'Outro'];

// Week Calculation Helpers
function getISOWeekDetails(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

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

export default function NutritionPage() {
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [waterAdding, setWaterAdding] = useState<boolean>(false);

  // Accordions State
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Manual Meal Modal State
  const [isMealModalOpen, setIsMealModalOpen] = useState<boolean>(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formMealType, setFormMealType] = useState<string>('Almoço');
  const [formMealName, setFormMealName] = useState<string>('');
  const [formCalories, setFormCalories] = useState<number>(500);
  const [formProtein, setFormProtein] = useState<number>(40);
  const [formCarbs, setFormCarbs] = useState<number>(60);
  const [formFats, setFormFats] = useState<number>(15);

  const loadData = async () => {
    const [p, n, wt] = await Promise.all([
      OmniStore.getProfile(),
      OmniStore.getNutritionLogs(),
      OmniStore.getWaterLogs(),
    ]);
    setProfile(p);
    setLogs(n);
    setWaterLogs(wt);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayWeekDetails = getISOWeekDetails(todayStr);
    const todayWeekKey = `${todayWeekDetails.year}-W${todayWeekDetails.weekNum}`;

    // Expand today's week and day by default
    setExpandedWeeks((prev) => ({ ...prev, [todayWeekKey]: true }));
    setExpandedDays((prev) => ({ ...prev, [todayStr]: true }));
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleAddWater = async (amount: number) => {
    setWaterAdding(true);
    await OmniStore.addWaterLog(amount);
    await loadData();
    setWaterAdding(false);
    showToast(`+${amount}ml de água registrados com sucesso!`);
  };

  // AI Meal Processor
  const handleProcessInput = async (bodyData: FormData | { text: string }) => {
    setIsLoading(true);
    showToast('Nutricionista IA Gemini 2.5 Flash analisando refeição...');

    try {
      let res: Response;
      if (bodyData instanceof FormData) {
        res = await fetch('/api/gemini/nutrition', {
          method: 'POST',
          body: bodyData,
        });
      } else {
        res = await fetch('/api/gemini/nutrition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });
      }

      if (!res.ok) throw new Error('Falha ao processar a refeição.');

      const data: GeminiNutritionResponse = await res.json();
      const todayStr = new Date().toISOString().split('T')[0];

      await OmniStore.addNutritionLog({
        meal_name: data.meal_name,
        meal_type: data.meal_type || 'Refeição',
        log_date: todayStr,
        calories: data.calories,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fats_g: data.fats_g,
        raw_input: data.feedback,
      });

      await loadData();
      showToast('Refeição computada e macros atualizados!');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao processar refeição. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Meal Modal Openers
  const openNewMealModal = () => {
    setEditingLogId(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormMealType('Almoço');
    setFormMealName('');
    setFormCalories(500);
    setFormProtein(40);
    setFormCarbs(60);
    setFormFats(15);
    setIsMealModalOpen(true);
  };

  const openEditMealModal = (log: NutritionLog) => {
    setEditingLogId(log.id);
    setFormDate(log.log_date || log.logged_at.split('T')[0]);
    setFormMealType(log.meal_type || 'Refeição');
    setFormMealName(log.meal_name);
    setFormCalories(log.calories);
    setFormProtein(Number(log.protein_g));
    setFormCarbs(Number(log.carbs_g));
    setFormFats(Number(log.fats_g));
    setIsMealModalOpen(true);
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMealName.trim() || formCalories <= 0) return;

    try {
      if (editingLogId) {
        await OmniStore.updateNutritionLog(editingLogId, {
          meal_name: formMealName.trim(),
          meal_type: formMealType,
          log_date: formDate,
          calories: formCalories,
          protein_g: formProtein,
          carbs_g: formCarbs,
          fats_g: formFats,
        });
        showToast('Refeição atualizada com sucesso!');
      } else {
        await OmniStore.addNutritionLog({
          meal_name: formMealName.trim(),
          meal_type: formMealType,
          log_date: formDate,
          calories: formCalories,
          protein_g: formProtein,
          carbs_g: formCarbs,
          fats_g: formFats,
          raw_input: 'Refeição registrada manualmente.',
        });
        showToast('Nova refeição adicionada!');
      }

      setIsMealModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar refeição.');
    }
  };

  const handleDeleteMeal = async (id: string) => {
    if (confirm('Deseja excluir esta refeição?')) {
      await OmniStore.deleteNutritionLog(id);
      await loadData();
      showToast('Refeição excluída.');
    }
  };

  // Profile Targets
  const targetCal = profile?.daily_calorie_target || 2500;
  const targetProt = profile?.daily_protein_target || 160;
  const targetCarbs = profile?.daily_carbs_target || 280;
  const targetFats = profile?.daily_fats_target || 70;
  const targetWater = profile?.daily_water_target || 3000;

  // Group Logs into 3-Level Cascade: Weeks -> Days -> Meals
  const groupedCascade = useMemo(() => {
    const weeksMap = new Map<
      string,
      {
        weekNum: number;
        year: number;
        rangeStr: string;
        mondayTimestamp: number;
        daysMap: Map<
          string,
          {
            dateStr: string;
            dateObj: Date;
            meals: NutritionLog[];
            totalCalories: number;
            totalProtein: number;
            totalCarbs: number;
            totalFats: number;
            waterMl: number;
          }
        >;
      }
    >();

    logs.forEach((log) => {
      const dateStr = log.log_date || log.logged_at.split('T')[0];
      const weekDetails = getISOWeekDetails(dateStr);
      const weekKey = `${weekDetails.year}-W${weekDetails.weekNum}`;

      if (!weeksMap.has(weekKey)) {
        weeksMap.set(weekKey, {
          weekNum: weekDetails.weekNum,
          year: weekDetails.year,
          rangeStr: weekDetails.rangeStr,
          mondayTimestamp: weekDetails.mondayTimestamp,
          daysMap: new Map(),
        });
      }

      const weekGroup = weeksMap.get(weekKey)!;

      if (!weekGroup.daysMap.has(dateStr)) {
        const waterSum = waterLogs
          .filter((w) => w.logged_at.split('T')[0] === dateStr)
          .reduce((acc, curr) => acc + curr.amount_ml, 0);

        weekGroup.daysMap.set(dateStr, {
          dateStr,
          dateObj: new Date(dateStr + 'T12:00:00'),
          meals: [],
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFats: 0,
          waterMl: waterSum,
        });
      }

      const dayGroup = weekGroup.daysMap.get(dateStr)!;
      dayGroup.meals.push(log);
      dayGroup.totalCalories += log.calories;
      dayGroup.totalProtein += Number(log.protein_g);
      dayGroup.totalCarbs += Number(log.carbs_g);
      dayGroup.totalFats += Number(log.fats_g);
    });

    // Transform into sorted arrays
    const sortedWeeks = Array.from(weeksMap.entries())
      .sort((a, b) => b[1].mondayTimestamp - a[1].mondayTimestamp)
      .map(([weekKey, weekData]) => {
        const sortedDays = Array.from(weekData.daysMap.values()).sort(
          (a, b) => b.dateObj.getTime() - a.dateObj.getTime()
        );

        // Calculate Weekly Totals & Daily Averages
        const daysCount = sortedDays.length || 1;
        const weekTotalCalories = sortedDays.reduce((a, d) => a + d.totalCalories, 0);
        const weekTotalProtein = sortedDays.reduce((a, d) => a + d.totalProtein, 0);
        const weekTotalCarbs = sortedDays.reduce((a, d) => a + d.totalCarbs, 0);
        const weekTotalFats = sortedDays.reduce((a, d) => a + d.totalFats, 0);

        const avgCalories = Math.round(weekTotalCalories / daysCount);
        const avgProtein = Math.round(weekTotalProtein / daysCount);
        const avgCarbs = Math.round(weekTotalCarbs / daysCount);
        const avgFats = Math.round(weekTotalFats / daysCount);

        // Count consistency days (calorie goal hit within +-15% range or > 85% target)
        const daysGoalMetCount = sortedDays.filter(
          (d) => d.totalCalories >= targetCal * 0.85 && d.totalCalories <= targetCal * 1.15
        ).length;

        return {
          weekKey,
          ...weekData,
          days: sortedDays,
          daysCount,
          weekTotalCalories,
          weekTotalProtein,
          weekTotalCarbs,
          weekTotalFats,
          avgCalories,
          avgProtein,
          avgCarbs,
          avgFats,
          daysGoalMetCount,
        };
      });

    return sortedWeeks;
  }, [logs, waterLogs, targetCal]);

  const toggleWeek = (key: string) => {
    setExpandedWeeks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDay = (dateStr: string) => {
    setExpandedDays((prev) => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  // Today Water Total for top quick card
  const todayStr = new Date().toISOString().split('T')[0];
  const todayWaterTotal = waterLogs
    .filter((w) => w.logged_at.split('T')[0] === todayStr)
    .reduce((acc, curr) => acc + curr.amount_ml, 0);

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Utensils className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Nutrição de Precisão IA & Timeline Semanal
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Diário Nutricional Cascata
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Organização em 3 níveis: Semanas ➔ Dias ➔ Refeições Individuais.
          </p>
        </div>

        {/* Quick Water Action Buttons */}
        <div className="flex items-center gap-2 p-2 bg-slate-950/80 rounded-2xl border border-slate-800">
          <div className="px-2 text-right">
            <span className="text-xs text-slate-400 block font-medium">Água Hoje</span>
            <span className="text-sm font-extrabold text-cyan-400">{todayWaterTotal} ml</span>
          </div>
          <button
            onClick={() => handleAddWater(250)}
            disabled={waterAdding}
            className="px-3 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition active:scale-95"
          >
            +250ml
          </button>
          <button
            onClick={() => handleAddWater(500)}
            disabled={waterAdding}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-extrabold hover:opacity-90 transition active:scale-95 shadow-md shadow-cyan-500/20"
          >
            +500ml
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {statusMessage && (
        <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-2 animate-bounce shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-cyan-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top Action Bar: AI Voice/Text Logger + Manual Entry Button */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            Registrar Refeição (Voz / IA ou Formulário Manual)
          </label>

          <button
            onClick={openNewMealModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 hover:opacity-90 transition shadow-md shadow-cyan-500/20"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            + Refeição Manual
          </button>
        </div>

        <VoiceTextInput
          placeholder="Ex: Almocei 200g de peito de frango, 200g de arroz integral e salada de alface..."
          onSendText={(text) => handleProcessInput({ text })}
          onSendAudio={(blob) => {
            const formData = new FormData();
            formData.append('audio', blob, 'nutrition.webm');
            return handleProcessInput(formData);
          }}
          isLoading={isLoading}
        />
      </div>

      {/* 3-LEVEL CASCADING HISTORICAL LOGS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-400" />
            Histórico Nutricional em Cascata
          </h3>
          <span className="text-xs text-slate-400">Expandido por Semanas e Dias</span>
        </div>

        {groupedCascade.length === 0 ? (
          <div className="glass-card p-10 rounded-2xl text-center text-slate-500 space-y-2">
            <Apple className="h-10 w-10 mx-auto text-slate-600 opacity-50" />
            <p className="text-sm font-medium">Nenhuma refeição registrada no histórico.</p>
            <p className="text-xs">Use a gravação de voz ou o botão "+ Refeição Manual" para começar.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* LEVEL 1: WEEKLY BLOCK */}
            {groupedCascade.map((week) => {
              const isWeekExpanded = Boolean(expandedWeeks[week.weekKey]);

              return (
                <div
                  key={week.weekKey}
                  className="glass-card rounded-2xl overflow-hidden border border-slate-800 space-y-0 transition duration-200"
                >
                  {/* LEVEL 1 HEADER: WEEKLY CONSOLIDATED TOTALS */}
                  <button
                    onClick={() => toggleWeek(week.weekKey)}
                    className="w-full p-5 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left border-b border-slate-800/80 hover:bg-slate-800/30 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded font-bold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Semana {week.weekNum}
                        </span>
                        <h4 className="font-extrabold text-white text-base md:text-lg">
                          Semana {week.weekNum} ({week.rangeStr})
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-medium flex items-center gap-1">
                          <Award className="h-3 w-3 text-amber-400" />
                          Consistência: <strong className="text-amber-300">{week.daysGoalMetCount} de {week.daysCount} dias</strong> na meta
                        </span>
                      </div>
                    </div>

                    {/* Weekly Consolidated Metrics Cards */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-right">
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Média / Dia</span>
                        <span className="text-xs font-extrabold text-amber-400">{week.avgCalories} kcal</span>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-right">
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Semana</span>
                        <span className="text-xs font-extrabold text-white">{week.weekTotalCalories.toLocaleString('pt-BR')} kcal</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 text-[11px] font-bold">
                        <span className="text-cyan-400 px-1.5">{week.avgProtein}g P</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-emerald-400 px-1.5">{week.avgCarbs}g C</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-indigo-400 px-1.5">{week.avgFats}g G</span>
                      </div>

                      <div className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                        {isWeekExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </button>

                  {/* LEVEL 2: DAYS CASCADE INSIDE WEEK */}
                  {isWeekExpanded && (
                    <div className="p-4 md:p-6 space-y-4 bg-slate-950/50 animate-fadeIn">
                      {week.days.map((day) => {
                        const isDayExpanded = Boolean(expandedDays[day.dateStr]);

                        // Calorie Status Badge Color
                        const isGoalHit = day.totalCalories >= targetCal * 0.85 && day.totalCalories <= targetCal * 1.15;
                        const isExcess = day.totalCalories > targetCal * 1.15;

                        const badgeClass = isGoalHit
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isExcess
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30';

                        const dayName = day.dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                        const dateFormatted = day.dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

                        return (
                          <div
                            key={day.dateStr}
                            className="bg-slate-900/90 rounded-xl border border-slate-800/80 overflow-hidden transition"
                          >
                            {/* LEVEL 2 HEADER: DAILY CARD HEADER */}
                            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900">
                              <button
                                onClick={() => toggleDay(day.dateStr)}
                                className="flex-1 text-left space-y-1 hover:opacity-90 transition"
                              >
                                <div className="flex items-center gap-2.5">
                                  <h5 className="font-extrabold text-white text-sm capitalize">
                                    {dayName}, {dateFormatted}
                                  </h5>
                                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold border ${badgeClass}`}>
                                    {day.totalCalories} / {targetCal} kcal
                                  </span>
                                </div>

                                {/* Macros & Water Summary */}
                                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold pt-1">
                                  <span className="text-cyan-400">Proteína: {day.totalProtein.toFixed(0)}g / {targetProt}g</span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-emerald-400">Carbos: {day.totalCarbs.toFixed(0)}g</span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-indigo-400">Gorduras: {day.totalFats.toFixed(0)}g</span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-cyan-300 font-bold flex items-center gap-1">
                                    <Droplets className="h-3.5 w-3.5" />
                                    Água: {day.waterMl} ml
                                  </span>
                                </div>
                              </button>

                              <button
                                onClick={() => toggleDay(day.dateStr)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition self-end sm:self-center"
                              >
                                {isDayExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </div>

                            {/* LEVEL 3: INDIVIDUAL MEALS INSIDE DAY */}
                            {isDayExpanded && (
                              <div className="p-4 pt-0 border-t border-slate-800/60 space-y-3 bg-slate-950/60">
                                <div className="space-y-2 pt-3">
                                  {day.meals.map((meal) => (
                                    <div
                                      key={meal.id}
                                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition group"
                                    >
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold uppercase">
                                            {meal.meal_type || 'Refeição'}
                                          </span>
                                          <h6 className="font-bold text-white text-sm">{meal.meal_name}</h6>
                                        </div>

                                        <p className="text-[11px] text-slate-400 flex items-center gap-2">
                                          <Clock className="h-3 w-3" />
                                          {new Date(meal.logged_at).toLocaleTimeString('pt-BR', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                          {meal.raw_input && (
                                            <span className="text-slate-500 italic truncate max-w-xs">
                                              - &quot;{meal.raw_input}&quot;
                                            </span>
                                          )}
                                        </p>
                                      </div>

                                      {/* Meal Macros & Actions */}
                                      <div className="flex items-center justify-between sm:justify-end gap-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold">
                                          <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            {meal.calories} kcal
                                          </span>
                                          <span className="text-cyan-300">{meal.protein_g}g P</span>
                                          <span className="text-emerald-300">{meal.carbs_g}g C</span>
                                          <span className="text-indigo-300">{meal.fats_g}g G</span>
                                        </div>

                                        <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                                          <button
                                            onClick={() => openEditMealModal(meal)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
                                            title="Editar refeição"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteMeal(meal.id)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                                            title="Excluir refeição"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: INSERÇÃO / EDIÇÃO MANUAL DE REFEIÇÃO */}
      {isMealModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl relative animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-lg">
                  {editingLogId ? 'Editar Refeição' : 'Lançar Refeição Manual'}
                </h3>
              </div>
              <button
                onClick={() => setIsMealModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMeal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Data da Refeição</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Tipo de Refeição</label>
                  <select
                    value={formMealType}
                    onChange={(e) => setFormMealType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {mealTypeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Descrição dos Alimentos</label>
                <input
                  type="text"
                  placeholder="Ex: 200g de peito de frango grelhado, 150g de arroz e salada..."
                  value={formMealName}
                  onChange={(e) => setFormMealName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-xs font-semibold text-amber-400 block mb-1">Kcal *</label>
                  <input
                    type="number"
                    value={formCalories}
                    onChange={(e) => setFormCalories(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-center text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-cyan-400 block mb-1">Proteína (g)</label>
                  <input
                    type="number"
                    value={formProtein}
                    onChange={(e) => setFormProtein(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-center text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-emerald-400 block mb-1">Carbo (g)</label>
                  <input
                    type="number"
                    value={formCarbs}
                    onChange={(e) => setFormCarbs(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-center text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-indigo-400 block mb-1">Gordura (g)</label>
                  <input
                    type="number"
                    value={formFats}
                    onChange={(e) => setFormFats(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-center text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMealModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs hover:opacity-90 transition shadow-lg shadow-cyan-500/20"
                >
                  Salvar Refeição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
