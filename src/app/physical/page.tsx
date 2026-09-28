'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { OmniStore } from '@/lib/store';
import { BodyMetric, PhysiqueAssessment, MuscleScoreDetail } from '@/lib/types';
import {
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Scale,
  Camera,
  Plus,
  TrendingDown,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Sparkles,
  Brain,
  Dumbbell,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Activity,
  ChevronRight,
  Info,
  RefreshCw,
  Target,
  Award,
} from 'lucide-react';

const muscleLabels: Record<string, string> = {
  peito: 'Peito / Peitoral',
  ombros: 'Ombros / Deltoides',
  bracos: 'Braços & Antebraços',
  abdomen: 'Abdômen / Core',
  costas: 'Dorsais / Costas',
  quadriceps: 'Pernas / Quadríceps',
  panturrilhas: 'Panturrilhas',
};

const getScoreColor = (score: number | null) => {
  if (score === null || score === undefined) {
    return {
      barBg: 'bg-slate-800',
      badgeBg: 'bg-slate-800/80 text-slate-400 border-slate-700',
      textColor: 'text-slate-400',
      label: 'Não visível',
    };
  }
  if (score < 6.0) {
    return {
      barBg: 'bg-gradient-to-r from-red-600 to-red-500',
      badgeBg: 'bg-red-950/80 text-red-400 border-red-500/40',
      textColor: 'text-red-400',
      label: 'Atrasado (< 6.0)',
    };
  }
  if (score <= 7.5) {
    return {
      barBg: 'bg-gradient-to-r from-amber-500 to-yellow-400',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      textColor: 'text-amber-400',
      label: 'Moderado (6.0 - 7.5)',
    };
  }
  return {
    barBg: 'bg-gradient-to-r from-emerald-500 to-cyan-400',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    textColor: 'text-emerald-400',
    label: 'Excelente (> 7.5)',
  };
};

