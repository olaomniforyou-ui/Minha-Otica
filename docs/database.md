# Modelagem de Dados — Minha Ótica

Este documento descreve as entidades principais e a estrutura do banco de dados (PostgreSQL).

## 🏢 Núcleo (SaaS/Multi-tenant)
- **companies**: Dados das óticas (CNPJ, Logo, Configurações).
- **branches**: Unidades/Lojas vinculadas a uma empresa.
- **users**: Usuários do sistema (Auth vinculada).
- **roles/permissions**: Perfis de acesso e permissões granulares.
- **audit_logs**: Registro de todas as ações sensíveis no sistema.

## 👤 CRM & Clientes
- **customers**: Dados cadastrais e preferências.
- **prescriptions**: Receitas (graus OD/OE, médico, validade).
- **customer_timeline**: Histórico de eventos do cliente.
- **consent_logs**: Registro de aceites LGPD.

## 📦 Estoque & Produtos
- **products**: Catálogo (SKU, custos, preços, dados fiscais).
- **product_categories/brands**: Categorias e marcas.
- **stock_levels**: Saldo por unidade (branch).
- **stock_movements**: Histórico de entradas/saídas/ajustes.
- **suppliers**: Fornecedores de mercadoria.

## 💰 Comercial & Financeiro
- **quotes**: Orçamentos (itens, descontos, validade).
- **sales**: Vendas realizadas.
- **payments**: Registros de pagamentos (método, parcelas).
- **accounts_receivable/payable**: Contas a receber e a pagar.
- **cash_registers**: Movimentação de caixa diário.
- **commissions**: Lançamentos de comissão por vendedor.

## 🛠️ Operacional & Produção
- **service_orders (OS)**: Controle de fabricação (status, prazos).
- **service_order_history**: Log de mudança de status da OS.
- **labs**: Laboratórios parceiros.
- **lab_orders**: Pedidos enviados para laboratórios.

## 📅 Agenda & Comunicação
- **appointments**: Agendamentos de clientes.
- **messages**: Histórico de mensagens Omnichannel.
- **templates**: Modelos de mensagens e documentos.

---

## 🔑 Regras de Integridade
1. **Isolamento**: Toda query deve conter `WHERE company_id = ?`.
2. **Soft Delete**: Registros críticos (clientes, produtos) devem usar `deleted_at`.
3. **Imutabilidade**: Logs de auditoria e movimentos de estoque não podem ser editados após criação.
