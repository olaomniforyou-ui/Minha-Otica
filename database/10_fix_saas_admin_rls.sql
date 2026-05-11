-- ============================================================
-- Minha Ótica — Fix: RLS recursivo em saas_admins
-- A policy "saas_admins_admin_all" consultava a própria tabela
-- dentro de um USING, causando recursão infinita no PostgreSQL.
-- Execute no Supabase Studio > SQL Editor
-- ============================================================

-- 1. Função helper com SECURITY DEFINER (bypassa RLS na consulta interna)
create or replace function is_saas_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from saas_admins where id = auth.uid() and is_active = true
  )
$$;

-- 2. Remove a policy recursiva
drop policy if exists "saas_admins_admin_all" on saas_admins;

-- 3. Recria sem recursão
--    SELECT: a saas_admins_self já cobre leitura do próprio registro.
--            Esta cobre leitura de todos os admins (para tela de usuários futura).
create policy "saas_admins_admin_read" on saas_admins
  for select
  using (is_saas_admin());

--    UPDATE: admin atualiza apenas o próprio perfil
create policy "saas_admins_self_update" on saas_admins
  for update
  using  (id = auth.uid())
  with check (id = auth.uid());

-- Verificação rápida (deve retornar as policies da tabela)
select policyname, cmd, qual
from pg_policies
where tablename = 'saas_admins';
