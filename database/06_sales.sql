-- ============================================================
-- Minha Ótica — Módulo de Vendas diretas
-- Execute no Supabase SQL Editor
-- ============================================================

-- ── SEQUÊNCIA DE NUMERAÇÃO DE VENDAS ─────────────────────────
create table if not exists sale_sequences (
  company_id  uuid primary key references companies(id) on delete cascade,
  last_number integer not null default 0
);

-- ── VENDAS ────────────────────────────────────────────────────
create table sales (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  sale_number     text not null,
  patient_id      uuid references patients(id) on delete set null,
  customer_name   text,
  total_amount    numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  paid_amount     numeric(10,2) not null default 0,
  payment_method  text,
  notes           text,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger sales_updated_at
  before update on sales
  for each row execute function update_updated_at();

alter table sales enable row level security;

create policy "sales: select" on sales for select
  using (company_id = auth_company_id());
create policy "sales: insert" on sales for insert
  with check (company_id = auth_company_id());
create policy "sales: update" on sales for update
  using (company_id = auth_company_id());
create policy "sales: delete" on sales for delete
  using (company_id = auth_company_id());

-- ── ITENS DA VENDA ────────────────────────────────────────────
create table sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references sales(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  description text not null,
  quantity    integer not null default 1,
  unit_price  numeric(10,2) not null,
  discount    numeric(10,2) not null default 0,
  total_price numeric(10,2) not null
);

alter table sale_items enable row level security;

create policy "sale_items: select" on sale_items for select
  using (exists (
    select 1 from sales s
    where s.id = sale_items.sale_id
      and s.company_id = auth_company_id()
  ));
create policy "sale_items: insert" on sale_items for insert
  with check (exists (
    select 1 from sales s
    where s.id = sale_items.sale_id
      and s.company_id = auth_company_id()
  ));
create policy "sale_items: delete" on sale_items for delete
  using (exists (
    select 1 from sales s
    where s.id = sale_items.sale_id
      and s.company_id = auth_company_id()
  ));

-- ── FUNÇÃO: PRÓXIMO NÚMERO DE VENDA ──────────────────────────
create or replace function next_sale_number(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  insert into sale_sequences (company_id, last_number)
  values (p_company_id, 1)
  on conflict (company_id) do update
    set last_number = sale_sequences.last_number + 1
  returning last_number into v_next;
  return 'VND-' || lpad(v_next::text, 4, '0');
end;
$$;

grant execute on function next_sale_number to authenticated;

-- Garante que empresas existentes tenham entrada na sequência
insert into sale_sequences (company_id, last_number)
select id, 0 from companies
on conflict (company_id) do nothing;
