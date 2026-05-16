# Minha Ótica - Blue Print

## 1. Visão do Projeto
Minha Ótica será um sistema web para gestão completa de óticas, combinando:
ERP + CRM + Vendas + Estoque + Ordem de Serviço + Atendimento + Financeiro + Relatórios.
A ideia central é tirar a ótica do controle manual, planilha solta e WhatsApp bagunçado, levando tudo para um sistema único.

## 2. Objetivo Principal
Criar uma plataforma para óticas gerenciarem toda a operação diária, desde o primeiro contato com o cliente até a entrega dos óculos, incluindo:
- Cadastro de clientes
- Receitas oftalmológicas
- Produtos e lentes
- Estoque
- Vendas
- Ordens de serviço
- Laboratórios parceiros
- Financeiro
- Atendimento
- Relatórios gerenciais
- Pós-venda e recompra

## 3. Perfis de Usuários
### 3.1 Super Admin
Usuário dono da plataforma.
- Gerenciar todas as óticas cadastradas
- Criar, bloquear ou excluir empresas
- Controlar planos e assinaturas
- Acessar métricas globais

### 3.2 Admin da Ótica
Dono ou gerente da ótica.
- Configurar dados da empresa
- Criar usuários internos
- Gerenciar estoque, vendas e financeiro
- Acompanhar performance da equipe

### 3.3 Vendedor / Atendente
Usuário operacional.
- Cadastrar clientes e atendimentos
- Criar orçamentos e efetuar vendas
- Abrir ordens de serviço
- Consultar produtos

### 3.4 Financeiro
Usuário focado em contas e fluxo de caixa.
- Controlar contas a pagar e receber
- Gerenciar parcelas e inadimplência
- Acompanhar caixa diário

### 3.5 Estoquista / Operacional
Usuário responsável por produtos e movimentações.
- Cadastrar produtos e atualizar estoque
- Registrar entrada/saída e conferir produtos
- Controlar envio para laboratório

## 4. Módulos Principais
### 4.1 Dashboard
Indicadores de vendas (dia/mês), ticket médio, pedidos abertos, OS em produção, estoque baixo, financeiro, aniversariantes, etc.

### 4.2 Clientes / CRM
Cadastro completo com histórico de compras, atendimentos, receitas e preferências. Registro de interações e lembretes de retorno.

### 4.3 Receitas Oftalmológicas
Campos técnicos (esférico, cilíndrico, eixo, adição, DNP, altura) para OD e OE. Upload de arquivos e histórico por cliente.

### 4.4 Produtos
Categorias (armações, lentes, solares, etc.) com SKU, marca, modelo, custos, preços e controle de estoque mínimo.

### 4.5 Estoque
Entradas, saídas, ajustes, inventário e relatórios de giro e curva ABC.

### 4.6 Orçamentos
Geração de propostas, envio via WhatsApp/E-mail, conversão em venda e controle de status.

### 4.7 Vendas
PDV rápido, múltiplas formas de pagamento (Pix, Cartão, Boleto, Parcelamento Interno), comissões e baixa automática.

### 4.8 Ordem de Serviço (OS)
Controle de produção com status (Pedido criado -> Laboratório -> Conferência -> Pronto). Checklist e histórico.

### 4.9 Laboratórios / Fornecedores
Cadastro de parceiros vinculados a produtos e OS, com avaliação de prazos.

### 4.10 Financeiro
Caixa diário, fluxo de caixa, DRE simplificada, comissões e alertas de vencimento.

### 4.11 Agenda
Agendamento de atendimentos, exames, retiradas e lembretes de recompra.

### 4.12 Atendimento / Omnichannel
Centralização de comunicação (WhatsApp, Instagram, Chat) com histórico e automações.

### 4.13 Relatórios
Visão gerencial completa de vendas, estoque, financeiro e performance.

### 4.14 Configurações
Dados da ótica, logo, usuários, permissões e templates de mensagens.

## 5. Escopo Técnico (Sugerido)
- **Frontend**: Next.js + TypeScript
- **UI**: Tailwind CSS + ShadCN UI
- **Backend**: Next.js API Routes / Prisma
- **Banco**: PostgreSQL
- **Autenticação**: NextAuth / Supabase Auth

## 6. MVP — Primeira Versão
O que precisa entrar no MVP:
- Login e usuários
- Dashboard simples
- Clientes e Receitas
- Produtos e Estoque básico
- Orçamentos e Vendas
- Ordem de Serviço
- Financeiro básico
- Configurações da ótica
