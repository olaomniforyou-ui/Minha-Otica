-- ============================================================
-- Minha Ótica — Setup completo de Produtos
-- Cria tabelas faltantes + RLS + bucket de imagens
-- Execute no Supabase Studio > SQL Editor
-- ============================================================

-- ── 1. Funções helper (SECURITY DEFINER) ─────────────────────

create or replace function auth_company_id()
returns uuid language sql stable security definer as $$
  select company_id from profiles where id = auth.uid()
$$;

create or replace function auth_user_role()
returns text language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

-- ── 2. Tabela de Fornecedores ─────────────────────────────────

create table if not exists suppliers (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  name          text not null,
  cnpj          text,
  phone         text,
  whatsapp      text,
  email         text,
  contact_name  text,
  address       jsonb,
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_suppliers_company on suppliers(company_id);

do $$ begin
  create trigger trg_suppliers_updated_at
    before update on suppliers
    for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;

alter table suppliers enable row level security;

alter table products
  add column if not exists supplier_id uuid references suppliers(id);

create index if not exists idx_products_supplier on products(supplier_id);

-- ── 3. Tabela de Movimentações de Estoque ────────────────────

create table if not exists stock_movements (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  product_id      uuid not null references products(id) on delete cascade,
  type            text not null check (type in ('entrada','saida','ajuste','devolucao')),
  quantity        integer not null,
  previous_qty    integer not null,
  new_qty         integer not null,
  unit_cost       numeric(10,2),
  reason          text,
  reference_id    uuid,
  reference_type  text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);

create index if not exists idx_stock_movements_company  on stock_movements(company_id);
create index if not exists idx_stock_movements_product  on stock_movements(product_id);
create index if not exists idx_stock_movements_created  on stock_movements(company_id, created_at desc);

alter table stock_movements enable row level security;

-- Função atômica de movimentação
create or replace function move_stock(
  p_product_id      uuid,
  p_type            text,
  p_quantity        integer,
  p_unit_cost       numeric  default null,
  p_reason          text     default null,
  p_reference_id    uuid     default null,
  p_reference_type  text     default null
)
returns stock_movements
language plpgsql security definer
set search_path = public
as $$
declare
  v_product      products%rowtype;
  v_previous_qty integer;
  v_new_qty      integer;
  v_movement     stock_movements%rowtype;
begin
  select * into v_product from products where id = p_product_id;
  if not found then raise exception 'Produto não encontrado.'; end if;

  v_previous_qty := v_product.stock_quantity;

  case p_type
    when 'entrada'   then v_new_qty := v_previous_qty + p_quantity;
    when 'saida'     then v_new_qty := v_previous_qty - p_quantity;
    when 'devolucao' then v_new_qty := v_previous_qty + p_quantity;
    when 'ajuste'    then v_new_qty := p_quantity;
    else raise exception 'Tipo inválido: %', p_type;
  end case;

  if v_new_qty < 0 then
    raise exception 'Estoque insuficiente. Disponível: %, solicitado: %', v_previous_qty, p_quantity;
  end if;

  update products set stock_quantity = v_new_qty, updated_at = now()
  where id = p_product_id;

  insert into stock_movements (
    company_id, product_id, type, quantity,
    previous_qty, new_qty, unit_cost, reason,
    reference_id, reference_type, created_by
  ) values (
    v_product.company_id, p_product_id, p_type, p_quantity,
    v_previous_qty, v_new_qty, p_unit_cost, p_reason,
    p_reference_id, p_reference_type, auth.uid()
  )
  returning * into v_movement;

  return v_movement;
end;
$$;

grant execute on function move_stock to authenticated;

-- ── 4. Tabela de Marcas ───────────────────────────────────────

create table if not exists brands (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_brands_company on brands(company_id);

do $$ begin
  create trigger brands_updated_at
    before update on brands
    for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;

alter table brands enable row level security;

-- ── 5. Tabela de Modelos ──────────────────────────────────────

create table if not exists models (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  brand_id    uuid references brands(id) on delete set null,
  name        text not null,
  description text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_models_company on models(company_id);
create index if not exists idx_models_brand   on models(brand_id);

do $$ begin
  create trigger models_updated_at
    before update on models
    for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;

alter table models enable row level security;

-- Adiciona FK de marca e modelo em products
alter table products add column if not exists brand_id uuid references brands(id) on delete set null;
alter table products add column if not exists model_id uuid references models(id)  on delete set null;

-- Adiciona hierarquia em product_categories
alter table product_categories
  add column if not exists parent_id uuid references product_categories(id) on delete set null;

-- ── 6. RLS — políticas de empresa (empresa só vê seus dados) ──

-- Suppliers
drop policy if exists "Fornecedor: da própria empresa" on suppliers;
create policy "Fornecedor: da própria empresa" on suppliers
  for all using (company_id = auth_company_id()) with check (company_id = auth_company_id());

-- Stock movements
drop policy if exists "Movimentação: da própria empresa" on stock_movements;
create policy "Movimentação: da própria empresa" on stock_movements
  for all using (company_id = auth_company_id()) with check (company_id = auth_company_id());

-- Brands
drop policy if exists "brands: select" on brands;
drop policy if exists "brands: insert" on brands;
drop policy if exists "brands: update" on brands;
drop policy if exists "brands: delete" on brands;
create policy "brands_company" on brands
  for all using (company_id = auth_company_id()) with check (company_id = auth_company_id());

-- Models
drop policy if exists "models: select" on models;
drop policy if exists "models: insert" on models;
drop policy if exists "models: update" on models;
drop policy if exists "models: delete" on models;
create policy "models_company" on models
  for all using (company_id = auth_company_id()) with check (company_id = auth_company_id());

-- ── 7. RLS — bypass para saas_admin ──────────────────────────

drop policy if exists "products_saas_admin_all"           on products;
drop policy if exists "product_categories_saas_admin_all" on product_categories;
drop policy if exists "suppliers_saas_admin_all"          on suppliers;
drop policy if exists "stock_movements_saas_admin_all"    on stock_movements;
drop policy if exists "brands_saas_admin_all"             on brands;
drop policy if exists "models_saas_admin_all"             on models;
drop policy if exists "service_orders_saas_admin_all"     on service_orders;
drop policy if exists "service_order_items_saas_admin_all" on service_order_items;
drop policy if exists "lab_trackings_saas_admin_all"      on lab_trackings;
drop policy if exists "prescriptions_saas_admin_all"      on prescriptions;

create policy "products_saas_admin_all"           on products           for all using (is_saas_admin()) with check (is_saas_admin());
create policy "product_categories_saas_admin_all" on product_categories for all using (is_saas_admin()) with check (is_saas_admin());
create policy "suppliers_saas_admin_all"          on suppliers          for all using (is_saas_admin()) with check (is_saas_admin());
create policy "stock_movements_saas_admin_all"    on stock_movements    for all using (is_saas_admin()) with check (is_saas_admin());
create policy "brands_saas_admin_all"             on brands             for all using (is_saas_admin()) with check (is_saas_admin());
create policy "models_saas_admin_all"             on models             for all using (is_saas_admin()) with check (is_saas_admin());
create policy "service_orders_saas_admin_all"     on service_orders     for all using (is_saas_admin()) with check (is_saas_admin());
create policy "service_order_items_saas_admin_all" on service_order_items for all using (is_saas_admin()) with check (is_saas_admin());
create policy "lab_trackings_saas_admin_all"      on lab_trackings      for all using (is_saas_admin()) with check (is_saas_admin());
create policy "prescriptions_saas_admin_all"      on prescriptions      for all using (is_saas_admin()) with check (is_saas_admin());

-- ── 8. Bucket de imagens de produto ──────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "product_images_select" on storage.objects;
drop policy if exists "product_images_insert" on storage.objects;
drop policy if exists "product_images_update" on storage.objects;
drop policy if exists "product_images_delete" on storage.objects;

create policy "product_images_select" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images');

create policy "product_images_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images');

create policy "product_images_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images');

-- ── 9. Verificação ────────────────────────────────────────────
select
  t.tablename,
  count(p.policyname) as policies
from (values
  ('products'),('product_categories'),('suppliers'),('stock_movements'),
  ('brands'),('models'),('service_orders'),('service_order_items'),
  ('lab_trackings'),('prescriptions')
) as t(tablename)
left join pg_policies p using (tablename)
group by t.tablename
order by t.tablename;
