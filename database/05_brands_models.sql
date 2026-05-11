-- ============================================================
-- Minha Ótica — Marcas, Modelos e hierarquia de categorias
-- Execute no Supabase SQL Editor
-- ============================================================

-- ── MARCAS ────────────────────────────────────────────────────
create table brands (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create trigger brands_updated_at
  before update on brands
  for each row execute function update_updated_at();

alter table brands enable row level security;

create policy "brands: select" on brands for select
  using (company_id = auth_company_id());
create policy "brands: insert" on brands for insert
  with check (company_id = auth_company_id());
create policy "brands: update" on brands for update
  using (company_id = auth_company_id());
create policy "brands: delete" on brands for delete
  using (company_id = auth_company_id());

-- ── MODELOS ───────────────────────────────────────────────────
create table models (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  brand_id    uuid references brands(id) on delete set null,
  name        text not null,
  description text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create trigger models_updated_at
  before update on models
  for each row execute function update_updated_at();

alter table models enable row level security;

create policy "models: select" on models for select
  using (company_id = auth_company_id());
create policy "models: insert" on models for insert
  with check (company_id = auth_company_id());
create policy "models: update" on models for update
  using (company_id = auth_company_id());
create policy "models: delete" on models for delete
  using (company_id = auth_company_id());

-- ── CATEGORIA PAI (hierarquia) ────────────────────────────────
alter table product_categories
  add column if not exists parent_id uuid references product_categories(id) on delete set null;

-- ── PRODUTO: FK para marca e modelo ──────────────────────────
alter table products
  add column if not exists brand_id uuid references brands(id) on delete set null;
alter table products
  add column if not exists model_id uuid references models(id) on delete set null;
