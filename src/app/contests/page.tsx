'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  GraduationCap,
  Timer,
  CheckCircle2,
  Dumbbell,
  Brain,
  Trophy,
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
  FileQuestion,
  BookMarked,
  Clock,
  AlertTriangle,
  Layers,
  BrainCircuit,
  CheckSquare,
  TrendingUp,
  RotateCw,
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
  MockExam,
  MockExamQuestion,
  ErrorNotebookItem,
  ScheduledReview,
} from '@/lib/types';
import { OmniStore } from '@/lib/store';

export default function ContestsPage() {
  const [activeNavTab, setActiveNavTab] = useState<
    'edital' | 'simulados' | 'caderno_erros' | 'srs_revisoes' | 'pomodoro' | 'taf' | 'gemini'
  >('edital');

  // Multi-Contest Data States
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string>('');
  const [subjects, setSubjects] = useState<ContestSubject[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [tafRequirements, setTafRequirements] = useState<ContestTafRequirement[]>([]);

  // Contest Evaluation Suite States
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [errorNotebook, setErrorNotebook] = useState<ErrorNotebookItem[]>([]);
  const [scheduledReviews, setScheduledReviews] = useState<ScheduledReview[]>([]);

  // Active Simulado Mode
  const [activeExam, setActiveExam] = useState<MockExam | null>(null);
  const [examCurrentQuestionIdx, setExamCurrentQuestionIdx] = useState<number>(0);
  const [examUserAnswers, setExamUserAnswers] = useState<Record<string, string>>({});
  const [examSecondsElapsed, setExamSecondsElapsed] = useState<number>(0);
  const [isExamTimerRunning, setIsExamTimerRunning] = useState<boolean>(false);

  // New Exam Modal States
  const [showNewExamModal, setShowNewExamModal] = useState<boolean>(false);
  const [examCreationTab, setExamCreationTab] = useState<'ai' | 'manual'>('ai');
  const [isGeneratingAiExam, setIsGeneratingAiExam] = useState<boolean>(false);
  const [aiExamNumQuestions, setAiExamNumQuestions] = useState<number>(5);
  const [aiExamType, setAiExamType] = useState<'true_false' | 'multiple_choice'>('true_false');

  const [manualExamTitle, setManualExamTitle] = useState<string>('');
  const [manualExamScoring, setManualExamScoring] = useState<'standard' | 'cebraspe_penalty'>('cebraspe_penalty');
  const [manualExamQuestions, setManualExamQuestions] = useState<
    { subject_name: string; topic_name: string; statement: string; type: 'true_false' | 'multiple_choice'; optionA: string; optionB: string; optionC: string; optionD: string; correct: string; explanation: string }[]
  >([
    {
      subject_name: 'Direito Constitucional',
      topic_name: 'Art. 5º',
      statement: 'A casa é asilo inviolável do indivíduo.',
      type: 'true_false',
      optionA: '', optionB: '', optionC: '', optionD: '',
      correct: 'CERTO',
      explanation: 'Art 5, XI da CF/88.',
    }
  ]);

  // Error Notebook Filters
  const [errorFilterReason, setErrorFilterReason] = useState<string>('all');
  const [errorFilterStatus, setErrorFilterStatus] = useState<string>('pending');
  const [isExplainingErrorId, setIsExplainingErrorId] = useState<string | null>(null);

  // SRS Reviews Filters
  const [srsFilter, setSrsFilter] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [showAddSRSModal, setShowAddSRSModal] = useState<boolean>(false);
  const [srsSubjectInput, setSrsSubjectInput] = useState<string>('');

  // Modals & Form States (Legacy & Existing)
  const [showNewContestModal, setShowNewContestModal] = useState<boolean>(false);
  const [showImportEditalModal, setShowImportEditalModal] = useState<boolean>(false);
  const [showLogSessionModal, setShowLogSessionModal] = useState<boolean>(false);
  const [showAddTafModal, setShowAddTafModal] = useState<boolean>(false);

  // Manual Contest Creation Form
  const [newContestTitle, setNewContestTitle] = useState<string>('');
  const [newContestInstitution, setNewContestInstitution] = useState<string>('Cebraspe');
  const [newContestDate, setNewContestDate] = useState<string>('2026-11-29');
  const [newContestColor, setNewContestColor] = useState<string>('#3b82f6');

  // Edital Import Form
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

  // Load All Multi-Contest & Evaluation Suite Data
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
      const loadedExams = await OmniStore.getMockExams(activeId);
      const loadedErrors = await OmniStore.getErrorNotebook(activeId);
      const loadedSRS = await OmniStore.getScheduledReviews(activeId);

      setSubjects(loadedSubjects);
      setStudySessions(loadedSessions);
      setTafRequirements(loadedTafReqs);
      setMockExams(loadedExams);
      setErrorNotebook(loadedErrors);
      setScheduledReviews(loadedSRS);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedContestId]);

  // Active Simulado Timer Effect
  useEffect(() => {
    let timer: any = null;
    if (activeExam && isExamTimerRunning && activeExam.status === 'in_progress') {
      timer = setInterval(() => {
        setExamSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeExam, isExamTimerRunning]);

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

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSelectContest = async (id: string) => {
    setSelectedContestId(id);
    await OmniStore.setActiveContest(id);
    await loadAllData();
  };

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
      institution: newContestInstitution,
      target_date: newContestDate,
      color_tag: newContestColor,
      is_active: true,
    });

    setNewContestTitle('');
    setShowNewContestModal(false);
    setSelectedContestId(created.id);
    showToast(`Concurso "${created.title}" criado e definido como ativo!`);
    await loadAllData();
  };

  // Import Edital via Gemini AI
  const handleParseEdital = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsParsingEdital(true);
    setImportError(null);

    try {
      const formData = new FormData();
      if (importFile) {
        formData.append('editalPdf', importFile);
      }
      if (importRawText) {
        formData.append('rawText', importRawText);
      }
      formData.append('targetRoles', importTargetRoles);

      const res = await fetch('/api/gemini/parse-contest-doc', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao processar documento de edital.');
      }

      setParsedSummary(data);

      // Auto Import Contest Data into Store
      const imported = await OmniStore.importContestFromGemini(data);
      setSelectedContestId(imported.contest.id);
      showToast(
        `Edital "${imported.contest.title}" importado com ${imported.subjectsCount} tópicos e ${imported.tafCount} requisitos TAF!`
      );
      setShowImportEditalModal(false);
      await loadAllData();
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || 'Erro no envio do arquivo.');
    } finally {
      setIsParsingEdital(false);
    }
  };

  const handleDeleteContest = async (id: string, title: string) => {
    if (confirm(`Deseja realmente excluir o concurso "${title}"?`)) {
      await OmniStore.deleteContest(id);
      showToast(`Concurso "${title}" removido.`);
      await loadAllData();
    }
  };

  // Toggle Topic Completion
  const handleToggleTopic = async (subjectId: string, currentStatus: boolean) => {
    await OmniStore.updateContestSubject(subjectId, { is_completed: !currentStatus });
    await loadAllData();
  };

  // Add Subject/Topic to Edital
  const handleAddSubjectTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContestId || !newSubjectInput || !newTopicInput) return;

    await OmniStore.addContestSubject({
      contest_id: selectedContestId,
      subject_name: newSubjectInput.trim(),
      topic_name: newTopicInput.trim(),
    });

    setNewTopicInput('');
    showToast(`Tópico adicionado à matéria "${newSubjectInput}"!`);
    await loadAllData();
  };

  const handleDeleteSubjectTopic = async (id: string) => {
    await OmniStore.deleteContestSubject(id);
    await loadAllData();
  };

  // Save Study Session
  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContestId) return;

    await OmniStore.addStudySession({
      contest_id: selectedContestId,
      minutes_studied: pomodoroMinutes,
      questions_solved: sessionQuestionsSolved,
      questions_correct: sessionQuestionsCorrect,
      notes: sessionNotes || `${pomodoroMinutes} min de estudo em ${sessionSubjectName || 'Geral'}`,
      logged_at: new Date().toISOString().split('T')[0],
      subject_name: sessionSubjectName,
    });

    await OmniStore.addXp(60, `Sessão de Estudo (${pomodoroMinutes} min)`);

    setShowLogSessionModal(false);
    showToast(`Sessão de ${pomodoroMinutes} min registrada! (+60 XP)`);
    await loadAllData();
  };

  // Save TAF Requirement
  const handleSaveTafReq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContestId || !tafModalityInput) return;

    await OmniStore.addContestTafRequirement({
      contest_id: selectedContestId,
      modality: tafModalityInput,
      target_value: tafTargetValInput,
      unit: tafUnitInput,
      current_best: tafCurrentBestInput,
      is_passed: tafCurrentBestInput >= tafTargetValInput,
    });

    setShowAddTafModal(false);
    showToast(`Exigência TAF "${tafModalityInput}" salva!`);
    await loadAllData();
  };

  // Call Gemini AI Assistant
  const handleAskGemini = async () => {
    if (!aiInputText.trim() && aiMode !== 'question') return;

    setAiLoading(true);
    setAiResponse(null);
    setUserSelectedOption(null);

    try {
      const res = await fetch('/api/gemini/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiInputText,
          mode: aiMode,
          topic: selectedAiTopic,
        }),
      });

      const data = await res.json();
      setAiResponse(data);
    } catch (err) {
      console.error(err);
      showToast('Erro ao consultar Gemini IA.');
    } finally {
      setAiLoading(false);
    }
  };

  // ----------------------------------------------------
  // SIMULADOS HANDLERS
  // ----------------------------------------------------
  const handleStartExam = (exam: MockExam) => {
    setActiveExam(exam);
    setExamCurrentQuestionIdx(0);
    const initialAns: Record<string, string> = {};
    (exam.questions || []).forEach((q) => {
      if (q.user_answer) initialAns[q.id] = q.user_answer;
    });
    setExamUserAnswers(initialAns);
    setExamSecondsElapsed(exam.duration_taken_seconds || 0);
    setIsExamTimerRunning(exam.status === 'in_progress');
  };

  const handleAnswerExamQuestion = (qId: string, value: string) => {
    setExamUserAnswers((prev) => ({
      ...prev,
      [qId]: prev[qId] === value ? '' : value,
    }));
  };

  const handleFinishActiveExam = async () => {
    if (!activeExam) return;
    setIsExamTimerRunning(false);
    try {
      const finished = await OmniStore.finishMockExam(
        activeExam.id,
        examUserAnswers,
        examSecondsElapsed,
        selectedContestId
      );
      showToast(`Simulado concluído! Pontuação: ${finished.score_achieved} pts (${finished.percentage_score}%)`);
      setActiveExam(finished);
      await loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao finalizar simulado');
    }
  };

  const handleCreateAiMockExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentContest) return;
    setIsGeneratingAiExam(true);
    try {
      const res = await fetch('/api/gemini/mock-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contestTitle: currentContest.title,
          institution: currentContest.institution || 'Cebraspe',
          numQuestions: aiExamNumQuestions,
          questionType: aiExamType,
          subjects: Array.from(new Set(subjects.map((s) => s.subject_name))),
        }),
      });

      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        const created = await OmniStore.createMockExam(
          {
            contest_id: selectedContestId,
            title: data.title || `Simulado IA - ${currentContest.title}`,
            scoring_system: data.scoring_system || (aiExamType === 'true_false' ? 'cebraspe_penalty' : 'standard'),
            total_questions: data.questions.length,
            time_limit_minutes: 60,
          },
          data.questions
        );

        showToast('Novo Simulado gerado via IA!');
        setShowNewExamModal(false);
        await loadAllData();
        handleStartExam(created);
      } else {
        showToast('Falha ao gerar simulado via IA.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao conectar com serviço da IA.');
    } finally {
      setIsGeneratingAiExam(false);
    }
  };

  const handleDeleteExam = async (id: string, title: string) => {
    if (confirm(`Excluir simulado "${title}"?`)) {
      await OmniStore.deleteMockExam(id);
      if (activeExam?.id === id) setActiveExam(null);
      showToast('Simulado removido.');
      await loadAllData();
    }
  };

  // ----------------------------------------------------
  // CADERNO DE ERROS HANDLERS
  // ----------------------------------------------------
  const handleUpdateErrorReason = async (errorId: string, reason: string) => {
    await OmniStore.updateErrorReason(errorId, reason);
    showToast('Motivo do erro atualizado!');
    await loadAllData();
  };

  const handleToggleMasteredError = async (errorId: string, currentStatus: boolean) => {
    await OmniStore.markErrorAsMastered(errorId, !currentStatus);
    showToast(!currentStatus ? '🎉 Marcado como Dominado!' : 'Retornado para Caderno de Erros.');
    await loadAllData();
  };

  const handleRequestAiErrorExplanation = async (item: ErrorNotebookItem) => {
    setIsExplainingErrorId(item.id);
    try {
      const res = await fetch('/api/gemini/explain-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionStatement: item.question?.question_statement || item.subject_name,
          userAnswer: item.question?.user_answer || 'Incorreta',
          correctAnswer: item.question?.correct_answer || 'Correta',
          subjectName: item.subject_name,
          topicName: item.topic_name,
        }),
      });
      const data = await res.json();
      if (data.ai_clarification) {
        await OmniStore.updateErrorClarification(item.id, data.ai_clarification);
        if (data.suggested_error_reason && (!item.error_reason || item.error_reason === 'Não sabia o conteúdo')) {
          await OmniStore.updateErrorReason(item.id, data.suggested_error_reason);
        }
        showToast('Explicação mastigada da IA gerada!');
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao obter explicação da IA.');
    } finally {
      setIsExplainingErrorId(null);
    }
  };

  const handleDeleteErrorItem = async (id: string) => {
    await OmniStore.deleteErrorNotebookItem(id);
    showToast('Item do Caderno de Erros removido.');
    await loadAllData();
  };

  // ----------------------------------------------------
  // REVISÃO ESPAÇADA (SRS) HANDLERS
  // ----------------------------------------------------
  const handleCompleteSRSReview = async (reviewId: string) => {
    try {
      const updated = await OmniStore.completeScheduledReview(reviewId);
      if (updated.is_completed) {
        showToast('🎉 Tópico 100% dominado na Curva de Esquecimento (SRS)!');
      } else {
        showToast(`Etapa concluída! Próxima revisão (Etapa ${updated.review_stage}) agendada.`);
      }
      await loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar revisão');
    }
  };

  const handleCreateSRSReview = async (subjectId: string) => {
    const subj = subjects.find((s) => s.id === subjectId);
    if (!subj) return;
    await OmniStore.createScheduledReview(
      subj.id,
      1,
      undefined,
      subj.subject_name,
      subj.topic_name
    );
    showToast(`Revisão de 24h (D+1) agendada para "${subj.topic_name || subj.subject_name}"!`);
    setShowAddSRSModal(false);
    await loadAllData();
  };

  // Derived Calculations
  const currentContest = useMemo(
    () => contests.find((c) => c.id === selectedContestId) || contests[0],
    [contests, selectedContestId]
  );

  const totalTopics = subjects.length;
  const completedTopics = subjects.filter((s) => s.is_completed).length;
  const editalProgressPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const totalQuestionsSolved = studySessions.reduce((acc, s) => acc + (s.questions_solved || 0), 0);
  const totalQuestionsCorrect = studySessions.reduce((acc, s) => acc + (s.questions_correct || 0), 0);
  const overallAccuracyPct = totalQuestionsSolved > 0 ? Math.round((totalQuestionsCorrect / totalQuestionsSolved) * 100) : 0;

  const isTafPassed = tafRequirements.length > 0 && tafRequirements.every((r) => r.is_passed);

  // Grouped Subjects by Subject Name
  const groupedSubjects = useMemo(() => {
    const map = new Map<string, ContestSubject[]>();
    subjects.forEach((subj) => {
      const name = subj.subject_name;
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(subj);
    });
    return Array.from(map.entries()).map(([name, list]) => ({
      name,
      topics: list,
      completedCount: list.filter((t) => t.is_completed).length,
      totalCount: list.length,
      pct: Math.round((list.filter((t) => t.is_completed).length / list.length) * 100),
    }));
  }, [subjects]);

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const dueReviewsCount = useMemo(() => {
    return scheduledReviews.filter((r) => !r.is_completed && r.scheduled_for <= todayDateStr).length;
  }, [scheduledReviews, todayDateStr]);

  const filteredErrors = useMemo(() => {
    return errorNotebook.filter((item) => {
      if (errorFilterStatus === 'pending' && item.is_mastered) return false;
      if (errorFilterStatus === 'mastered' && !item.is_mastered) return false;
      if (errorFilterReason !== 'all' && item.error_reason !== errorFilterReason) return false;
      return true;
    });
  }, [errorNotebook, errorFilterStatus, errorFilterReason]);

  const filteredSRS = useMemo(() => {
    return scheduledReviews.filter((r) => {
      if (srsFilter === 'today') return !r.is_completed && r.scheduled_for <= todayDateStr;
      if (srsFilter === 'upcoming') return !r.is_completed && r.scheduled_for > todayDateStr;
      if (srsFilter === 'completed') return r.is_completed;
      return true;
    });
  }, [scheduledReviews, srsFilter, todayDateStr]);

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Central Integrada de Concursos & Avaliação Prática
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Módulo Multi-Edital & IA Evaluator
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Edital verticalizado, motor de simulados inéditos, caderno de erros e curva de esquecimento (SRS).
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowImportEditalModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs hover:opacity-90 transition shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar Edital (PDF / IA)
          </button>
          <button
            onClick={() => setShowNewContestModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs transition flex items-center gap-2"
          >
            <Plus className="h-4 w-4 text-cyan-400" />
            Novo Concurso
          </button>
        </div>
      </div>

      {/* Multi-Contest Selector Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Seus Concursos Alvo ({contests.length})
          </span>
        </div>

        {contests.length === 0 ? (
          <div className="glass-card p-10 rounded-2xl text-center text-slate-500 space-y-2">
            <Trophy className="h-10 w-10 mx-auto text-slate-600 opacity-50" />
            <p className="text-sm font-medium">Nenhum concurso em andamento. Adicione um novo concurso ou importe um edital em PDF com IA.</p>
          </div>
        ) : (
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
        )}
      </div>

      {/* Global Status Toast */}
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
                <div className="text-2xl font-black text-purple-400">{mockExams.length}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Simulados</div>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div className="text-center px-2">
                {dueReviewsCount > 0 ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-extrabold border border-rose-500/30">
                    {dueReviewsCount} SRS Pendentes
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-extrabold border border-emerald-500/30">
                    SRS em Dia
                  </span>
                )}
                <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Revisões Hoje</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex items-center gap-2 mt-8 pt-6 border-t border-slate-800/80 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveNavTab('edital')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                activeNavTab === 'edital'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Edital Verticalizado ({editalProgressPct}%)
            </button>

            <button
              onClick={() => setActiveNavTab('simulados')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                activeNavTab === 'simulados'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileQuestion className="h-4 w-4 text-amber-400" />
              Motor de Simulados ({mockExams.length})
            </button>

            <button
              onClick={() => setActiveNavTab('caderno_erros')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                activeNavTab === 'caderno_erros'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookMarked className="h-4 w-4 text-rose-400" />
              Caderno de Erros ({errorNotebook.filter((e) => !e.is_mastered).length})
            </button>

            <button
              onClick={() => setActiveNavTab('srs_revisoes')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                activeNavTab === 'srs_revisoes'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BrainCircuit className="h-4 w-4 text-purple-400" />
              Revisão Espaçada SRS ({dueReviewsCount})
            </button>

            <button
              onClick={() => setActiveNavTab('pomodoro')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                activeNavTab === 'pomodoro'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Timer className="h-4 w-4" />
              Pomodoro
            </button>

            <button
              onClick={() => setActiveNavTab('taf')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
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
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${editalProgressPct}%` }}
              />
            </div>
          </div>

          {/* Add Subject/Topic Form Bar */}
          <form
            onSubmit={handleAddSubjectTopic}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center gap-3"
          >
            <input
              type="text"
              placeholder="Matéria (ex: Direito Constitucional)"
              value={newSubjectInput}
              onChange={(e) => setNewSubjectInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 w-full"
            />
            <input
              type="text"
              placeholder="Tópico do Edital (ex: Art. 5º Direitos Fundamentais)"
              value={newTopicInput}
              onChange={(e) => setNewTopicInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 w-full"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 w-full md:w-auto flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              Adicionar Tópico
            </button>
          </form>

          {/* Accordion List by Subject */}
          <div className="space-y-4">
            {groupedSubjects.map((subjectGroup) => {
              const isOpen = openSubject === subjectGroup.name;

              return (
                <div
                  key={subjectGroup.name}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden transition"
                >
                  {/* Subject Header */}
                  <button
                    onClick={() => setOpenSubject(isOpen ? null : subjectGroup.name)}
                    className="w-full p-4 md:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-base md:text-lg">{subjectGroup.name}</h4>
                        <p className="text-xs text-slate-400">
                          {subjectGroup.completedCount} de {subjectGroup.totalCount} tópicos concluídos ({subjectGroup.pct}%)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-24 md:w-36 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-cyan-400 transition-all"
                          style={{ width: `${subjectGroup.pct}%` }}
                        />
                      </div>
                      {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                    </div>
                  </button>

                  {/* Topics List */}
                  {isOpen && (
                    <div className="border-t border-slate-800/80 bg-slate-950/60 p-4 md:p-6 space-y-2.5">
                      {subjectGroup.topics.map((topic) => (
                        <div
                          key={topic.id}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                            <button
                              onClick={() => handleToggleTopic(topic.id, topic.is_completed)}
                              className={`p-1 rounded-lg border transition ${
                                topic.is_completed
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                  : 'bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-500'
                              }`}
                            >
                              <Check className="h-4 w-4" />
                            </button>

                            <span
                              className={`text-sm font-semibold truncate ${
                                topic.is_completed ? 'line-through text-slate-500' : 'text-white'
                              }`}
                            >
                              {topic.topic_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {topic.reviews_count !== undefined && topic.reviews_count > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                <RotateCw className="h-3 w-3" />
                                {topic.reviews_count} SRS
                              </span>
                            )}

                            <button
                              onClick={() => handleCreateSRSReview(topic.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-950/50 border border-slate-700 hover:border-purple-500/30 text-purple-300 text-xs font-bold transition flex items-center gap-1"
                              title="Agendar para Revisão Espaçada SRS (24h)"
                            >
                              <BrainCircuit className="h-3.5 w-3.5" />
                              Revisar
                            </button>

                            <button
                              onClick={() => handleDeleteSubjectTopic(topic.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition"
                              title="Excluir Tópico"
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
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MOTOR DE SIMULADOS */}
      {activeNavTab === 'simulados' && (
        <div className="space-y-6">
          {/* Active Simulado Mode */}
          {activeExam ? (
            <div className="space-y-6 animate-scaleUp">
              {/* Header Bar Mode */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      Modo Prova Ativo
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      {activeExam.scoring_system === 'cebraspe_penalty' ? '⚠️ Sistema Cebraspe (-1 pt por Erro)' : 'Standard (+1 pt por Acerto)'}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white">{activeExam.title}</h2>
                </div>

                <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-lg">
                    <Clock className="h-5 w-5 animate-pulse" />
                    <span>
                      {Math.floor(examSecondsElapsed / 60)}m {examSecondsElapsed % 60}s
                    </span>
                  </div>

                  <button
                    onClick={handleFinishActiveExam}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs hover:opacity-90 transition shadow-lg shadow-emerald-500/20"
                  >
                    Finalizar Simulado
                  </button>

                  <button
                    onClick={() => setActiveExam(null)}
                    className="p-2 text-slate-400 hover:text-white"
                    title="Minimizar / Voltar à Lista"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Questions Navigation Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {(activeExam.questions || []).map((q, idx) => {
                  const isCurrent = idx === examCurrentQuestionIdx;
                  const isAnswered = Boolean(examUserAnswers[q.id]);

                  return (
                    <button
                      key={q.id}
                      onClick={() => setExamCurrentQuestionIdx(idx)}
                      className={`w-10 h-10 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center flex-shrink-0 border ${
                        isCurrent
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 scale-105 shadow-md shadow-cyan-500/30'
                          : isAnswered
                          ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Current Question View */}
              {(() => {
                const currentQuestion = (activeExam.questions || [])[examCurrentQuestionIdx];
                if (!currentQuestion) return null;
                const currentAns = examUserAnswers[currentQuestion.id] || '';

                return (
                  <div className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-xl">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold">
                            {currentQuestion.subject_name}
                          </span>
                          {currentQuestion.topic_name && (
                            <span className="text-xs font-semibold text-slate-400">
                              • {currentQuestion.topic_name}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-extrabold text-white mt-3 leading-relaxed">
                          Questão {examCurrentQuestionIdx + 1} de {(activeExam.questions || []).length}
                        </h3>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-slate-200 text-sm md:text-base leading-relaxed font-medium">
                      {currentQuestion.question_statement}
                    </div>

                    {/* Options (Cebraspe Certo/Errado OR Multiple Choice) */}
                    <div className="space-y-3">
                      {currentQuestion.question_type === 'true_false' ? (
                        <div className="grid grid-cols-2 gap-4">
                          {['CERTO', 'ERRADO'].map((opt) => {
                            const isSelected = currentAns === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => handleAnswerExamQuestion(currentQuestion.id, opt)}
                                className={`p-4 rounded-2xl border font-black text-sm transition-all flex items-center justify-center gap-2 ${
                                  isSelected
                                    ? opt === 'CERTO'
                                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                                      : 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10'
                                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                {isSelected ? <CheckCircle2 className="h-5 w-5" /> : <div className="w-5 h-5 rounded-full border border-slate-700" />}
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {(currentQuestion.options || [
                            { key: 'A', text: 'Opção A' },
                            { key: 'B', text: 'Opção B' },
                            { key: 'C', text: 'Opção C' },
                            { key: 'D', text: 'Opção D' },
                          ]).map((opt) => {
                            const isSelected = currentAns === opt.key;
                            return (
                              <button
                                key={opt.key}
                                onClick={() => handleAnswerExamQuestion(currentQuestion.id, opt.key)}
                                className={`w-full p-4 rounded-2xl border text-left font-semibold text-sm transition-all flex items-center gap-3 ${
                                  isSelected
                                    ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border ${
                                  isSelected ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-400'
                                }`}>
                                  {opt.key}
                                </span>
                                <span className="flex-1">{opt.text}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Question Footer Controls */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      <button
                        onClick={() => setExamCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                        disabled={examCurrentQuestionIdx === 0}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold disabled:opacity-30"
                      >
                        Anterior
                      </button>

                      <div className="text-xs text-slate-400 font-bold">
                        {Object.keys(examUserAnswers).length} de {(activeExam.questions || []).length} respondidas
                      </div>

                      <button
                        onClick={() =>
                          setExamCurrentQuestionIdx((prev) =>
                            Math.min((activeExam.questions || []).length - 1, prev + 1)
                          )
                        }
                        disabled={examCurrentQuestionIdx === (activeExam.questions || []).length - 1}
                        className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-extrabold disabled:opacity-30"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* List of Mock Exams */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-white">Simulados Inéditos & Provas Anteriores</h3>
                  <p className="text-xs text-slate-400">
                    Avalie seu desempenho sob pressão e alimente automaticamente seu Caderno de Erros.
                  </p>
                </div>

                <button
                  onClick={() => setShowNewExamModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-xs hover:opacity-90 transition shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Gerar Novo Simulado
                </button>
              </div>

              {mockExams.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <FileQuestion className="h-12 w-12 text-slate-600 mx-auto" />
                  <h4 className="text-base font-bold text-white">Nenhum simulado cadastrado</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Gere um simulado inédito automaticamente com a IA Gemini ou monte sua prova personalizada.
                  </p>
                  <button
                    onClick={() => setShowNewExamModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-extrabold text-xs"
                  >
                    Gerar Primeiro Simulado
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                            exam.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                          }`}>
                            {exam.status === 'completed' ? 'Concluído' : 'Em Andamento'}
                          </span>

                          <span className="text-xs font-bold text-slate-400">
                            {exam.scoring_system === 'cebraspe_penalty' ? 'Cebraspe (-1 pt por erro)' : 'Standard'}
                          </span>
                        </div>

                        <h4 className="font-black text-white text-base leading-snug">{exam.title}</h4>
                        <p className="text-xs text-slate-400 flex items-center gap-2">
                          <span>{exam.total_questions} questões</span>
                          <span>•</span>
                          <span>{Math.round(exam.duration_taken_seconds / 60)} min dedicados</span>
                        </p>
                      </div>

                      {exam.status === 'completed' && (
                        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Pontuação</span>
                            <span className="text-sm font-black text-cyan-400">{exam.score_achieved} pts</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Aproveitamento</span>
                            <span className="text-sm font-black text-emerald-400">{exam.percentage_score}%</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleStartExam(exam)}
                          className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition flex items-center justify-center gap-1.5"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          {exam.status === 'completed' ? 'Refazer Prova' : 'Continuar Simulado'}
                        </button>

                        <button
                          onClick={() => handleDeleteExam(exam.id, exam.title)}
                          className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition"
                          title="Excluir Simulado"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CADERNO DE ERROS INTELIGENTE */}
      {activeNavTab === 'caderno_erros' && (
        <div className="space-y-6">
          {/* Header Stats & Filters */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <BookMarked className="h-5 w-5 text-rose-400" />
                  Caderno de Erros Automático com Explicação IA
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cada erro nos simulados é catalogado com a justificativa técnica da lei e da banca examinadora.
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setErrorFilterStatus('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    errorFilterStatus === 'pending'
                      ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pendentes ({errorNotebook.filter((e) => !e.is_mastered).length})
                </button>
                <button
                  onClick={() => setErrorFilterStatus('mastered')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    errorFilterStatus === 'mastered'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dominados ({errorNotebook.filter((e) => e.is_mastered).length})
                </button>
                <button
                  onClick={() => setErrorFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    errorFilterStatus === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({errorNotebook.length})
                </button>
              </div>
            </div>

            {/* Error Reason Tag Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">
                Motivo do Erro:
              </span>
              {[
                'all',
                'Pegadinha da Banca',
                'Não sabia a Lei Seca',
                'Falta de Atenção',
                'Interpretação de Texto',
                'Não sabia o conteúdo',
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setErrorFilterReason(reason)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 border transition ${
                    errorFilterReason === reason
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {reason === 'all' ? 'Todos os Motivos' : reason}
                </button>
              ))}
            </div>
          </div>

          {/* Errors List */}
          {filteredErrors.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <h4 className="text-base font-bold text-white">Nenhum erro encontrado neste filtro</h4>
              <p className="text-xs text-slate-400">
                Responda simulados para capturar automaticamente as questões em que houve dúvida ou erro.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredErrors.map((item) => (
                <div
                  key={item.id}
                  className={`p-6 rounded-3xl bg-slate-900/90 border transition space-y-4 ${
                    item.is_mastered
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded font-bold text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {item.subject_name}
                      </span>
                      {item.topic_name && (
                        <span className="px-2.5 py-0.5 rounded font-medium text-xs bg-slate-800 text-slate-300 border border-slate-700">
                          {item.topic_name}
                        </span>
                      )}

                      {/* Error Reason Dropdown / Badge */}
                      <select
                        value={item.error_reason || 'Não sabia o conteúdo'}
                        onChange={(e) => handleUpdateErrorReason(item.id, e.target.value)}
                        className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 focus:outline-none"
                      >
                        <option value="Pegadinha da Banca" className="bg-slate-900 text-white">
                          Pegadinha da Banca
                        </option>
                        <option value="Não sabia a Lei Seca" className="bg-slate-900 text-white">
                          Não sabia a Lei Seca
                        </option>
                        <option value="Falta de Atenção" className="bg-slate-900 text-white">
                          Falta de Atenção
                        </option>
                        <option value="Interpretação de Texto" className="bg-slate-900 text-white">
                          Interpretação de Texto
                        </option>
                        <option value="Não sabia o conteúdo" className="bg-slate-900 text-white">
                          Não sabia o conteúdo
                        </option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleMasteredError(item.id, item.is_mastered)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 border ${
                          item.is_mastered
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-800 text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/40'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {item.is_mastered ? 'Dominado' : 'Marcar como Dominado'}
                      </button>

                      <button
                        onClick={() => handleDeleteErrorItem(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                        title="Excluir do Caderno"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Statement & Answers */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                    <p className="text-sm font-semibold text-slate-200 leading-relaxed">
                      {item.question?.question_statement || 'Enunciado da questão armazenada'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-800">
                      <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 font-bold flex items-center gap-2">
                        <X className="h-4 w-4 text-rose-400" />
                        Sua Resposta: {item.question?.user_answer || 'Incorreta'}
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Gabarito Oficial: {item.question?.correct_answer || 'Correta'}
                      </div>
                    </div>
                  </div>

                  {/* AI Clarification Box */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black text-purple-300">
                        <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                        Explicação Mastigada da IA Gemini:
                      </div>

                      <button
                        onClick={() => handleRequestAiErrorExplanation(item)}
                        disabled={isExplainingErrorId === item.id}
                        className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
                      >
                        <RefreshCw className={`h-3 w-3 ${isExplainingErrorId === item.id ? 'animate-spin' : ''}`} />
                        {isExplainingErrorId === item.id ? 'Gerando...' : 'Regerar IA'}
                      </button>
                    </div>

                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed italic">
                      &quot;{item.ai_clarification || 'Solicite a explicação detalhada da IA para fundamentação jurídica ou teórica completa.'}&quot;
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REVISÃO ESPAÇADA (CURVA DE ESQUECIMENTO / SRS) */}
      {activeNavTab === 'srs_revisoes' && (
        <div className="space-y-6">
          {/* Header Stats */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-purple-400" />
                  Mecanismo de Revisão Espaçada (Curva de Esquecimento / SRS)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Revisões otimizadas nos intervalos científicos: **24h (D+1) ➔ 7 dias (D+7) ➔ 30 dias (D+30)**.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setSrsFilter('today')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    srsFilter === 'today'
                      ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Para Hoje ({dueReviewsCount})
                </button>
                <button
                  onClick={() => setSrsFilter('upcoming')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    srsFilter === 'upcoming'
                      ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Próximas
                </button>
                <button
                  onClick={() => setSrsFilter('completed')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    srsFilter === 'completed'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Concluídas
                </button>
              </div>
            </div>

            {/* SRS Stages Diagram Bar */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-extrabold text-cyan-400 block">Etapa 1 (24 Horas)</span>
                <span className="text-[10px] text-slate-500">Fixação imediata pós-estudo</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-extrabold text-indigo-400 block">Etapa 2 (7 Dias)</span>
                <span className="text-[10px] text-slate-500">Consolidação na memória de médio prazo</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-extrabold text-emerald-400 block">Etapa 3 (30 Dias)</span>
                <span className="text-[10px] text-slate-500">Retenção de longo prazo antes da prova</span>
              </div>
            </div>
          </div>

          {/* SRS List */}
          {filteredSRS.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <h4 className="text-base font-bold text-white">Nenhuma revisão nesta categoria</h4>
              <p className="text-xs text-slate-400">
                Vá no Edital Verticalizado e clique em &quot;Revisar&quot; em qualquer tópico para criar um agendamento de 24h.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSRS.map((review) => (
                <div
                  key={review.id}
                  className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={`px-2.5 py-0.5 rounded font-black text-[10px] uppercase border ${
                        review.review_stage === 1
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          : review.review_stage === 2
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        Etapa {review.review_stage} ({review.review_stage === 1 ? '24h' : review.review_stage === 2 ? '7 Dias' : '30 Dias'})
                      </span>

                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                        {new Date(review.scheduled_for).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-white text-base">
                      {review.topic_name || review.subject_name}
                    </h4>
                    {review.subject_name && review.topic_name && (
                      <p className="text-xs text-slate-400">Matéria: {review.subject_name}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-semibold">
                      {review.is_completed ? 'Concluída' : 'Pendente'}
                    </span>

                    {!review.is_completed && (
                      <button
                        onClick={() => handleCompleteSRSReview(review.id)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90 text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
                      >
                        <Check className="h-4 w-4" />
                        Revisar Agora (Concluir Etapa)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CICLO POMODORO & QUESTÕES */}
      {activeNavTab === 'pomodoro' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pomodoro Timer Box */}
          <div className="lg:col-span-1 glass-panel p-6 border-slate-800 space-y-6 text-center">
            <div className="space-y-1">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Cronômetro de Foco</span>
              <h3 className="text-xl font-black text-white">Ciclo Pomodoro</h3>
            </div>

            {/* Timer Ring Counter */}
            <div className="relative w-56 h-56 mx-auto flex items-center justify-center rounded-full border-4 border-slate-800 bg-slate-950/80 shadow-2xl">
              <div className="text-center">
                <span className="text-5xl font-black text-white tracking-tight">
                  {Math.floor(timeLeft / 60)
                    .toString()
                    .padStart(2, '0')}
                  :{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-xs text-slate-400 block mt-1 font-semibold">
                  {isRunning ? '⏱️ Em Foco Máximo' : 'Pausado'}
                </span>
              </div>
            </div>

            {/* Presets */}
            <div className="flex justify-center gap-2">
              {[25, 45, 50, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => startPomodoro(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    pomodoroMinutes === m
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                }`}
              >
                {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                {isRunning ? 'Pausar' : 'Iniciar Foco'}
              </button>

              <button
                onClick={resetTimer}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400"
                title="Reiniciar Cronômetro"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Study Sessions Analytics & Logs */}
          <div className="lg:col-span-2 glass-panel p-6 border-slate-800 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold text-white">Histórico de Sessões Registradas</h3>
                <p className="text-xs text-slate-400">Total acumulado de tempo e questões resolvidas.</p>
              </div>

              <button
                onClick={() => setShowLogSessionModal(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition"
              >
                + Registrar Sessão
              </button>
            </div>

            {studySessions.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 text-xs">
                Nenhuma sessão de estudo registrada ainda neste concurso.
              </div>
            ) : (
              <div className="space-y-3">
                {studySessions.map((session) => {
                  const accuracy =
                    session.questions_solved > 0
                      ? Math.round((session.questions_correct / session.questions_solved) * 100)
                      : 0;

                  return (
                    <div
                      key={session.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-cyan-400">
                            {session.subject_name || 'Estudo Geral'}
                          </span>
                          <span className="text-[10px] text-slate-500">{session.logged_at}</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">{session.notes}</p>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="text-sm font-black text-white">{session.minutes_studied} min</span>
                          <span className="text-[10px] text-slate-500 block">Tempo</span>
                        </div>
                        <div>
                          <span className="text-sm font-black text-emerald-400">
                            {session.questions_correct}/{session.questions_solved} ({accuracy}%)
                          </span>
                          <span className="text-[10px] text-slate-500 block">Questões</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: ÍNDICES TAF FÍSICO */}
      {activeNavTab === 'taf' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-white">Requisitos do TAF (Teste de Aptidão Física)</h3>
              <p className="text-xs text-slate-400">
                Acompanhe o alinhamento com as marcas mínimas exigidas pelo edital.
              </p>
            </div>

            <button
              onClick={() => setShowAddTafModal(true)}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
            >
              + Adicionar Exigência TAF
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tafRequirements.map((taf) => (
              <div
                key={taf.id}
                className={`p-6 rounded-3xl border transition space-y-4 ${
                  taf.is_passed
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-extrabold text-white text-base">{taf.modality}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                      taf.is_passed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {taf.is_passed ? 'Aprovado' : 'Pendente'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Marca Atual:</span>
                    <span className="text-white font-bold">
                      {taf.current_best} {taf.unit}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Meta Mínima:</span>
                    <span className="text-cyan-400 font-bold">
                      {taf.target_value} {taf.unit}
                    </span>
                  </div>
                </div>

                <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all ${taf.is_passed ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{
                      width: `${Math.min(100, Math.round((taf.current_best / taf.target_value) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: TUTOR GEMINI IA */}
      {activeNavTab === 'gemini' && (
        <div className="glass-panel p-6 border-slate-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Brain className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Tutor Inteligente de Concursos Gemini IA</h3>
              <p className="text-xs text-slate-400">
                Tire dúvidas, peça mnemônicos e simule questões adaptativas em tempo real.
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            {[
              { id: 'mnemonic', label: 'Mnemônicos & Acrônimos' },
              { id: 'doubt', label: 'Tirar Dúvida Teórica' },
              { id: 'question', label: 'Questão Inédita' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setAiMode(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  aiMode === tab.id
                    ? 'bg-cyan-500 text-slate-950 font-black'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Digite o assunto ou tópico (ex: Art. 5º da CF/88, Atos Administrativos)..."
              value={aiInputText}
              onChange={(e) => setAiInputText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
            />

            <button
              onClick={handleAskGemini}
              disabled={aiLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {aiLoading ? 'Processando com Gemini IA...' : 'Consultar Tutor IA'}
            </button>

            {/* AI Output Card */}
            {aiResponse && (
              <div className="p-6 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-4 animate-scaleUp">
                <h4 className="font-extrabold text-white text-base">{aiResponse.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{aiResponse.explanation}</p>

                {aiResponse.mnemonic && (
                  <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 font-bold text-cyan-300 text-sm">
                    💡 Mnemônico: {aiResponse.mnemonic}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: NOVO SIMULADO (IA / MANUAL) */}
      {showNewExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-amber-400" />
                Gerar Novo Simulado
              </h3>
              <button onClick={() => setShowNewExamModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAiMockExam} className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-xs text-slate-400 font-bold block">
                  Quantidade de Questões Inéditas
                </label>
                <select
                  value={aiExamNumQuestions}
                  onChange={(e) => setAiExamNumQuestions(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none"
                >
                  <option value={3}>3 Questões Rápido</option>
                  <option value={5}>5 Questões Padrão</option>
                  <option value={10}>10 Questões Completo</option>
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-xs text-slate-400 font-bold block">
                  Formato da Banca Examinadora
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAiExamType('true_false')}
                    className={`p-3 rounded-xl border text-xs font-bold transition ${
                      aiExamType === 'true_false'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Certo / Errado (Cebraspe)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiExamType('multiple_choice')}
                    className={`p-3 rounded-xl border text-xs font-bold transition ${
                      aiExamType === 'multiple_choice'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Múltipla Escolha (A, B, C, D)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isGeneratingAiExam}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isGeneratingAiExam ? 'Elaborando Prova via Gemini IA...' : 'Gerar Simulado com IA agora'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NOVO CONCURSO MANUAL */}
      {showNewContestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Adicionar Novo Concurso Alvo</h3>
              <button onClick={() => setShowNewContestModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContest} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Título do Concurso</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Polícia Federal - Agente"
                  value={newContestTitle}
                  onChange={(e) => setNewContestTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Banca Examinadora</label>
                <input
                  type="text"
                  placeholder="Ex: Cebraspe, FGV, FCC"
                  value={newContestInstitution}
                  onChange={(e) => setNewContestInstitution(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Data da Prova</label>
                <input
                  type="date"
                  value={newContestDate}
                  onChange={(e) => setNewContestDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
              >
                Salvar Concurso
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: IMPORTAR EDITAL VIA IA (PDF / TEXTO) */}
      {showImportEditalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-extrabold text-white">Importar Edital via IA Gemini</h3>
              </div>
              <button onClick={() => setShowImportEditalModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleParseEdital} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Arquivo PDF do Edital</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Ou Cole o Conteúdo Programático</label>
                <textarea
                  rows={4}
                  placeholder="Cole aqui o texto do edital contendo as matérias e tópicos..."
                  value={importRawText}
                  onChange={(e) => setImportRawText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              {importError && <p className="text-xs text-rose-400 font-semibold">{importError}</p>}

              <button
                type="submit"
                disabled={isParsingEdital}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isParsingEdital ? 'Extraindo Conteúdo Programático...' : 'Extrair Edital Verticalizado'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: LOG SESSION */}
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
                <input
                  type="text"
                  placeholder="Ex: Direito Constitucional"
                  value={sessionSubjectName}
                  onChange={(e) => setSessionSubjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
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

      {/* MODAL 5: LOG TAF REQUIREMENT */}
      {showAddTafModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Registrar Exigência TAF</h3>
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
                  placeholder="Ex: Barra Fixa, Corrida 12 min"
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
