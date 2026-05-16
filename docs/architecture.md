# Arquitetura do Sistema — Minha Ótica

Este documento descreve a infraestrutura técnica e os padrões arquiteturais do projeto.

## 🏗️ Visão Geral
O sistema é dividido em um monorepo (ou pastas separadas) contendo Frontend e Backend independentes, comunicando-se via API REST.

---

## 💻 Frontend (Client)
Baseado em **React + Vite + TypeScript**.

### Core Stack:
- **Roteamento**: React Router (Rotas protegidas por Tenant/Auth).
- **Gerenciamento de Estado**: 
  - **Zustand**: Estados globais leves (auth, UI, cart).
  - **React Query**: Sincronização de dados do servidor e cache.
- **Banco Local/Offline**: 
  - **Dexie.js**: Camada para IndexedDB (PWA/Offline mode).
- **Estilização**: Tailwind CSS + ShadCN UI (Componentes acessíveis).
- **Visualização de Dados**: Recharts.
- **Utilitários**:
  - **jsPDF**: Geração de orçamentos e recibos no cliente.
  - **Lucide React**: Biblioteca de ícones.

---

## ⚙️ Backend (Server)
Baseado em **Node.js + Express + TypeScript**.

### Core Stack:
- **Framework**: Express.
- **Validação**: **Zod** (Schemas rigorosos para entradas/saídas).
- **Segurança**:
  - **Helmet**: Cabeçalhos de segurança.
  - **Rate Limit**: Proteção contra ataques de força bruta.
  - **Auth/Tenant Guard**: Middlewares para isolamento de dados por empresa (Multi-tenancy).
- **Processamento**:
  - **Node Cron**: Tarefas agendadas (alertas de receitas, backups).
  - **Google GenAI**: Integração para assistente inteligente e insights.

---

## 🗄️ Infraestrutura e Dados
- **Banco de Dados**: **PostgreSQL** (Hospedado no Supabase).
- **ORM**: Prisma (ou Supabase Client).
- **Storage**: Supabase Storage (Imagens de produtos e anexos de OS).
- **Autenticação**: Supabase Auth.
- **Hospedagem**: Vercel (Frontend) e Cloud Run/SaaS Admin (Backend).

---

## 🛡️ Padrões de Projeto
1. **Multi-tenancy**: Todo dado deve ser vinculado a um `company_id` e filtrado via middleware no backend.
2. **Repository Pattern**: Abstração da lógica de dados no backend para facilitar testes.
3. **Design System**: Uso estrito de componentes ShadCN para consistência visual.
4. **API Contracts**: Respostas padronizadas (`{ success: boolean, data?: any, error?: string }`).
