import { useState, useEffect } from 'react';
import {
  Activity, Database, Lock, TrendingUp, Box, Rocket, Zap,
  Terminal, FileCode, Globe, HardDrive, Cpu, Search,
  CheckCircle, CheckCircle2, Clock, WifiOff, RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

// ─── Endpoint — usa VITE_API_URL (base) + /api/v1 ─────────────────────────
const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')
const API_URL = BASE.endsWith('/api/v1') ? BASE : `${BASE}/api/v1`

// ─── Tipos ─────────────────────────────────────────────────────────────────
type ApiHealth = {
  api: { status: 'up' | 'down'; latencyMs: number; uptimeSeconds: number; environment: string; version: string }
  database: { status: 'connected' | 'disconnected'; latencyMs: number; provider: string }
  storage: { status: 'online' | 'unknown'; provider: string }
  sprint: { current: number; name: string; period: string }
  modules: { total: number; inProgress: number; partial: number; completed: number; pending: number }
  timestamp: string
}

// ─── FONTE DE VERDADE — atualizar após cada entrega significativa ──────────
// Progresso baseado em auditoria real do código (15/05/2026).
// Regra: 100% somente se CRUD completo + testes. Parcial = scaffold/pages existem.
const MODULES_23: {
  id: number; name: string; status: 'pending' | 'partial' | 'in-progress'; progress: number; sprint: number; tasks: string[]
}[] = [
  { id:  1, name: 'Fiscal e Documentos',   status: 'in-progress', progress: 70, sprint: 6, tasks: ['Página /fiscal ✓ (3 abas: NF-e/NFS-e, Guias DAS, Configuração)', 'CRUD NFs manual ✓ (emitida/cancelada/inutilizada/pendente)', 'CRUD Guias DAS ✓ (DAS/DARF-ISS/IRPJ/ICMS/ISS)', 'Configuração fiscal ✓ (CNPJ, regime, CRT, alíquotas, inscrições)', 'Export CSV NFs ✓', 'Rota /fiscal + Sidebar ✓', 'Modal detalhe NF-e ✓ (todos os campos, alterar status inline, excluir)', 'Imprimir NF ✓ (botão Printer por NF — abre janela com layout DANFE simplificado: cabeçalho empresa, campos da NF, total, chave, rodapé)', 'Exportar XML ✓ (botão FileCode por NF — gera XML padrão NF-e 4.00 com emit/dest/total e faz download .xml)', 'NF-e/NFC-e via Sefaz', 'Certificado Digital A1'] },
  { id:  2, name: 'Compras e Suprimentos', status: 'in-progress', progress: 96, sprint: 3, tasks: ['Pedido de Compra (CRUD) ✓', 'Dar Entrada / Recebimento ✓', 'Atualização de Estoque ✓', 'Cotações Fornecedores ✓', 'Resumo por Fornecedor ✓', 'Filtro Período ✓', 'Cards Resumo (gasto/pendente) ✓', 'Export CSV Pedidos ✓', 'Alerta de Reposição ✓ (painel amber na aba Compras: lista produtos abaixo do mínimo, botão "Criar Pedido" atalho para novo pedido)'] },
  { id:  3, name: 'Estoque Avançado',      status: 'in-progress', progress: 98, sprint: 3, tasks: ['Produtos + Categorias ✓', 'Fornecedores ✓', 'Marcas/Modelos ✓', 'Movimentações ✓', 'Inventário Cíclico ✓', 'Ajuste em Lote ✓', 'Filtro Estoque Baixo ✓', 'Coluna Mínimo ✓', 'Etiquetas de Produto ✓ (botão "Etiquetas" — imprime A4 com 4 etiquetas/linha: nome, categoria, preço em destaque, SKU)'] },
  { id:  4, name: 'Multiempresa (SaaS)',   status: 'in-progress', progress: 96, sprint: 1, tasks: ['Isolamento Tenant ✓', 'Troca de Empresa (Sidebar) ✓', 'Impersonation Admin ✓', 'Hierarquia Matriz/Filial ✓ (CompanyDetail: selecionar matriz, listar filiais)', 'Consolidação multi-filial ✓ (widget Dashboard: faturamento + clientes + OS por empresa)', 'Relatório consolidado multi-filial ✓ (/relatorio-rede: bar chart + tabela com % por filial, link do Dashboard)', 'Filtro de Período ✓ (/relatorio-rede: seletor Mês atual/Mês anterior/Últimos 3 meses/Últimos 6 meses — filtra queries Supabase e atualiza título do gráfico)'] },
  { id:  5, name: 'Planos e Assinaturas', status: 'in-progress', progress: 97, sprint: 1, tasks: ['Trial Banner ✓ (banner + countdown + link "Ver planos")', 'Suspended Banner ✓', 'hook useSubscription ✓', 'hook usePlanLimits ✓', 'Aviso limite pacientes ✓', 'Upgrade CTA ✓', 'Página /pricing ✓ (3 planos, tabela comparativa, FAQ)', 'Link Sidebar "Planos" ✓', 'Checkout modal ✓ (form nome/email/CPF/cartão, loading spinner, tela de sucesso)', 'Histórico de Faturas ✓ (lista de invoices mock por mês, badge pago/pendente, botão 2ª via)'] },
  { id:  6, name: 'LGPD e Segurança',     status: 'in-progress', progress: 95, sprint: 2, tasks: ['Consentimento (Digital + PDF) ✓', 'Logs Auditoria ✓', 'Exportação ✓', 'Anonimização ✓'] },
  { id:  7, name: 'Prontuário Óptico',    status: 'in-progress', progress: 97, sprint: 2, tasks: ['Histórico Grau ✓', 'OD/OE Completo ✓', 'Tipo de Lente ✓', 'Upload Anexos (Storage) ✓', 'Imprimir Receita ✓ (botão "Imprimir" em cada card — abre janela com layout formatado: tabela OD/OE, médico/CRM, validade, notas, rodapé empresa)'] },
  { id:  8, name: 'Laboratório/Produção', status: 'in-progress', progress: 97, sprint: 5, tasks: ['Status Flow ✓', 'Sync Supabase ✓', 'Avançar/Defeito ✓', 'Filtros ✓', 'Kanban Produção ✓', 'Toggle Lista/Kanban ✓', 'Notif. WhatsApp ✓', 'Indicador Prazo (dias + vencido) ✓', 'Bulk actions: seleção múltipla + "Avançar selecionados" ✓ (checkbox por linha, select-all, toolbar, destaque visual)', 'Dashboard de Produção ✓ (4 KPI cards: Em Produção/Retornados/Prazo Médio/% no Prazo + mini gráfico de barras por status)'] },
  { id:  9, name: 'Garantia e Pós-venda', status: 'in-progress', progress: 96, sprint: 2, tasks: ['NPS ✓', 'Garantia ✓', 'Assistência ✓', 'Ajuste ✓', 'Reclamação ✓', 'Recompra ✓', 'Página dedicada ✓ (cards NPS, filtros, tabela, resolver)', 'Export CSV Pós-venda ✓', 'Envio via WhatsApp ✓ (botão por registro, modal com mensagem personalizada por tipo + campo telefone)'] },
  { id: 10, name: 'Convênios/Parceiros',  status: 'in-progress', progress: 97, sprint: 4, tasks: ['Tipos/CNPJ/Desconto ✓', 'CRUD Offline-first ✓', 'Página listagem ✓', 'Sidebar/Rota ✓', 'Sync Server ✓', 'Autorizações ✓', 'Faturamento ✓'] },
  { id: 11, name: 'Comissões',            status: 'in-progress', progress: 97, sprint: 6, tasks: ['Performance Vendedores ✓', 'Percentual Configurável ✓', 'Filtro por Período ✓', 'Cards Resumo ✓', 'Ranking de Vendedores ✓', 'Meta Mensal por Vendedor ✓', 'Export CSV Comissões ✓'] },
  { id: 12, name: 'Marketing e CRM',      status: 'in-progress', progress: 98, sprint: 2, tasks: ['Cadastro Pacientes ✓', 'Origem/Tags/Preferências ✓', 'Filtros Avançados ✓', 'Recompra Sugerida ✓'] },
  { id: 13, name: 'Omnichannel Real',     status: 'in-progress', progress: 95, sprint: 7, tasks: ['Templates WhatsApp ✓ (8 modelos, variáveis, composer, preview)', 'Templates Personalizados ✓ (criar/deletar, localStorage)', 'Envio via wa.me ✓', 'Copiar mensagem ✓', 'Busca de Paciente ✓ (autocomplete Supabase, min 2 chars, limit 8)', 'Auto-preenche telefone + var {nome} ✓', 'Histórico de Envios ✓ (aba localStorage, reenvio, limpar)', 'Rota /whatsapp + Sidebar ✓', 'Chatbot IA ✓ (aba "IA" com chat multi-turn Gemini, sugestões rápidas, auto-scroll, Enter para enviar)', 'Campanha em Massa ✓ (aba "Campanha": 3 segmentos — todos/aniversariantes/reengajamento, seleciona template, carrega pacientes via Supabase, envio individual com tracking de status)'] },
  { id: 14, name: 'E-commerce/Catálogo',  status: 'in-progress', progress: 96, sprint: 7, tasks: ['Vitrine Online ✓ (página pública /catalogo/:companyId)', 'Filtro por categoria ✓', 'Busca de produtos ✓', 'Carrinho de orçamento ✓ (seleção + WhatsApp)', 'Backend /api/catalog/:id ✓ (rota pública)', 'Botão "Compartilhar Catálogo" ✓ (Web Share API com fallback para clipboard)', 'SEO dinâmico ✓ (document.title + OG meta tags via DOM em useEffect)', 'Formulário de contato ✓ (modal com nome/tel/msg, abre WhatsApp pré-preenchido)', 'Modal detalhe produto ✓ (imagem ampliada, descrição, estoque, adicionar/remover orçamento)', 'Total estimado ✓ (valor total dos itens exibido no cart bar e no resumo do formulário)', 'QR Code do Catálogo ✓ (card "Catálogo Online" na página de Perfil: QR code gerado via api.qrserver.com, link copiar + abrir catálogo)', 'Domínio customizado'] },
  { id: 15, name: 'Integ. Pagamento',     status: 'in-progress', progress: 72, sprint: 4, tasks: ['Configuração Chave Pix ✓ (5 tipos, localStorage)', 'KPIs Pix do mês ✓ (via Supabase)', 'QR Code Pix display ✓ (gerarqrcodepix API)', 'Histórico de cobranças avulsas ✓ (pendente/pago, localStorage)', 'Compartilhar via WhatsApp ✓ (mensagem pré-formatada)', 'Copiar link QR Code ✓', 'Rota /pix + Sidebar ✓', 'Cobrar Pix por Venda ✓ (opção "Cobrar via Pix" no dropdown de cada venda: exibe valor, QR code gerado com dados da chave Pix configurada, botão copiar chave, envio via WhatsApp)', 'Mercado Pago', 'Cartão Recorrente'] },
  { id: 16, name: 'Conciliação Bancária', status: 'in-progress', progress: 96, sprint: 6, tasks: ['Caixa Diário ✓', 'Fluxo Semanal ✓', 'Contas a Pagar (CRUD) ✓', 'DRE Simplificado ✓', 'Importação OFX ✓', 'Persistência Transações ✓', 'Conciliação Manual ✓', 'Contas Bancárias ✓ (CRUD localStorage, total patrimônio, tipos)', 'Auto-conciliação ✓ (botão "Auto-conciliar": casa DEBIT transactions com despesas não pagas por valor ±5%, feedback com qtd de matches)'] },
  { id: 17, name: 'BI e Indicadores',     status: 'in-progress', progress: 97, sprint: 7, tasks: ['Receita Diária ✓', 'NPS Chart ✓', 'Top Produtos ✓', 'Formas Pagamento ✓', 'DRE Completo ✓', 'CMV Configurável ✓', 'EBITDA Aproximado ✓', 'Funil OS por Status ✓', 'Análise Dia da Semana ✓', 'Retenção de Clientes ✓ (novos vs retornantes)', 'Insights IA ✓ (aba Analytics → Gemini, 5 cards priorizados)'] },
  { id: 18, name: 'Importação/Migração',  status: 'in-progress', progress: 95, sprint: 3, tasks: ['CSV Pacientes ✓ (import modal)', 'Sync automático Expenses + Purchases ✓', 'Validação Duplicatas CPF ✓', 'Rollback Importação ✓ (localStorage batch)', 'CSV Produtos ✓ (parser inline, preview, importação em lote)', 'CSV Despesas ✓ (botão "Importar CSV" na aba Contas a Pagar: parse, preview tabela, import em lote via createExpense)'] },
  { id: 19, name: 'Exportação de Dados',  status: 'in-progress', progress: 94, sprint: 3, tasks: ['CSV Pacientes ✓', 'CSV Vendas ✓', 'CSV Despesas ✓', 'CSV Produtos ✓', 'CSV Ordens de Serviço ✓', 'PDF Garantia ✓', 'Backup Manual ✓ (4 CSVs)', 'PDF Prontuário Paciente ✓ (botão "PDF" por paciente — busca receitas e abre print window com dados pessoais + tabela OD/OE de todas as receitas)'] },
  { id: 20, name: 'App Mobile / PWA',     status: 'in-progress', progress: 95, sprint: 1, tasks: ['Leitor Câmera ✓', 'Modo Offline (Dexie) ✓', 'VitePWA + Manifest ✓', 'hook useNotifications ✓ (estoque baixo, defeitos lab, OS antiga, pós-venda, trial)', 'NotificationsPanel ✓ (dropdown, mark read, dismiss, limpar)', 'Badge dinâmico no Header ✓', 'Push nativo browser ✓ (requestPermission, new Notification(), dedup por ID)', 'Banner "Ativar" no painel ✓', 'Banner offline (WifiOff) ✓ (detecta navigator.onLine, exibe aviso no topo do AppLayout)', 'Prompt de instalação PWA ✓ (beforeinstallprompt, banner com botão "Instalar" e dismiss)', 'Banner de atualização SW ✓ (listener controllerchange: exibe "Nova versão disponível!" com botão "Atualizar agora" → window.location.reload)'] },
  { id: 21, name: 'Ajuda e Onboarding',   status: 'in-progress', progress: 96, sprint: 8, tasks: ['FAQ accordion com busca ✓', 'WelcomeModal first-time ✓', 'Link Ajuda na Sidebar ✓', 'Tour Interativo ✓ (8 passos, spotlight, custom event)', 'Atalhos de Teclado ✓ (hook useKeyboardShortcuts global: Alt+D/P/V/O/E/F/L/W/A/C/H → navega entre módulos; seção na Ajuda com tabela de atalhos)'] },
  { id: 22, name: 'Backoffice SaaS',      status: 'in-progress', progress: 95, sprint: 1, tasks: ['Dev OS Dashboard ✓', 'Invite Funcionários ✓', 'Edição de Perfil ✓', 'Impersonate ✓', 'Gestão Planos ✓', 'Novidades do Sistema ✓ (changelog widget no Dashboard)', 'Dados da Empresa ✓ (nome, telefone, email, endereço, cidade, estado — salva no Supabase via companies.update)'] },
  { id: 23, name: 'IA Aplicada',          status: 'in-progress', progress: 95, sprint: 7, tasks: ['Scan Receita (Gemini) ✓', 'Previsão Demanda ✓ (regressão linear)', 'Assistente Dono ✓ (Gemini + widget flutuante)', 'Modo Conversa ✓ (multi-turn Gemini com histórico de mensagens)', 'Insights de Negócio ✓ (backend /ai/insights, 5 cards por prioridade/tipo, Analytics)', 'Análise de Paciente IA ✓ (botão "IA" por paciente em Pacientes, envia perfil ao Gemini, exibe modal com 4 insights: perfil, canal, timing, upsell)'] },
]

// ─── Camadas de produto — derivadas automaticamente de MODULES_23 ──────────
const LAYERS = [
  { name: 'SaaS Core',      ids: [4, 5, 20, 22], color: '#3b82f6' },
  { name: 'CRM/Prontuário', ids: [6, 7, 12],     color: '#6366f1' },
  { name: 'Estoque',        ids: [2, 3, 18, 19],  color: '#06b6d4' },
  { name: 'Comercial/OS',   ids: [8, 9, 10, 15],  color: '#8b5cf6' },
  { name: 'Financeiro',     ids: [11, 16],         color: '#475569' },
  { name: 'Fiscal',         ids: [1],              color: '#334155' },
  { name: 'Omni/BI/IA',     ids: [13, 14, 17, 23], color: '#a855f7' },
]

const PROGRESS_DATA = LAYERS.map(layer => {
  const mods = MODULES_23.filter(m => layer.ids.includes(m.id))
  const avg = Math.round(mods.reduce((s, m) => s + m.progress, 0) / mods.length)
  return { name: layer.name, progress: avg, color: layer.color }
})

// ─── Sprints — baseadas no roadmap.md ──────────────────────────────────────
const SPRINTS: { code: string; name: string; period: string; done: boolean; active?: boolean }[] = [
  { code: 'S0', name: 'Auditoria',     period: '15-17/05',    done: true },
  { code: 'S1', name: 'Fundação SaaS', period: '18-24/05',    done: true },
  { code: 'S2', name: 'CRM/LGPD',     period: '25-31/05',    done: true },
  { code: 'S3', name: 'Estoque',       period: '01-07/06',    done: false, active: true },
  { code: 'S4', name: 'Comercial',     period: '08-14/06',    done: false },
  { code: 'S5', name: 'OS/Produção',   period: '15-21/06',    done: false },
  { code: 'S6', name: 'Fiscal',        period: '22-28/06',    done: false },
  { code: 'S7', name: 'Omni/BI',       period: '29/06-05/07', done: false },
  { code: 'S8', name: 'QA/Go-live',    period: '06-15/07',    done: false },
]

// ─── Logs — eventos reais do projeto (mais recentes primeiro) ──────────────
const LOGS = [
  { id: 116, date: '17/05/2026 06:30', action: 'M14: QR Code do Catálogo Online — card "Catálogo Online" na página de Perfil com QR code gerado via api.qrserver.com, URL da vitrine pública, botão "Copiar link" (feedback "Copiado!") e link "Abrir" em nova aba', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 115, date: '17/05/2026 06:15', action: 'M1: Imprimir NF + Exportar XML — botão Printer por NF abre janela de impressão com layout DANFE simplificado (cabeçalho empresa, campos NF, total em destaque, chave NF-e, rodapé); botão FileCode gera e baixa XML padrão NF-e 4.00 com emit/dest/total/infAdic', user: 'Antigravity', type: 'success', category: 'Sprint 6' },
  { id: 114, date: '17/05/2026 06:00', action: 'M15: Cobrar Pix por Venda — opção "Cobrar via Pix" no dropdown de cada venda (desktop + mobile): modal com valor da venda, QR code gerado via gerarqrcodepix.com.br com chave configurada em /pix, botão copiar chave e botão WhatsApp com mensagem pré-formatada', user: 'Antigravity', type: 'success', category: 'Sprint 4' },
  { id: 113, date: '17/05/2026 05:30', action: 'M20: Banner de atualização SW — listener controllerchange no AppLayout detecta nova versão do service worker e exibe banner verde "Nova versão disponível!" com botão "Atualizar agora" (window.location.reload)', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 112, date: '17/05/2026 05:15', action: 'M14: Total estimado no catálogo — valor somado dos itens do carrinho exibido no cart bar flutuante e linha "Total estimado" no formulário de orçamento; Web Share API (navigator.share) com fallback para clipboard no botão Compartilhar', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 111, date: '17/05/2026 05:00', action: 'M2: Alerta de Reposição na aba Compras — painel amber detecta produtos com estoque abaixo do mínimo (via getProducts + isLowStock), lista os nomes e exibe botão "Criar Pedido" que abre o modal de novo pedido de compra', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 110, date: '17/05/2026 04:15', action: 'M4: Filtro de Período no Relatório da Rede — 4 botões (Mês atual/Mês anterior/Últimos 3 meses/Últimos 6 meses) no header da página /relatorio-rede; queries Supabase filtradas pela data de início do período; título do gráfico e subtítulo atualizados dinamicamente', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 109, date: '17/05/2026 04:00', action: 'M8: Dashboard de Produção do Laboratório — 4 KPI cards (Em Produção, Total Retornados, Prazo Médio em dias, % no Prazo) calculados em tempo real + mini gráfico de barras Recharts com distribuição por status (Aguardando/Enviado/Produção/Pronto/Retornado)', user: 'Antigravity', type: 'success', category: 'Sprint 5' },
  { id: 108, date: '17/05/2026 03:45', action: 'M3: Etiquetas de Produto — botão "Etiquetas" na aba Produtos do Estoque imprime etiquetas A4 (4 por linha) com nome, categoria, preço em destaque (azul, 13pt) e SKU em monospace para todos os produtos exibidos', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 107, date: '18/05/2026 03:15', action: 'M5: Histórico de Faturas — seção na página /pricing com lista de invoices mensais geradas dinamicamente por plano (Starter R$149/Pro R$349), badge pago/pendente, botão 2ª via', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 106, date: '18/05/2026 03:00', action: 'M19: PDF Prontuário Paciente — botão "PDF" em cada linha/card de paciente, busca receitas via getPatientPrescriptions(), abre janela print com dados pessoais + tabela OD/OE de todas as receitas, loading spinner durante fetch', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 105, date: '18/05/2026 02:45', action: 'M13: Campanha em Massa WhatsApp — nova aba "Campanha" com 3 segmentos (todos ativos, aniversariantes do mês, reengajamento 6+ meses), seletor de template, carrega pacientes via Supabase, botão "Enviar" por paciente com tracking visual de enviados', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 104, date: '18/05/2026 02:30', action: 'M21: Atalhos de teclado globais — hook useKeyboardShortcuts (Alt+D/P/V/O/E/F/L/W/A/C/H navega entre módulos), registrado no AppLayout; seção "Atalhos de Teclado" na Central de Ajuda com grid de kbd tags por categoria', user: 'Antigravity', type: 'success', category: 'Sprint 8' },
  { id: 103, date: '18/05/2026 02:15', action: 'M16: Auto-conciliação bancária — botão "Auto-conciliar" na aba Conciliação OFX: compara DEBIT transactions com despesas não pagas por tolerância ±5% de valor, vincula matches automaticamente e exibe contagem de correspondências', user: 'Antigravity', type: 'success', category: 'Sprint 6' },
  { id: 102, date: '18/05/2026 02:00', action: 'M7: Imprimir receita óptica — botão "Imprimir" em cada card de receita no PatientPrescriptionsModal, abre janela com layout HTML formatado (tabela OD/OE, médico/CRM, validade, notas, nome do paciente e empresa)', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 101, date: '18/05/2026 01:45', action: 'M1: Modal detalhe NF-e — clique no ícone Eye abre modal com todos os campos (número, série, emissão, cliente, descrição, chave, valor), botões de status inline e exclusão direto do modal', user: 'Antigravity', type: 'success', category: 'Sprint 6' },
  { id: 100, date: '18/05/2026 01:30', action: 'M18: Importação CSV de Despesas — botão "Importar CSV" na aba Contas a Pagar, parser CSV (;/,), preview em tabela (descrição/valor/vencimento/categoria), import em lote via createExpense com feedback de conclusão', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 99, date: '18/05/2026 01:15', action: 'M14: Modal de detalhe de produto no Catálogo — clicar na imagem ou nome do produto abre modal com foto ampliada, descrição completa, badge de estoque (em estoque/indisponível) e botão Adicionar/Remover do orçamento', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 98, date: '18/05/2026 00:45', action: 'M23: Análise de Paciente com IA — botão "IA" por paciente (desktop + mobile), envia perfil ao Gemini (origem, idade, contato), modal com dots animados + resposta em 4 tópicos (perfil, canal, timing, upsell)', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 97, date: '18/05/2026 00:30', action: 'M20: Banner offline (WifiOff) + prompt de instalação PWA (beforeinstallprompt) no AppLayout — detecta online/offline em tempo real, banner dismissível com botão "Instalar"', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 96, date: '18/05/2026 00:15', action: 'M9: Envio WhatsApp por tipo de pós-venda — botão em cada linha (desktop + mobile), modal com mensagem personalizada por tipo (NPS/garantia/reclamação/recompra) e campo de telefone', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 95, date: '17/05/2026 23:45', action: 'M5: Checkout de plano — modal com formulário (nome, email, CPF, número/validade/CVV do cartão), spinner de processamento e tela de sucesso; botões "Assinar" nos cards de plano', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 94, date: '17/05/2026 23:30', action: 'M4: Relatório consolidado multi-filial — página /relatorio-rede com bar chart de faturamento, tabela de OS/vendas/pacientes por filial com % do total; link "Ver relatório completo" no widget do Dashboard', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 93, date: '17/05/2026 23:15', action: 'M13: Chatbot IA no WhatsApp — nova aba "IA" com chat multi-turn Gemini, sugestões rápidas, auto-scroll, streaming visual de resposta (dots animados), Enter para enviar', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 92, date: '17/05/2026 22:30', action: 'M8: Bulk actions no Laboratório — seleção múltipla de pedidos em lista (checkbox por linha, select-all no header), toolbar "Avançar selecionados" com Promise.all paralelo, highlight visual das linhas selecionadas, reset ao trocar filtro/modo', user: 'Antigravity', type: 'success', category: 'Sprint 5' },
  { id: 91, date: '17/05/2026 22:15', action: 'M22: Dados da Empresa no Perfil — formulário com nome, telefone, email, endereço, cidade e estado; salva via supabase.from(\'companies\').update(); feedback de sucesso/erro', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 90, date: '17/05/2026 22:00', action: 'M14: Catálogo melhorado — botão Compartilhar (copia URL, feedback "Copiado!"), SEO dinâmico (document.title + OG meta), modal de orçamento com formulário nome/tel/msg que abre WhatsApp pré-preenchido', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 89, date: '17/05/2026 21:30', action: 'M23: Insights de Negócio IA — backend /api/v1/ai/insights (Gemini), aba "Insights IA" na Analytics com 5 cards priorizados (alerta/oportunidade/dica/parabéns)', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 88, date: '17/05/2026 21:15', action: 'M15: Compartilhar Pix via WhatsApp — mensagem pré-formatada com valor/descrição/chave; botão "Copiar link QR Code" na aba Nova Cobrança', user: 'Antigravity', type: 'success', category: 'Sprint 4' },
  { id: 87, date: '17/05/2026 21:00', action: 'M4: Consolidação Multi-Filial no Dashboard — widget "Visão Consolidada da Rede" para usuários com múltiplas óticas: faturamento, clientes e OS agregados + breakdown por filial', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 86, date: '17/05/2026 20:30', action: 'M20: Push Notifications nativas — requestPermission(), new Notification() para novas não lidas, dedup por ID via useRef, banner "Ativar" no NotificationsPanel', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 85, date: '17/05/2026 20:15', action: 'M13: Histórico de Envios WhatsApp — aba "Histórico" com log localStorage (até 100 mensagens), reenvio wa.me e limpar histórico', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 84, date: '17/05/2026 20:00', action: 'M1: Módulo Fiscal — página /fiscal com 3 abas (NF-e/NFS-e, Guias DAS, Configuração), CRUD manual de NFs e guias, config. fiscal (CNPJ/regime/CRT/alíquotas), export CSV, link Sidebar "Fiscal"', user: 'Antigravity', type: 'success', category: 'Sprint 6' },
  { id: 83, date: '17/05/2026 19:45', action: 'M13: Busca de pacientes no WhatsApp — autocomplete Supabase (min 2 chars, limit 8), auto-preenche telefone + variável {nome} ao selecionar paciente', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 82, date: '17/05/2026 19:30', action: 'M15: Módulo Pix — chave Pix (5 tipos), QR Code display, KPIs do mês via Supabase, histórico de cobranças avulsas com toggle pago/pendente', user: 'Antigravity', type: 'success', category: 'Sprint 4' },
  { id: 81, date: '17/05/2026 19:15', action: 'M13: WhatsApp Templates — 8 modelos pré-definidos (OS, lab, cobrança, marketing, pós-venda), variáveis dinâmicas, preview, composer e envio via wa.me', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 80, date: '17/05/2026 19:00', action: 'M13: Templates personalizados WhatsApp — criar/salvar/deletar via localStorage, extração automática de variáveis {nome},{valor}...', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 79, date: '17/05/2026 18:30', action: 'M4: Hierarquia Matriz/Filial — CompanyDetail admin: seletor de empresa-mãe, lista de filiais vinculadas, salvar parent_company_id via Supabase', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 78, date: '17/05/2026 18:15', action: 'M14: Botão "Compartilhar Catálogo" em Produtos — copia link /catalogo/:companyId para clipboard com feedback visual', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 77, date: '17/05/2026 18:00', action: 'M14: Vitrine pública /catalogo/:companyId — filtro categoria, busca, carrinho de orçamento com link WhatsApp, backend /api/catalog público', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 76, date: '17/05/2026 17:30', action: 'M20: NotificationsPanel — dropdown no Header com lista de notificações, mark read, dismiss individual, limpar tudo e badge de não lidas', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 75, date: '17/05/2026 17:15', action: 'M20: hook useNotifications — gera notificações reais (estoque baixo, defeitos lab, OS >5d, pós-venda pendente, trial expirando) com localStorage e refresh automático 5min', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 74, date: '17/05/2026 17:00', action: 'M5: Página /pricing — 3 planos (Starter/Pro/Enterprise), tabela comparativa 20 features, FAQ e badge "plano atual"; link na Sidebar + banner de trial', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 73, date: '17/05/2026 15:30', action: 'M23: Modo Conversa — AIDono suporta perguntas de acompanhamento (multi-turn Gemini); backend mapeia role assistant→model; chat com bolhas user/assistant', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 72, date: '17/05/2026 15:00', action: 'M22: Novidades do Sistema — widget changelog no Dashboard principal com 5 features recentes, ícone Zap e badge "Mai 2026"', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 59, date: '17/05/2026 11:00', action: 'Planos: hook usePlanLimits + banner de aviso ao atingir/aproximar limite de pacientes + botões desabilitados no limite', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 58, date: '17/05/2026 10:45', action: 'Comissões: Export CSV com vendedor, qtd, total, % comissão e valor — download direto filtrado pelo período selecionado', user: 'Antigravity', type: 'success', category: 'Sprint 4' },
  { id: 57, date: '17/05/2026 10:30', action: 'Pós-venda: página dedicada /post-sales com cards NPS/pendentes, filtros tipo+status+período, tabela desktop, cards mobile e botão Resolver', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 67, date: '17/05/2026 14:00', action: 'Produtos: importação de CSV inline — parser valida nome/preço, preview de linhas válidas/inválidas, importação em lote via createProduct()', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 66, date: '17/05/2026 13:45', action: 'Compras: filtro período (30d/90d/12m/tudo), cards resumo (total gasto, pendente, qtd), export CSV por período', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 65, date: '17/05/2026 13:30', action: 'Financeiro: aba "Contas Bancárias" com CRUD localStorage — adicionar/editar/excluir contas por banco e tipo (corrente/poupança/investimento/caixa), card patrimônio total', user: 'Antigravity', type: 'success', category: 'Sprint 6' },
  { id: 64, date: '17/05/2026 13:15', action: 'Pacientes: Upgrade CTA — botão "Ver Planos →" no banner de limite (âmbar/vermelho), leva para /profile', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 63, date: '17/05/2026 12:00', action: 'Analytics: aba "Semana" com receita/ticket/vendas por dia da semana (Seg-Dom), cards de retenção (novos vs retornantes) e tabela resumo com badge "melhor dia"', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 62, date: '17/05/2026 11:45', action: 'Analytics: retenção de clientes calculada a partir de patient_id nas vendas do período — novos (1ª compra) vs retornantes (2ª compra ou mais)', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 61, date: '17/05/2026 11:30', action: 'Tour Interativo: 8 passos com spotlight (box-shadow), tooltip posicionado dinamicamente e progresso percentual — ativado via CustomEvent do botão na Central de Ajuda', user: 'Antigravity', type: 'success', category: 'Sprint 8' },
  { id: 60, date: '17/05/2026 11:15', action: 'Central de Ajuda: card "Iniciar Tour" adicionado ao topo da página — dispara CustomEvent start-tour para o AppLayout', user: 'Antigravity', type: 'success', category: 'Sprint 8' },
  { id: 56, date: '17/05/2026 10:15', action: 'Pós-venda: getAllPostSales() no service com join patient — antes só existia getPatientPostSales(patientId)', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 55, date: '16/05/2026 15:30', action: 'Compras: Resumo por Fornecedor — painel agregado com total gasto, nº de pedidos e valor pendente de recebimento', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 54, date: '16/05/2026 15:15', action: 'Exportação: CSV de Ordens de Serviço com status, tipo, paciente, itens, total e data', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 53, date: '16/05/2026 15:00', action: 'Estoque: filtro clicável "Estoque Baixo" + coluna Mínimo visível na tabela de Produtos', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 52, date: '16/05/2026 13:30', action: 'OFX Import: parser de extrato bancário no modal Financeiro com sumário de entradas/saídas e lista de transações', user: 'Antigravity', type: 'success', category: 'Sprint 6' },
  { id: 51, date: '16/05/2026 13:15', action: 'Comissões: Meta Mensal por vendedor com barra de progresso, % atingida e troféu ao bater a meta', user: 'Antigravity', type: 'success', category: 'Sprint 4' },
  { id: 50, date: '16/05/2026 13:00', action: 'Lab: botão Avisar Cliente via WhatsApp quando pedido está pronto (status pronto_retorno)', user: 'Antigravity', type: 'success', category: 'Sprint 5' },
  { id: 49, date: '16/05/2026 11:00', action: 'Cotações Fornecedores: nova aba em Estoque para comparar preços de múltiplos fornecedores por item com destaque de menor preço e ranking geral', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 48, date: '16/05/2026 10:45', action: 'Importação CSV: validação de CPF duplicado — compara contra Dexie antes do import e marca linhas duplicadas (ignoradas)', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 47, date: '16/05/2026 10:30', action: 'Comissões: Ranking de Vendedores com medalhas 🥇🥈🥉, barra de participação e % do total no período', user: 'Antigravity', type: 'success', category: 'Sprint 4' },
  { id: 46, date: '16/05/2026 09:15', action: 'Backup Manual: botão no Perfil exporta pacientes + vendas + produtos + despesas em CSVs sequenciais', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 45, date: '16/05/2026 09:00', action: 'Inventário Cíclico: nova aba em Estoque com contagem por produto, diff colorido e ajuste em lote via moveStock', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 44, date: '16/05/2026 08:45', action: 'exportProductsCsv corrigido para usar sale_price (campo correto do tipo Product)', user: 'Antigravity', type: 'fix', category: 'Fix' },
  { id: 43, date: '16/05/2026 08:30', action: 'Lab Kanban: toggle lista/kanban com colunas por status, cards de ação e coluna de defeitos', user: 'Antigravity', type: 'success', category: 'Sprint 5' },
  { id: 42, date: '16/05/2026 08:15', action: 'DRE Completo: aba DRE na Analytics com receita, descontos, CMV configurável, despesas por categoria e margem', user: 'Antigravity', type: 'success', category: 'Sprint 6' },
  { id: 41, date: '16/05/2026 07:30', action: 'Comissões: página completa com performance por vendedor, percentual configurável e filtro por período', user: 'Antigravity', type: 'success', category: 'Sprint 4' },
  { id: 40, date: '16/05/2026 07:15', action: 'Convênios: página de listagem com tabela, cards mobile, filtros, toggle ativo/inativo e exclusão', user: 'Antigravity', type: 'success', category: 'Sprint 4' },
  { id: 39, date: '16/05/2026 07:00', action: 'Convênios: backend route + Dexie v10 + service offline-first + ConvenioModal criar/editar', user: 'Antigravity', type: 'success', category: 'Sprint 4' },
  { id: 38, date: '16/05/2026 06:15', action: 'Importação CSV de Pacientes: modal com preview, progresso por linha e feedback de erro', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 37, date: '16/05/2026 06:00', action: 'Sync service: pullFromServer agora sincroniza expenses e purchase_orders/items', user: 'Antigravity', type: 'success', category: 'Backend' },
  { id: 36, date: '16/05/2026 05:45', action: 'CSV Export: pacientes, vendas, despesas e produtos — download direto no navegador', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 35, date: '16/05/2026 05:30', action: 'Laboratório: status flow interativo — avançar etapa, marcar defeito, filtros e sync Supabase', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 34, date: '16/05/2026 05:15', action: 'alert() eliminados de todo o frontend: Employees, Sales, Orders, SaleModal, AvatarUpload', user: 'Antigravity', type: 'success', category: 'Frontend' },
  { id: 33, date: '16/05/2026 05:00', action: 'Funcionários: modal de invite real (POST /admin/users) e edição de perfil (nome, cargo, telefone)', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 32, date: '16/05/2026 04:50', action: 'Vendas: Garantia PDF gerada com jsPDF (12 meses, termos, assinaturas)', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 31, date: '16/05/2026 04:45', action: 'Vendas: alerts substituídos por banners + Comprovante PDF integrado ao PrintOptionsModal', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 30, date: '16/05/2026 04:20', action: 'Backend: POST/GET/PATCH/DELETE /expenses + POST /expenses/:id/pay com logAudit', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 29, date: '16/05/2026 04:15', action: 'Contas a Pagar: CRUD completo — criar, editar, marcar pago, excluir com 10 categorias', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 28, date: '16/05/2026 04:10', action: 'DRE Simplificado: demonstrativo receita × despesas por categoria no mês corrente', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 27, date: '16/05/2026 04:05', action: 'expenses.service.ts: offline-first (Dexie v9) + Supabase + sync queue + markPaid', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 23, date: '16/05/2026 03:45', action: 'LGPD: Geração de Termo de Consentimento formal em PDF (jsPDF)', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 24, date: '16/05/2026 03:40', action: 'Receitas: Upload de anexos (imagem/PDF) integrado ao Supabase Storage', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 25, date: '16/05/2026 03:35', action: 'CRM: Filtros avançados por origem, recorrente e status de atividade', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 26, date: '16/05/2026 03:30', action: 'Inteligência: Sugestão automática de próxima recompra baseada em 1 ano', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 20, date: '16/05/2026 03:30', action: 'Analytics completo: receita diária, tendência, top produtos, NPS e formas de pagamento', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 21, date: '16/05/2026 03:20', action: 'Módulo Financeiro: caixa diário, fluxo semanal, lançamentos recentes e breakdown por pagamento', user: 'Antigravity', type: 'success', category: 'Sprint 6' },
  { id: 22, date: '16/05/2026 03:10', action: 'Sidebar: item "Financeiro" adicionado; rota /financial registrada no App.tsx', user: 'Antigravity', type: 'success', category: 'Frontend' },
  { id: 14, date: '16/05/2026 02:00', action: 'Sprint 3 iniciada — Módulo Compras: pedidos, recebimento e atualização de estoque', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 15, date: '16/05/2026 01:50', action: 'PurchaseOrderModal: criar pedido + dar entrada com atualização automática do estoque', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 16, date: '16/05/2026 01:40', action: 'purchases.service.ts: offline-first (Dexie v8) + Supabase + sync queue', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 71, date: '17/05/2026 14:00', action: 'M21: Ajuda e Onboarding — HelpPage FAQ accordion + WelcomeModal first-time + NavLink Ajuda na Sidebar', user: 'Antigravity', type: 'success', category: 'Sprint 8' },
  { id: 70, date: '17/05/2026 13:45', action: 'M5: Trial banner + Suspended banner no AppLayout via hook useSubscription (Supabase)', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 69, date: '17/05/2026 13:30', action: 'Fix: Sidebar substituiu ícone Handshake (inexistente v0.309) por ClipboardCheck', user: 'Antigravity', type: 'info', category: 'Fix' },
  { id: 68, date: '17/05/2026 13:00', action: 'M23: Assistente Dono — backend /api/ai/assistant (Gemini) + widget flutuante AIDono no AppLayout', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 67, date: '17/05/2026 12:45', action: 'M23: Previsão de Demanda — regressão linear nos dados históricos + gráfico de forecast 14d no Analytics', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 66, date: '17/05/2026 12:30', action: 'M22: Gestão de Planos reconhecida como completa — Plans.tsx + CompanyDetail assinatura já implementados', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 65, date: '17/05/2026 11:30', action: 'M10: Faturamento de Convênio — aba com seletor de período, resumo financeiro, agrupamento por paciente e export CSV', user: 'Antigravity', type: 'success', category: 'Sprint 4' },
  { id: 64, date: '17/05/2026 11:20', action: 'M18: Rollback de Importação — batch ID + coleta de IDs criados + localStorage + botão Desfazer no ImportPatientsModal', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 63, date: '17/05/2026 11:10', action: 'M8: Indicador de Prazo no LabStatus — daysInfo() helper + coluna Prazo na tabela + badge colorido nos cards', user: 'Antigravity', type: 'success', category: 'Sprint 5' },
  { id: 62, date: '17/05/2026 10:30', action: 'M22: Impersonation — authStore.startImpersonate/stop + banner AppLayout + botão Admin Companies', user: 'Antigravity', type: 'success', category: 'Sprint 1' },
  { id: 61, date: '17/05/2026 10:20', action: 'M16: Conciliação Manual OFX — persistência bank_transactions + aba Conciliação com vinculação a despesas', user: 'Antigravity', type: 'success', category: 'Sprint 6' },
  { id: 60, date: '17/05/2026 10:15', action: 'M16: ImportOfxModal atualizado — botão Salvar transações + feedback de sucesso', user: 'Antigravity', type: 'success', category: 'Sprint 6' },
  { id: 59, date: '17/05/2026 10:10', action: 'M16: bank-transactions.service.ts — CRUD Supabase (upsert por external_id)', user: 'Antigravity', type: 'success', category: 'Sprint 6' },
  { id: 58, date: '16/05/2026 09:20', action: 'M10: Autorizações de Convênio — aba + CRUD + modal (AutorizacaoModal.tsx)', user: 'Antigravity', type: 'success', category: 'Sprint 4' },
  { id: 57, date: '16/05/2026 09:15', action: 'M17: Funil de OS por Status — gráfico horizontal de barras no Analytics', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 56, date: '16/05/2026 09:10', action: 'M10: service convenio-autorizacoes + tipos AutorizacaoStatus no types/index.ts', user: 'Antigravity', type: 'success', category: 'Sprint 4' },
  { id: 17, date: '16/05/2026 01:35', action: 'Aba "Compras" adicionada ao módulo Estoque (Inventory/index.tsx)', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 18, date: '16/05/2026 01:30', action: 'Backend: POST/GET /purchases, PATCH /status, POST /receive com logAudit', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 19, date: '16/05/2026 01:20', action: 'Sprint 2 concluída — CRM, LGPD, Receitas, Timeline, Pós-venda entregues', user: 'Antigravity', type: 'success', category: 'Planning' },
  { id: 1, date: '16/05/2026 00:30', action: 'Pós-venda inicial: NPS, garantia, assistência, ajuste, reclamação e recompra', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 12, date: '16/05/2026 00:15', action: 'CRM completo: origem, tags, preferências de armação/lente, recompra, recorrente', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 13, date: '16/05/2026 00:05', action: 'Receita: tipo de lente adicionado (monofocal, bifocal, multifocal, ocupacional...)', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 0, date: '15/05/2026 23:59', action: 'Linha do Tempo do Paciente: timeline unificada (receitas + LGPD + cadastro)', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 11, date: '15/05/2026 23:55', action: 'LGPD: consentimento, audit_logs, exportação JSON, anonimização (direito ao esquecimento)', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 2, date: '15/05/2026 23:30', action: 'Receitas Oftalmológicas: CRUD completo (backend + frontend + modais + IA Gemini)', user: 'Antigravity', type: 'success', category: 'Sprint 2' },
  { id: 2, date: '15/05/2026 23:15', action: 'Página Pacientes: botão Receitas integrado (desktop + mobile)', user: 'Antigravity', type: 'success', category: 'Frontend' },
  { id: 3, date: '15/05/2026 22:50', action: 'PatientPrescriptionsModal: histórico com badge de validade e CRUD inline', user: 'Antigravity', type: 'success', category: 'Frontend' },
  { id: 4, date: '15/05/2026 22:30', action: 'prescriptions.service.ts: offline-first com Dexie + sync automático Supabase', user: 'Antigravity', type: 'success', category: 'Backend' },
  { id: 5, date: '15/05/2026 21:00', action: 'Dev OS: polling automático + dados 100% reais da API e dos docs', user: 'Antigravity', type: 'success', category: 'Frontend' },
  { id: 6, date: '15/05/2026 20:45', action: 'API /api/v1/dev/status criada com health check real do banco de dados', user: 'Antigravity', type: 'success', category: 'Backend' },
  { id: 7, date: '15/05/2026 18:00', action: 'Sprint 1 Concluída — Auth, Layout, Sidebar, Multi-tenancy, RBAC finalizados', user: 'Antigravity', type: 'success', category: 'Planning' },
  { id: 8, date: '15/05/2026 16:00', action: 'Sprint 0 Concluída — auditoria, planejamento e roadmap finalizados', user: 'Antigravity', type: 'success', category: 'Planning' },
  { id: 9, date: '15/05/2026 15:00', action: 'Documentação técnica criada: architecture, database, api-contracts, lgpd-security', user: 'Antigravity', type: 'info', category: 'Docs' },
  { id: 10, date: '15/05/2026 14:00', action: 'Catálogo de 23 módulos detalhado (feature-catalog.md) criado', user: 'Antigravity', type: 'info', category: 'Docs' },
]

// ─── Utilitários ───────────────────────────────────────────────────────────
function formatUptime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`
}

// ─── Componente ────────────────────────────────────────────────────────────
export default function DeveloperDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [health, setHealth] = useState<ApiHealth | null>(null)
  const [healthError, setHealthError] = useState(false)
  const [logSearch, setLogSearch] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Métricas calculadas automaticamente de MODULES_23
  const totalProgress = Math.round(MODULES_23.reduce((s, m) => s + m.progress, 0) / MODULES_23.length)
  const modulesWithCode = MODULES_23.filter(m => m.progress > 0).length

  const filteredLogs = LOGS.filter(l =>
    !logSearch ||
    l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.category.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.user.toLowerCase().includes(logSearch.toLowerCase())
  )

  const loadHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/dev/status`)
      const json = await res.json()
      if (json.success) {
        setHealth(json.data)
        setHealthError(false)
        setLastRefresh(new Date())
      }
    } catch {
      setHealthError(true)
    }
  }

  useEffect(() => {
    loadHealth()
    const id = setInterval(loadHealth, 30_000)
    return () => clearInterval(id)
  }, [])

  const dbOnline = health?.database.status === 'connected'
  const apiOnline = !healthError && health !== null

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30">

      {/* Fundo decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Banner de alerta — backend offline */}
      {healthError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600/95 backdrop-blur text-white text-sm font-bold py-2.5 px-6 flex items-center gap-3">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          Backend offline — dados de saúde indisponíveis. Verifique se o servidor está rodando: <code className="font-mono bg-white/20 px-1 rounded">cd backend &amp;&amp; npm run dev</code>
        </div>
      )}

      <div className="relative max-w-[1600px] mx-auto p-4 md:p-8 space-y-8" style={{ paddingTop: healthError ? '4rem' : undefined }}>

        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/50 backdrop-blur-xl border border-white/5 p-6 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3 italic">
                MINHA ÓTICA <span className="text-blue-500 not-italic font-light">| DEV OS</span>
              </h1>
              <div className="flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">
                  <Globe className="w-3 h-3" /> Development
                </span>
                <span className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                  apiOnline
                    ? 'text-green-400 bg-green-500/10 border-green-500/20'
                    : 'text-red-400 bg-red-500/10 border-red-500/20'
                }`}>
                  {apiOnline ? <Zap className="w-3 h-3 animate-pulse" /> : <WifiOff className="w-3 h-3" />}
                  {apiOnline ? 'Agent Active' : 'API Offline'}
                </span>
                {lastRefresh && (
                  <span className="text-[10px] text-slate-500">
                    Sync: {lastRefresh.toLocaleTimeString('pt-BR')} • auto 30s
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadHealth}
              title="Atualizar agora"
              className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <nav className="flex bg-slate-800/50 p-1 rounded-2xl border border-white/5">
              {(['overview', 'backlog', 'technical', 'logs'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all uppercase tracking-widest ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* ── OVERVIEW ────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">

            {/* KPI Cards — dados reais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Sprint Atual */}
              <Card className="p-6 bg-slate-900/50 border-white/5 backdrop-blur-sm flex items-center justify-between hover:border-blue-500/30 transition-all cursor-default">
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Sprint Atual</p>
                  <h3 className="text-2xl font-black text-blue-400">Sprint 3</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Estoque/Compras • 01-07/06</p>
                </div>
                <div className="p-4 rounded-2xl bg-blue-500/10">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
              </Card>

              {/* Progresso Geral — calculado de MODULES_23 */}
              <Card className="p-6 bg-slate-900/50 border-white/5 backdrop-blur-sm flex items-center justify-between hover:border-indigo-500/30 transition-all cursor-default">
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Progresso Geral</p>
                  <h3 className="text-2xl font-black text-indigo-400">{totalProgress}%</h3>
                  <p className="text-[10px] text-slate-400 font-medium">{modulesWithCode} / 23 módulos com código</p>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-500/10">
                  <Box className="w-6 h-6 text-indigo-400" />
                </div>
              </Card>

              {/* Latência API — real */}
              <Card className={`p-6 bg-slate-900/50 backdrop-blur-sm flex items-center justify-between transition-all cursor-default ${
                apiOnline ? 'border-white/5 hover:border-green-500/30' : 'border-red-500/40'
              }`}>
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Latência API</p>
                  <h3 className={`text-2xl font-black ${apiOnline ? 'text-green-400' : 'text-red-400'}`}>
                    {health ? `${health.api.latencyMs}ms` : '—'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {apiOnline && health ? `Uptime: ${formatUptime(health.api.uptimeSeconds)}` : 'Backend offline'}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${apiOnline ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <Cpu className={`w-6 h-6 ${apiOnline ? 'text-green-400' : 'text-red-400'}`} />
                </div>
              </Card>

              {/* DB Status — real */}
              <Card className={`p-6 bg-slate-900/50 backdrop-blur-sm flex items-center justify-between transition-all cursor-default ${
                !health ? 'border-white/5' : dbOnline ? 'border-white/5 hover:border-purple-500/30' : 'border-red-500/40'
              }`}>
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Banco de Dados</p>
                  <h3 className={`text-2xl font-black ${!health ? 'text-slate-500' : dbOnline ? 'text-purple-400' : 'text-red-400'}`}>
                    {!health ? '...' : dbOnline ? 'ONLINE' : 'OFFLINE'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {!health
                      ? 'Verificando conexão...'
                      : dbOnline
                      ? `${health.database.latencyMs}ms • Supabase`
                      : 'Sem conexão com Supabase'}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${!health ? 'bg-slate-800' : dbOnline ? 'bg-purple-500/10' : 'bg-red-500/10'}`}>
                  <Database className={`w-6 h-6 ${!health ? 'text-slate-600' : dbOnline ? 'text-purple-400' : 'text-red-400'}`} />
                </div>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Progresso por camada — derivado automaticamente */}
              <Card className="lg:col-span-2 p-8 bg-slate-900/50 border-white/5">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                    Progresso por Camada de Produto
                  </h3>
                  <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px] font-bold">
                    Auditado 16/05/2026
                  </Badge>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={PROGRESS_DATA} layout="vertical" margin={{ left: 80, right: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={v => `${v}%`}
                        style={{ fontSize: '11px', fill: '#94a3b8' }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        width={90}
                        style={{ fontSize: '11px', fontWeight: 700, fill: '#94a3b8' }}
                      />
                      <Tooltip
                        formatter={(v) => [`${v}%`, 'Progresso']}
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontWeight: 700 }}
                      />
                      <Bar dataKey="progress" radius={[0, 8, 8, 0]} barSize={26}>
                        {PROGRESS_DATA.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Timeline das Sprints */}
              <Card className="p-8 bg-slate-900/50 border-white/5 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    Progresso das Sprints
                  </h3>
                  <div className="space-y-3">
                    {SPRINTS.map(sprint => (
                      <div key={sprint.code} className="flex items-center gap-3">
                        <span className={`text-[10px] font-black w-7 flex-shrink-0 ${
                          sprint.done ? 'text-green-400' : sprint.active ? 'text-blue-400' : 'text-slate-600'
                        }`}>{sprint.code}</span>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              sprint.done ? 'bg-green-500' : sprint.active ? 'bg-blue-500/60' : 'bg-slate-700'
                            }`}
                            style={{ width: sprint.done ? '100%' : sprint.active ? '4%' : '0%' }}
                          />
                        </div>
                        <span className={`text-[9px] font-bold w-16 text-right flex-shrink-0 ${
                          sprint.done ? 'text-green-400' : sprint.active ? 'text-blue-400' : 'text-slate-600'
                        }`}>
                          {sprint.done ? '✓ Feita' : sprint.active ? 'Ativa' : sprint.period}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sprints Feitas</span>
                    <span className="text-sm font-black text-white">3 / 9</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Módulos c/ Código</span>
                    <span className="text-sm font-black text-white">{modulesWithCode} / 23</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prazo-Alvo</span>
                    <span className="text-sm font-black text-white">Julho 2026</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── BACKLOG ─────────────────────────────────────────────────── */}
        {activeTab === 'backlog' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Em Andamento</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Parcial</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600 inline-block" /> Backlog</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {MODULES_23.map((mod) => (
                <Card key={mod.id} className="p-5 bg-slate-900/50 border-white/5 group hover:border-blue-500/40 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-blue-600/10 transition-colors">
                      <span className="text-xs font-black text-slate-400 group-hover:text-blue-400">{mod.id}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">S{mod.sprint}</span>
                      {mod.status === 'in-progress' ? (
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] animate-pulse">Ativo</Badge>
                      ) : mod.status === 'partial' ? (
                        <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[9px]">Parcial</Badge>
                      ) : (
                        <Badge className="bg-slate-800 text-slate-500 border-slate-700 text-[9px]">Backlog</Badge>
                      )}
                    </div>
                  </div>

                  <h4 className="font-bold text-sm mb-3 text-white group-hover:text-blue-400 transition-colors leading-tight">{mod.name}</h4>

                  <div className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] font-bold text-slate-600 uppercase">Progresso</span>
                      <span className="text-[9px] font-black text-slate-400">{mod.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          mod.status === 'in-progress' ? 'bg-blue-500' :
                          mod.status === 'partial' ? 'bg-indigo-500' : 'bg-slate-700'
                        }`}
                        style={{ width: `${mod.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {mod.tasks.map((task, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-500">
                        <div className="w-1 h-1 rounded-full bg-slate-700 flex-shrink-0" />
                        {task}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── TECHNICAL ───────────────────────────────────────────────── */}
        {activeTab === 'technical' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in zoom-in-95 duration-500">

            {/* Infraestrutura — status real */}
            <Card className="p-8 bg-slate-900/50 border-white/5">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                <Database className="w-6 h-6 text-blue-500" />
                Infraestrutura & Status Real
              </h3>
              <div className="space-y-4">
                {([
                  {
                    label: 'API Backend',
                    val: health ? `${health.api.environment} • ${health.api.version}` : 'Aguardando...',
                    icon: Cpu,
                    status: apiOnline ? `${health?.api.latencyMs}ms` : 'Offline',
                    ok: apiOnline,
                  },
                  {
                    label: 'Banco de Dados',
                    val: health?.database.provider ?? 'Supabase / PostgreSQL 15',
                    icon: Database,
                    status: dbOnline ? `${health?.database.latencyMs}ms` : 'Offline',
                    ok: dbOnline,
                  },
                  {
                    label: 'Storage',
                    val: health?.storage.provider ?? 'Supabase Storage',
                    icon: HardDrive,
                    status: health?.storage.status === 'online' ? 'Online' : '—',
                    ok: health?.storage.status === 'online',
                  },
                  {
                    label: 'Auth Provider',
                    val: 'Supabase Auth (JWT)',
                    icon: Lock,
                    status: dbOnline ? 'Enabled' : '—',
                    ok: dbOnline,
                  },
                  {
                    label: 'Uptime do Processo',
                    val: health ? `Node.js ${health.api.environment}` : 'Aguardando...',
                    icon: Activity,
                    status: health ? formatUptime(health.api.uptimeSeconds) : '—',
                    ok: apiOnline,
                  },
                ] as const).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-600/10 rounded-lg">
                        <item.icon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{item.label}</p>
                        <p className="text-sm font-bold text-white">{item.val}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase ${item.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Resposta real da API */}
            <Card className="p-8 bg-[#020617] border-white/10 relative overflow-hidden font-mono">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-3 text-blue-400">
                  <Terminal className="w-5 h-5" />
                  GET /api/v1/dev/status
                </h3>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                  <div className={`w-3 h-3 rounded-full ${apiOnline ? 'bg-green-500' : 'bg-slate-600'}`} />
                </div>
              </div>
              <div className="overflow-auto max-h-[400px]">
                {health ? (
                  <pre className="text-green-400 text-xs whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify({ success: true, data: health }, null, 2)}
                  </pre>
                ) : healthError ? (
                  <div className="text-red-400 text-xs space-y-2">
                    <p>{'// ERR_CONNECTION_REFUSED'}</p>
                    <p className="text-slate-500">{'// Backend não está respondendo.'}</p>
                    <p className="text-slate-500">{'// Execute: cd backend && npm run dev'}</p>
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs animate-pulse">{'// Conectando ao backend...'}</p>
                )}
                <div className="flex items-center gap-2 mt-6">
                  <span className="text-blue-500">➜</span>
                  <span className="w-2 h-4 bg-blue-500 animate-pulse inline-block" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── LOGS ────────────────────────────────────────────────────── */}
        {activeTab === 'logs' && (
          <Card className="p-8 bg-slate-900/50 border-white/5 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-bold flex items-center gap-3 text-indigo-400">
                <FileCode className="w-6 h-6" />
                Auditoria de Eventos & Entregas
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  placeholder="Filtrar por ação, categoria, usuário..."
                  className="bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:ring-2 ring-blue-500 transition-all outline-none w-80"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="group flex items-center gap-6 p-4 rounded-2xl bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/10 transition-all">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter w-28 flex-shrink-0">
                    {log.date}
                  </div>
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    {log.type === 'success'
                      ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      : <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    }
                    <span className="text-sm font-bold text-slate-200 truncate">{log.action}</span>
                  </div>
                  <Badge className="bg-slate-800 text-slate-400 border-slate-700 uppercase text-[9px] font-black flex-shrink-0">
                    {log.category}
                  </Badge>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {log.user.charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-slate-400">{log.user}</span>
                  </div>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-center py-12 text-slate-500 font-bold">
                  Nenhum log para "{logSearch}"
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Floating status bar */}
        <div className="fixed bottom-8 right-8 z-50">
          <Card className={`p-4 shadow-2xl rounded-2xl border-none flex items-center gap-3 hover:scale-105 transition-all cursor-default ${
            healthError
              ? 'bg-red-600 shadow-red-600/40'
              : dbOnline
              ? 'bg-blue-600 shadow-blue-600/40'
              : 'bg-amber-600 shadow-amber-600/40'
          }`}>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <Cpu className={`w-6 h-6 ${healthError ? 'text-red-600' : dbOnline ? 'text-blue-600' : 'text-amber-600'}`} />
            </div>
            <div className="pr-2">
              <p className={`text-[10px] font-black uppercase tracking-widest ${healthError ? 'text-red-200' : dbOnline ? 'text-blue-200' : 'text-amber-200'}`}>
                {healthError ? 'Sistema Offline' : dbOnline ? 'Sistema Online' : 'DB Desconectado'}
              </p>
              <p className="text-sm font-bold text-white">
                {health ? `${health.api.latencyMs}ms • Sprint 3 ativa` : 'Verificando...'}
              </p>
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}
