-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Perfis
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_calorie_target INT DEFAULT 2500,
    daily_protein_target INT DEFAULT 160,
    daily_carbs_target INT DEFAULT 280,
    daily_fats_target INT DEFAULT 70,
    daily_water_target INT DEFAULT 3000,
    current_xp INT DEFAULT 0,
    current_level INT DEFAULT 1,
    streak_days INT DEFAULT 0,
    rank_title TEXT DEFAULT 'Aspirante / Recruta',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Registro de Nutrição
CREATE TABLE IF NOT EXISTS nutrition_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    meal_name TEXT NOT NULL,
    meal_type TEXT DEFAULT 'Refeição', -- Ex: 'Café da Manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'
    log_date DATE DEFAULT CURRENT_DATE,
    calories INT NOT NULL,
    protein_g NUMERIC(6,2) NOT NULL,
    carbs_g NUMERIC(6,2) NOT NULL,
    fats_g NUMERIC(6,2) NOT NULL,
    raw_input TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir colunas e índices adicionais na tabela nutrition_logs se ela já existir
ALTER TABLE nutrition_logs ADD COLUMN IF NOT EXISTS meal_type TEXT DEFAULT 'Refeição';
ALTER TABLE nutrition_logs ADD COLUMN IF NOT EXISTS log_date DATE DEFAULT CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON nutrition_logs(user_id, log_date DESC);

-- 3. Sessão de Treino Completa (1 para N com Exercícios)
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL, -- Ex: "Treino de Peito e Tríceps", "Leg Day Pesado"
    session_date DATE DEFAULT CURRENT_DATE NOT NULL,
    total_session_volume_kg NUMERIC(10,2) DEFAULT 0,
    coach_feedback TEXT,
    raw_input TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Exercícios Realizados na Sessão
CREATE TABLE IF NOT EXISTS workout_session_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
    exercise_name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    sets JSONB NOT NULL, -- Ex: [{"set": 1, "reps": 10, "weight_each_side_kg": 30, "total_weight_kg": 80}]
    best_weight_kg NUMERIC(6,2) NOT NULL, -- Carga máxima levantada nesta sessão
    exercise_volume_kg NUMERIC(8,2) NOT NULL,
    observation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Recordes Pessoais (Personal Records - PRs)
CREATE TABLE IF NOT EXISTS user_prs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    exercise_name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    weight_kg NUMERIC(6,2) NOT NULL,
    reps INT NOT NULL,
    achieved_at DATE NOT NULL,
    workout_session_id UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, exercise_name)
);

-- 6. Métricas Corporais & Fotos de Progresso
CREATE TABLE IF NOT EXISTS body_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    weight_kg NUMERIC(5,2) NOT NULL,
    photo_url TEXT,
    notes TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Consumo de Água
CREATE TABLE IF NOT EXISTS water_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    amount_ml INT NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Segundo Cérebro (Estudos, Ideias e Pensamentos)
CREATE TABLE IF NOT EXISTS second_brain_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    category TEXT CHECK (category IN ('treino', 'estudos', 'pensamentos', 'ideias')) NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Avaliação Fisiológica e Muscular (IA Computacional)
CREATE TABLE IF NOT EXISTS physique_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    photo_url TEXT NOT NULL,
    assessment_date DATE DEFAULT CURRENT_DATE NOT NULL,
    overall_score NUMERIC(3,1) NOT NULL, -- Nota geral de 0.0 a 10.0
    estimated_bf_percent TEXT, -- Faixa estimada de gordura corporal (ex: "14% - 16%")
    scores JSONB NOT NULL, -- Notas detalhadas por agrupamento
    strengths TEXT[] DEFAULT '{}', -- Pontos fortes
    weaknesses TEXT[] DEFAULT '{}', -- Pontos a melhorar
    detailed_critique TEXT NOT NULL, -- Análise técnica honesta e sincera
    training_adjustments TEXT NOT NULL, -- Recomendações práticas de treino
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Módulo de Concursos Multi-Edital
-- 10.1 Tabela Pai: Concursos Alvo
CREATE TABLE IF NOT EXISTS contests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL, -- Ex: "Polícia Federal - Agente", "INSS", "Banco do Brasil"
    institution TEXT, -- Ex: "Cebraspe", "FGV", "FCC"
    target_date DATE, -- Data prevista da prova
    is_active BOOLEAN DEFAULT TRUE, -- Concurso com foco prioritário
    color_tag TEXT DEFAULT '#3b82f6', -- Cor de identificação visual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10.2 Matérias e Tópicos do Edital Verticalizado (Vinculados ao Concurso)
