-- ============================================================
-- Minha Ótica — Row Level Security (RLS)
-- Cada empresa só acessa seus próprios dados
-- ============================================================

-- Helper: retorna company_id do usuário logado
create or replace function auth_company_id()
returns uuid language sql stable as $$
  select company_id from profiles where id = auth.uid()
$$;

-- Helper: retorna role do usuário logado
create or replace function auth_user_role()
returns text language sql stable as $$
  select role from profiles where id = auth.uid()
$$;

-- ============================================================
-- COMPANIES
-- ============================================================
alter table companies enable row level security;

create policy "Empresa: ver própria" on companies
  for select using (id = auth_company_id());

create policy "Empresa: admin pode atualizar" on companies
  for update using (id = auth_company_id() and auth_user_role() = 'admin');

-- ============================================================
-- PROFILES
-- ============================================================
alter table profiles enable row level security;

create policy "Perfil: ver da própria empresa" on profiles
  for select using (company_id = auth_company_id());

create policy "Perfil: ver próprio" on profiles
  for select using (id = auth.uid());

create policy "Perfil: admin gerencia" on profiles
  for all using (company_id = auth_company_id() and auth_user_role() in ('admin','gerente'));

create policy "Perfil: atualizar próprio" on profiles
  for update using (id = auth.uid());

-- ============================================================
-- PATIENTS
-- ============================================================
alter table patients enable row level security;

create policy "Paciente: da própria empresa" on patients
  for all using (company_id = auth_company_id());

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================
alter table prescriptions enable row level security;

create policy "Receita: da própria empresa" on prescriptions
  for all using (company_id = auth_company_id());

-- ============================================================
-- PRODUCT CATEGORIES
-- ============================================================
alter table product_categories enable row level security;

create policy "Categoria: da própria empresa" on product_categories
  for all using (company_id = auth_company_id());

-- ============================================================
-- PRODUCTS
-- ============================================================
alter table products enable row level security;

create policy "Produto: da própria empresa" on products
  for all using (company_id = auth_company_id());

-- ============================================================
-- SERVICE ORDERS
-- ============================================================
alter table service_orders enable row level security;

create policy "OS: da própria empresa" on service_orders
  for all using (company_id = auth_company_id());

-- ============================================================
-- SERVICE ORDER ITEMS
-- ============================================================
alter table service_order_items enable row level security;

create policy "Item OS: via OS da empresa" on service_order_items
  for all using (
    exists (
      select 1 from service_orders so
      where so.id = service_order_id
        and so.company_id = auth_company_id()
    )
  );

-- ============================================================
-- LAB TRACKINGS
-- ============================================================
alter table lab_trackings enable row level security;

create policy "Lab: da própria empresa" on lab_trackings
  for all using (company_id = auth_company_id());

-- ============================================================
-- ORDER SEQUENCES
-- ============================================================
alter table order_sequences enable row level security;

create policy "Seq: da própria empresa" on order_sequences
  for all using (company_id = auth_company_id());

-- ============================================================
-- SYNC LOGS
-- ============================================================
alter table sync_logs enable row level security;

create policy "SyncLog: da própria empresa" on sync_logs
  for all using (company_id = auth_company_id());

-- ============================================================
-- SEED: categorias padrão (executar após criar empresa)
-- ============================================================
-- Exemplo de uso: select seed_default_categories('uuid-da-empresa');
create or replace function seed_default_categories(p_company_id uuid)
returns void language plpgsql as $$
begin
  insert into product_categories (company_id, name, slug, icon) values
    (p_company_id, 'Armações',       'armacoes',       'glasses'),
    (p_company_id, 'Lentes de Grau', 'lentes_grau',    'eye'),
    (p_company_id, 'Lentes de Contato', 'lentes_contato', 'circle'),
    (p_company_id, 'Óculos Solar',   'oculos_solar',   'sun'),
    (p_company_id, 'Acessórios',     'acessorios',     'package')
  on conflict (company_id, slug) do nothing;
end;
$$;
