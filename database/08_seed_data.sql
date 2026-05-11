-- ============================================================
-- Minha Ótica — Dados de Exemplo (Seed)
-- Execute no Supabase Studio > SQL Editor
-- ============================================================

-- 1. Criar uma empresa de teste
insert into companies (id, name, cnpj, email, phone)
values (
  '00000000-0000-0000-0000-000000000001',
  'Ótica Exemplo - Matriz',
  '12.345.678/0001-90',
  'contato@oticaexemplo.com.br',
  '(11) 99999-8888'
)
on conflict (id) do update set name = excluded.name;

-- 2. Criar uma assinatura para esta empresa
insert into subscriptions (company_id, plan_id, status, billing_cycle, amount)
select 
  '00000000-0000-0000-0000-000000000001',
  id,
  'active',
  'monthly',
  price_monthly
from plans
where slug = 'profissional'
limit 1
on conflict (company_id) do nothing;

-- 3. Criar perfis para usuários existentes que ainda não possuem perfil
-- IMPORTANTE: Isso vincula todos os usuários atuais da tabela auth.users
-- à empresa de teste criada acima. Ajuste conforme necessário.
insert into profiles (id, company_id, full_name, role, is_active)
select 
  id, 
  '00000000-0000-0000-0000-000000000001', 
  split_part(email, '@', 1), -- Usa a parte antes do @ como nome provisório
  'admin',
  true
from auth.users
where id not in (select id from profiles)
on conflict (id) do nothing;

-- 4. Tornar o usuário gdesignbrasil@gmail.com um SUPER ADMIN do SaaS
insert into saas_admins (id, full_name, email, is_active)
select
  id,
  'GDesign Brasil',
  email,
  true
from auth.users
where email ilike 'gdesignbrasil@gmail.com'
on conflict (id) do update set is_active = true;

-- 5. Alguns pacientes de teste
insert into patients (company_id, full_name, phone, email)
values 
  ('00000000-0000-0000-0000-000000000001', 'João da Silva', '(11) 91111-2222', 'joao@email.com'),
  ('00000000-0000-0000-0000-000000000001', 'Maria Oliveira', '(11) 93333-4444', 'maria@email.com')
on conflict do nothing;
