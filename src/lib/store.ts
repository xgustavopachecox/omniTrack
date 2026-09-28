import {
  Profile,
  NutritionLog,
  WorkoutSession,
  WorkoutSessionExercise,
  UserPR,
  BodyMetric,
  WaterLog,
  SecondBrainNote,
  Contest,
  ContestSubject,
  StudySession,
  ContestTafRequirement,
  TafBenchmark,
  PhysiqueAssessment,
  GeminiParseEditalResponse,
} from './types';
import { supabase, isSupabaseConfigured } from './supabase/client';

const DEMO_USER_ID = 'demo-user-omnitrack';

const defaultProfile: Profile = {
  id: DEMO_USER_ID,
  daily_calorie_target: 2500,
  daily_protein_target: 160,
  daily_carbs_target: 280,
  daily_fats_target: 70,
  daily_water_target: 3000,
  current_level: 5,
  current_xp: 350,
  rank_title: 'Combatente Disciplinado',
  streak_days: 7,
  created_at: new Date().toISOString(),
};

const getTodayDateStr = () => new Date().toISOString().split('T')[0];
const getYesterdayDateStr = () => new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0];

const defaultNutritionLogs: NutritionLog[] = [
  {
    id: 'n1',
    user_id: DEMO_USER_ID,
    meal_name: 'Omelete de 4 Ovos com Queijo e Pão Integral',
    meal_type: 'Café da Manhã',
    log_date: getTodayDateStr(),
    calories: 540,
    protein_g: 36,
    carbs_g: 38,
    fats_g: 22,
    raw_input: 'Comi 4 ovos mexidos com queijo minas e 2 fatias de pão integral no café da manhã',
    logged_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  {
    id: 'n2',
    user_id: DEMO_USER_ID,
    meal_name: 'Peito de Frango Grelhado, Arroz Integral e Brócolis',
    meal_type: 'Almoço',
    log_date: getTodayDateStr(),
    calories: 680,
    protein_g: 58,
    carbs_g: 72,
    fats_g: 14,
    raw_input: 'Almoço: 220g de peito de frango grelhado, 250g de arroz integral e brócolis no vapor com azeite',
    logged_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  {
    id: 'n3',
    user_id: DEMO_USER_ID,
    meal_name: 'Iogurte Grego Proteico com Whey e Banana',
    meal_type: 'Lanche',
    log_date: getTodayDateStr(),
    calories: 320,
    protein_g: 32,
    carbs_g: 35,
    fats_g: 5,
    raw_input: 'Lanche da tarde proteico',
    logged_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'n4',
    user_id: DEMO_USER_ID,
    meal_name: 'Salmão Grelhado com Batata Doce',
    meal_type: 'Jantar',
    log_date: getYesterdayDateStr(),
    calories: 710,
    protein_g: 52,
    carbs_g: 65,
    fats_g: 24,
    raw_input: 'Jantar de ontem com salmão',
    logged_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
];

const defaultSessions: WorkoutSession[] = [
  {
    id: 'ws1',
    user_id: DEMO_USER_ID,
    title: 'Treino de Peito e Tríceps Pesado',
    session_date: new Date().toISOString().split('T')[0],
    total_session_volume_kg: 5020.0,
    coach_feedback: 'Excelente densidade no supino e grande estabilidade escapular! Sobrecarga progressiva sustentável.',
    raw_input: 'Fiz supino reto com barra 100kg e tríceps corda.',
    created_at: new Date().toISOString(),
    exercises: [
      {
        id: 'wse1',
        session_id: 'ws1',
        exercise_name: 'Supino Reto com Barra',
        muscle_group: 'Peito',
        sets: [
          { set: 1, reps: 12, weight_each_side_kg: 25, total_weight_kg: 70 },
          { set: 2, reps: 10, weight_each_side_kg: 30, total_weight_kg: 80 },
          { set: 3, reps: 8, weight_each_side_kg: 35, total_weight_kg: 90 },
          { set: 4, reps: 6, weight_each_side_kg: 40, total_weight_kg: 100 },
        ],
        best_weight_kg: 100.0,
        exercise_volume_kg: 2960.0,
        observation: 'Falha na 6ª rep da última série. Execução perfeita.',
      },
      {
        id: 'wse2',
        session_id: 'ws1',
        exercise_name: 'Desenvolvimento com Halteres',
        muscle_group: 'Ombros',
        sets: [
          { set: 1, reps: 10, weight_each_side_kg: 24, total_weight_kg: 48 },
          { set: 2, reps: 10, weight_each_side_kg: 26, total_weight_kg: 52 },
          { set: 3, reps: 8, weight_each_side_kg: 28, total_weight_kg: 56 },
        ],
        best_weight_kg: 56.0,
        exercise_volume_kg: 1448.0,
        observation: 'Boa amplitude e controle na fase excêntrica.',
      },
      {
        id: 'wse3',
        session_id: 'ws1',
        exercise_name: 'Tríceps Corda na Polia',
        muscle_group: 'Braços',
        sets: [
          { set: 1, reps: 12, weight_each_side_kg: 0, total_weight_kg: 25 },
          { set: 2, reps: 10, weight_each_side_kg: 0, total_weight_kg: 30 },
          { set: 3, reps: 9, weight_each_side_kg: 0, total_weight_kg: 35 },
        ],
        best_weight_kg: 35.0,
        exercise_volume_kg: 612.0,
        observation: 'Pico de contração mantido por 1 segundo.',
      },
    ],
  },
  {
    id: 'ws2',
    user_id: DEMO_USER_ID,
    title: 'Leg Day & Isquiotibiais',
    session_date: new Date(Date.now() - 48 * 3600 * 1000).toISOString().split('T')[0],
    total_session_volume_kg: 8640.0,
    coach_feedback: 'Dominância nos quadríceps excepcional. Agachamento atingiu marca pessoal de 140kg!',
    raw_input: 'Treino de pernas completo',
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    exercises: [
      {
        id: 'wse4',
        session_id: 'ws2',
        exercise_name: 'Agachamento Livre com Barra',
        muscle_group: 'Pernas',
        sets: [
          { set: 1, reps: 10, weight_each_side_kg: 40, total_weight_kg: 100 },
          { set: 2, reps: 8, weight_each_side_kg: 50, total_weight_kg: 120 },
          { set: 3, reps: 6, weight_each_side_kg: 60, total_weight_kg: 140 },
        ],
        best_weight_kg: 140.0,
        exercise_volume_kg: 2800.0,
        observation: 'Profundidade paralela atingida sem retroversão pélvica.',
      },
      {
        id: 'wse5',
        session_id: 'ws2',
        exercise_name: 'Leg Press 45º',
        muscle_group: 'Pernas',
        sets: [
          { set: 1, reps: 12, weight_each_side_kg: 100, total_weight_kg: 220 },
          { set: 2, reps: 10, weight_each_side_kg: 120, total_weight_kg: 260 },
          { set: 3, reps: 8, weight_each_side_kg: 130, total_weight_kg: 280 },
        ],
        best_weight_kg: 280.0,
        exercise_volume_kg: 7480.0,
        observation: 'Intensidade máxima.',
      },
    ],
  },
];

const defaultPRs: UserPR[] = [
  {
    id: 'pr1',
    user_id: DEMO_USER_ID,
    exercise_name: 'Agachamento Livre com Barra',
    muscle_group: 'Pernas',
    weight_kg: 140.0,
    reps: 6,
    achieved_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString().split('T')[0],
    workout_session_id: 'ws2',
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: 'pr2',
    user_id: DEMO_USER_ID,
    exercise_name: 'Supino Reto com Barra',
    muscle_group: 'Peito',
    weight_kg: 100.0,
    reps: 6,
    achieved_at: new Date().toISOString().split('T')[0],
    workout_session_id: 'ws1',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pr3',
    user_id: DEMO_USER_ID,
    exercise_name: 'Desenvolvimento com Halteres',
    muscle_group: 'Ombros',
    weight_kg: 56.0,
    reps: 8,
    achieved_at: new Date().toISOString().split('T')[0],
    workout_session_id: 'ws1',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pr4',
    user_id: DEMO_USER_ID,
    exercise_name: 'Leg Press 45º',
    muscle_group: 'Pernas',
    weight_kg: 280.0,
    reps: 8,
    achieved_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString().split('T')[0],
    workout_session_id: 'ws2',
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: 'pr5',
    user_id: DEMO_USER_ID,
    exercise_name: 'Tríceps Corda na Polia',
    muscle_group: 'Braços',
    weight_kg: 35.0,
    reps: 9,
    achieved_at: new Date().toISOString().split('T')[0],
    workout_session_id: 'ws1',
    created_at: new Date().toISOString(),
  },
];

const defaultBodyMetrics: BodyMetric[] = [
  { id: 'b1', user_id: DEMO_USER_ID, weight_kg: 81.5, notes: 'Início do cutting', logged_at: new Date(Date.now() - 14 * 86400 * 1000).toISOString() },
  { id: 'b2', user_id: DEMO_USER_ID, weight_kg: 81.0, notes: 'Boa adesão aos macros', logged_at: new Date(Date.now() - 11 * 86400 * 1000).toISOString() },
  { id: 'b3', user_id: DEMO_USER_ID, weight_kg: 80.4, notes: 'Retenção diminuiu', logged_at: new Date(Date.now() - 8 * 86400 * 1000).toISOString() },
  { id: 'b4', user_id: DEMO_USER_ID, weight_kg: 79.8, notes: 'Cintura reduzida em 1cm', logged_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString() },
  { id: 'b5', user_id: DEMO_USER_ID, weight_kg: 79.2, notes: 'Definição abdominal aparecendo', logged_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString() },
  { id: 'b6', user_id: DEMO_USER_ID, weight_kg: 78.8, notes: 'Sensação de energia alta nos treinos', logged_at: new Date().toISOString() },
];

const defaultWaterLogs: WaterLog[] = [
  { id: 'wt1', user_id: DEMO_USER_ID, amount_ml: 500, logged_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString() },
  { id: 'wt2', user_id: DEMO_USER_ID, amount_ml: 500, logged_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString() },
  { id: 'wt3', user_id: DEMO_USER_ID, amount_ml: 250, logged_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  { id: 'wt4', user_id: DEMO_USER_ID, amount_ml: 500, logged_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
];

const defaultNotes: SecondBrainNote[] = [
  {
    id: 'note1',
    user_id: DEMO_USER_ID,
    category: 'treino',
    title: 'Periodização de Carga - Supino e Agachamento',
    content: 'Manter foco no RPE 8 nas 2 primeiras semanas do bloco de força. Aumentar 2.5kg por lado apenas quando todas as repetições forem completadas com estabilidade na pausa.',
    tags: ['hipertrofia', 'forca', 'periodizacao'],
    created_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
  },
  {
    id: 'note2',
    user_id: DEMO_USER_ID,
    category: 'estudos',
    title: 'Síntese Proteica e Timings de Nutrição',
    content: 'Estudo do Jornal da Sociedade Internacional de Nutrição Esportiva: A distribuição de proteína em 4 refeições contendo 0.4g/kg de leucina otimiza o estímulo do mTOR ao longo de 24h.',
    tags: ['nutricao', 'artigo', 'leucina'],
    created_at: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
  },
  {
    id: 'note3',
    user_id: DEMO_USER_ID,
    category: 'ideias',
    title: 'Novo aplicativo de micro-hábitos e foco diário',
    content: 'Criar uma funcionalidade de ritual matinal: 500ml de água + 5min de meditação + revisão dos 3 objetivos chave do dia antes de ligar a tela do computador.',
    tags: ['produtividade', 'saude', 'habitos'],
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: 'note4',
    user_id: DEMO_USER_ID,
    category: 'pensamentos',
    title: 'Reflexão sobre Consistência vs Intensidade',
    content: 'A intensidade atrai a atenção no curto prazo, mas é a consistência sustentável sem burnout que constrói resultados de longo prazo, tanto na física quanto na carreira.',
    tags: ['mindset', 'filosofia'],
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
];

const defaultContests: Contest[] = [
  {
    id: 'c1',
    user_id: DEMO_USER_ID,
    title: 'Polícia Federal - Agente',
    institution: 'Cebraspe',
    target_date: '2026-11-29',
    is_active: true,
    color_tag: '#3b82f6',
    created_at: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
  },
  {
    id: 'c2',
    user_id: DEMO_USER_ID,
    title: 'TRT 2ª Região - Analista Judiciário',
    institution: 'FCC',
    target_date: '2026-12-15',
    is_active: false,
    color_tag: '#10b981',
    created_at: new Date(Date.now() - 15 * 86400 * 1000).toISOString(),
  },
  {
    id: 'c3',
    user_id: DEMO_USER_ID,
    title: 'Receita Federal - Auditor Fiscal',
    institution: 'FGV',
    target_date: '2027-03-20',
    is_active: false,
    color_tag: '#8b5cf6',
    created_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
  },
];

const defaultContestSubjects: ContestSubject[] = [
  { id: 'cs1', user_id: DEMO_USER_ID, contest_id: 'c1', subject_name: 'Língua Portuguesa', topic_name: 'Compreensão e interpretação de textos', is_completed: true, reviews_count: 2 },
  { id: 'cs2', user_id: DEMO_USER_ID, contest_id: 'c1', subject_name: 'Língua Portuguesa', topic_name: 'Ortografia oficial e acentuação gráfica', is_completed: true, reviews_count: 1 },
  { id: 'cs3', user_id: DEMO_USER_ID, contest_id: 'c1', subject_name: 'Língua Portuguesa', topic_name: 'Sintaxe da oração e do período', is_completed: false, reviews_count: 0 },
  { id: 'cs4', user_id: DEMO_USER_ID, contest_id: 'c1', subject_name: 'Direito Constitucional', topic_name: 'Direitos e Garantias Fundamentais (Art. 5º)', is_completed: true, reviews_count: 3 },
  { id: 'cs5', user_id: DEMO_USER_ID, contest_id: 'c1', subject_name: 'Direito Constitucional', topic_name: 'Segurança Pública (Art. 144)', is_completed: false, reviews_count: 1 },
  { id: 'cs6', user_id: DEMO_USER_ID, contest_id: 'c1', subject_name: 'Direito Administrativo', topic_name: 'Atos Administrativos: conceitos e atributos', is_completed: true, reviews_count: 2 },
  { id: 'cs7', user_id: DEMO_USER_ID, contest_id: 'c1', subject_name: 'Direito Administrativo', topic_name: 'Licitações e Contratos (Lei 14.133/21)', is_completed: false, reviews_count: 0 },
  { id: 'cs8', user_id: DEMO_USER_ID, contest_id: 'c1', subject_name: 'Informática & TI', topic_name: 'Redes de Computadores & Segurança', is_completed: false, reviews_count: 0 },
  { id: 'cs9', user_id: DEMO_USER_ID, contest_id: 'c2', subject_name: 'Direito do Trabalho', topic_name: 'Contrato Individual de Trabalho', is_completed: true, reviews_count: 1 },
  { id: 'cs10', user_id: DEMO_USER_ID, contest_id: 'c2', subject_name: 'Direito Processual do Trabalho', topic_name: 'Recursos Trabalhistas e Execução', is_completed: false, reviews_count: 0 },
  { id: 'cs11', user_id: DEMO_USER_ID, contest_id: 'c3', subject_name: 'Direito Tributário', topic_name: 'Sistema Tributário Nacional (CTN)', is_completed: false, reviews_count: 0 },
  { id: 'cs12', user_id: DEMO_USER_ID, contest_id: 'c3', subject_name: 'Contabilidade Geral', topic_name: 'Balanço Patrimonial & DRE', is_completed: false, reviews_count: 0 },
];

const defaultStudySessions: StudySession[] = [
  {
    id: 'ss1',
    user_id: DEMO_USER_ID,
    contest_id: 'c1',
    subject_id: 'cs4',
    subject_name: 'Direito Constitucional',
    minutes_studied: 50,
    questions_solved: 20,
    questions_correct: 17,
    notes: 'Aproveitamento de 85% em Art. 5º',
    logged_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0],
  },
  {
    id: 'ss2',
    user_id: DEMO_USER_ID,
    contest_id: 'c1',
    subject_id: 'cs1',
    subject_name: 'Língua Portuguesa',
    minutes_studied: 45,
    questions_solved: 25,
    questions_correct: 22,
    notes: 'Revisão de interpretação Cebraspe',
    logged_at: new Date().toISOString().split('T')[0],
  },
];

const defaultContestTafRequirements: ContestTafRequirement[] = [
  {
    id: 'taf1',
    user_id: DEMO_USER_ID,
    contest_id: 'c1',
    modality: 'Barra Fixa',
    target_value: 5.0,
    unit: 'reps',
    current_best: 6.0,
    is_passed: true,
  },
  {
    id: 'taf2',
    user_id: DEMO_USER_ID,
    contest_id: 'c1',
    modality: 'Corrida 12 min',
    target_value: 2400.0,
    unit: 'metros',
    current_best: 2550.0,
    is_passed: true,
  },
  {
    id: 'taf3',
    user_id: DEMO_USER_ID,
    contest_id: 'c1',
    modality: 'Abdominal Remador',
    target_value: 30.0,
    unit: 'reps',
    current_best: 32.0,
    is_passed: true,
  },
];

const defaultTafBenchmarks: TafBenchmark[] = [
  {
    id: 'tb1',
    user_id: DEMO_USER_ID,
    modality: 'Corrida 12 min',
    score: 2550,
    score_value: 2550,
    passed: true,
    logged_at: new Date().toISOString(),
  },
  {
    id: 'tb2',
    user_id: DEMO_USER_ID,
    modality: 'Barra Fixa',
    score: 6,
    score_value: 6,
    passed: true,
    logged_at: new Date().toISOString(),
  },
];

const defaultPhysiqueAssessments: PhysiqueAssessment[] = [
  {
    id: 'pa1',
    user_id: DEMO_USER_ID,
    photo_url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=800&auto=format&fit=crop',
    assessment_date: new Date(Date.now() - 14 * 86400 * 1000).toISOString().split('T')[0],
    overall_score: 6.8,
    estimated_bf_percent: '15% - 17%',
    scores: {
      peito: { nota: 6.5, critica: 'Porção clavicular (superior) pouco desenvolvida, volume concentrado na base.' },
      ombros: { nota: 7.0, critica: 'Deltóide lateral aceitável, mas falta projeção tridimensional anterior/posterior.' },
      bracos: { nota: 7.5, critica: 'Boa espessura de tríceps, porém pico de bíceps com pouca inserção evidente.' },
      abdomen: { nota: 6.0, critica: 'Linha de cintura larga, pouca nitidez e baixa densidade nos retos abdominais.' },
      costas: { nota: null, critica: 'Não visível nesta foto.' },
      quadriceps: { nota: 5.5, critica: 'Vasto medial tímido, falta amplitude de corte na coxa.' },
      panturrilhas: { nota: null, critica: 'Não visível nesta foto.' },
    },
    strengths: [
      'Densidade razoável de tríceps',
      'Estrutura óssea clavicular favorável',
    ],
    weaknesses: [
      'Porção superior de peito atrasada em relação à base',
      'Definição abdominal camuflada por percentual de gordura intermediário',
      'Vasto lateral e medial das pernas demandam maior volume de treino',
    ],
    detailed_critique: 'Análise geral crua e sincera sobre a proporção atual do atleta, postura e maturidade muscular.',
    training_adjustments: 'Recomendações técnicas: Priorizar supino inclinado com halteres com foco no alongamento da fáscia, aumentar volume semanal de deltoide lateral em polia e adicionar agachamento com pausa profunda.',
    created_at: new Date(Date.now() - 14 * 86400 * 1000).toISOString(),
  },
];

export class OmniStore {
  private static get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(`omnitrack_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`omnitrack_${key}`, JSON.stringify(value));
    } catch (err) {
      console.error('Error saving to LocalStorage', err);
    }
  }

  // Profile
  static async getProfile(): Promise<Profile> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('profiles').select('*').single();
      if (data) return data as Profile;
    }
    return this.get('profile', defaultProfile);
  }

  static async updateProfile(profile: Partial<Profile>): Promise<Profile> {
    const current = await this.getProfile();
    const updated = { ...current, ...profile };
    if (isSupabaseConfigured && supabase) {
      await supabase.from('profiles').upsert(updated);
    }
    this.set('profile', updated);
    return updated;
  }

  // Nutrition
  static async getNutritionLogs(): Promise<NutritionLog[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('nutrition_logs').select('*').order('logged_at', { ascending: false });
      if (data && data.length > 0) return data as NutritionLog[];
    }
    return this.get('nutrition_logs', defaultNutritionLogs);
  }

  static async addNutritionLog(log: Omit<NutritionLog, 'id' | 'user_id' | 'logged_at'>): Promise<NutritionLog> {
    const nowIso = new Date().toISOString();
    const newLog: NutritionLog = {
      ...log,
      id: `n_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      meal_type: log.meal_type || 'Refeição',
      log_date: log.log_date || nowIso.split('T')[0],
      logged_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('nutrition_logs').insert(newLog).select().single();
      if (data && !error) return data as NutritionLog;
    }

    const current = await this.getNutritionLogs();
    const updated = [newLog, ...current];
    this.set('nutrition_logs', updated);
    return newLog;
  }

  static async updateNutritionLog(id: string, logData: Partial<NutritionLog>): Promise<NutritionLog> {
    const current = await this.getNutritionLogs();
    const existing = current.find((l) => l.id === id);
    if (!existing) throw new Error('Nutrition log not found');

    const updated: NutritionLog = { ...existing, ...logData };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('nutrition_logs').update(updated).eq('id', id);
    }

    const updatedList = current.map((l) => (l.id === id ? updated : l));
    this.set('nutrition_logs', updatedList);
    return updated;
  }

  static async deleteNutritionLog(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('nutrition_logs').delete().eq('id', id);
    }
    const current = await this.getNutritionLogs();
    const updated = current.filter((l) => l.id !== id);
    this.set('nutrition_logs', updated);
  }

  // Workout Sessions & PRs
  static async getWorkoutSessions(): Promise<WorkoutSession[]> {
    if (isSupabaseConfigured && supabase) {
      const { data: sessionsData } = await supabase
        .from('workout_sessions')
        .select('*, exercises:workout_session_exercises(*)')
        .order('created_at', { ascending: false });
      if (sessionsData && sessionsData.length > 0) return sessionsData as WorkoutSession[];
    }
    return this.get('workout_sessions', defaultSessions);
  }

  static async getUserPRs(): Promise<UserPR[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('user_prs').select('*').order('weight_kg', { ascending: false });
      if (data && data.length > 0) return data as UserPR[];
    }
    return this.get('user_prs', defaultPRs);
  }

  static async addWorkoutSession(sessionInput: {
    title: string;
    session_date?: string;
    total_session_volume_kg: number;
    coach_feedback?: string;
    raw_input?: string;
    exercises: Omit<WorkoutSessionExercise, 'id' | 'session_id'>[];
  }): Promise<WorkoutSession> {
    const now = new Date().toISOString();
    const sDate = sessionInput.session_date || now.split('T')[0];
    const sessionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const exercisesFormatted: WorkoutSessionExercise[] = sessionInput.exercises.map((ex, idx) => ({
      ...ex,
      id: `wse_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      session_id: sessionId,
      created_at: now,
    }));

    const newSession: WorkoutSession = {
      id: sessionId,
      user_id: DEMO_USER_ID,
      title: sessionInput.title,
      session_date: sDate,
      total_session_volume_kg: sessionInput.total_session_volume_kg,
      coach_feedback: sessionInput.coach_feedback,
      raw_input: sessionInput.raw_input,
      created_at: now,
      exercises: exercisesFormatted,
    };

    if (isSupabaseConfigured && supabase) {
      const { error: sessErr } = await supabase.from('workout_sessions').insert({
        id: newSession.id,
        user_id: newSession.user_id,
        title: newSession.title,
        session_date: newSession.session_date,
        total_session_volume_kg: newSession.total_session_volume_kg,
        coach_feedback: newSession.coach_feedback,
        raw_input: newSession.raw_input,
        created_at: newSession.created_at,
      });

      if (!sessErr) {
        const exercisesToInsert = exercisesFormatted.map((ex) => ({
          id: ex.id,
          session_id: ex.session_id,
          exercise_name: ex.exercise_name,
          muscle_group: ex.muscle_group,
          sets: ex.sets,
          best_weight_kg: ex.best_weight_kg,
          exercise_volume_kg: ex.exercise_volume_kg,
          observation: ex.observation,
          created_at: ex.created_at,
        }));
        await supabase.from('workout_session_exercises').insert(exercisesToInsert);
      }
    }

    const currentSessions = await this.getWorkoutSessions();
    const updatedSessions = [newSession, ...currentSessions];
    this.set('workout_sessions', updatedSessions);

    await this.updatePRsFromSession(newSession);

    return newSession;
  }

  static async updateWorkoutSession(
    sessionId: string,
    sessionInput: {
      title: string;
      session_date: string;
      total_session_volume_kg: number;
      coach_feedback?: string;
      exercises: Omit<WorkoutSessionExercise, 'id' | 'session_id'>[];
    }
  ): Promise<WorkoutSession> {
    const now = new Date().toISOString();
    const exercisesFormatted: WorkoutSessionExercise[] = sessionInput.exercises.map((ex, idx) => ({
      ...ex,
      id: `wse_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      session_id: sessionId,
      created_at: now,
    }));

    const currentSessions = await this.getWorkoutSessions();
    const oldSession = currentSessions.find((s) => s.id === sessionId);

    const updatedSession: WorkoutSession = {
      id: sessionId,
      user_id: DEMO_USER_ID,
      title: sessionInput.title,
      session_date: sessionInput.session_date,
      total_session_volume_kg: sessionInput.total_session_volume_kg,
      coach_feedback: sessionInput.coach_feedback || oldSession?.coach_feedback,
      raw_input: oldSession?.raw_input,
      created_at: oldSession?.created_at || now,
      exercises: exercisesFormatted,
    };

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('workout_sessions')
        .update({
          title: updatedSession.title,
          session_date: updatedSession.session_date,
          total_session_volume_kg: updatedSession.total_session_volume_kg,
          coach_feedback: updatedSession.coach_feedback,
        })
        .eq('id', sessionId);

      await supabase.from('workout_session_exercises').delete().eq('session_id', sessionId);

      const exercisesToInsert = exercisesFormatted.map((ex) => ({
        id: ex.id,
        session_id: sessionId,
        exercise_name: ex.exercise_name,
        muscle_group: ex.muscle_group,
        sets: ex.sets,
        best_weight_kg: ex.best_weight_kg,
        exercise_volume_kg: ex.exercise_volume_kg,
        observation: ex.observation,
        created_at: ex.created_at,
      }));
      await supabase.from('workout_session_exercises').insert(exercisesToInsert);
    }

    const updatedList = currentSessions.map((s) => (s.id === sessionId ? updatedSession : s));
    this.set('workout_sessions', updatedList);

    await this.updatePRsFromSession(updatedSession);
    return updatedSession;
  }

  static async deleteWorkoutSession(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('workout_sessions').delete().eq('id', id);
    }
    const currentSessions = await this.getWorkoutSessions();
    const updated = currentSessions.filter((s) => s.id !== id);
    this.set('workout_sessions', updated);
  }

  // PR CRUD
  static async addPR(prInput: {
    exercise_name: string;
    muscle_group: string;
    weight_kg: number;
    reps: number;
    achieved_at: string;
  }): Promise<UserPR> {
    const newPR: UserPR = {
      id: `pr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      exercise_name: prInput.exercise_name,
      muscle_group: prInput.muscle_group,
      weight_kg: prInput.weight_kg,
      reps: prInput.reps,
      achieved_at: prInput.achieved_at,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('user_prs').upsert(newPR, { onConflict: 'user_id, exercise_name' });
    }

    const currentPRs = await this.getUserPRs();
    const existingIndex = currentPRs.findIndex(
      (p) => p.exercise_name.toLowerCase() === prInput.exercise_name.toLowerCase()
    );

    let updatedPRs: UserPR[];
    if (existingIndex >= 0) {
      updatedPRs = [...currentPRs];
      updatedPRs[existingIndex] = newPR;
    } else {
      updatedPRs = [newPR, ...currentPRs];
    }
    this.set('user_prs', updatedPRs);
    return newPR;
  }

  static async updatePR(id: string, prData: Partial<UserPR>): Promise<UserPR> {
    const currentPRs = await this.getUserPRs();
    const existing = currentPRs.find((p) => p.id === id);
    if (!existing) throw new Error('PR not found');

    const updated: UserPR = { ...existing, ...prData };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('user_prs').upsert(updated);
    }

    const updatedList = currentPRs.map((p) => (p.id === id ? updated : p));
    this.set('user_prs', updatedList);
    return updated;
  }

  static async deletePR(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('user_prs').delete().eq('id', id);
    }
    const currentPRs = await this.getUserPRs();
    const updated = currentPRs.filter((p) => p.id !== id);
    this.set('user_prs', updated);
  }

  private static async updatePRsFromSession(session: WorkoutSession): Promise<void> {
    const currentPRs = await this.getUserPRs();
    const updatedPRs = [...currentPRs];

    if (!session.exercises) return;

    for (const ex of session.exercises) {
      const bestWeight = ex.best_weight_kg;
      const bestSet = ex.sets.find((s) => s.total_weight_kg === bestWeight) || ex.sets[ex.sets.length - 1];
      const repsAchieved = bestSet ? bestSet.reps : 1;

      const existingPrIndex = updatedPRs.findIndex(
        (p) => p.exercise_name.toLowerCase() === ex.exercise_name.toLowerCase()
      );

      if (existingPrIndex >= 0) {
        const existingPR = updatedPRs[existingPrIndex];
        if (bestWeight > existingPR.weight_kg) {
          const newPRRecord: UserPR = {
            id: existingPR.id,
            user_id: DEMO_USER_ID,
            exercise_name: ex.exercise_name,
            muscle_group: ex.muscle_group,
            weight_kg: bestWeight,
            reps: repsAchieved,
            achieved_at: session.session_date,
            workout_session_id: session.id,
            created_at: new Date().toISOString(),
          };

          updatedPRs[existingPrIndex] = newPRRecord;

          if (isSupabaseConfigured && supabase) {
            await supabase.from('user_prs').upsert(newPRRecord, { onConflict: 'user_id, exercise_name' });
          }
        }
      } else {
        const newPRRecord: UserPR = {
          id: `pr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          user_id: DEMO_USER_ID,
          exercise_name: ex.exercise_name,
          muscle_group: ex.muscle_group,
          weight_kg: bestWeight,
          reps: repsAchieved,
          achieved_at: session.session_date,
          workout_session_id: session.id,
          created_at: new Date().toISOString(),
        };

        updatedPRs.push(newPRRecord);

        if (isSupabaseConfigured && supabase) {
          await supabase.from('user_prs').upsert(newPRRecord, { onConflict: 'user_id, exercise_name' });
        }
      }
    }

    this.set('user_prs', updatedPRs);
  }

  // Body Metrics
  static async getBodyMetrics(): Promise<BodyMetric[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('body_metrics').select('*').order('logged_at', { ascending: true });
      if (data && data.length > 0) return data as BodyMetric[];
    }
    return this.get('body_metrics', defaultBodyMetrics);
  }

  static async addBodyMetric(metric: Omit<BodyMetric, 'id' | 'user_id' | 'logged_at'>): Promise<BodyMetric> {
    const newMetric: BodyMetric = {
      ...metric,
      id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      logged_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('body_metrics').insert(newMetric).select().single();
      if (data && !error) return data as BodyMetric;
    }

    const current = await this.getBodyMetrics();
    const updated = [...current, newMetric];
    this.set('body_metrics', updated);
    return newMetric;
  }

  static async deleteBodyMetric(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('body_metrics').delete().eq('id', id);
    }
    const current = await this.getBodyMetrics();
    const updated = current.filter((b) => b.id !== id);
    this.set('body_metrics', updated);
  }

  // Water Logs
  static async getWaterLogs(): Promise<WaterLog[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('water_logs').select('*').order('logged_at', { ascending: false });
      if (data && data.length > 0) return data as WaterLog[];
    }
    return this.get('water_logs', defaultWaterLogs);
  }

  static async addWaterLog(amount_ml: number): Promise<WaterLog> {
    const newLog: WaterLog = {
      id: `wt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      amount_ml,
      logged_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('water_logs').insert(newLog).select().single();
      if (data && !error) return data as WaterLog;
    }

    const current = await this.getWaterLogs();
    const updated = [newLog, ...current];
    this.set('water_logs', updated);
    return newLog;
  }

  static async resetTodayWater(): Promise<void> {
    const todayStr = new Date().toISOString().split('T')[0];
    const current = await this.getWaterLogs();
    const updated = current.filter((w) => w.logged_at.split('T')[0] !== todayStr);
    this.set('water_logs', updated);
  }

  // Second Brain Notes
  static async getNotes(): Promise<SecondBrainNote[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('second_brain_notes').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) return data as SecondBrainNote[];
    }
    return this.get('second_brain_notes', defaultNotes);
  }

  static async addNote(note: Omit<SecondBrainNote, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<SecondBrainNote> {
    const now = new Date().toISOString();
    const newNote: SecondBrainNote = {
      ...note,
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('second_brain_notes').insert(newNote).select().single();
      if (data && !error) return data as SecondBrainNote;
    }

    const current = await this.getNotes();
    const updated = [newNote, ...current];
    this.set('second_brain_notes', updated);
    return newNote;
  }

  static async deleteNote(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('second_brain_notes').delete().eq('id', id);
    }
    const current = await this.getNotes();
    const updated = current.filter((n) => n.id !== id);
    this.set('second_brain_notes', updated);
  }

  // Contests & TAF Methods (Multi-Concurso)
  static async getContests(): Promise<Contest[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('contests').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) return data as Contest[];
    }
    return this.get('contests', defaultContests);
  }

  static async addContest(contestInput: Partial<Contest> & { title: string }): Promise<Contest> {
    const nowIso = new Date().toISOString();
    const newContest: Contest = {
      id: contestInput.id || `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      title: contestInput.title,
      institution: contestInput.institution || 'Banca Examinadora',
      target_date: contestInput.target_date || new Date(Date.now() + 90 * 86400 * 1000).toISOString().split('T')[0],
      is_active: contestInput.is_active ?? true,
      color_tag: contestInput.color_tag || '#3b82f6',
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('contests').insert(newContest).select().single();
      if (data && !error) return data as Contest;
    }

    const current = await this.getContests();
    // If set to active, deactivate others in local array
    const updated = newContest.is_active
      ? [newContest, ...current.map((c) => ({ ...c, is_active: false }))]
      : [newContest, ...current];

    this.set('contests', updated);
    return newContest;
  }

  static async setActiveContest(id: string): Promise<Contest[]> {
    const current = await this.getContests();
    const updated = current.map((c) => ({
      ...c,
      is_active: c.id === id,
    }));

    if (isSupabaseConfigured && supabase) {
      await supabase.from('contests').update({ is_active: false }).neq('id', id);
      await supabase.from('contests').update({ is_active: true }).eq('id', id);
    }

    this.set('contests', updated);
    return updated;
  }

  static async deleteContest(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('contests').delete().eq('id', id);
    }
    const current = await this.getContests();
    const updated = current.filter((c) => c.id !== id);
    if (updated.length > 0 && !updated.some((c) => c.is_active)) {
      updated[0].is_active = true;
    }
    this.set('contests', updated);
  }

  static async getContestSubjects(contestId?: string): Promise<ContestSubject[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('contest_subjects').select('*').order('created_at', { ascending: true });
      if (contestId) query = query.eq('contest_id', contestId);
      const { data } = await query;
      if (data && data.length > 0) return data as ContestSubject[];
    }

    const all = this.get('contest_subjects', defaultContestSubjects);
    if (contestId) {
      return all.filter((s) => s.contest_id === contestId);
    }
    return all;
  }

  static async addContestSubject(
    input:
      | { contest_id?: string; subject_name: string; topic_name: string; contest_name?: string }
      | string,
    topicsArg?: string[]
  ): Promise<ContestSubject> {
    let contestId = typeof input === 'string' ? 'c1' : input.contest_id || 'c1';
    let subjectName = typeof input === 'string' ? 'Geral' : input.subject_name || 'Geral';
    let topicName = typeof input === 'string' ? input : input.topic_name || 'Tópico de Estudo';

    const nowIso = new Date().toISOString();
    const newSubject: ContestSubject = {
      id: `cs_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      contest_id: contestId,
      subject_name: subjectName,
      topic_name: topicName,
      is_completed: false,
      reviews_count: 0,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('contest_subjects').insert(newSubject).select().single();
      if (data && !error) return data as ContestSubject;
    }

    const current = await this.getContestSubjects();
    const updated = [...current, newSubject];
    this.set('contest_subjects', updated);
    return newSubject;
  }

  static async toggleContestSubject(id: string): Promise<void> {
    const current = await this.getContestSubjects();
    const target = current.find((s) => s.id === id);
    if (!target) return;

    const newCompleted = !target.is_completed;
    const newReviews = newCompleted ? (target.reviews_count || 0) + 1 : target.reviews_count || 0;

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('contest_subjects')
        .update({ is_completed: newCompleted, reviews_count: newReviews })
        .eq('id', id);
    }

    const updated = current.map((s) => (s.id === id ? { ...s, is_completed: newCompleted, reviews_count: newReviews } : s));
    this.set('contest_subjects', updated);
  }

  static async deleteContestSubject(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('contest_subjects').delete().eq('id', id);
    }
    const current = await this.getContestSubjects();
    const updated = current.filter((s) => s.id !== id);
    this.set('contest_subjects', updated);
  }

  static async getStudySessions(contestId?: string): Promise<StudySession[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('study_sessions').select('*').order('created_at', { ascending: false });
      if (contestId) query = query.eq('contest_id', contestId);
      const { data } = await query;
      if (data && data.length > 0) return data as StudySession[];
    }

    const all = this.get('study_sessions', defaultStudySessions);
    if (contestId) {
      return all.filter((s) => s.contest_id === contestId);
    }
    return all;
  }

  static async addStudySession(sessionInput: any): Promise<StudySession> {
    const nowIso = new Date().toISOString();
    const duration = Number(sessionInput.minutes_studied || sessionInput.duration_minutes || 30);
    const subj = sessionInput.subject_name || sessionInput.subject || 'Geral';
    const contestId = sessionInput.contest_id || 'c1';

    const newSession: StudySession = {
      id: `ss_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      contest_id: contestId,
      subject_id: sessionInput.subject_id || undefined,
      subject_name: subj,
      minutes_studied: duration,
      questions_solved: Number(sessionInput.questions_solved || 0),
      questions_correct: Number(sessionInput.questions_correct || 0),
      notes: sessionInput.notes || '',
      logged_at: sessionInput.logged_at || nowIso.split('T')[0],
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('study_sessions').insert(newSession).select().single();
      if (data && !error) return data as StudySession;
    }

    const current = await this.getStudySessions();
    const updated = [newSession, ...current];
    this.set('study_sessions', updated);
    return newSession;
  }

  static async getContestTafRequirements(contestId?: string): Promise<ContestTafRequirement[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('contest_taf_requirements').select('*').order('created_at', { ascending: true });
      if (contestId) query = query.eq('contest_id', contestId);
      const { data } = await query;
      if (data && data.length > 0) return data as ContestTafRequirement[];
    }

    const all = this.get('contest_taf_requirements', defaultContestTafRequirements);
    if (contestId) {
      return all.filter((r) => r.contest_id === contestId);
    }
    return all;
  }

  static async addContestTafRequirement(reqInput: any): Promise<ContestTafRequirement> {
    const nowIso = new Date().toISOString();
    const contestId = reqInput.contest_id || 'c1';
    const targetVal = Number(reqInput.target_value || reqInput.targetVal || 0);
    const bestVal = Number(reqInput.current_best || reqInput.currentBest || 0);
    const isPassed = bestVal >= targetVal && targetVal > 0;

    const newReq: ContestTafRequirement = {
      id: `tafr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      contest_id: contestId,
      modality: reqInput.modality,
      target_value: targetVal,
      unit: reqInput.unit || 'reps',
      current_best: bestVal,
      is_passed: isPassed,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('contest_taf_requirements').insert(newReq).select().single();
      if (data && !error) return data as ContestTafRequirement;
    }

    const current = await this.getContestTafRequirements();
    const updated = [...current, newReq];
    this.set('contest_taf_requirements', updated);
    return newReq;
  }

  static async updateContestTafRequirement(id: string, reqData: Partial<ContestTafRequirement>): Promise<ContestTafRequirement> {
    const current = await this.getContestTafRequirements();
    const existing = current.find((r) => r.id === id);
    if (!existing) throw new Error('TAF Requirement not found');

    const updated: ContestTafRequirement = { ...existing, ...reqData };
    if (updated.target_value > 0) {
      updated.is_passed = updated.current_best >= updated.target_value;
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('contest_taf_requirements').update(updated).eq('id', id);
    }

    const updatedList = current.map((r) => (r.id === id ? updated : r));
    this.set('contest_taf_requirements', updatedList);
    return updated;
  }

  static async deleteContestTafRequirement(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('contest_taf_requirements').delete().eq('id', id);
    }
    const current = await this.getContestTafRequirements();
    const updated = current.filter((r) => r.id !== id);
    this.set('contest_taf_requirements', updated);
  }

  static async importContestFromGemini(
    parsedData: GeminiParseEditalResponse
  ): Promise<{ contest: Contest; subjectsCount: number; tafCount: number }> {
    // 1. Create Contest
    const newContest = await this.addContest({
      title: parsedData.contest_title || 'Novo Concurso Importado',
      institution: parsedData.institution || 'Banca Examinadora',
      target_date: parsedData.target_date || new Date(Date.now() + 90 * 86400 * 1000).toISOString().split('T')[0],
      is_active: true,
      color_tag: '#06b6d4',
    });

    await this.setActiveContest(newContest.id);

    // 2. Add Syllabus Subjects & Topics
    let subjectsCount = 0;
    if (parsedData.syllabus && parsedData.syllabus.length > 0) {
      for (const subj of parsedData.syllabus) {
        for (const topicStr of subj.topics) {
          await this.addContestSubject({
            contest_id: newContest.id,
            subject_name: subj.subject_name,
            topic_name: topicStr,
          });
          subjectsCount++;
        }
      }
    }

    // 3. Add TAF Requirements
    let tafCount = 0;
    if (parsedData.taf_requirements && parsedData.taf_requirements.length > 0) {
      for (const taf of parsedData.taf_requirements) {
        await this.addContestTafRequirement({
          contest_id: newContest.id,
          modality: taf.modality,
          target_value: Number(taf.target_value),
          unit: taf.unit,
          current_best: 0,
          is_passed: false,
        });
        tafCount++;
      }
    }

    return { contest: newContest, subjectsCount, tafCount };
  }

  static async getTafBenchmarks(): Promise<TafBenchmark[]> {
    return this.get('taf_benchmarks', defaultTafBenchmarks);
  }

  static async addTafBenchmark(benchInput: any): Promise<TafBenchmark> {
    const val = benchInput.score_value ?? benchInput.score ?? 0;
    const newBench: TafBenchmark = {
      id: `taf_${Date.now()}`,
      user_id: DEMO_USER_ID,
      modality: benchInput.modality,
      score: val,
      score_value: val,
      passed: Boolean(benchInput.passed),
      logged_at: new Date().toISOString(),
    };
    const current = await this.getTafBenchmarks();
    const updated = [newBench, ...current];
    this.set('taf_benchmarks', updated);
    return newBench;
  }

  // Physique Assessments (Gemini Vision IA)
  static async getPhysiqueAssessments(): Promise<PhysiqueAssessment[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('physique_assessments')
        .select('*')
        .order('created_at', { ascending: false });
      if (data && data.length > 0) return data as PhysiqueAssessment[];
    }
    return this.get('physique_assessments', defaultPhysiqueAssessments);
  }

  static async addPhysiqueAssessment(
    assessmentInput: Omit<PhysiqueAssessment, 'id' | 'user_id' | 'created_at'>
  ): Promise<PhysiqueAssessment> {
    const nowIso = new Date().toISOString();
    const newAssessment: PhysiqueAssessment = {
      ...assessmentInput,
      id: `pa_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      assessment_date: assessmentInput.assessment_date || nowIso.split('T')[0],
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('physique_assessments')
        .insert(newAssessment)
        .select()
        .single();
      if (data && !error) return data as PhysiqueAssessment;
    }

    const current = await this.getPhysiqueAssessments();
    const updated = [newAssessment, ...current];
    this.set('physique_assessments', updated);
    return newAssessment;
  }

  static async deletePhysiqueAssessment(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('physique_assessments').delete().eq('id', id);
    }
    const current = await this.getPhysiqueAssessments();
    const updated = current.filter((pa) => pa.id !== id);
    this.set('physique_assessments', updated);
  }
}

