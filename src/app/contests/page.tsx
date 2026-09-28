'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  GraduationCap,
  Timer,
  CheckCircle2,
  Dumbbell,
  Brain,
  Sparkles,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Target,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Flame,
  HelpCircle,
  Zap,
  Check,
  X,
  Send,
  RefreshCw,
  FileText,
  Upload,
  Calendar,
  Building2,
  DollarSign,
  Award,
  Trash2,
  Tag,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Contest,
  ContestSubject,
  StudySession,
  ContestTafRequirement,
  GeminiStudyResponse,
  GeminiParseEditalResponse,
} from '@/lib/types';
import { OmniStore } from '@/lib/store';

export default function ContestsPage() {
  const [activeNavTab, setActiveNavTab] = useState<'edital' | 'pomodoro' | 'taf' | 'gemini'>('edital');

  // Multi-Contest Data States
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string>('');
  const [subjects, setSubjects] = useState<ContestSubject[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [tafRequirements, setTafRequirements] = useState<ContestTafRequirement[]>([]);

  // Modals & Form States
  const [showNewContestModal, setShowNewContestModal] = useState<boolean>(false);
  const [showImportEditalModal, setShowImportEditalModal] = useState<boolean>(false);
  const [showLogSessionModal, setShowLogSessionModal] = useState<boolean>(false);
  const [showAddTafModal, setShowAddTafModal] = useState<boolean>(false);

  // Manual Contest Creation Form
  const [newContestTitle, setNewContestTitle] = useState<string>('');
  const [newContestInstitution, setNewContestInstitution] = useState<string>('Cebraspe');
  const [newContestDate, setNewContestDate] = useState<string>('2026-11-29');
  const [newContestColor, setNewContestColor] = useState<string>('#3b82f6');

  // Edital Import Form (PDF / Raw Text)
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRawText, setImportRawText] = useState<string>('');
  const [importTargetRoles, setImportTargetRoles] = useState<string>('Agente de Polícia');
  const [isParsingEdital, setIsParsingEdital] = useState<boolean>(false);
  const [parsedSummary, setParsedSummary] = useState<GeminiParseEditalResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Edital Subjects / Topics Form
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [newSubjectInput, setNewSubjectInput] = useState<string>('');
  const [newTopicInput, setNewTopicInput] = useState<string>('');

  // Pomodoro Timer States
  const [pomodoroMinutes, setPomodoroMinutes] = useState<number>(25);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Session Log Modal Form
  const [sessionSubjectName, setSessionSubjectName] = useState<string>('');
  const [sessionQuestionsSolved, setSessionQuestionsSolved] = useState<number>(15);
  const [sessionQuestionsCorrect, setSessionQuestionsCorrect] = useState<number>(12);
  const [sessionNotes, setSessionNotes] = useState<string>('');

  // TAF Requirement Form State
  const [tafModalityInput, setTafModalityInput] = useState<string>('Barra Fixa');
  const [tafTargetValInput, setTafTargetValInput] = useState<number>(5);
  const [tafUnitInput, setTafUnitInput] = useState<string>('reps');
  const [tafCurrentBestInput, setTafCurrentBestInput] = useState<number>(6);

  // Gemini AI Study Assistant States
  const [aiMode, setAiMode] = useState<'doubt' | 'mnemonic' | 'question'>('mnemonic');
  const [aiInputText, setAiInputText] = useState<string>('');
  const [selectedAiTopic, setSelectedAiTopic] = useState<string>('Direito Constitucional');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<GeminiStudyResponse | null>(null);
  const [userSelectedOption, setUserSelectedOption] = useState<number | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load All Multi-Contest Data
  const loadAllData = async () => {
    const loadedContests = await OmniStore.getContests();
    setContests(loadedContests);

    let activeId = selectedContestId;
    if (!activeId || !loadedContests.some((c) => c.id === activeId)) {
      const activeContest = loadedContests.find((c) => c.is_active) || loadedContests[0];
      activeId = activeContest ? activeContest.id : '';
      setSelectedContestId(activeId);
    }

    if (activeId) {
      const loadedSubjects = await OmniStore.getContestSubjects(activeId);
      const loadedSessions = await OmniStore.getStudySessions(activeId);
      const loadedTafReqs = await OmniStore.getContestTafRequirements(activeId);

      setSubjects(loadedSubjects);
      setStudySessions(loadedSessions);
      setTafRequirements(loadedTafReqs);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedContestId]);

  // Handle Changing Active Contest
  const handleSelectContest = async (id: string) => {
    setSelectedContestId(id);
    await OmniStore.setActiveContest(id);
    await loadAllData();
  };

  // Pomodoro Timer Effect
  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setShowLogSessionModal(true);
      playTimerSound();
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const playTimerSound = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {}
  };

  const startPomodoro = (minutes: number) => {
    setPomodoroMinutes(minutes);
    setTimeLeft(minutes * 60);
    setIsRunning(true);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(pomodoroMinutes * 60);
  };

  // Add Manual Contest
  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContestTitle) return;

    const created = await OmniStore.addContest({
      title: newContestTitle,
      institution: newContestInstitution || 'Cebraspe',
      target_date: newContestDate || '2026-11-29',
      color_tag: newContestColor || '#3b82f6',
      is_active: true,
    });

    setNewContestTitle('');
    setShowNewContestModal(false);
    setSelectedContestId(created.id);
    await loadAllData();
    setStatusMessage(`Concurso "${created.title}" criado e definido como foco ativo!`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Delete Contest
  const handleDeleteContest = async (id: string, title: string) => {
    if (!confirm(`Deseja excluir o concurso "${title}" e todas as suas matérias/métricas?`)) return;
    await OmniStore.deleteContest(id);
    setSelectedContestId('');
    await loadAllData();
    setStatusMessage('Concurso removido.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // AI Edital Parser Handler
  const handleRunParseEdital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile && !importRawText) return;

    setIsParsingEdital(true);
    setImportError(null);
    setParsedSummary(null);

    try {
      const formData = new FormData();
      formData.append('target_roles', importTargetRoles || 'Cargos do Edital');

      if (importFile) {
        formData.append('file', importFile);
      }
      if (importRawText) {
        formData.append('raw_text', importRawText);
      }

      const res = await fetch('/api/gemini/parse-contest-doc', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao processar arquivo do edital');
      }

      const data: GeminiParseEditalResponse = await res.json();
      setParsedSummary(data);

      // Auto Import into Store
      const result = await OmniStore.importContestFromGemini(data);
      setSelectedContestId(result.contest.id);
      await loadAllData();

      setStatusMessage(`Edital "${data.contest_title}" importado com sucesso! (${result.subjectsCount} tópicos e ${result.tafCount} exigências de TAF criados).`);
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || 'Erro ao importar edital via Gemini IA.');
    } finally {
      setIsParsingEdital(false);
    }
  };

  // Toggle Topic Completion
  const handleToggleTopic = async (subjectId: string) => {
    await OmniStore.toggleContestSubject(subjectId);
    await loadAllData();
  };

  // Delete Topic
  const handleDeleteTopic = async (subjectId: string) => {
    await OmniStore.deleteContestSubject(subjectId);
    await loadAllData();
  };

  // Add Custom Topic
  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicInput || !newSubjectInput || !selectedContestId) return;

    await OmniStore.addContestSubject({
      contest_id: selectedContestId,
      subject_name: newSubjectInput,
      topic_name: newTopicInput,
    });

    setNewTopicInput('');
    await loadAllData();
  };

  // Save Pomodoro / Study Session
  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContestId) return;

    await OmniStore.addStudySession({
      contest_id: selectedContestId,
      subject_name: sessionSubjectName || 'Geral',
      minutes_studied: pomodoroMinutes,
      questions_solved: Number(sessionQuestionsSolved),
      questions_correct: Number(sessionQuestionsCorrect),
      notes: sessionNotes,
    });

    setShowLogSessionModal(false);
    await loadAllData();
    setStatusMessage('Sessão de estudo registrada!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Add / Update TAF Requirement
  const handleSaveTafReq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContestId) return;

    const targetVal = Number(tafTargetValInput);
    const bestVal = Number(tafCurrentBestInput);

    const existing = tafRequirements.find((r) => r.modality.toLowerCase() === tafModalityInput.toLowerCase());
    if (existing) {
      await OmniStore.updateContestTafRequirement(existing.id, {
        target_value: targetVal,
        unit: tafUnitInput,
        current_best: bestVal,
      });
    } else {
      await OmniStore.addContestTafRequirement({
        contest_id: selectedContestId,
        modality: tafModalityInput,
        target_value: targetVal,
        unit: tafUnitInput,
        current_best: bestVal,
      });
    }

    setShowAddTafModal(false);
    await loadAllData();
    setStatusMessage('Índice de TAF atualizado!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Ask Gemini AI Assistant
  const handleAskGemini = async (overrideMode?: 'doubt' | 'mnemonic' | 'question') => {
    setAiLoading(true);
    setUserSelectedOption(null);
    const targetMode = overrideMode || aiMode;

    try {
      const res = await fetch('/api/gemini/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: targetMode,
          topic: selectedAiTopic,
          text: aiInputText || `Solicitação sobre ${selectedAiTopic}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na requisição');
      setAiResponse(data);
    } catch (err: any) {
      alert('Erro ao consultar Tutor Gemini: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Active Contest Object
  const currentContest = useMemo(() => {
    return contests.find((c) => c.id === selectedContestId) || contests[0];
  }, [contests, selectedContestId]);

  // Calculated Metrics for Current Contest
  const totalTopics = subjects.length;
  const completedTopics = subjects.filter((s) => s.is_completed).length;
  const editalProgressPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // Group Subjects by subject_name
  const groupedSubjects = useMemo(() => {
    return subjects.reduce((acc, curr) => {
      const key = curr.subject_name || 'Geral';
      if (!acc[key]) acc[key] = [];
      acc[key].push(curr);
      return acc;
    }, {} as Record<string, ContestSubject[]>);
  }, [subjects]);

  // Questions Metrics for Current Contest
  const totalQuestionsSolved = studySessions.reduce((acc, s) => acc + (s.questions_solved || 0), 0);
  const totalQuestionsCorrect = studySessions.reduce((acc, s) => acc + (s.questions_correct || 0), 0);
  const totalQuestionsIncorrect = Math.max(0, totalQuestionsSolved - totalQuestionsCorrect);
  const overallAccuracyPct = totalQuestionsSolved > 0 ? Math.round((totalQuestionsCorrect / totalQuestionsSolved) * 100) : 0;

  const questionsPieData = [
    { name: 'Acertos', value: totalQuestionsCorrect || 1, color: '#10b981' },
    { name: 'Erros', value: totalQuestionsIncorrect || 0, color: '#ef4444' },
  ];

  // TAF Pass Status for Current Contest
  const isTafPassed = tafRequirements.length > 0 && tafRequirements.every((r) => r.is_passed);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
        {/* Top Contest Selection Bar */}
        <div className="glass-panel p-6 border-slate-800 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider mb-2">
                <GraduationCap className="h-4 w-4 text-cyan-400" />
                Módulo Multi-Concursos Alvo
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Gestão Isolada de Editais & TAF
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Alterne entre seus concursos foco, gerencie matérias verticalizadas e importe editais em PDF com Gemini IA.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowImportEditalModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-extrabold text-xs flex items-center gap-2 hover:brightness-110 transition shadow-lg shadow-cyan-500/20"
              >
                <Sparkles className="h-4 w-4" />
                Importar Edital via IA (PDF)
              </button>

              <button
                onClick={() => setShowNewContestModal(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-2 transition"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                Novo Concurso
              </button>
            </div>
          </div>

          {/* Horizontal Contest Selector Cards */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {contests.map((contest) => {
              const isSelected = currentContest?.id === contest.id;

              return (
                <div
                  key={contest.id}
                  onClick={() => handleSelectContest(contest.id)}
                  className={`flex-shrink-0 p-4 rounded-2xl border cursor-pointer transition-all duration-200 min-w-[240px] max-w-[280px] flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                      : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1 shadow-sm"
                      style={{ backgroundColor: contest.color_tag || '#3b82f6' }}
                    />
                    <div className="flex items-center gap-1.5">
                      {contest.institution && (
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {contest.institution}
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                          ATIVO
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-white truncate">{contest.title}</h3>
                    {contest.target_date && (
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-cyan-400" />
                        Prova: {new Date(contest.target_date).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>

                  {contests.length > 1 && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContest(contest.id, contest.title);
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 transition"
                        title="Excluir Concurso"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Status Message */}
        {statusMessage && (
          <div className="p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-medium flex items-center gap-2 shadow-lg animate-bounce">
            <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Active Contest Card Banner */}
        {currentContest && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 md:p-8 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currentContest.color_tag || '#3b82f6' }}
                  />
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Concurso em Foco Selecionado
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                  {currentContest.title}
                  {currentContest.institution && (
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                      Banca: {currentContest.institution}
                    </span>
                  )}
                </h2>
                <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
                  {currentContest.target_date
                    ? `Data prevista da prova: ${new Date(currentContest.target_date).toLocaleDateString('pt-BR')}`
                    : 'Edital verticalizado ativo'}
                </p>
              </div>

              {/* Quick Summary Pill */}
              <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-4 rounded-2xl">
                <div className="text-center px-2">
                  <div className="text-2xl font-black text-cyan-400">{editalProgressPct}%</div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Edital Cumprido</div>
                </div>
                <div className="h-8 w-[1px] bg-slate-800" />
                <div className="text-center px-2">
                  <div className="text-2xl font-black text-emerald-400">{overallAccuracyPct}%</div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Taxa de Acertos</div>
                </div>
                <div className="h-8 w-[1px] bg-slate-800" />
                <div className="text-center px-2">
                  {isTafPassed ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-extrabold border border-emerald-500/30">
                      APROVADO TAF 🎉
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-extrabold border border-amber-500/30">
                      EM EVOLUÇÃO ⚠️
                    </span>
                  )}
                  <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Status TAF</div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs inside Contest */}
            <div className="flex items-center gap-2 mt-8 pt-6 border-t border-slate-800/80 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveNavTab('edital')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeNavTab === 'edital'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Edital Verticalizado ({editalProgressPct}%)
              </button>

              <button
                onClick={() => setActiveNavTab('pomodoro')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeNavTab === 'pomodoro'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Timer className="h-4 w-4" />
                Ciclo Pomodoro & Questões
              </button>

              <button
                onClick={() => setActiveNavTab('taf')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeNavTab === 'taf'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Dumbbell className="h-4 w-4" />
                Índices TAF ({tafRequirements.length})
              </button>

              <button
                onClick={() => setActiveNavTab('gemini')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeNavTab === 'gemini'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Brain className="h-4 w-4 text-cyan-300 animate-pulse" />
                Tutor Gemini IA
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: EDITAL VERTICALIZADO */}
        {activeNavTab === 'edital' && (
          <div className="space-y-6">
            {/* Overall Progress Bar */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-cyan-400" />
                  <span className="text-sm font-bold text-white">Progresso Geral do Edital Verticalizado</span>
                </div>
                <span className="text-sm font-black text-cyan-400">
                  {completedTopics} de {totalTopics} tópicos ({editalProgressPct}%)
                </span>
              </div>
              <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden p-1 border border-slate-700/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 transition-all duration-700 shadow-lg shadow-cyan-500/30"
                  style={{ width: `${editalProgressPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                Cada tópico concluído garante <span className="text-cyan-300 font-bold">+120 XP</span> no motor de gamificação global!
              </p>
            </div>

            {/* Add Custom Topic Form */}
            <form onSubmit={handleAddTopic} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nome da Matéria (ex: Direito Administrativo)"
                  value={newSubjectInput}
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 flex-1"
                />
                <input
                  type="text"
                  required
                  placeholder="Nome do Tópico (ex: Atos Administrativos)"
                  value={newTopicInput}
                  onChange={(e) => setNewTopicInput(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 flex-1"
                />
              </div>
              <button
                type="submit"
                className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-500/20"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                Adicionar Tópico
              </button>
            </form>

            {/* Subjects Accordion List */}
            <div className="space-y-4">
              {Object.keys(groupedSubjects).length === 0 ? (
                <div className="text-center py-12 p-6 rounded-3xl bg-slate-900/30 border border-slate-800 space-y-3">
                  <BookOpen className="h-10 w-10 text-slate-600 mx-auto" />
                  <p className="text-slate-400 text-sm">Nenhum tópico cadastrado para este edital ainda.</p>
                  <p className="text-xs text-slate-500">
                    Use o botão &quot;Importar Edital via IA (PDF)&quot; acima para extrair a grade inteira automaticamente!
                  </p>
                </div>
              ) : (
                Object.entries(groupedSubjects).map(([subjectName, items]) => {
                  const subjectDone = items.filter((i) => i.is_completed).length;
                  const subjectTotal = items.length;
                  const subjectPct = Math.round((subjectDone / subjectTotal) * 100);
                  const isOpen = openSubject === subjectName || openSubject === null;

                  return (
                    <div key={subjectName} className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden transition-all">
                      {/* Accordion Header */}
                      <button
                        onClick={() => setOpenSubject(openSubject === subjectName ? null : subjectName)}
                        className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-slate-800/40 transition text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-bold text-cyan-400 text-sm">
                            {subjectDone}/{subjectTotal}
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-white">{subjectName}</h3>
                            <p className="text-xs text-slate-400">
                              {subjectDone} de {subjectTotal} tópicos estudados ({subjectPct}%)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="hidden sm:block w-32 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${subjectPct}%` }} />
                          </div>
                          {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                        </div>
                      </button>

                      {/* Accordion Content */}
                      {isOpen && (
                        <div className="p-4 md:p-5 pt-0 space-y-2 border-t border-slate-800/60">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => handleToggleTopic(item.id)}
                              className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all group ${
                                item.is_completed
                                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`h-6 w-6 rounded-lg border flex items-center justify-center transition ${
                                    item.is_completed
                                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                      : 'border-slate-700 group-hover:border-cyan-400'
                                  }`}
                                >
                                  {item.is_completed && <Check className="h-4 w-4 stroke-[3]" />}
                                </div>
                                <span className={`text-sm font-medium ${item.is_completed ? 'line-through text-slate-400' : 'text-white'}`}>
                                  {item.topic_name}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                                  {item.reviews_count || 0} revisões
                                </span>
                                {item.is_completed && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                                    +120 XP
                                  </span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTopic(item.id);
                                  }}
                                  className="text-slate-600 hover:text-red-400 p-1 transition opacity-0 group-hover:opacity-100"
                                  title="Excluir tópico"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: POMODORO TIMER & QUESTÕES */}
        {activeNavTab === 'pomodoro' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Pomodoro Ring & Controls */}
            <div className="lg:col-span-1 p-6 md:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center text-center shadow-xl">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Timer className="h-5 w-5 text-cyan-400" />
                Ciclo Pomodoro de Foco
              </h3>
              <p className="text-xs text-slate-400 mb-6">Mantenha foco total durante o bloco de estudos</p>

              {/* Presets */}
              <div className="flex gap-2 mb-8">
                <button
                  onClick={() => startPomodoro(25)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                    pomodoroMinutes === 25
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  25 Minutos
                </button>
                <button
                  onClick={() => startPomodoro(50)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                    pomodoroMinutes === 50
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  50 Minutos (Avançado)
                </button>
              </div>

              {/* Big Timer Countdown Ring */}
              <div className="relative w-56 h-56 flex items-center justify-center mb-8">
                <div className="absolute inset-0 rounded-full border-8 border-slate-800" />
                <div
                  className="absolute inset-0 rounded-full border-8 border-cyan-500 border-t-transparent animate-spin-slow opacity-80"
                  style={{ animationDuration: isRunning ? '10s' : '0s' }}
                />
                <div className="relative z-10 text-center">
                  <div className="text-4xl font-black text-white font-mono tracking-tight">
                    {Math.floor(timeLeft / 60)
                      .toString()
                      .padStart(2, '0')}
                    :
                    {(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-1">
                    {isRunning ? 'EM FOCO TOTAL 🔥' : 'PAUSADO'}
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex gap-3 w-full max-w-xs">
                {isRunning ? (
                  <button
                    onClick={() => setIsRunning(false)}
                    className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Pause className="h-4 w-4 fill-slate-950" />
                    Pausar
                  </button>
                ) : (
                  <button
                    onClick={() => setIsRunning(true)}
                    className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-500/20"
                  >
                    <Play className="h-4 w-4 fill-slate-950" />
                    Iniciar Foco
                  </button>
                )}
                <button
                  onClick={resetTimer}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Reiniciar Timer"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => setShowLogSessionModal(true)}
                className="mt-4 text-xs text-cyan-400 hover:underline font-semibold"
              >
                + Registrar Sessão & Questões Manuais
              </button>
            </div>

            {/* Right Column: Analytics & Recent Sessions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Analytics Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Target className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white">{totalQuestionsSolved}</div>
                    <div className="text-xs text-slate-400 font-medium">Questões Resolvidas</div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-cyan-400">{overallAccuracyPct}%</div>
                    <div className="text-xs text-slate-400 font-medium">Taxa de Acertos no Concurso</div>
                  </div>
                </div>
              </div>

              {/* Recharts Pie Chart Accuracy */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                  Desempenho de Aproveitamento em Questões ({currentContest?.title})
                </h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={questionsPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {questionsPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Sessions List */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-4">Sessões de Estudo Registradas</h4>
                <div className="space-y-3">
                  {studySessions.length === 0 ? (
                    <p className="text-xs text-slate-500">Nenhuma sessão registrada para este concurso ainda.</p>
                  ) : (
                    studySessions.map((session) => {
                      const acc = session.questions_solved > 0 ? Math.round((session.questions_correct / session.questions_solved) * 100) : 0;
                      return (
                        <div key={session.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-white">{session.subject_name || 'Geral'}</span>
                            <div className="text-xs text-slate-400">
                              {session.minutes_studied} min estudados • {session.questions_solved} questões ({session.questions_correct} certas)
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${acc >= 80 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                            {acc}% Aproveitamento
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MÓDULO TAF (TESTE DE APTIDÃO FÍSICA) */}
        {activeNavTab === 'taf' && (
          <div className="space-y-6">
            {/* TAF Status Banner */}
            <div className={`p-6 md:p-8 rounded-3xl border ${isTafPassed ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-amber-950/30 border-amber-500/40'} flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl`}>
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-2xl ${isTafPassed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                  {isTafPassed ? '🏆' : '⚠️'}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    {isTafPassed ? 'STATUS: APROVADO NO TAF DO EDITAL! 🎉' : 'STATUS: EXIGÊNCIAS DE TAF EM EVOLUÇÃO ⚠️'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    {isTafPassed
                      ? 'Parabéns! Seus índices físicos atingem ou superam as marcas mínimas exigidas pelo edital deste concurso.'
                      : 'Monitore e registre seus simulados físicos para cobrir a meta exigida no edital.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddTafModal(true)}
                className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition whitespace-nowrap"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                Registrar/Atualizar Exigência TAF
              </button>
            </div>

            {/* Modalities Grid Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tafRequirements.length === 0 ? (
                <div className="lg:col-span-3 text-center py-12 p-6 rounded-3xl bg-slate-900/30 border border-slate-800 space-y-2">
                  <Dumbbell className="h-10 w-10 text-slate-600 mx-auto" />
                  <p className="text-slate-400 text-sm">Nenhuma exigência TAF cadastrada para este concurso.</p>
                  <p className="text-xs text-slate-500">Clique no botão acima ou importe o edital em PDF para criar os índices automaticamente!</p>
                </div>
              ) : (
                tafRequirements.map((req) => (
                  <div key={req.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{req.modality}</span>
                        <div className="text-2xl font-black text-white mt-1">
                          {req.current_best} <span className="text-xs font-medium text-slate-400">{req.unit}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${req.is_passed ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                        {req.is_passed ? 'Aprovado' : 'Abaixo da Meta'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Meta do Edital:</span>
                        <span className="font-bold text-white">{req.target_value} {req.unit}</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${req.is_passed ? 'bg-emerald-400' : 'bg-amber-400'}`}
                          style={{ width: `${Math.min(100, Math.round(((req.current_best || 0) / (req.target_value || 1)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: TUTOR GEMINI IA */}
        {activeNavTab === 'gemini' && (
          <div className="space-y-6">
            <div className="p-6 md:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Tutor Inteligente de Concursos ({currentContest?.title})</h3>
                  <p className="text-xs text-slate-400">Tire dúvidas teóricas, gere resumos mnemônicos ou simule questões inéditas</p>
                </div>
              </div>

              {/* Mode Selectors */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setAiMode('doubt')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
                    aiMode === 'doubt'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <HelpCircle className="h-4 w-4" />
                  Dúvida Teórica
                </button>

                <button
                  onClick={() => setAiMode('mnemonic')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
                    aiMode === 'mnemonic'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  Resumo Mnemônico
                </button>

                <button
                  onClick={() => setAiMode('question')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
                    aiMode === 'question'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Target className="h-4 w-4" />
                  Questão Inédita Simulada
                </button>
              </div>

              {/* Topic Select & Input Text */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedAiTopic}
                    onChange={(e) => setSelectedAiTopic(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 sm:w-64"
                  >
                    {Object.keys(groupedSubjects).length > 0 ? (
                      Object.keys(groupedSubjects).map((sName) => (
                        <option key={sName} value={sName}>
                          {sName}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Direito Constitucional">Direito Constitucional</option>
                        <option value="Direito Administrativo">Direito Administrativo</option>
                        <option value="Língua Portuguesa">Língua Portuguesa</option>
                        <option value="Informática & TI">Informática & TI</option>
                      </>
                    )}
                  </select>

                  <input
                    type="text"
                    placeholder="Descreva sua dúvida ou solicitação (ex: Diferença entre anulação e revogação)"
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  onClick={() => handleAskGemini()}
                  disabled={aiLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Sintetizando Conhecimento via IA...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Consultar Tutor Gemini
                    </>
                  )}
                </button>
              </div>

              {/* AI Response Card */}
              {aiResponse && (
                <div className="mt-6 p-6 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-base font-bold text-cyan-300 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-cyan-400" />
                      {aiResponse.title}
                    </h4>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 font-bold uppercase border border-cyan-500/20">
                      {aiResponse.mode}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{aiResponse.explanation}</p>

                  {/* Mnemonic Banner */}
                  {aiResponse.mnemonic && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                      💡 MNEMÔNICO: {aiResponse.mnemonic}
                    </div>
                  )}

                  {/* Simulated Interactive Question */}
                  {aiResponse.question && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <p className="text-xs font-bold text-white leading-relaxed">{aiResponse.question.statement}</p>
                      <div className="space-y-2">
                        {aiResponse.question.options.map((opt: string, idx: number) => {
                          const isSelected = userSelectedOption === idx;
                          const isCorrect = idx === aiResponse.question?.correctIndex;
                          let btnStyle = 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700';

                          if (userSelectedOption !== null) {
                            if (isCorrect) btnStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold';
                            else if (isSelected) btnStyle = 'bg-rose-950/60 border-rose-500 text-rose-300';
                          }

                          return (
                            <button
                              key={idx}
                              onClick={() => setUserSelectedOption(idx)}
                              className={`w-full text-left p-3 rounded-xl border text-xs transition ${btnStyle}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {userSelectedOption !== null && (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed mt-2">
                          <span className="font-bold text-cyan-400">Gabarito Comentado: </span>
                          {aiResponse.question.explanation}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Key Takeaways */}
                  {aiResponse.keyTakeaways && aiResponse.keyTakeaways.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Pontos-Chave para a Prova:</span>
                      <ul className="space-y-1.5">
                        {aiResponse.keyTakeaways.map((point: string, idx: number) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 1: EDITAL INTELLIGENT PARSER WITH GEMINI */}
        {showImportEditalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Leitor Inteligente de Edital (Gemini IA)</h3>
                    <p className="text-xs text-slate-400">Upload de PDF ou texto bruto para extração de matérias e TAF</p>
                  </div>
                </div>
                <button onClick={() => setShowImportEditalModal(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRunParseEdital} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">Cargo(s) Pretendido(s)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Agente de Polícia e Escrivão"
                    value={importTargetRoles}
                    onChange={(e) => setImportTargetRoles(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* File Dropzone */}
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">Arquivo PDF do Edital</label>
                  <label className="w-full cursor-pointer bg-slate-950 border-2 border-dashed border-slate-800 hover:border-cyan-500 rounded-2xl p-6 text-center transition flex flex-col items-center justify-center gap-2 group">
                    <Upload className="h-8 w-8 text-cyan-400 group-hover:scale-110 transition duration-200" />
                    {importFile ? (
                      <div>
                        <p className="text-sm font-bold text-cyan-300">{importFile.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{(importFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-200">Clique para selecionar o PDF do Edital</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Processado via Gemini Vision Multimodal (application/pdf)</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Raw Text Fallback */}
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                    OU Cole o Texto Bruto do Conteúdo Programático
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Cole aqui a parte de conhecimentos do edital..."
                    value={importRawText}
                    onChange={(e) => setImportRawText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isParsingEdital || (!importFile && !importRawText)}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-cyan-500 text-white font-extrabold text-xs uppercase tracking-wider hover:brightness-110 transition shadow-lg shadow-cyan-500/25 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {isParsingEdital ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analisando Edital & Gerando Trilha...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analisar Edital & Gerar Trilha com IA
                    </>
                  )}
                </button>
              </form>

              {importError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Parsed Summary Preview Card */}
              {parsedSummary && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-3 text-xs text-slate-200">
                  <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-cyan-400" />
                    Edital Mapeado: {parsedSummary.contest_title}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 bg-slate-900 p-3 rounded-xl">
                    <p><strong>Banca:</strong> {parsedSummary.institution}</p>
                    <p><strong>Salário:</strong> {parsedSummary.salary}</p>
                    <p><strong>Data Prova:</strong> {parsedSummary.target_date}</p>
                    <p><strong>Inscrições:</strong> {parsedSummary.registration_deadline}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 2: MANUAL NEW CONTEST */}
        {showNewContestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">Cadastrar Novo Concurso</h3>
                <button onClick={() => setShowNewContestModal(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateContest} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">Título do Concurso / Cargo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: INSS - Técnico do Seguro Social"
                    value={newContestTitle}
                    onChange={(e) => setNewContestTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Banca Examinadora</label>
                    <input
                      type="text"
                      placeholder="Ex: Cebraspe, FGV, FCC"
                      value={newContestInstitution}
                      onChange={(e) => setNewContestInstitution(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Data Prevista da Prova</label>
                    <input
                      type="date"
                      value={newContestDate}
                      onChange={(e) => setNewContestDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">Cor de Identificação</label>
                  <div className="flex items-center gap-3">
                    {['#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewContestColor(c)}
                        className={`w-7 h-7 rounded-full transition-transform ${newContestColor === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
                >
                  Salvar e Definir como Foco Ativo
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: LOG STUDY SESSION */}
        {showLogSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">Registrar Sessão de Estudo</h3>
                <button onClick={() => setShowLogSessionModal(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSession} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1 block">Matéria Estudada</label>
                  <select
                    value={sessionSubjectName}
                    onChange={(e) => setSessionSubjectName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                  >
                    <option value="">Selecione ou digite abaixo...</option>
                    {Object.keys(groupedSubjects).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 block">Questões Feitas</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={sessionQuestionsSolved}
                      onChange={(e) => setSessionQuestionsSolved(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 block">Questões Certas</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={sessionQuestionsCorrect}
                      onChange={(e) => setSessionQuestionsCorrect(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1 block">Anotações / Resumo</label>
                  <textarea
                    rows={2}
                    placeholder="Observações da sessão..."
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
                >
                  Salvar Sessão (+60 XP)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: LOG TAF REQUIREMENT */}
        {showAddTafModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">Registrar/Atualizar Exigência TAF</h3>
                <button onClick={() => setShowAddTafModal(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTafReq} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1 block">Modalidade do TAF</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Barra Fixa, Corrida 12 min, Natação"
                    value={tafModalityInput}
                    onChange={(e) => setTafModalityInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 block">Meta do Edital</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={tafTargetValInput}
                      onChange={(e) => setTafTargetValInput(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1 block">Unidade</label>
                    <input
                      type="text"
                      required
                      placeholder="reps, metros, seg"
                      value={tafUnitInput}
                      onChange={(e) => setTafUnitInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1 block">Seu Melhor Marca Atual</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={tafCurrentBestInput}
                    onChange={(e) => setTafCurrentBestInput(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
                >
                  Salvar Exigência TAF
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
