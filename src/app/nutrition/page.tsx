'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OmniStore } from '@/lib/store';
import {
  NutritionLog,
  Profile,
  WaterLog,
  GeminiNutritionResponse,
  GeminiNutritionPhotoResponse,
  DetectedMealItem,
} from '@/lib/types';
import { calculateMacroPercentages } from '@/lib/consistency';
import { XP_TABLE } from '@/lib/gamification';
import { VoiceTextInput } from '@/components/ui/VoiceTextInput';
import {
  Utensils,
  Flame,
  Apple,
  Sparkles,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  Plus,
  Minus,
  Droplets,
  ChevronDown,
  ChevronUp,
  Calendar,
  X,
  TrendingDown,
  Camera,
  Image as ImageIcon,
  Loader2,
  Info,
} from 'lucide-react';

const mealTypeOptions = ['Café da Manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia', 'Outro'];

function getSuggestedMealTypeByTime(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'Café da Manhã';
  if (hour >= 11 && hour < 15) return 'Almoço';
  if (hour >= 15 && hour < 18) return 'Lanche';
  if (hour >= 18 && hour < 22) return 'Jantar';
  return 'Ceia';
}

/**
 * Redimensiona a imagem no cliente usando HTML5 <canvas> para no máximo 1024px no maior lado
 * e converte para image/jpeg com qualidade 0.75 (reduzindo fotos de ~8MB para ~150-300KB).
 */
async function compressMealImage(
  file: File,
  maxDimension = 1024,
  quality = 0.75
): Promise<{ blob: Blob; previewUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onerror = () =>
        reject(new Error('Não foi possível decodificar a imagem selecionada.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Contexto 2D do Canvas indisponível no navegador.'));
          return;
        }

        // Fundo branco para imagens PNG transparentes antes de converter para JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedPreviewUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao comprimir imagem para JPEG.'));
              return;
            }
            resolve({
              blob,
              previewUrl: compressedPreviewUrl,
              sizeKb: Math.max(1, Math.round(blob.size / 1024)),
            });
          },
          'image/jpeg',
          quality
        );
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

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

