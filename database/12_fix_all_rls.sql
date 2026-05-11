-- ============================================================
-- Minha Ótica — Reset completo e definitivo de RLS
-- Elimina toda recursão com funções SECURITY DEFINER
-- Execute no Supabase Studio > SQL Editor
-- ============================================================

-- ── 1. Funções helper (SECURITY DEFINER = bypass RLS interno) ─

create or replace function get_my_company_id()
returns uuid language sql stable security definer as $$
  select company_id from profiles where id = auth.uid()
$$;

create or replace function is_saas_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from saas_admins where id = auth.uid() and is_active = true
  )
$$;

-- ── 2. Remove TODAS as policies (nomes PT e EN) ───────────────

-- saas_admins
drop policy if exists "saas_admins_admin_all"    on saas_admins;
drop policy if exists "saas_admins_admin_read"   on saas_admins;
drop policy if exists "saas_admins_select"       on saas_admins;
drop policy if exists "saas_admins_self"         on saas_admins;
drop policy if exists "saas_admins_self_update"  on saas_admins;

-- companies
drop policy if exists "companies_saas_admin_all"       on companies;
drop policy if exists "companies_own"                  on companies;
drop policy if exists "companies_own_read"             on companies;
drop policy if exists "companies_admin_update"         on companies;
drop policy if exists "Empresa: admin pode atualizar"  on companies;
drop policy if exists "Empresa: ver própria"           on companies;

-- profiles
drop policy if exists "profiles_saas_admin_all"        on profiles;
drop policy if exists "profiles_own"                   on profiles;
drop policy if exists "profiles_own_read"              on profiles;
drop policy if exists "profiles_own_update"            on profiles;
drop policy if exists "profiles_company"               on profiles;
drop policy if exists "profiles_company_read"          on profiles;
drop policy if exists "Perfil: admin gerencia"         on profiles;
drop policy if exists "Perfil: atualizar próprio"      on profiles;
drop policy if exists "Perfil: ver da própria empresa" on profiles;
drop policy if exists "Perfil: ver próprio"            on profiles;

-- patients
drop policy if exists "patients_saas_admin_all"        on patients;
drop policy if exists "patients_company"               on patients;
drop policy if exists "Paciente: da própria empresa"   on patients;

-- subscriptions
drop policy if exists "subscriptions_saas_admin_all"   on subscriptions;
drop policy if exists "subscriptions_admin_write"      on subscriptions;
drop policy if exists "subscriptions_company_read"     on subscriptions;

-- plans
drop policy if exists "plans_saas_admin_all"           on plans;
drop policy if exists "plans_admin_all"                on plans;
drop policy if exists "plans_authenticated_read"       on plans;
drop policy if exists "plans_public_read"              on plans;

-- ── 3. Recria policies sem recursão ──────────────────────────

-- SAAS_ADMINS
-- Lê: própria linha OU qualquer admin (is_saas_admin usa SECURITY DEFINER)
create policy "saas_admins_select" on saas_admins
  for select using (id = auth.uid() or is_saas_admin());

-- Atualiza: só o próprio perfil
create policy "saas_admins_self_update" on saas_admins
  for update using (id = auth.uid()) with check (id = auth.uid());

-- COMPANIES
-- Lê: própria empresa (get_my_company_id usa SECURITY DEFINER, sem recursão)
create policy "companies_own_read" on companies
  for select using (id = get_my_company_id());

-- Atualiza: própria empresa
create policy "companies_admin_update" on companies
  for update
  using (id = get_my_company_id())
  with check (id = get_my_company_id());

-- Super admin: acesso total
create policy "companies_saas_admin_all" on companies
  for all using (is_saas_admin()) with check (is_saas_admin());

-- PROFILES
-- Lê: próprio perfil
create policy "profiles_own_read" on profiles
  for select using (id = auth.uid());

-- Lê: colegas da mesma empresa (sem recursão via SECURITY DEFINER)
create policy "profiles_company_read" on profiles
  for select using (company_id = get_my_company_id());

-- Atualiza: próprio perfil
create policy "profiles_own_update" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Super admin: acesso total
create policy "profiles_saas_admin_all" on profiles
  for all using (is_saas_admin()) with check (is_saas_admin());

-- PATIENTS
-- Acesso: mesma empresa
create policy "patients_company" on patients
  for all
  using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

-- Super admin: acesso total
create policy "patients_saas_admin_all" on patients
  for all using (is_saas_admin()) with check (is_saas_admin());

-- SUBSCRIPTIONS
-- Lê: própria empresa
create policy "subscriptions_company_read" on subscriptions
  for select using (company_id = get_my_company_id());

-- Super admin: acesso total
create policy "subscriptions_saas_admin_all" on subscriptions
  for all using (is_saas_admin()) with check (is_saas_admin());

-- PLANS
-- Lê: qualquer autenticado
create policy "plans_authenticated_read" on plans
  for select using (auth.role() = 'authenticated');

-- Super admin: gerencia
create policy "plans_saas_admin_all" on plans
  for all using (is_saas_admin()) with check (is_saas_admin());

-- ── 4. Verificação final ──────────────────────────────────────
select tablename, policyname, cmd
from pg_policies
where tablename in ('saas_admins','companies','profiles','patients','subscriptions','plans')
order by tablename, policyname;
