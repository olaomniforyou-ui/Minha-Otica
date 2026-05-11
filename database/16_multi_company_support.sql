-- ============================================================
-- Suporte Multi-Empresa — versão corrigida
--
-- A abordagem original (PK composta em profiles) foi descartada porque:
--   • Quebra todas as FKs simples: seller_id REFERENCES profiles(id)
--   • No Supabase, auth.uid() retorna só o id — referências compostas
--     não funcionam com RLS baseado em auth.uid()
--
-- Abordagem adotada:
--   • profiles.id permanece como PK única (UUID por linha)
--   • Múltiplas empresas = múltiplas linhas em profiles com UUIDs distintos
--   • Isolamento garantido pelo campo company_id + RLS
--   • UNIQUE (id, company_id) adicionado apenas para integridade semântica
-- ============================================================

BEGIN;

-- Remove FKs antigas que possam ter ficado inválidas de tentativas anteriores
ALTER TABLE prescriptions  DROP CONSTRAINT IF EXISTS prescriptions_created_by_fkey;
ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_created_by_fkey;
ALTER TABLE lab_trackings  DROP CONSTRAINT IF EXISTS lab_trackings_created_by_fkey;
ALTER TABLE sales           DROP CONSTRAINT IF EXISTS sales_created_by_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_created_by_fkey') THEN
    ALTER TABLE suppliers DROP CONSTRAINT suppliers_created_by_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_created_by_fkey') THEN
    ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_created_by_fkey;
  END IF;
END $$;

-- Garante que a PK de profiles seja simples (só id), desfazendo qualquer
-- tentativa anterior de torná-la composta
DO $$
BEGIN
  -- Se a PK já foi alterada para composta, reverte
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_pkey'
      AND contype = 'p'
      AND array_length(conkey, 1) > 1
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_pkey CASCADE;
    ALTER TABLE profiles ADD PRIMARY KEY (id);
  END IF;

  -- Se a PK foi removida completamente, recria simples
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE profiles ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Constraint semântica: um usuário (auth.uid) não pode ter dois perfis
-- na mesma empresa. Requer coluna user_id se existir.
-- (Opcional — só executa se a coluna user_id existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE profiles
      DROP CONSTRAINT IF EXISTS profiles_user_company_unique;
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_user_company_unique UNIQUE (user_id, company_id);
  END IF;
END $$;

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

-- Recriar FKs simples (apenas id, sem company_id) — compatível com auth.uid()
ALTER TABLE prescriptions
  ADD CONSTRAINT prescriptions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE service_orders
  ADD CONSTRAINT service_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE lab_trackings
  ADD CONSTRAINT lab_trackings_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE sales
  ADD CONSTRAINT sales_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

COMMIT;
