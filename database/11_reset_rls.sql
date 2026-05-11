-- ============================================================
-- Minha Ótica — Reset completo de RLS
-- Execute no Supabase Studio > SQL Editor
-- ============================================================

-- ── 1. Remove todas as policies existentes ────────────────────

-- saas_admins
drop policy if exists "saas_admins_admin_all"    on saas_admins;
drop policy if exists "saas_admins_admin_read"   on saas_admins;
drop policy if exists "saas_admins_self"         on saas_admins;
drop policy if exists "saas_admins_self_update"  on saas_admins;

-- companies
drop policy if exists "companies_saas_admin_all"  on companies;
drop policy if exists "companies_own"             on companies;

-- profiles
drop policy if exists "profiles_saas_admin_all"   on profiles;
drop policy if exists "profiles_own"              on profiles;
drop policy if exists "profiles_company"          on profiles;

-- patients
drop policy if exists "patients_saas_admin_all"   on patients;
drop policy if exists "patients_company"          on patients;

-- subscriptions
drop policy if exists "subscriptions_saas_admin_all" on subscriptions;

-- plans
drop policy if exists "plans_saas_admin_all"      on plans;
drop policy if exists "plans_public_read"         on plans;

-- ── 2. Recria a função helper (SECURITY DEFINER) ──────────────
create or replace function is_saas_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from saas_admins where id = auth.uid() and is_active = true
  )
$$;

-- ── 3. Policies em saas_admins ────────────────────────────────
-- SELECT: admin lê qualquer linha; usuário lê a própria
create policy "saas_admins_select" on saas_admins
  for select using (id = auth.uid() or is_saas_admin());

-- UPDATE: admin atualiza apenas o próprio perfil
create policy "saas_admins_self_update" on saas_admins
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ── 4. Policies para as demais tabelas ───────────────────────

-- companies: admin vê tudo + políticas normais de tenant
create policy "companies_saas_admin_all" on companies
  for all using (is_saas_admin()) with check (is_saas_admin());

-- profiles: admin vê tudo
create policy "profiles_saas_admin_all" on profiles
  for all using (is_saas_admin()) with check (is_saas_admin());

-- patients: admin vê tudo
create policy "patients_saas_admin_all" on patients
  for all using (is_saas_admin()) with check (is_saas_admin());

-- subscriptions: admin vê tudo
create policy "subscriptions_saas_admin_all" on subscriptions
  for all using (is_saas_admin()) with check (is_saas_admin());

-- plans: admin gerencia; qualquer autenticado pode ler
create policy "plans_saas_admin_all" on plans
  for all using (is_saas_admin()) with check (is_saas_admin());

create policy "plans_authenticated_read" on plans
  for select using (auth.role() = 'authenticated');

-- ── 5. Verificação ───────────────────────────────────────────
select tablename, policyname, cmd
from pg_policies
where tablename in ('saas_admins','companies','profiles','patients','subscriptions','plans')
order by tablename, policyname;
