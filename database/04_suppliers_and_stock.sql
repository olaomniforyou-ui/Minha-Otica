-- ============================================================
-- Minha Ótica — Fornecedores + Movimentações de Estoque
-- ============================================================

-- ── FORNECEDORES ─────────────────────────────────────────────
create table if not exists suppliers (
  id            uuid primary key default uuid_generate_v4(),
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
  updated_at    timestamptz not null default now(),
  unique (company_id, cnpj)
);

create trigger trg_suppliers_updated_at
  before update on suppliers
  for each row execute function update_updated_at();

create index if not exists idx_suppliers_company on suppliers(company_id);

-- ── Adiciona supplier_id em products ─────────────────────────
alter table products
  add column if not exists supplier_id uuid references suppliers(id);

create index if not exists idx_products_supplier on products(supplier_id);

-- ── MOVIMENTAÇÕES DE ESTOQUE ──────────────────────────────────
create table if not exists stock_movements (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  product_id      uuid not null references products(id) on delete cascade,
  type            text not null check (type in ('entrada','saida','ajuste','devolucao')),
  quantity        integer not null,
  previous_qty    integer not null,
  new_qty         integer not null,
  unit_cost       numeric(10,2),
  reason          text,
  reference_id    uuid,
  reference_type  text,   -- 'service_order' | 'purchase' | 'adjustment' | 'return'
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);

create index if not exists idx_stock_movements_company  on stock_movements(company_id);
create index if not exists idx_stock_movements_product  on stock_movements(product_id);
create index if not exists idx_stock_movements_created  on stock_movements(company_id, created_at desc);

-- ── RLS ───────────────────────────────────────────────────────
alter table suppliers       enable row level security;
alter table stock_movements enable row level security;

create policy "Fornecedor: da própria empresa" on suppliers
  for all using (company_id = auth_company_id());

create policy "Movimentação: da própria empresa" on stock_movements
  for all using (company_id = auth_company_id());

-- ── Função atômica de movimentação de estoque ─────────────────
create or replace function move_stock(
  p_product_id    uuid,
  p_type          text,
  p_quantity      integer,
  p_unit_cost     numeric default null,
  p_reason        text    default null,
  p_reference_id  uuid    default null,
  p_reference_type text   default null
)
returns stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product      products%rowtype;
  v_previous_qty integer;
  v_new_qty      integer;
  v_movement     stock_movements%rowtype;
  v_company_id   uuid;
begin
  -- Produto existe e pertence à empresa do usuário
  select * into v_product from products where id = p_product_id;
  if not found then
    raise exception 'Produto não encontrado.';
  end if;

  v_company_id   := v_product.company_id;
  v_previous_qty := v_product.stock_quantity;

  -- Calcula novo estoque
  case p_type
    when 'entrada'   then v_new_qty := v_previous_qty + p_quantity;
    when 'saida'     then v_new_qty := v_previous_qty - p_quantity;
    when 'devolucao' then v_new_qty := v_previous_qty + p_quantity;
    when 'ajuste'    then v_new_qty := p_quantity;     -- quantidade = valor final
    else raise exception 'Tipo de movimentação inválido: %', p_type;
  end case;

  if v_new_qty < 0 then
    raise exception 'Estoque insuficiente. Disponível: %, solicitado: %', v_previous_qty, p_quantity;
  end if;

  -- Atualiza estoque do produto
  update products set stock_quantity = v_new_qty, updated_at = now()
  where id = p_product_id;

  -- Registra movimentação
  insert into stock_movements (
    company_id, product_id, type, quantity,
    previous_qty, new_qty, unit_cost, reason,
    reference_id, reference_type, created_by
  ) values (
    v_company_id, p_product_id, p_type, p_quantity,
    v_previous_qty, v_new_qty, p_unit_cost, p_reason,
    p_reference_id, p_reference_type, auth.uid()
  )
  returning * into v_movement;

  return v_movement;
end;
$$;

grant execute on function move_stock to authenticated;
