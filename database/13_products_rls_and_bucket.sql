-- ============================================================
-- Minha Ótica — RLS para tabelas de produto + bucket de imagens
-- Execute no Supabase Studio > SQL Editor
-- ============================================================

-- ── 1. Corrige funções helper para SECURITY DEFINER ───────────
-- (sem isso, auth_company_id() causa recursão ao ser chamada
--  dentro de um RLS de profiles)

create or replace function auth_company_id()
returns uuid language sql stable security definer as $$
  select company_id from profiles where id = auth.uid()
$$;

create or replace function auth_user_role()
returns text language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

-- ── 2. Saas admin bypass para tabelas de produto ──────────────

-- PRODUCTS
drop policy if exists "products_saas_admin_all" on products;
create policy "products_saas_admin_all" on products
  for all using (is_saas_admin()) with check (is_saas_admin());

-- PRODUCT_CATEGORIES
drop policy if exists "product_categories_saas_admin_all" on product_categories;
create policy "product_categories_saas_admin_all" on product_categories
  for all using (is_saas_admin()) with check (is_saas_admin());

-- SUPPLIERS
drop policy if exists "suppliers_saas_admin_all" on suppliers;
create policy "suppliers_saas_admin_all" on suppliers
  for all using (is_saas_admin()) with check (is_saas_admin());

-- STOCK_MOVEMENTS
drop policy if exists "stock_movements_saas_admin_all" on stock_movements;
create policy "stock_movements_saas_admin_all" on stock_movements
  for all using (is_saas_admin()) with check (is_saas_admin());

-- BRANDS
drop policy if exists "brands_saas_admin_all" on brands;
create policy "brands_saas_admin_all" on brands
  for all using (is_saas_admin()) with check (is_saas_admin());

-- MODELS
drop policy if exists "models_saas_admin_all" on models;
create policy "models_saas_admin_all" on models
  for all using (is_saas_admin()) with check (is_saas_admin());

-- SERVICE_ORDERS
drop policy if exists "service_orders_saas_admin_all" on service_orders;
create policy "service_orders_saas_admin_all" on service_orders
  for all using (is_saas_admin()) with check (is_saas_admin());

-- SERVICE_ORDER_ITEMS
drop policy if exists "service_order_items_saas_admin_all" on service_order_items;
create policy "service_order_items_saas_admin_all" on service_order_items
  for all using (is_saas_admin()) with check (is_saas_admin());

-- LAB_TRACKINGS
drop policy if exists "lab_trackings_saas_admin_all" on lab_trackings;
create policy "lab_trackings_saas_admin_all" on lab_trackings
  for all using (is_saas_admin()) with check (is_saas_admin());

-- PRESCRIPTIONS
drop policy if exists "prescriptions_saas_admin_all" on prescriptions;
create policy "prescriptions_saas_admin_all" on prescriptions
  for all using (is_saas_admin()) with check (is_saas_admin());

-- ── 3. Bucket de imagens de produto ──────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Políticas de storage
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

-- ── 4. Verificação ────────────────────────────────────────────
select tablename, count(*) as policies
from pg_policies
where tablename in (
  'products','product_categories','suppliers','stock_movements',
  'brands','models','service_orders','service_order_items',
  'lab_trackings','prescriptions'
)
group by tablename
order by tablename;
