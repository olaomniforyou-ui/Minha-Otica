-- ============================================================
-- Minha Ótica — Schema Principal (Supabase / PostgreSQL)
-- Convenção: snake_case, UUIDs, timestamps com timezone
-- ============================================================

-- Extensão para UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- EMPRESAS
-- ============================================================
create table if not exists companies (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  cnpj            text unique,
  phone           text,
  email           text,
  address         jsonb,          -- { cep, street, number, complement, neighborhood, city, state }
  logo_url        text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- PERFIS DE USUÁRIO (estende auth.users do Supabase)
-- ============================================================
create table if not exists profiles (
  id              uuid primary key references auth.users on delete cascade,
  company_id      uuid not null references companies(id) on delete cascade,
  full_name       text not null,
  role            text not null check (role in ('admin','gerente','atendente','tecnico')),
  avatar_url      text,
  phone           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- PACIENTES
-- ============================================================
create table if not exists patients (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  full_name       text not null,
  cpf             text,
  rg              text,
  phone           text not null,
  whatsapp        text,
  email           text,
  birth_date      date,
  gender          text check (gender in ('M','F','outro')),
  address         jsonb,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (company_id, cpf)
);

-- ============================================================
-- RECEITAS (Prescrições Ópticas)
-- ============================================================
create table if not exists prescriptions (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  patient_id      uuid not null references patients(id) on delete cascade,
  -- Olho Direito (OD)
  od_esf          numeric(5,2),
  od_cil          numeric(5,2),
  od_eixo         smallint check (od_eixo between 0 and 180),
  od_add          numeric(5,2),
  od_dnp          numeric(5,2),
  od_altura       numeric(5,2),
  -- Olho Esquerdo (OE)
  oe_esf          numeric(5,2),
  oe_cil          numeric(5,2),
  oe_eixo         smallint check (oe_eixo between 0 and 180),
  oe_add          numeric(5,2),
  oe_dnp          numeric(5,2),
  oe_altura       numeric(5,2),
  -- Dados do médico
  doctor_name     text,
  crm             text,
  exam_date       date,
  valid_until     date,
  notes           text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);

-- ============================================================
-- CATEGORIAS DE PRODUTOS
-- ============================================================
create table if not exists product_categories (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  name            text not null,
  slug            text not null,
  icon            text,
  created_at      timestamptz not null default now(),
  unique (company_id, slug)
);

-- ============================================================
-- PRODUTOS / ESTOQUE
-- ============================================================
create table if not exists products (
  id                    uuid primary key default uuid_generate_v4(),
  company_id            uuid not null references companies(id) on delete cascade,
  category_id           uuid references product_categories(id),
  name                  text not null,
  brand                 text,
  model                 text,
  sku                   text,
  barcode               text,
  description           text,
  color                 text,
  size                  text,
  sale_price            numeric(10,2) not null default 0,
  cost_price            numeric(10,2),
  stock_quantity        integer not null default 0,
  min_stock_quantity    integer not null default 2,
  image_url             text,
  supplier              text,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (company_id, sku)
);

-- ============================================================
-- ORDENS DE SERVIÇO
-- ============================================================
create table if not exists service_orders (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references companies(id) on delete cascade,
  patient_id          uuid not null references patients(id),
  prescription_id     uuid references prescriptions(id),
  order_number        text not null,
  service_type        text not null check (service_type in (
                        'oculos_grau','oculos_solar','lentes_contato',
                        'reparo','ajuste','consulta','outro'
                      )),
  status              text not null default 'orcamento' check (status in (
                        'orcamento','aprovado','producao',
                        'laboratorio','pronto','entregue','cancelado'
                      )),
  total_amount        numeric(10,2) not null default 0,
  discount_amount     numeric(10,2) not null default 0,
  paid_amount         numeric(10,2) not null default 0,
  payment_method      text check (payment_method in (
                        'dinheiro','pix','cartao_credito',
                        'cartao_debito','boleto','convenio','outro'
                      )),
  estimated_delivery  date,
  delivered_at        timestamptz,
  notes               text,
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (company_id, order_number)
);

-- Sequência para número da OS por empresa
create table if not exists order_sequences (
  company_id    uuid primary key references companies(id),
  last_number   integer not null default 0
);

-- ============================================================
-- ITENS DA ORDEM DE SERVIÇO
-- ============================================================
create table if not exists service_order_items (
  id                  uuid primary key default uuid_generate_v4(),
  service_order_id    uuid not null references service_orders(id) on delete cascade,
  product_id          uuid references products(id),
  description         text not null,
  quantity            integer not null default 1,
  unit_price          numeric(10,2) not null,
  total_price         numeric(10,2) not null,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- ACOMPANHAMENTO DE LABORATÓRIO
-- ============================================================
create table if not exists lab_trackings (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references companies(id) on delete cascade,
  service_order_id    uuid not null references service_orders(id) on delete cascade,
  lab_name            text not null,
  lab_order_number    text,
  status              text not null default 'aguardando_envio' check (status in (
                        'aguardando_envio','enviado','em_producao',
                        'pronto_retorno','retornado','com_defeito'
                      )),
  sent_at             timestamptz,
  expected_return     date,
  returned_at         timestamptz,
  notes               text,
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- LOG DE SINCRONIZAÇÃO
-- ============================================================
create table if not exists sync_logs (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references companies(id),
  synced_at           timestamptz not null default now(),
  records_synced      integer not null default 0,
  status              text not null check (status in ('success','partial','error')),
  error_message       text,
  source              text default 'manual'  -- 'manual' | 'scheduled'
);

-- ============================================================
-- TRIGGERS — updated_at automático
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_companies_updated_at
  before update on companies
  for each row execute function update_updated_at();

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger trg_patients_updated_at
  before update on patients
  for each row execute function update_updated_at();

create trigger trg_products_updated_at
  before update on products
  for each row execute function update_updated_at();

create trigger trg_service_orders_updated_at
  before update on service_orders
  for each row execute function update_updated_at();

create trigger trg_lab_trackings_updated_at
  before update on lab_trackings
  for each row execute function update_updated_at();

-- ============================================================
-- FUNÇÃO — próximo número de OS
-- ============================================================
create or replace function next_order_number(p_company_id uuid)
returns text language plpgsql as $$
declare
  v_number integer;
begin
  insert into order_sequences (company_id, last_number)
  values (p_company_id, 1)
  on conflict (company_id) do update
    set last_number = order_sequences.last_number + 1
  returning last_number into v_number;

  return 'OS-' || lpad(v_number::text, 4, '0');
end;
$$;

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
create index if not exists idx_patients_company_id    on patients(company_id);
create index if not exists idx_patients_cpf           on patients(cpf);
create index if not exists idx_products_company_id    on products(company_id);
create index if not exists idx_products_stock         on products(company_id, stock_quantity);
create index if not exists idx_service_orders_company on service_orders(company_id);
create index if not exists idx_service_orders_status  on service_orders(company_id, status);
create index if not exists idx_service_orders_patient on service_orders(patient_id);
create index if not exists idx_lab_trackings_order    on lab_trackings(service_order_id);
create index if not exists idx_prescriptions_patient  on prescriptions(patient_id);
