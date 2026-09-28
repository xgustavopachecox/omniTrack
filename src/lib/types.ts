export interface Profile {
  id: string;
  daily_calorie_target: number;
  daily_protein_target: number;
  daily_carbs_target: number;
  daily_fats_target: number;
  daily_water_target: number;
  current_level?: number;
  current_xp?: number;
  rank_title?: string;
  streak_days?: number;
  last_active_date?: string;
  created_at: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  meal_name: string;
  meal_type?: string; // Ex: 'Café da Manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'
  log_date?: string; // YYYY-MM-DD
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  raw_input?: string;
  logged_at: string;
}

export interface WorkoutSet {
  set: number;
  reps: number;
  weight_each_side_kg: number;
  total_weight_kg: number;
}

export interface WorkoutSessionExercise {
  id?: string;
  session_id?: string;
  exercise_name: string;
  muscle_group: string;
  sets: WorkoutSet[];
  best_weight_kg: number;
  exercise_volume_kg: number;
  observation?: string;
  created_at?: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  title: string;
  session_date: string;
  total_session_volume_kg: number;
  coach_feedback?: string;
  raw_input?: string;
  created_at: string;
  exercises?: WorkoutSessionExercise[];
}

export interface UserPR {
  id: string;
  user_id: string;
  exercise_name: string;
  muscle_group: string;
  weight_kg: number;
  reps: number;
  achieved_at: string;
  workout_session_id?: string;
  created_at?: string;
}

export interface BodyMetric {
  id: string;
  user_id: string;
  weight_kg: number;
  photo_url?: string;
  notes?: string;
  logged_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
}

export type NoteCategory = 'treino' | 'estudos' | 'pensamentos' | 'ideias';

export interface SecondBrainNote {
  id: string;
  user_id: string;
  category: NoteCategory;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Gamification Types
export interface BadgeDetail {
  key: string;
  title: string;
  description: string;
}

export interface GamificationReward {
  xpGained: number;
  reason: string;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newTitle: string;
  unlockedBadges: (BadgeDetail | string)[];
}

export interface UserAchievement {
  id: string;
  user_id: string;
  badge_key: string;
  unlocked_at: string;
}

// Contests & TAF Types
export interface Contest {
  id: string;
  user_id: string;
  title: string;
  institution?: string;
  target_date?: string;
  is_active?: boolean;
  color_tag?: string;
  created_at: string;
}

export interface ContestSubjectTopic {
  id?: string;
  title: string;
  completed?: boolean;
}

export interface ContestSubject {
  id: string;
  user_id?: string;
  contest_id: string;
  subject_name: string;
  topic_name: string;
  is_completed: boolean;
  reviews_count?: number;
  created_at?: string;
  // Legacy backward compatibility fields
  title?: string;
  contest_name?: string;
  topics?: ContestSubjectTopic[];
}

export interface StudySession {
  id: string;
  user_id?: string;
  contest_id: string;
  subject_id?: string;
  subject_name?: string;
  minutes_studied: number;
  questions_solved: number;
  questions_correct: number;
  notes?: string;
  logged_at: string;
  created_at?: string;
  // Legacy backward compatibility field
  duration_minutes?: number;
  subject?: string;
}

export interface ContestTafRequirement {
  id: string;
  user_id?: string;
  contest_id: string;
  modality: string;
  target_value: number;
  unit: string;
  current_best: number;
  is_passed: boolean;
  created_at?: string;
}

export interface TafBenchmark {
  id: string;
  user_id?: string;
  modality: string;
  score: number;
  score_value?: number;
  passed: boolean;
  logged_at: string;
}

export interface GeminiStudyResponse {
  summary: string;
  title?: string;
  mode?: string;
  explanation?: string;
  mnemonic?: string;
  keyTakeaways?: string[];
  question?: {
    statement: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export interface GeminiParseEditalResponse {
  contest_title: string;
  institution: string;
  salary?: string;
  target_date?: string;
  registration_deadline?: string;
  summary_points?: string[];
  taf_requirements?: {
    modality: string;
    target_value: number;
    unit: string;
  }[];
  syllabus: {
    subject_name: string;
    topics: string[];
  }[];
}

// AI Response Interfaces
export interface GeminiNutritionResponse {
  meal_name: string;
  meal_type?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  feedback: string;
}

export interface GeminiWorkoutSessionExerciseResponse {
  exercise_name: string;
  muscle_group: string;
  sets: WorkoutSet[];
  best_weight_kg: number;
  exercise_volume_kg: number;
  observation: string;
}

export interface GeminiWorkoutSessionResponse {
  workout_title: string;
  exercises: GeminiWorkoutSessionExerciseResponse[];
  total_session_volume_kg: number;
  coach_feedback: string;
}

export interface MuscleScoreDetail {
  nota: number | null;
  critica: string;
}

export interface PhysiqueAssessmentScores {
  peito?: MuscleScoreDetail;
  ombros?: MuscleScoreDetail;
  bracos?: MuscleScoreDetail;
  abdomen?: MuscleScoreDetail;
  costas?: MuscleScoreDetail;
  quadriceps?: MuscleScoreDetail;
  panturrilhas?: MuscleScoreDetail;
  [key: string]: MuscleScoreDetail | undefined;
}

export interface PhysiqueAssessment {
  id: string;
  user_id: string;
  photo_url: string;
  assessment_date: string;
  overall_score: number;
  estimated_bf_percent?: string;
  scores: PhysiqueAssessmentScores;
  strengths: string[];
  weaknesses: string[];
  detailed_critique: string;
  training_adjustments: string;
  created_at: string;
}

export interface GeminiPhysiqueAssessmentResponse {
  overall_score: number;
  estimated_bf_percent: string;
  scores: PhysiqueAssessmentScores;
  strengths: string[];
  weaknesses: string[];
  detailed_critique: string;
  training_adjustments: string;
}