CREATE TABLE IF NOT EXISTS contest_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    contest_id UUID REFERENCES contests(id) ON DELETE CASCADE NOT NULL,
    subject_name TEXT NOT NULL, -- Ex: "Direito Administrativo", "Português"
    topic_name TEXT NOT NULL,   -- Ex: "Atos Administrativos", "Crase"
    is_completed BOOLEAN DEFAULT FALSE,
    reviews_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10.3 Sessões de Estudo e Questões (Vinculadas ao Concurso e à Matéria)
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    contest_id UUID REFERENCES contests(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES contest_subjects(id) ON DELETE SET NULL,
    minutes_studied INT NOT NULL,
    questions_solved INT DEFAULT 0,
    questions_correct INT DEFAULT 0,
    notes TEXT,
    logged_at DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10.4 Metas e Índices de TAF por Concurso
CREATE TABLE IF NOT EXISTS contest_taf_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    contest_id UUID REFERENCES contests(id) ON DELETE CASCADE NOT NULL,
    modality TEXT NOT NULL, -- Ex: "Barra Fixa", "Corrida 12 min", "Natação 50m"
    target_value NUMERIC(6,2) NOT NULL, -- Meta mínima exigida no edital
    unit TEXT NOT NULL, -- "reps", "metros", "segundos"
    current_best NUMERIC(6,2) DEFAULT 0,
    is_passed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prs ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE second_brain_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE physique_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_taf_requirements ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own profile') THEN
        CREATE POLICY "Users can manage own profile" ON profiles FOR ALL USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own nutrition') THEN
        CREATE POLICY "Users can manage own nutrition" ON nutrition_logs FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own workout_sessions') THEN
        CREATE POLICY "Users manage own workout_sessions" ON workout_sessions FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own workout_session_exercises') THEN
        CREATE POLICY "Users manage own workout_session_exercises" ON workout_session_exercises FOR ALL USING (
            session_id IN (SELECT id FROM workout_sessions WHERE user_id = auth.uid())
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own user_prs') THEN
        CREATE POLICY "Users manage own user_prs" ON user_prs FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own metrics') THEN
        CREATE POLICY "Users can manage own metrics" ON body_metrics FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own water') THEN
        CREATE POLICY "Users can manage own water" ON water_logs FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own notes') THEN
        CREATE POLICY "Users can manage own notes" ON second_brain_notes FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own physique_assessments') THEN
        CREATE POLICY "Users manage own physique_assessments" ON physique_assessments FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own contests') THEN
        CREATE POLICY "Users manage own contests" ON contests FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own contest_subjects') THEN
        CREATE POLICY "Users manage own contest_subjects" ON contest_subjects FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own study_sessions') THEN
        CREATE POLICY "Users manage own study_sessions" ON study_sessions FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own contest_taf_requirements') THEN
        CREATE POLICY "Users manage own contest_taf_requirements" ON contest_taf_requirements FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Função e Trigger para criar perfil logo após o cadastro no auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    daily_calorie_target, 
    daily_protein_target, 
    daily_carbs_target, 
    daily_fats_target, 
    daily_water_target,
    current_xp,
    current_level,
    streak_days,
    rank_title
  )
  VALUES (
    NEW.id,
    2500,
    160,
    280,
    70,
    3000,
    0,
    1,
    0,
    'Aspirante / Recruta'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparado no INSERT da auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

