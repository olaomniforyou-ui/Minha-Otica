-- ============================================================
-- Minha Ótica — Receita vinculada à venda + tipo de venda
-- Execute no Supabase Studio > SQL Editor
-- ============================================================

-- ── 1. Adiciona colunas em sales ─────────────────────────────

alter table sales
  add column if not exists sale_type  text,
  add column if not exists prescription_id uuid references prescriptions(id) on delete set null;

create index if not exists idx_sales_sale_type       on sales(sale_type);
create index if not exists idx_sales_prescription_id on sales(prescription_id);

-- ── 2. Garante que a tabela prescriptions existe com RLS ──────

create table if not exists prescriptions (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  patient_id   uuid not null references patients(id)  on delete cascade,
  od_esf       numeric(5,2),
  od_cil       numeric(5,2),
  od_eixo      integer,
  od_add       numeric(4,2),
  od_dnp       numeric(4,1),
  od_altura    integer,
  oe_esf       numeric(5,2),
  oe_cil       numeric(5,2),
  oe_eixo      integer,
  oe_add       numeric(4,2),
  oe_dnp       numeric(4,1),
  oe_altura    integer,
  doctor_name  text,
  crm          text,
  exam_date    date,
  valid_until  date,
  notes        text,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

create index if not exists idx_prescriptions_company on prescriptions(company_id);
create index if not exists idx_prescriptions_patient on prescriptions(patient_id);

alter table prescriptions enable row level security;

-- ── 3. RLS para prescriptions ─────────────────────────────────

drop policy if exists "prescriptions_company" on prescriptions;
create policy "prescriptions_company" on prescriptions
  for all
  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());

-- saas_admin bypass (já criado em 14, mas idempotente)
drop policy if exists "prescriptions_saas_admin_all" on prescriptions;
create policy "prescriptions_saas_admin_all" on prescriptions
  for all using (is_saas_admin()) with check (is_saas_admin());

-- ── 4. Verificação ────────────────────────────────────────────
select column_name, data_type
from information_schema.columns
where table_name = 'sales'
  and column_name in ('sale_type', 'prescription_id')
order by column_name;
