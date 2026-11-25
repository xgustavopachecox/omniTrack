-- ============================================================================
-- OMNITRACK - SCHEMA COMPLETO E MIGRAÇÃO CONSOLIDADA DE PRODUÇÃO (SUPABASE)
-- Cobre todas as 19 tabelas do sistema com RLS (auth.uid() = user_id) e índices.
-- Idempotente: pode ser rodado com segurança em projetos novos ou existentes.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_calorie_target integer NOT NULL DEFAULT 2500,
  daily_protein_target integer NOT NULL DEFAULT 160,
  daily_carbs_target integer NOT NULL DEFAULT 280,
  daily_fats_target integer NOT NULL DEFAULT 70,
  daily_water_target integer NOT NULL DEFAULT 3000,
  weekly_workout_target integer NOT NULL DEFAULT 4,
  current_level integer NOT NULL DEFAULT 1,
  current_xp integer NOT NULL DEFAULT 0,
  rank_title text NOT NULL DEFAULT 'Iniciante / Recruta',
  streak_days integer NOT NULL DEFAULT 0,
  last_active_date text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weekly_workout_target integer NOT NULL DEFAULT 4;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_level integer NOT NULL DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_xp integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rank_title text NOT NULL DEFAULT 'Iniciante / Recruta';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_date text;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_all_own" ON public.profiles;
CREATE POLICY "profiles_all_own" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. NUTRITION LOGS
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_name text NOT NULL,
  meal_type text DEFAULT 'Refeição',
  log_date date DEFAULT CURRENT_DATE,
  calories numeric(10,2) NOT NULL DEFAULT 0,
  protein_g numeric(10,2) NOT NULL DEFAULT 0,
  carbs_g numeric(10,2) NOT NULL DEFAULT 0,
  fats_g numeric(10,2) NOT NULL DEFAULT 0,
  raw_input text,
  logged_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nutrition_logs ADD COLUMN IF NOT EXISTS meal_type text DEFAULT 'Refeição';
ALTER TABLE public.nutrition_logs ADD COLUMN IF NOT EXISTS log_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nutrition_logs_all_own" ON public.nutrition_logs;
CREATE POLICY "nutrition_logs_all_own" ON public.nutrition_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. WATER LOGS
CREATE TABLE IF NOT EXISTS public.water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml integer NOT NULL DEFAULT 0,
  logged_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "water_logs_all_own" ON public.water_logs;
CREATE POLICY "water_logs_all_own" ON public.water_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. WORKOUT SESSIONS
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  total_session_volume_kg numeric(12,2) NOT NULL DEFAULT 0,
  coach_feedback text,
  raw_input text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_sessions_all_own" ON public.workout_sessions;
CREATE POLICY "workout_sessions_all_own" ON public.workout_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. WORKOUT SESSION EXERCISES
CREATE TABLE IF NOT EXISTS public.workout_session_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  muscle_group text NOT NULL,
  sets jsonb NOT NULL DEFAULT '[]'::jsonb,
  best_weight_kg numeric(10,2) NOT NULL DEFAULT 0,
  exercise_volume_kg numeric(12,2) NOT NULL DEFAULT 0,
  observation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_session_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_session_exercises_all_own" ON public.workout_session_exercises;
CREATE POLICY "workout_session_exercises_all_own" ON public.workout_session_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = workout_session_exercises.session_id
        AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = workout_session_exercises.session_id
        AND ws.user_id = auth.uid()
    )
  );

-- 6. USER PRS
CREATE TABLE IF NOT EXISTS public.user_prs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  muscle_group text NOT NULL,
  weight_kg numeric(10,2) NOT NULL DEFAULT 0,
  reps integer NOT NULL DEFAULT 1,
  achieved_at date NOT NULL DEFAULT CURRENT_DATE,
  workout_session_id uuid REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_name)
);
ALTER TABLE public.user_prs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_prs_all_own" ON public.user_prs;
CREATE POLICY "user_prs_all_own" ON public.user_prs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. BODY METRICS
CREATE TABLE IF NOT EXISTS public.body_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg numeric(8,2) NOT NULL,
  photo_url text,
  notes text,
  logged_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "body_metrics_all_own" ON public.body_metrics;
CREATE POLICY "body_metrics_all_own" ON public.body_metrics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. PHYSIQUE ASSESSMENTS
CREATE TABLE IF NOT EXISTS public.physique_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  overall_score numeric(5,2) NOT NULL DEFAULT 0,
  estimated_bf_percent text,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  detailed_critique text,
  training_adjustments text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.physique_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "physique_assessments_all_own" ON public.physique_assessments;
CREATE POLICY "physique_assessments_all_own" ON public.physique_assessments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. SECOND BRAIN NOTES
CREATE TABLE IF NOT EXISTS public.second_brain_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'pensamentos',
  title text NOT NULL,
  content text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.second_brain_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "second_brain_notes_all_own" ON public.second_brain_notes;
CREATE POLICY "second_brain_notes_all_own" ON public.second_brain_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. CONTESTS
CREATE TABLE IF NOT EXISTS public.contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  institution text,
  target_date date,
  is_active boolean NOT NULL DEFAULT true,
  color_tag text DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contests_all_own" ON public.contests;
