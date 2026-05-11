-- ============================================================
-- Minha Ótica — Função de registro de empresa
-- security definer → bypassa RLS, roda como superuser
-- Chamada pelo frontend após auth.signUp()
-- ============================================================

create or replace function register_company(
  p_company_name  text,
  p_company_cnpj  text,
  p_company_phone text,
  p_company_email text,
  p_admin_name    text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  -- Usuário autenticado obrigatório
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  -- CNPJ já cadastrado?
  if exists (select 1 from companies where cnpj = p_company_cnpj) then
    raise exception 'CNPJ já cadastrado no sistema.';
  end if;

  -- Usuário já tem empresa?
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'Este usuário já possui uma empresa cadastrada.';
  end if;

  -- 1. Cria a empresa
  insert into companies (name, cnpj, phone, email)
  values (p_company_name, p_company_cnpj, p_company_phone, p_company_email)
  returning id into v_company_id;

  -- 2. Cria o perfil do admin
  insert into profiles (id, company_id, full_name, role)
  values (auth.uid(), v_company_id, p_admin_name, 'admin');

  -- 3. Categorias padrão de produtos
  perform seed_default_categories(v_company_id);

  -- 4. Sequência de OS
  insert into order_sequences (company_id, last_number)
  values (v_company_id, 0)
  on conflict (company_id) do nothing;

  return v_company_id;
end;
$$;

-- Permite que qualquer usuário autenticado chame a função
grant execute on function register_company to authenticated;
