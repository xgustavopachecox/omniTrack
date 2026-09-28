import { Profile, UserAchievement, GamificationReward } from './types';

// Tabela de XP por ação
export const XP_TABLE = {
  // Dieta
  LOG_MEAL: 30,
  HIT_PROTEIN_TARGET: 80,
  HIT_WATER_TARGET: 50,

  // Treino
  COMPLETE_WORKOUT: 100,
  HIT_PR_LOAD: 150,
  CARDIO_TAF_SESSION: 80,

  // Concurso & Estudos
  STUDY_30_MIN: 60,
  QUESTIONS_HIGH_ACCURACY: 100, // aproveitamento >= 80%
  COMPLETE_EDITAL_TOPIC: 120,
  PASS_TAF_SIMULATOR: 200,

  // Segundo Cérebro
  CREATE_NOTE: 25,
};

// Fórmula de Level: XP necessário para subir do nível L ao L+1 é (L * 500)
export function getXpForNextLevel(level: number): number {
  return Math.max(1, level) * 500;
}

// Retorna título de rank com base no nível atual
export function getRankTitle(level: number): string {
  if (level >= 30) return 'Servidor Imparável / Elite';
  if (level >= 20) return 'Máquina de Aprovação';
  if (level >= 10) return 'Especialista em Foco';
  if (level >= 5) return 'Combatente Disciplinado';
  return 'Iniciante / Recruta';
}

// Catálogo de Conquistas (Badges)
export const SYSTEM_BADGES = [
  {
    key: 'STREAK_7',
    title: 'Fogo Diário (7 Dias) 🔥',
    description: 'Manteve a chama da disciplina acesa por 7 dias consecutivos!',
  },
  {
    key: 'STREAK_30',
    title: 'Inabalável (30 Dias) ⚡',
    description: '30 dias seguidos cumprindo as metas fundamentais.',
  },
  {
    key: 'FIRST_WORKOUT',
    title: 'Primeiro Treino 🏋️‍♂️',
    description: 'Registrou seu primeiro treino no OmniTrack.',
  },
  {
    key: 'FIRST_STUDY',
    title: 'Foco nos Estudos 📚',
    description: 'Completou sua primeira sessão de estudo focado.',
  },
  {
    key: 'QUESTOES_100',
    title: 'Centurião de Questões ✍️',
    description: 'Completou mais de 100 questões em simulados.',
  },
  {
    key: 'TAF_PASSED',
    title: 'Aprovado no TAF 🏆',
    description: 'Atingiu os índices de aprovação no Teste de Aptidão Física.',
  },
  {
    key: 'EDITAL_50',
    title: 'Meio Edital Dominado 🎯',
    description: 'Concluiu mais de 50% dos tópicos do edital verticalizado.',
  },
  {
    key: 'EDITAL_100',
    title: 'Edital Esgotado 🥇',
    description: 'Concluiu 100% dos tópicos do edital verticalizado!',
  },
];

// Evento customizado para escuta reativa da UI
export const GAMIFICATION_EVENT_NAME = 'omnitrack_gamification_event';

export function triggerGamificationEvent(reward: GamificationReward) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(GAMIFICATION_EVENT_NAME, { detail: reward });
    window.dispatchEvent(event);
  }
}

// Avalia progresso de XP e calcula se o usuário subiu de nível
export function processXpGain(
  currentProfile: Profile,
  xpGained: number,
  reason: string
): { updatedProfile: Profile; reward: GamificationReward } {
  let xp = (currentProfile.current_xp || 0) + xpGained;
  let level = currentProfile.current_level || 1;
  const oldLevel = level;
  let leveledUp = false;

  // Checa se ultrapassou o XP necessário para o nível atual
  let xpNeeded = getXpForNextLevel(level);
  while (xp >= xpNeeded) {
    xp -= xpNeeded;
    level += 1;
    leveledUp = true;
    xpNeeded = getXpForNextLevel(level);
  }

  const newTitle = getRankTitle(level);

  const updatedProfile: Profile = {
    ...currentProfile,
    current_xp: xp,
    current_level: level,
    rank_title: newTitle,
    last_active_date: new Date().toISOString().split('T')[0],
  };

  const reward: GamificationReward = {
    xpGained,
    reason,
    leveledUp,
    oldLevel,
    newLevel: level,
    newTitle,
    unlockedBadges: [],
  };

  return { updatedProfile, reward };
}

// Avalia metas diárias para manter o fogo do Streak (🔥)
export interface DailyGoalStatus {
  workoutOrWater: boolean;
  nutritionMacros: boolean;
  studyOrQuestions: boolean;
  isStreakActive: boolean;
}

export function evaluateDailyStreak(
  workoutLoggedToday: boolean,
  waterGoalMetToday: boolean,
  nutritionGoalMetToday: boolean,
  studied45mOr15QuestionsToday: boolean
): DailyGoalStatus {
  const goal1 = workoutLoggedToday || waterGoalMetToday;
  const goal2 = nutritionGoalMetToday;
  const goal3 = studied45mOr15QuestionsToday;

  const countMet = (goal1 ? 1 : 0) + (goal2 ? 1 : 0) + (goal3 ? 1 : 0);
  const isStreakActive = countMet >= 2;

  return {
    workoutOrWater: goal1,
    nutritionMacros: goal2,
    studyOrQuestions: goal3,
    isStreakActive,
  };
}
