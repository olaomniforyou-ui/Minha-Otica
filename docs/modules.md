# Matriz de Módulos e Navegação — Minha Ótica

Este documento mapeia a estrutura de navegação e as funcionalidades de cada módulo do sistema.

## 🧭 Estrutura de Navegação

### 1. Dashboard
- Visão geral, KPIs e alertas imediatos.

### 2. Clientes & CRM
- **CRM**: Funil de vendas e oportunidades.
- **Histórico**: Linha do tempo de interações.
- **Receitas**: Gestão técnica de graus oftalmológicos.
- **Pós-venda**: Garantias e fidelização.

### 3. Produtos & Estoque
- **Produtos**: Catálogo completo.
- **Categorias/Marcas**: Organização taxonômica.
- **Estoque/Movimentações**: Entradas, saídas e ajustes.
- **Inventário**: Auditoria de itens.
- **Importação/Exportação**: Carga de dados via planilha.
- **Etiquetas**: Impressão de códigos de barras.

### 4. Comercial & Operação
- **Orçamentos**: Propostas comerciais.
- **Vendas / PDV**: Interface de fechamento.
- **Ordens de Serviço**: Controle de produção.
- **Entregas**: Logística de retirada.
- **Trocas / Devoluções**: Gestão de reversa.

### 5. Compras & Suprimentos
- **Solicitações/Pedidos**: Fluxo de compra com fornecedores.
- **Recebimentos**: Entrada de mercadoria.
- **Fornecedores**: Cadastro de parceiros.

### 6. Financeiro
- **Caixa Diário**: Controle de PDV.
- **Contas a Receber/Pagar**: Fluxo financeiro.
- **Comissões**: Pagamento de vendedores.
- **Conciliação**: Batimento bancário.
- **DRE**: Demonstrativo de resultados.

### 7. Agenda
- **Atendimentos/Retiradas**: Agendamentos operacionais.
- **Recompra/Aniversários**: Gatilhos de marketing.

### 8. Omnichannel
- **Inbox/Conversas**: WhatsApp, Instagram e Chat centralizados.
- **Automações**: Respostas e gatilhos automáticos.

### 9. Laboratórios
- **Gestão de Pedidos**: Envio e retorno de serviços externos.
- **Tabelas de Preços**: Custos por tipo de serviço.

### 10. SaaS Admin (Super Admin)
- Gestão de empresas, planos e métricas globais.

---

## 🔐 Matriz de Permissões (Resumo)

| Módulo | Admin | Gerente | Vendedor | Financeiro | Estoque |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Dashboard | Full | Full | View | View | View |
| Clientes | Full | Full | Edit | View | View |
| Produtos | Full | Full | View | View | Full |
| Vendas | Full | Full | Full | View | View |
| Financeiro | Full | Edit | No | Full | No |
| OS | Full | Full | Edit | View | Edit |
| SaaS Admin | Full | No | No | No | No |
