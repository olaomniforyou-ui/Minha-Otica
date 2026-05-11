-- ============================================================
-- Minha Ótica — RLS: Super Admin bypass
-- Execute no Supabase Studio > SQL Editor
-- Permite que saas_admins acessem todos os dados da plataforma
-- ============================================================

-- Helper reutilizável
create or replace function is_saas_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from saas_admins where id = auth.uid() and is_active = true
  )
$$;

-- ── COMPANIES ────────────────────────────────────────────────
create policy "companies_saas_admin_all" on companies
  for all
  using (is_saas_admin())
  with check (is_saas_admin());

-- ── PROFILES ─────────────────────────────────────────────────
create policy "profiles_saas_admin_all" on profiles
  for all
  using (is_saas_admin())
  with check (is_saas_admin());

-- ── PATIENTS ─────────────────────────────────────────────────
-- (necessário para contagem no detalhe da empresa)
create policy "patients_saas_admin_all" on patients
  for all
  using (is_saas_admin())
  with check (is_saas_admin());
