-- ============================================================================
-- OMNITRACK - MÓDULO FINANCEIRO COMPLETO (SUPABASE SQL SCHEMA)
-- Tabelas: financial_transactions, financial_goals,
--          financial_goal_contributions, financial_vision_plans
-- Inclui: Primary Keys, Foreign Keys, Checks, Índices de Performance e RLS
-- ============================================================================

-- Habilita extensão pgcrypto se necessário para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABELA: financial_transactions (Movimentações do Extrato)
-- ----------------------------------------------------------------------------
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

-- Índices solicitados para alta performance em filtros de data e estabelecimento
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_date
  ON public.financial_transactions (user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_place
  ON public.financial_transactions (user_id, place);

-- Habilitar RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (CRUD restrito ao dono)
DROP POLICY IF EXISTS "financial_transactions_select_own" ON public.financial_transactions;
CREATE POLICY "financial_transactions_select_own"
  ON public.financial_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_transactions_insert_own" ON public.financial_transactions;
CREATE POLICY "financial_transactions_insert_own"
  ON public.financial_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_transactions_update_own" ON public.financial_transactions;
CREATE POLICY "financial_transactions_update_own"
  ON public.financial_transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_transactions_delete_own" ON public.financial_transactions;
CREATE POLICY "financial_transactions_delete_own"
  ON public.financial_transactions
  FOR DELETE
  USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 2. TABELA: financial_goals (Cofrinhos / Metas Financeiras)
-- ----------------------------------------------------------------------------
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

-- Habilitar RLS
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (CRUD restrito ao dono)
DROP POLICY IF EXISTS "financial_goals_select_own" ON public.financial_goals;
CREATE POLICY "financial_goals_select_own"
  ON public.financial_goals
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_goals_insert_own" ON public.financial_goals;
CREATE POLICY "financial_goals_insert_own"
  ON public.financial_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_goals_update_own" ON public.financial_goals;
CREATE POLICY "financial_goals_update_own"
  ON public.financial_goals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_goals_delete_own" ON public.financial_goals;
CREATE POLICY "financial_goals_delete_own"
  ON public.financial_goals
  FOR DELETE
  USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 3. TABELA: financial_goal_contributions (Histórico de Aportes e Resgates)
-- ----------------------------------------------------------------------------
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

-- Habilitar RLS
ALTER TABLE public.financial_goal_contributions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (CRUD restrito ao dono)
DROP POLICY IF EXISTS "financial_goal_contributions_select_own" ON public.financial_goal_contributions;
CREATE POLICY "financial_goal_contributions_select_own"
  ON public.financial_goal_contributions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_goal_contributions_insert_own" ON public.financial_goal_contributions;
CREATE POLICY "financial_goal_contributions_insert_own"
  ON public.financial_goal_contributions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_goal_contributions_update_own" ON public.financial_goal_contributions;
CREATE POLICY "financial_goal_contributions_update_own"
  ON public.financial_goal_contributions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_goal_contributions_delete_own" ON public.financial_goal_contributions;
CREATE POLICY "financial_goal_contributions_delete_own"
  ON public.financial_goal_contributions
  FOR DELETE
  USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 4. TABELA: financial_vision_plans (Visão de Futuro / Onde Quero Chegar)
-- ----------------------------------------------------------------------------
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

-- Trigger para atualizar updated_at automaticamente em financial_vision_plans
CREATE OR REPLACE FUNCTION public.handle_financial_vision_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_financial_vision_plans_updated_at ON public.financial_vision_plans;
CREATE TRIGGER trg_financial_vision_plans_updated_at
  BEFORE UPDATE ON public.financial_vision_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_financial_vision_updated_at();

-- Habilitar RLS
ALTER TABLE public.financial_vision_plans ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (CRUD restrito ao dono)
DROP POLICY IF EXISTS "financial_vision_plans_select_own" ON public.financial_vision_plans;
CREATE POLICY "financial_vision_plans_select_own"
  ON public.financial_vision_plans
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_vision_plans_insert_own" ON public.financial_vision_plans;
CREATE POLICY "financial_vision_plans_insert_own"
  ON public.financial_vision_plans
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_vision_plans_update_own" ON public.financial_vision_plans;
CREATE POLICY "financial_vision_plans_update_own"
  ON public.financial_vision_plans
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_vision_plans_delete_own" ON public.financial_vision_plans;
CREATE POLICY "financial_vision_plans_delete_own"
  ON public.financial_vision_plans
  FOR DELETE
  USING (auth.uid() = user_id);