CREATE POLICY "contests_all_own" ON public.contests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 11. CONTEST SUBJECTS
CREATE TABLE IF NOT EXISTS public.contest_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  topic_name text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  reviews_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contest_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contest_subjects_all_own" ON public.contest_subjects;
CREATE POLICY "contest_subjects_all_own" ON public.contest_subjects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 12. STUDY SESSIONS
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.contest_subjects(id) ON DELETE SET NULL,
  subject_name text,
  minutes_studied integer NOT NULL DEFAULT 0,
  questions_solved integer NOT NULL DEFAULT 0,
  questions_correct integer NOT NULL DEFAULT 0,
  notes text,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_sessions_all_own" ON public.study_sessions;
CREATE POLICY "study_sessions_all_own" ON public.study_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 13. CONTEST TAF REQUIREMENTS
CREATE TABLE IF NOT EXISTS public.contest_taf_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  modality text NOT NULL,
  target_value numeric(10,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'reps',
  current_best numeric(10,2) NOT NULL DEFAULT 0,
  is_passed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contest_taf_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contest_taf_requirements_all_own" ON public.contest_taf_requirements;
CREATE POLICY "contest_taf_requirements_all_own" ON public.contest_taf_requirements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 14. MOCK EXAMS
CREATE TABLE IF NOT EXISTS public.mock_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  title text NOT NULL,
  scoring_system text NOT NULL DEFAULT 'cebraspe_penalty',
  total_questions integer NOT NULL DEFAULT 0,
  time_limit_minutes integer NOT NULL DEFAULT 60,
  duration_taken_seconds integer NOT NULL DEFAULT 0,
  score_achieved numeric(10,2) NOT NULL DEFAULT 0,
  percentage_score numeric(5,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mock_exams_all_own" ON public.mock_exams;
CREATE POLICY "mock_exams_all_own" ON public.mock_exams
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 15. MOCK EXAM QUESTIONS
CREATE TABLE IF NOT EXISTS public.mock_exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  topic_name text,
  question_statement text NOT NULL,
  question_type text NOT NULL DEFAULT 'true_false',
  options jsonb DEFAULT '[]'::jsonb,
  correct_answer text NOT NULL,
  user_answer text,
  is_correct boolean,
  explanation text
);
ALTER TABLE public.mock_exam_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mock_exam_questions_all_own" ON public.mock_exam_questions;
CREATE POLICY "mock_exam_questions_all_own" ON public.mock_exam_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.mock_exams me
      WHERE me.id = mock_exam_questions.exam_id
        AND me.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mock_exams me
      WHERE me.id = mock_exam_questions.exam_id
        AND me.user_id = auth.uid()
    )
  );

-- 16. ERROR NOTEBOOK
CREATE TABLE IF NOT EXISTS public.error_notebook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.mock_exam_questions(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  topic_name text,
  error_reason text DEFAULT 'Não sabia o conteúdo',
  ai_clarification text,
  is_mastered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.error_notebook ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "error_notebook_all_own" ON public.error_notebook;
CREATE POLICY "error_notebook_all_own" ON public.error_notebook
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 17. SCHEDULED REVIEWS (SRS)
CREATE TABLE IF NOT EXISTS public.scheduled_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.contest_subjects(id) ON DELETE CASCADE,
  review_stage integer NOT NULL DEFAULT 1,
  scheduled_for date NOT NULL DEFAULT CURRENT_DATE,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scheduled_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scheduled_reviews_all_own" ON public.scheduled_reviews;
CREATE POLICY "scheduled_reviews_all_own" ON public.scheduled_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 18. FINANCIAL TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  description text NOT NULL,
  category text NOT NULL,
  place text,
  payment_method text NOT NULL DEFAULT 'Pix',
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  is_recurring boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_date
  ON public.financial_transactions (user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_place
  ON public.financial_transactions (user_id, place);
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_transactions_all_own" ON public.financial_transactions;
CREATE POLICY "financial_transactions_all_own" ON public.financial_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 19. FINANCIAL GOALS (COFRINHOS)
CREATE TABLE IF NOT EXISTS public.financial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount numeric(12,2) NOT NULL CHECK (target_amount >= 0),
  current_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline date,
  category text,
  color text DEFAULT '#06b6d4',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_created
  ON public.financial_goals (user_id, created_at DESC);
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_goals_all_own" ON public.financial_goals;
CREATE POLICY "financial_goals_all_own" ON public.financial_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 20. FINANCIAL GOAL CONTRIBUTIONS
CREATE TABLE IF NOT EXISTS public.financial_goal_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES public.financial_goals(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  contribution_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_financial_goal_contributions_user_goal
  ON public.financial_goal_contributions (user_id, goal_id, contribution_date DESC);
ALTER TABLE public.financial_goal_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_goal_contributions_all_own" ON public.financial_goal_contributions;
CREATE POLICY "financial_goal_contributions_all_own" ON public.financial_goal_contributions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 21. FINANCIAL VISION PLANS
CREATE TABLE IF NOT EXISTS public.financial_vision_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  horizon text NOT NULL CHECK (horizon IN ('short', 'medium', 'long', 'freedom')),
  target_year integer,
  target_amount numeric(12,2),
  content text NOT NULL,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'achieved')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_financial_vision_plans_user_horizon
  ON public.financial_vision_plans (user_id, horizon, created_at DESC);
ALTER TABLE public.financial_vision_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_vision_plans_all_own" ON public.financial_vision_plans;
CREATE POLICY "financial_vision_plans_all_own" ON public.financial_vision_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