function NutritionPageContent() {
  const searchParams = useSearchParams();
  const activeTab: 'diario' | 'historico' =
    searchParams.get('tab') === 'historico' ? 'historico' : 'diario';

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
  const [formMealType, setFormMealType] = useState<string>(getSuggestedMealTypeByTime);
  const [formMealName, setFormMealName] = useState<string>('');
  const [formCalories, setFormCalories] = useState<number>(500);
  const [formProtein, setFormProtein] = useState<number>(40);
  const [formCarbs, setFormCarbs] = useState<number>(60);
  const [formFats, setFormFats] = useState<number>(15);
  const [modalDetectedItems, setModalDetectedItems] = useState<DetectedMealItem[]>([]);

  // Photo AI Meal Analyzer States
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoSizeKb, setPhotoSizeKb] = useState<number>(0);
  const [photoMealType, setPhotoMealType] = useState<string>(getSuggestedMealTypeByTime);
  const [photoNotes, setPhotoNotes] = useState<string>('');
  const [autoSavePhotoMeal, setAutoSavePhotoMeal] = useState<boolean>(true);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [lastPhotoResult, setLastPhotoResult] = useState<{
    analysis: GeminiNutritionPhotoResponse;
    savedLog?: NutritionLog;
  } | null>(null);

  const loadData = async () => {
    try {
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
    } catch (err) {
      console.error('Erro ao carregar dados de nutrição:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleAddWater = async (amount: number, dateStr?: string) => {
    setWaterAdding(true);
    await OmniStore.addWaterLog(amount, dateStr);
    await loadData();
    setWaterAdding(false);
    showToast(`+${amount}ml de água registrados com sucesso!`);
  };

  const handleSubtractWater = async (amount: number, dateStr?: string) => {
    setWaterAdding(true);
    const success = await OmniStore.subtractWaterLog(amount, dateStr);
    await loadData();
    setWaterAdding(false);
    if (success) {
      showToast(`-${amount}ml de água descontados com sucesso!`);
    } else {
      showToast('O consumo de água não pode ficar negativo (mínimo = 0 ml).');
    }
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

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error || 'Falha ao processar a refeição.');
      }

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

      await OmniStore.addXp(XP_TABLE.LOG_MEAL, 'Refeição Registrada com IA');
      await loadData();
      showToast('Refeição computada e macros atualizados! (+30 XP)');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao processar refeição. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Photo Capture & Compression Handler
  const handleSelectPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoError(null);
    setLastPhotoResult(null);
    setIsCompressingPhoto(true);

    try {
      const { blob, previewUrl, sizeKb } = await compressMealImage(file, 1024, 0.75);
      setPhotoBlob(blob);
      setPhotoPreviewUrl(previewUrl);
      setPhotoSizeKb(sizeKb);
      setPhotoMealType(getSuggestedMealTypeByTime());
    } catch (err: any) {
      console.error('Erro ao comprimir foto:', err);
      setPhotoError(err?.message || 'Não foi possível processar a imagem selecionada.');
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleClearPhoto = () => {
    setPhotoBlob(null);
    setPhotoPreviewUrl(null);
    setPhotoSizeKb(0);
    setPhotoNotes('');
    setPhotoError(null);
  };

  const handleAnalyzePhotoMeal = async () => {
    if (!photoBlob || isAnalyzingPhoto) return;

    setIsAnalyzingPhoto(true);
    setPhotoError(null);

    try {
      const formData = new FormData();
      formData.append('image', photoBlob, 'refeicao.jpg');
      formData.append('meal_type', photoMealType);
      if (photoNotes.trim()) {
        formData.append('notes', photoNotes.trim());
      }

      // Envia FormData sem header Content-Type manual
      const res = await fetch('/api/gemini/nutrition-photo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error(
          data?.error || 'Falha ao analisar foto da refeição com a IA.'
        );
      }

      const analysis = data as GeminiNutritionPhotoResponse;
      const todayDate = new Date().toISOString().split('T')[0];
      const fatVal = Number(analysis.fat_g ?? analysis.fats_g ?? 0);

      const itemsSummary =
        analysis.items_detected && analysis.items_detected.length > 0
          ? analysis.items_detected
              .map((i) => `${i.name} (~${i.estimated_grams}g)`)
              .join(', ')
          : analysis.meal_name;

      if (autoSavePhotoMeal) {
        const savedLog = await OmniStore.addNutritionLog({
          meal_name: analysis.meal_name,
          meal_type: photoMealType,
          log_date: todayDate,
          calories: Math.round(Number(analysis.calories || 0)),
          protein_g: Number(analysis.protein_g || 0),
          carbs_g: Number(analysis.carbs_g || 0),
          fats_g: fatVal,
          raw_input: `📸 Foto IA: ${itemsSummary}. ${analysis.confidence_note || ''}`,
        });

        await OmniStore.addXp(
          XP_TABLE.LOG_MEAL,
          `Refeição por Foto IA (${analysis.meal_name})`
        );

        await loadData();
        setLastPhotoResult({ analysis, savedLog });
        handleClearPhoto();
        showToast(
          `Prato "${analysis.meal_name}" (${analysis.calories} kcal) salvo direto no diário! (+30 XP)`
        );
      } else {
        // Preenche o modal de refeição para o usuário revisar e confirmar em 1 clique
        setEditingLogId(null);
        setFormDate(todayDate);
        setFormMealType(photoMealType);
        setFormMealName(analysis.meal_name);
        setFormCalories(Math.round(Number(analysis.calories || 0)));
        setFormProtein(Number(analysis.protein_g || 0));
        setFormCarbs(Number(analysis.carbs_g || 0));
        setFormFats(fatVal);
        setModalDetectedItems(analysis.items_detected || []);
        setLastPhotoResult({ analysis });
        setIsMealModalOpen(true);
        handleClearPhoto();
        showToast('Análise concluída! Revise os valores e confirme em 1 clique.');
      }
    } catch (err: any) {
      console.error('Erro na análise por foto:', err);
      setPhotoError(
        err?.message || 'Erro ao analisar foto do prato. Tente novamente.'
      );
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // Manual Meal Modal Openers
  const openNewMealModal = () => {
    setEditingLogId(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormMealType(getSuggestedMealTypeByTime());
    setFormMealName('');
    setFormCalories(500);
    setFormProtein(40);
    setFormCarbs(60);
    setFormFats(15);
    setModalDetectedItems([]);
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
    setModalDetectedItems([]);
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
          raw_input:
            modalDetectedItems.length > 0
              ? `📸 Foto IA revisada: ${modalDetectedItems
                  .map((i) => `${i.name} (~${i.estimated_grams}g)`)
                  .join(', ')}`
              : 'Refeição registrada manualmente.',
        });
        await OmniStore.addXp(XP_TABLE.LOG_MEAL, 'Refeição Registrada');
        showToast('Nova refeição adicionada! (+30 XP)');
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

        // Calculate Weekly Net Caloric Balance
        const weeklyTargetCalories = targetCal * daysCount;
        const weeklyBalance = weekTotalCalories - weeklyTargetCalories;
        const weeklyBalanceFormatted =
          weeklyBalance > 0
            ? `+${weeklyBalance.toLocaleString('pt-BR')} kcal`
            : `${weeklyBalance.toLocaleString('pt-BR')} kcal`;

        let weeklyBalanceLabel = 'Manutenção Acumulada';
        let weeklyEstimateStr = 'Balanço calórico em perfeito equilíbrio de manutenção';
        if (weeklyBalance > 0) {
          weeklyBalanceLabel = 'Superávit Acumulado';
          const massGainKg = (weeklyBalance / 7700).toFixed(2);
          weeklyEstimateStr = `Superávit favorável para ganho gradual de massa (~${massGainKg} kg)`;
        } else if (weeklyBalance < 0) {
          weeklyBalanceLabel = 'Défice Acumulado';
          const fatBurnKg = (Math.abs(weeklyBalance) / 7700).toFixed(2);
          weeklyEstimateStr = `Défice equivalente a aprox. ~${fatBurnKg} kg de queima`;
        }

        // Count consistency days (calorie goal hit within +-15% range or > 85% target)
        const daysGoalMetCount = sortedDays.filter(
          (d) => d.totalCalories >= targetCal * 0.85 && d.totalCalories <= targetCal * 1.15
        ).length;

        const weekMacros = calculateMacroPercentages(avgProtein, avgCarbs, avgFats);

        return {
          weekKey,
          ...weekData,
          days: sortedDays,
          daysCount,
          weekTotalCalories,
          weeklyTargetCalories,
          weeklyBalance,
          weeklyBalanceFormatted,
          weeklyBalanceLabel,
          weeklyEstimateStr,
          weekTotalProtein,
          weekTotalCarbs,
          weekTotalFats,
          avgCalories,
          avgProtein,
          avgCarbs,
          avgFats,
          weekMacros,
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
        <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-950/80 rounded-2xl border border-slate-800">
          <div className="px-2 text-right">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Água Hoje</span>
            <span className="text-sm font-extrabold text-cyan-400">{todayWaterTotal} ml</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleSubtractWater(250)}
              disabled={waterAdding || todayWaterTotal <= 0}
              title="Subtrair 250ml de água hoje"
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/30 text-rose-400 text-xs font-bold transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Minus className="h-3 w-3" />
              250ml
            </button>
            <button
              onClick={() => handleSubtractWater(100)}
              disabled={waterAdding || todayWaterTotal <= 0}
              title="Subtrair 100ml de água hoje"
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-bold transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Minus className="h-3 w-3" />
              100ml
            </button>
            <button
              onClick={() => handleAddWater(250)}
              disabled={waterAdding}
              title="Adicionar 250ml de água hoje"
              className="px-2.5 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition active:scale-95 flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              250ml
            </button>
            <button
              onClick={() => handleAddWater(500)}
              disabled={waterAdding}
              title="Adicionar 500ml de água hoje"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-extrabold hover:opacity-90 transition active:scale-95 shadow-md shadow-cyan-500/20 flex items-center gap-1"
            >
              <Plus className="h-3 w-3 stroke-[3]" />
              500ml
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

      {/* Inputs ocultos globais para Câmera Traseira e Galeria */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleSelectPhotoFile}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleSelectPhotoFile}
        className="hidden"
      />

      {/* Top Action Bar: Photo AI Analyzer + Voice/Text Logger + Manual Entry Button */}
      {activeTab === 'diario' ? (
        <div className="space-y-5">
          {/* CARD EM DESTAQUE: ANALISAR PRATO POR FOTO (IA) */}
          <div className="glass-card p-5 sm:p-6 rounded-2xl border-l-4 border-l-emerald-500 space-y-4 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    Visão Computacional TACO / IBGE
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  Analisar Prato por Foto (IA)
                </h2>
                <p className="text-xs text-slate-400">
                  Tire uma foto da sua refeição ou escolha da galeria. A IA identifica os alimentos, estima as porções em gramas e salva direto no seu diário.
                </p>
              </div>

              {/* Botões de Captura: Tirar Foto (Câmera) e Galeria */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isCompressingPhoto || isAnalyzingPhoto}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-xs hover:opacity-95 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4 stroke-[2.5]" />
                  Tirar Foto
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isCompressingPhoto || isAnalyzingPhoto}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-2 disabled:opacity-50"
                >
                  <ImageIcon className="h-4 w-4 text-cyan-400" />
                  Galeria
                </button>
              </div>
            </div>

            {isCompressingPhoto && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-cyan-300 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                <span>Otimizando imagem para envio rápido...</span>
              </div>
            )}

            {photoError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 font-semibold flex items-center justify-between gap-2">
                <span>{photoError}</span>
                <button
                  type="button"
                  onClick={() => setPhotoError(null)}
                  className="text-rose-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Preview da Foto Selecionada + Contexto Opcional + Toggle de Inserção Direta */}
            {photoPreviewUrl && (
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Miniatura da Foto */}
                  <div className="relative w-full sm:w-36 h-36 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreviewUrl}
                      alt="Preview do Prato"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/85 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      JPEG • {photoSizeKb} KB
                    </span>
                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      disabled={isAnalyzingPhoto}
                      className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-slate-950/85 text-slate-300 hover:text-rose-400 border border-slate-700"
                      title="Remover foto"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Campos de Contexto: Tipo de Refeição, Detalhe Opcional e Toggle */}
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Tipo de Refeição
                        </label>
                        <select
                          value={photoMealType}
                          onChange={(e) => setPhotoMealType(e.target.value)}
                          disabled={isAnalyzingPhoto}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                        >
                          {mealTypeOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Detalhe opcional (ajuda na precisão)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 150g de arroz, preparado com azeite, 2 ovos..."
                          value={photoNotes}
                          onChange={(e) => setPhotoNotes(e.target.value)}
                          disabled={isAnalyzingPhoto}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Toggle: Salvar direto no diário após analisar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoSavePhotoMeal}
                          onChange={(e) => setAutoSavePhotoMeal(e.target.checked)}
                          disabled={isAnalyzingPhoto}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">
                            Salvar direto no diário após analisar
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {autoSavePhotoMeal
                              ? 'Ativado: grava imediatamente no Supabase e permite editar depois.'
                              : 'Desativado: preenche o formulário para você revisar antes de salvar.'}
                          </span>
                        </div>
                      </label>

                      <button
                        type="button"
                        onClick={handleAnalyzePhotoMeal}
                        disabled={isAnalyzingPhoto}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-xs hover:opacity-95 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isAnalyzingPhoto ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                            <span>Identificando Alimentos...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            <span>Analisar Prato com IA</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card de Resultado Recente da Foto Analisada (com Itens Detectados + Botão Rápido Editar) */}
            {lastPhotoResult && (
              <div className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-500/35 space-y-3 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                        {lastPhotoResult.savedLog
                          ? 'Refeição Salva Automaticamente no Diário'
                          : 'Alimentos Detectados pela IA'}
                      </span>
                      <h4 className="text-sm font-extrabold text-white">
                        {lastPhotoResult.analysis.meal_name}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {lastPhotoResult.savedLog && (
                      <button
                        type="button"
                        onClick={() => openEditMealModal(lastPhotoResult.savedLog!)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Editar / Ajustar Gramas
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLastPhotoResult(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                      title="Fechar resumo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Resumo de Macros Detectados */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {lastPhotoResult.analysis.calories} kcal
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    Proteínas: {lastPhotoResult.analysis.protein_g}g
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Carboidratos: {lastPhotoResult.analysis.carbs_g}g
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Gorduras: {lastPhotoResult.analysis.fat_g}g
                  </span>
                </div>

                {/* Lista de Itens Detectados no Prato */}
                {lastPhotoResult.analysis.items_detected &&
                  lastPhotoResult.analysis.items_detected.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {lastPhotoResult.analysis.items_detected.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-200 truncate">
                              {item.name}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              Porção est.: ~{item.estimated_grams}g
                            </span>
                          </div>
                          <span className="font-extrabold text-amber-400 shrink-0">
                            {item.calories} kcal
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                {lastPhotoResult.analysis.confidence_note && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                    <Info className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span>{lastPhotoResult.analysis.confidence_note}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Registro por Voz / Texto IA + Botão Manual */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                Ou Registre por Voz / Texto (IA) ou Manualmente
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
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-500/25 transition"
          >
            <Camera className="h-4 w-4" />
            Analisar Foto IA
          </button>
          <button
            onClick={openNewMealModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 hover:opacity-90 transition shadow-md shadow-cyan-500/20"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            + Refeição Manual
          </button>
        </div>
      )}

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
            <p className="text-sm font-medium">Nenhuma refeição registrada hoje. Adicione uma refeição acima ou utilize o assistente de IA.</p>
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
                  {/* LEVEL 1 HEADER: WEEKLY CONSOLIDATED TOTALS & SALDO SEMANAL */}
                  <button
                    onClick={() => toggleWeek(week.weekKey)}
                    className="w-full p-5 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-900/95 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left border-b border-slate-800/80 hover:bg-slate-800/30 transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded font-bold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Semana {week.weekNum}
                        </span>
                        <h4 className="font-extrabold text-white text-base md:text-lg">
                          Semana {week.weekNum} ({week.rangeStr})
                        </h4>
                      </div>

                      {/* Weekly Caloric Balance Highlight Card */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <div className={`px-3 py-1 rounded-xl border flex items-center gap-2 text-xs font-black shadow-md ${
                          week.weeklyBalance > 0
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-amber-500/10'
                            : week.weeklyBalance < 0
                            ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-cyan-500/10'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10'
                        }`}>
                          {week.weeklyBalance > 0 ? (
                            <Flame className="h-4 w-4 text-amber-400 animate-pulse" />
                          ) : week.weeklyBalance < 0 ? (
                            <TrendingDown className="h-4 w-4 text-cyan-400" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          )}
                          <span>Saldo Semanal: {week.weeklyBalanceFormatted} ({week.weeklyBalanceLabel})</span>
                        </div>

                        <span className="text-[11px] text-slate-400 italic">
                          • {week.weeklyEstimateStr}
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

                      {/* Macro % Badge & 3-Color Bar */}
                      <div className="flex flex-col items-end gap-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold">
                          <span className="text-purple-400">P: {week.avgProtein}g ({week.weekMacros.pPct}%)</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-cyan-400">C: {week.avgCarbs}g ({week.weekMacros.cPct}%)</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-amber-400">G: {week.avgFats}g ({week.weekMacros.fPct}%)</span>
                        </div>

                        <div className="w-28 h-1.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                          <div style={{ width: `${week.weekMacros.cPct}%` }} className="h-full bg-cyan-400 transition-all" title={`Carboidratos: ${week.weekMacros.cPct}%`} />
                          <div style={{ width: `${week.weekMacros.pPct}%` }} className="h-full bg-purple-500 transition-all" title={`Proteínas: ${week.weekMacros.pPct}%`} />
                          <div style={{ width: `${week.weekMacros.fPct}%` }} className="h-full bg-amber-400 transition-all" title={`Gorduras: ${week.weekMacros.fPct}%`} />
                        </div>
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

                        // Daily Caloric Balance Calculation
                        const dailyBalance = day.totalCalories - targetCal;
                        const dailyBalanceFormatted =
                          dailyBalance > 0
                            ? `+${dailyBalance.toLocaleString('pt-BR')} kcal`
                            : `${dailyBalance.toLocaleString('pt-BR')} kcal`;
                        const isDailySurplus = dailyBalance > 0;
                        const isDailyDeficit = dailyBalance < 0;
                        const isDailyNeutral = dailyBalance === 0;

                        const dailyBalanceLabel = isDailySurplus
                          ? 'Superávit Calórico'
                          : isDailyDeficit
                          ? 'Défice Calórico'
                          : 'Neutro / Em Manutenção';

                        const dailyBadgeClass = isDailySurplus
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : isDailyDeficit
                          ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

                        const dayName = day.dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                        const dateFormatted = day.dateObj.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        });

                        return (
                          <div
                            key={day.dateStr}
                            className="bg-slate-900/90 rounded-xl border border-slate-800/80 overflow-hidden transition"
                          >
                            {/* LEVEL 2 HEADER: DAILY CARD HEADER */}
                            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900">
                              <button
                                onClick={() => toggleDay(day.dateStr)}
                                className="flex-1 text-left space-y-1.5 hover:opacity-90 transition"
                              >
                                <div className="flex flex-wrap items-center gap-2.5">
                                  <h5 className="font-extrabold text-white text-sm capitalize">
                                    {dayName}, {dateFormatted}
                                  </h5>

                                  <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold border bg-slate-950/80 border-slate-800 text-slate-300">
                                    {day.totalCalories} / {targetCal} kcal
                                  </span>

                                  {/* DAILY CALORIC BALANCE BADGE */}
                                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-black border flex items-center gap-1.5 ${dailyBadgeClass}`}>
                                    {isDailySurplus ? (
                                      <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                                    ) : isDailyDeficit ? (
                                      <TrendingDown className="h-3.5 w-3.5 text-cyan-400" />
                                    ) : (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                    )}
                                    {dailyBalanceFormatted} ({dailyBalanceLabel})
                                  </span>
                                </div>

                                {/* Macros % & Water Summary with Mini Action Pill Buttons */}
                                {(() => {
                                  const dayMacros = calculateMacroPercentages(day.totalProtein, day.totalCarbs, day.totalFats);
                                  return (
                                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold pt-1">
                                      <span className="text-purple-400 font-bold">P: {day.totalProtein.toFixed(0)}g ({dayMacros.pPct}%)</span>
                                      <span className="text-slate-600">•</span>
                                      <span className="text-cyan-400 font-bold">C: {day.totalCarbs.toFixed(0)}g ({dayMacros.cPct}%)</span>
                                      <span className="text-slate-600">•</span>
                                      <span className="text-amber-400 font-bold">G: {day.totalFats.toFixed(0)}g ({dayMacros.fPct}%)</span>
                                      <span className="text-slate-600">•</span>
                                      <div className="w-16 h-1.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 self-center">
                                        <div style={{ width: `${dayMacros.cPct}%` }} className="h-full bg-cyan-400" />
                                        <div style={{ width: `${dayMacros.pPct}%` }} className="h-full bg-purple-500" />
                                        <div style={{ width: `${dayMacros.fPct}%` }} className="h-full bg-amber-400" />
                                      </div>
                                      <span className="text-slate-600">•</span>

                                      {/* Water Indicator & Mini Pill Action Buttons */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-cyan-300 font-bold flex items-center gap-1">
                                          <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                                          Água: {day.waterMl} ml
                                        </span>

                                        {/* Mini Pill Buttons */}
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSubtractWater(100, day.dateStr);
                                            }}
                                            disabled={waterAdding || day.waterMl <= 0}
                                            title={`Subtrair 100ml em ${day.dateStr}`}
                                            className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 text-[10px] font-bold transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-0.5"
                                          >
                                            <Minus className="h-2.5 w-2.5" />
                                            100ml
                                          </button>

                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAddWater(250, day.dateStr);
                                            }}
                                            disabled={waterAdding}
                                            title={`Adicionar 250ml em ${day.dateStr}`}
                                            className="px-2 py-0.5 rounded-full bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold transition active:scale-95 flex items-center gap-0.5"
                                          >
                                            <Plus className="h-2.5 w-2.5" />
                                            250ml
                                          </button>

                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAddWater(500, day.dateStr);
                                            }}
                                            disabled={waterAdding}
                                            title={`Adicionar 500ml em ${day.dateStr}`}
                                            className="px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-[10px] font-extrabold hover:opacity-90 transition active:scale-95 flex items-center gap-0.5 shadow-sm shadow-cyan-500/20"
                                          >
                                            <Plus className="h-2.5 w-2.5 stroke-[3]" />
                                            500ml
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </button>

                              <button
                                onClick={() => toggleDay(day.dateStr)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition self-end sm:self-center"
                              >
                                {isDayExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </div>

                            {/* LEVEL 3: DIRECT MEALS LIST INSIDE DAY (NO REDUNDANT CENTRAL CARDS) */}
                            {isDayExpanded && (
                              <div className="border-t border-slate-800/60 bg-slate-950/60 p-4 space-y-3">
                                  <div className="space-y-2">
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
              {modalDetectedItems.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                  <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                    Itens Detectados na Foto (Tabela TACO/IBGE):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {modalDetectedItems.map((it, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-200"
                      >
                        {it.name} (~{it.estimated_grams}g • {it.calories} kcal)
                      </span>
                    ))}
                  </div>
                </div>
              )}

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

export default function NutritionPage() {
  return (
    <Suspense fallback={<div className="h-64 rounded-2xl bg-slate-900/50 animate-pulse" />}>
      <NutritionPageContent />
    </Suspense>
  );
}
