-- ============================================================
-- Minha Ótica SaaS — Tabelas Administrativas
-- Execute no Supabase Studio > SQL Editor
-- ============================================================

-- ── PLANOS ───────────────────────────────────────────────────
create table if not exists plans (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null unique,
  slug            text not null unique,
  description     text,
  price_monthly   numeric(10,2) not null default 0,
  price_yearly    numeric(10,2) not null default 0,
  max_users       integer not null default 3,
  max_patients    integer not null default 500,
  features        jsonb not null default '[]',
  is_active       boolean not null default true,
  is_popular      boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

insert into plans (name, slug, description, price_monthly, price_yearly, max_users, max_patients, features, is_popular, sort_order)
values
  ('Básico',       'basico',       'Ideal para óticas independentes',           97.00,   970.00,  2,   300, '["Dashboard","Pacientes","OS","Estoque básico"]',            false, 1),
  ('Profissional', 'profissional', 'Para óticas em crescimento',               197.00,  1970.00,  5,  1500, '["Tudo do Básico","Relatórios","Lab","Fornecedores"]',        true,  2),
  ('Empresarial',  'empresarial',  'Para redes e franquias de ótica',          397.00,  3970.00, 20, 99999, '["Tudo do Pro","Multi-filial","Suporte prioritário","SLA"]',  false, 3)
on conflict (slug) do nothing;

-- ── SUPER ADMINS ─────────────────────────────────────────────
create table if not exists saas_admins (
  id              uuid primary key references auth.users on delete cascade,
  full_name       text not null,
  email           text not null,
  avatar_url      text,
  is_active       boolean not null default true,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────
create table if not exists subscriptions (
  id                   uuid primary key default uuid_generate_v4(),
  company_id           uuid not null references companies(id) on delete cascade,
  plan_id              uuid not null references plans(id),
  status               text not null default 'trial' check (status in ('trial','active','suspended','cancelled','past_due')),
  billing_cycle        text not null default 'monthly' check (billing_cycle in ('monthly','yearly')),
  amount               numeric(10,2) not null default 0,
  trial_ends_at        timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz not null default (now() + interval '30 days'),
  cancelled_at         timestamptz,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (company_id)
);

-- ── SUBSCRIPTION HISTORY ──────────────────────────────────────
create table if not exists subscription_history (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references companies(id) on delete cascade,
  plan_id     uuid not null references plans(id),
  status      text not null,
  amount      numeric(10,2) not null default 0,
  changed_by  uuid references saas_admins(id),
  notes       text,
  created_at  timestamptz not null default now()
);

-- ── TRIGGERS ─────────────────────────────────────────────────
create trigger trg_plans_updated_at
  before update on plans
  for each row execute function update_updated_at();

create trigger trg_saas_admins_updated_at
  before update on saas_admins
  for each row execute function update_updated_at();

create trigger trg_subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table plans                enable row level security;
alter table saas_admins          enable row level security;
alter table subscriptions        enable row level security;
alter table subscription_history enable row level security;

create policy "plans_public_read" on plans for select using (true);
create policy "plans_admin_all"   on plans for all
  using (exists (select 1 from saas_admins where id = auth.uid() and is_active = true))
  with check (exists (select 1 from saas_admins where id = auth.uid() and is_active = true));

create policy "saas_admins_self"      on saas_admins for select using (auth.uid() = id);
create policy "saas_admins_admin_all" on saas_admins for all
  using (exists (select 1 from saas_admins where id = auth.uid() and is_active = true))
  with check (exists (select 1 from saas_admins where id = auth.uid() and is_active = true));

create policy "subscriptions_company_read" on subscriptions for select
  using (
    company_id in (select company_id from profiles where id = auth.uid())
    or exists (select 1 from saas_admins where id = auth.uid() and is_active = true)
  );
create policy "subscriptions_admin_write" on subscriptions for all
  using (exists (select 1 from saas_admins where id = auth.uid() and is_active = true))
  with check (exists (select 1 from saas_admins where id = auth.uid() and is_active = true));

create policy "sub_history_admin_all" on subscription_history for all
  using (exists (select 1 from saas_admins where id = auth.uid() and is_active = true))
  with check (exists (select 1 from saas_admins where id = auth.uid() and is_active = true));

-- ── ÍNDICES ──────────────────────────────────────────────────
create index if not exists idx_subscriptions_company on subscriptions(company_id);
create index if not exists idx_subscriptions_status  on subscriptions(status);
create index if not exists idx_subscriptions_plan    on subscriptions(plan_id);
create index if not exists idx_sub_history_company   on subscription_history(company_id);

-- ── FUNÇÃO: stats do SaaS admin ──────────────────────────────
create or replace function get_saas_stats()
returns jsonb language plpgsql security definer as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'total_companies',    (select count(*) from companies),
    'active_companies',   (select count(*) from subscriptions where status = 'active'),
    'trial_companies',    (select count(*) from subscriptions where status = 'trial'),
    'suspended_companies',(select count(*) from subscriptions where status in ('suspended','cancelled')),
    'total_users',        (select count(*) from profiles where is_active = true),
    'mrr',                (select coalesce(sum(amount), 0) from subscriptions where status = 'active' and billing_cycle = 'monthly'),
    'arr',                (select coalesce(sum(amount * 12), 0) from subscriptions where status = 'active' and billing_cycle = 'monthly'),
    'new_companies_30d',  (select count(*) from companies where created_at >= now() - interval '30 days'),
    'trials_expiring_7d', (select count(*) from subscriptions where status = 'trial' and trial_ends_at <= now() + interval '7 days' and trial_ends_at >= now())
  ) into v_result;
  return v_result;
end;
$$;