export default function PhysicalPage() {
  const [activeTab, setActiveTab] = useState<'ia-coach' | 'weight-history'>('ia-coach');
  
  // Weight metrics state
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [weightInput, setWeightInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isSubmittingWeight, setIsSubmittingWeight] = useState<boolean>(false);

  // AI Physique Assessment state
  const [assessments, setAssessments] = useState<PhysiqueAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<PhysiqueAssessment | null>(null);
  const [iaPhotoBase64, setIaPhotoBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = async () => {
    const weightData = await OmniStore.getBodyMetrics();
    setMetrics(weightData);

    const assessmentData = await OmniStore.getPhysiqueAssessments();
    setAssessments(assessmentData);
    if (assessmentData.length > 0 && !selectedAssessment) {
      setSelectedAssessment(assessmentData[0]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIaPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIaPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightInput || isSubmittingWeight) return;

    setIsSubmittingWeight(true);
    try {
      const weightVal = parseFloat(weightInput.replace(',', '.'));
      if (isNaN(weightVal)) {
        throw new Error('Peso inválido');
      }

      await OmniStore.addBodyMetric({
        weight_kg: weightVal,
        photo_url: photoBase64 || undefined,
        notes: notesInput.trim() || undefined,
      });

      setWeightInput('');
      setNotesInput('');
      setPhotoBase64(null);
      await loadData();
      setStatusMessage('Registro de peso corporal salvo!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Erro ao registrar peso. Verifique os dados.');
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsSubmittingWeight(false);
    }
  };

  const handleDeleteMetric = async (id: string) => {
    await OmniStore.deleteBodyMetric(id);
    await loadData();
    setStatusMessage('Registro de peso removido.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleRunIaAssessment = async () => {
    if (!iaPhotoBase64 || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch('/api/gemini/physique-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: iaPhotoBase64 }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao analisar a foto do físico');
      }

      const data = await res.json();

      const saved = await OmniStore.addPhysiqueAssessment({
        photo_url: iaPhotoBase64,
        assessment_date: new Date().toISOString().split('T')[0],
        overall_score: Number(data.overall_score),
        estimated_bf_percent: data.estimated_bf_percent,
        scores: data.scores,
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        detailed_critique: data.detailed_critique,
        training_adjustments: data.training_adjustments,
      });

      const updatedList = await OmniStore.getPhysiqueAssessments();
      setAssessments(updatedList);
      setSelectedAssessment(saved);
      setIaPhotoBase64(null);

      setStatusMessage('Avaliação de Físico gerada com sucesso pela IA Coach!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro na avaliação:', err);
      setAnalysisError(err.message || 'Ocorreu um erro ao processar a imagem.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    await OmniStore.deletePhysiqueAssessment(id);
    const updatedList = await OmniStore.getPhysiqueAssessments();
    setAssessments(updatedList);
    if (selectedAssessment?.id === id) {
      setSelectedAssessment(updatedList.length > 0 ? updatedList[0] : null);
    }
    setStatusMessage('Avaliação física excluída.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Recharts Chart Data for Weight
  const chartWeightData = useMemo(() => {
    return metrics.map((m) => ({
      date: new Date(m.logged_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      weight: Number(m.weight_kg),
    }));
  }, [metrics]);

  // Recharts Chart Data for Physique Overall Score Trend
  const chartScoreData = useMemo(() => {
    return [...assessments]
      .sort((a, b) => new Date(a.assessment_date).getTime() - new Date(b.assessment_date).getTime())
      .map((a) => ({
        date: new Date(a.assessment_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        score: Number(a.overall_score),
      }));
  }, [assessments]);

  const latestWeight = metrics[metrics.length - 1];
  const firstWeight = metrics[0];
  const diffWeight =
    latestWeight && firstWeight
      ? (latestWeight.weight_kg - firstWeight.weight_kg).toFixed(1)
      : '0';

  const weightPhotos = useMemo(() => {
    return metrics.filter((m) => Boolean(m.photo_url));
  }, [metrics]);

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto pb-12">
      {/* Header & Tab Switcher */}
      <div className="glass-panel p-6 border-slate-800 bg-gradient-to-r from-slate-900/90 via-cyan-950/40 to-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Brain className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Módulo de Físico & Visão Computacional
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Avaliação Fisiológica Honesta <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            IA Coach com Visão Computacional (Gemini Multimodal). Diagnóstico sincero, notas quantitativas por agrupamento muscular e plano de treino corretivo.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('ia-coach')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'ia-coach'
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Brain className="h-4 w-4" />
            <span>Avaliação de Físico (IA Coach)</span>
          </button>
          <button
            onClick={() => setActiveTab('weight-history')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'weight-history'
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Curva de Peso & Medidas</span>
          </button>
        </div>
      </div>

      {/* Global Status Toast */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-medium flex items-center gap-2 shadow-lg animate-bounce">
          <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* TAB 1: AVALIAÇÃO DE FÍSICO (IA COACH) */}
      {activeTab === 'ia-coach' && (
        <div className="space-y-8">
          {/* Section 1: Upload Card */}
          <div className="glass-card p-6 rounded-3xl border-slate-800/90 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-amber-500/10 text-amber-400 text-xs font-bold px-2 py-0.5">
                    Gemini 2.5 Multimodal
                  </span>
                  <span className="text-xs text-slate-400">• Sem Elogios Vazios</span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  Envie sua Foto para Avaliação Fisiológica Cruzada
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                  Nossa inteligência artificial analisa rigorosamente sua simetria, densidade muscular aparente, nitidez de corte e proporcionalidade de cada agrupamento (Peito, Ombros, Braços, Abdômen, Costas, Quadríceps e Panturrilhas).
                </p>
              </div>

              {/* Upload trigger button / area */}
              <div className="w-full md:w-80 flex flex-col items-center gap-4">
                <label className="w-full cursor-pointer bg-slate-900/90 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-5 text-center transition flex flex-col items-center justify-center gap-3 group">
                  {iaPhotoBase64 ? (
                    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden relative border border-cyan-500/50">
                      <img src={iaPhotoBase64} alt="Preview Físico" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <span className="text-xs font-semibold text-white bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700">
                          Trocar Imagem
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition duration-200">
                        <Camera className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">Tirar Foto ou Selecionar Arquivo</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Tire uma foto clara da pose frontal ou de costas</p>
                      </div>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIaPhotoUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleRunIaAssessment}
                  disabled={!iaPhotoBase64 || isAnalyzing}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500 bg-[length:200%_auto] text-slate-950 font-extrabold text-xs uppercase tracking-wider hover:opacity-95 transition shadow-lg shadow-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Analisando Físico com IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Analisar Físico com IA</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {analysisError && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}
          </div>

          {/* Section 2: Active / Selected Assessment Report */}
          {selectedAssessment ? (
            <div className="space-y-6">
              {/* Report Header Card */}
              <div className="glass-card p-6 rounded-3xl border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-cyan-950/30">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Photo & Date */}
                  <div className="flex items-center gap-5">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-slate-950 flex-shrink-0 shadow-lg shadow-cyan-950/50">
                      <img
                        src={selectedAssessment.photo_url}
                        alt="Foto Avaliada"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(selectedAssessment.assessment_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white tracking-tight">
                        Diagnóstico Biomecânico & Muscular
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Avaliação imparcial baseada em simetria, densidade e proporção corporal.
                      </p>
                    </div>
                  </div>

                  {/* Overall Score Badge + BF Percentage */}
                  <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 self-start lg:self-auto">
                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 via-emerald-400 to-amber-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center">
                          <span className="text-xl font-black text-white leading-none">
                            {selectedAssessment.overall_score.toFixed(1)}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold">/ 10</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Nota Geral de Físico
                      </span>
                      {selectedAssessment.estimated_bf_percent && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-500/30">
                          <Zap className="h-3.5 w-3.5 text-amber-400" />
                          <span>BF Estimado: {selectedAssessment.estimated_bf_percent}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Muscle Scores breakdown Grid */}
              <div className="glass-card p-6 rounded-3xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Dumbbell className="h-5 w-5 text-cyan-400" />
                      Avaliação Detalhada por Agrupamento Muscular
                    </h3>
                    <p className="text-xs text-slate-400">
                      Notas individuais de 0 a 10 com críticas biomecânicas personalizadas.
                    </p>
                  </div>
                  
                  {/* Color Legend */}
                  <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold">
                    <span className="flex items-center gap-1 text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> &lt; 6.0
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> 6.0 - 7.5
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> &gt; 7.5
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(selectedAssessment.scores || {}).map(([key, detail]) => {
                    if (!detail) return null;
                    const label = muscleLabels[key] || key.toUpperCase();
                    const style = getScoreColor(detail.nota);
                    const numericScore = detail.nota !== null ? detail.nota : 0;

                    return (
                      <div
                        key={key}
                        className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                            <span className="p-1 rounded bg-slate-800 text-cyan-400">
                              <Target className="h-3.5 w-3.5" />
                            </span>
                            {label}
                          </span>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${style.badgeBg}`}
                          >
                            {detail.nota !== null ? `${detail.nota.toFixed(1)} / 10` : 'N/V'}
                          </span>
                        </div>

                        {/* Score progress bar */}
                        {detail.nota !== null && (
                          <div className="space-y-1">
                            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden p-0.5 border border-slate-800">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${style.barBg}`}
                                style={{ width: `${Math.min(Math.max(numericScore * 10, 5), 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
                          &ldquo;{detail.critica}&rdquo;
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Contrast Cards: Strengths vs Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 🟢 Strengths */}
                <div className="glass-card p-6 rounded-3xl border-emerald-500/20 bg-gradient-to-br from-slate-900/90 via-emerald-950/10 to-slate-900/90 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-emerald-400">
                        Pontos Fortes Identificados
                      </h4>
                      <p className="text-[11px] text-slate-400">Estruturas anatômicas destacadas</p>
                    </div>
                  </div>

                  <ul className="space-y-2.5 pt-1">
                    {selectedAssessment.strengths && selectedAssessment.strengths.length > 0 ? (
                      selectedAssessment.strengths.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-xs text-slate-200 bg-slate-950/60 p-3 rounded-xl border border-emerald-500/20"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">Nenhum ponto forte registrado.</p>
                    )}
                  </ul>
                </div>

                {/* 🔴 Weaknesses */}
                <div className="glass-card p-6 rounded-3xl border-red-500/20 bg-gradient-to-br from-slate-900/90 via-red-950/10 to-slate-900/90 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                      <AlertTriangle className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-red-400">
                        Pontos Atrasados / A Melhorar
                      </h4>
                      <p className="text-[11px] text-slate-400">Desproporções e pontos fracos anatômicos</p>
                    </div>
                  </div>

                  <ul className="space-y-2.5 pt-1">
                    {selectedAssessment.weaknesses && selectedAssessment.weaknesses.length > 0 ? (
                      selectedAssessment.weaknesses.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-xs text-slate-200 bg-slate-950/60 p-3 rounded-xl border border-red-500/20"
                        >
                          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">Nenhum ponto a melhorar registrado.</p>
                    )}
                  </ul>
                </div>
              </div>

              {/* Detailed Technical Critique */}
              <div className="glass-card p-6 rounded-3xl border-slate-800 space-y-3">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-400" />
                  Crítica Técnica Detalhada & Sincera
                </h4>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                  {selectedAssessment.detailed_critique}
                </div>
              </div>

              {/* Training Adjustments Plan */}
              <div className="glass-card p-6 rounded-3xl border-cyan-500/30 bg-gradient-to-r from-slate-900/90 via-cyan-950/20 to-slate-900/90 space-y-3">
                <h4 className="text-base font-bold text-cyan-300 flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-cyan-400" />
                  Plano de Correção de Treino (Recomendações Biomecânicas)
                </h4>
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-cyan-500/30 text-xs text-slate-200 leading-relaxed">
                  {selectedAssessment.training_adjustments}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 rounded-3xl text-center space-y-3">
              <Camera className="h-12 w-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Nenhuma Avaliação de Físico Registrada</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Faça o upload de uma foto no painel acima para receber uma análise honesta e detalhada da IA Coach com notas por agrupamento muscular.
              </p>
            </div>
          )}

          {/* Section 3: History & Evolution Timeline */}
          {assessments.length > 0 && (
            <div className="glass-card p-6 rounded-3xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-amber-400" />
                    Histórico & Evolução Temporal das Notas
                  </h3>
                  <p className="text-xs text-slate-400">
                    Acompanhe o desenvolvimento da nota geral ao longo dos meses.
                  </p>
                </div>
              </div>

              {/* Line Chart of Score Trend */}
              {chartScoreData.length > 1 && (
                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReLineChart data={chartScoreData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} domain={[0, 10]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          color: '#f8fafc',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="Nota Geral"
                        stroke="#06b6d4"
                        strokeWidth={3}
                        dot={{ fill: '#06b6d4', r: 5 }}
                        activeDot={{ r: 8 }}
                      />
                    </ReLineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Evaluation Thumbnails List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {assessments.map((item) => {
                  const isSelected = selectedAssessment?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedAssessment(item)}
                      className={`glass-card p-4 rounded-2xl cursor-pointer transition flex items-center gap-4 ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/50'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-700">
                        <img
                          src={item.photo_url}
                          alt="Histórico"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white">
                            {new Date(item.assessment_date).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-xs font-black text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-500/30">
                            {item.overall_score.toFixed(1)}
                          </span>
                        </div>

                        {item.estimated_bf_percent && (
                          <p className="text-[10px] text-slate-400 mt-1 truncate">
                            BF: {item.estimated_bf_percent}
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1 hover:underline">
                            Ver Análise <ChevronRight className="h-3 w-3" />
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAssessment(item.id);
                            }}
                            className="text-slate-500 hover:text-red-400 p-1 transition"
                            title="Excluir avaliação"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CURVA DE PESO & MEDIDAS */}
      {activeTab === 'weight-history' && (
        <div className="space-y-8">
          {/* Grid: Logging Form + Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <form onSubmit={handleAddMetric} className="lg:col-span-2 glass-card p-6 rounded-3xl space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-cyan-400" />
                Registrar Peso Corporall do Dia
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">Peso Corporal (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 79.5"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    required
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">Observações / Medidas</label>
                  <input
                    type="text"
                    placeholder="Ex: Cintura 82cm, medido em jejum..."
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Photo Uploader */}
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                  Foto de Evolução (Opcional - Arquivo do Registro)
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 cursor-pointer bg-slate-900 border border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-3 text-center transition flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-cyan-400">
                    <Camera className="h-4 w-4" />
                    <span>{photoBase64 ? 'Foto selecionada (Clique para alterar)' : 'Selecionar Foto da Galeria / Câmera'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {photoBase64 && (
                    <div className="h-12 w-12 rounded-xl overflow-hidden border border-cyan-500/50 relative flex-shrink-0">
                      <img src={photoBase64} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingWeight || !weightInput}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs hover:opacity-90 transition shadow-lg shadow-cyan-500/20 disabled:opacity-40"
              >
                {isSubmittingWeight ? 'Salvando...' : 'Salvar Registro de Peso'}
              </button>
            </form>

            {/* Quick Weight Overview */}
            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Último Peso Registrado
                </span>
                <div className="my-3">
                  <span className="text-4xl font-black text-white">
                    {latestWeight ? latestWeight.weight_kg : '-'} <span className="text-sm font-normal text-slate-400">kg</span>
                  </span>
                  <p className="text-xs text-slate-400 mt-1">Atualização mais recente</p>
                </div>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Variação Total Acumulada:</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <TrendingDown className="h-3.5 w-3.5" />
                    {diffWeight} kg
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Calculado com base em todo o histórico de peso corporal.
                </p>
              </div>
            </div>
          </div>

          {/* Temporal Line Chart for Weight */}
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-400" />
                Curva de Peso Corporal Temporal
              </h3>
              <p className="text-xs text-slate-400">Variação em quilogramas (kg) ao longo dos dias</p>
            </div>

            {chartWeightData.length > 0 ? (
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ReLineChart data={chartWeightData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} unit="kg" domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      name="Peso (kg)"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 5 }}
                      activeDot={{ r: 8 }}
                    />
                  </ReLineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">Nenhum dado de peso registrado.</p>
            )}
          </div>

          {/* Photo Evolution Gallery */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-200 text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-cyan-400" />
              Galeria de Registros Fotográficos
            </h3>

            {weightPhotos.length === 0 ? (
              <div className="glass-card p-8 rounded-3xl text-center text-slate-500 space-y-2">
                <Camera className="h-10 w-10 mx-auto text-slate-600 opacity-50" />
                <p className="text-sm font-medium">Nenhuma foto anexada ao peso ainda.</p>
                <p className="text-xs">Anexe fotos nos registros diários de peso para galeria visual.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {weightPhotos.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card rounded-2xl overflow-hidden group hover:border-cyan-500/50 transition flex flex-col"
                  >
                    <div className="aspect-square w-full overflow-hidden bg-slate-950 relative">
                      <img
                        src={item.photo_url}
                        alt="Evolução"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-3 flex items-start justify-between">
                        <span className="text-[10px] text-white font-bold bg-slate-900/80 px-2 py-0.5 rounded">{item.weight_kg} kg</span>
                        <button
                          onClick={() => handleDeleteMetric(item.id)}
                          className="p-1.5 rounded-lg bg-red-950/80 text-red-400 hover:text-white transition border border-red-500/30"
                          title="Excluir foto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-semibold text-white">{item.weight_kg} kg</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(item.logged_at).toLocaleDateString('pt-BR')}
                        </p>
                        {item.notes && <p className="text-[10px] text-slate-400 truncate mt-1">{item.notes}</p>}
                      </div>
                      <button
                        onClick={() => handleDeleteMetric(item.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition"
                        title="Excluir registro"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
