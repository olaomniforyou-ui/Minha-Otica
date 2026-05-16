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
  { id:  1, name: 'Fiscal e Documentos',   status: 'partial',     progress: 10, sprint: 6, tasks: ['NF-e/NFC-e', 'Certificado A1', 'XML/DANFE'] },
  { id:  2, name: 'Compras e Suprimentos', status: 'in-progress', progress: 55, sprint: 3, tasks: ['Pedido de Compra (CRUD) ✓', 'Dar Entrada / Recebimento ✓', 'Atualização de Estoque ✓', 'Cotações'] },
  { id:  3, name: 'Estoque Avançado',      status: 'in-progress', progress: 70, sprint: 3, tasks: ['Produtos + Categorias ✓', 'Fornecedores ✓', 'Marcas/Modelos ✓', 'Movimentações ✓', 'Inventário Cíclico'] },
  { id:  4, name: 'Multiempresa (SaaS)',   status: 'partial',     progress: 45, sprint: 1, tasks: ['Isolamento Tenant', 'Hierarquia Matriz/Filial'] },
  { id:  5, name: 'Planos e Assinaturas', status: 'partial',     progress:  8, sprint: 1, tasks: ['Billing', 'Trial', 'Limites por Plano'] },
  { id:  6, name: 'LGPD e Segurança',     status: 'in-progress', progress: 60, sprint: 2, tasks: ['Consentimento ✓', 'Logs Auditoria ✓', 'Exportação ✓', 'Anonimização ✓'] },
  { id:  7, name: 'Prontuário Óptico',    status: 'in-progress', progress: 72, sprint: 2, tasks: ['Histórico Grau ✓', 'OD/OE Completo ✓', 'Tipo de Lente ✓', 'Upload Anexos'] },
  { id:  8, name: 'Laboratório/Produção', status: 'partial',     progress: 10, sprint: 5, tasks: ['OS Automática', 'Kanban Produção', 'Notif. Cliente'] },
  { id:  9, name: 'Garantia e Pós-venda', status: 'in-progress', progress: 45, sprint: 2, tasks: ['NPS ✓', 'Garantia ✓', 'Assistência ✓', 'Ajuste ✓', 'Reclamação ✓', 'Recompra ✓'] },
  { id: 10, name: 'Convênios/Parceiros',  status: 'pending',     progress:  0, sprint: 4, tasks: ['Tabelas Especiais', 'Autorizações', 'Faturamento'] },
  { id: 11, name: 'Comissões Avançadas',  status: 'pending',     progress:  0, sprint: 6, tasks: ['Regras por Meta', 'Ranking Vendas', 'Pag. Recebimento'] },
  { id: 12, name: 'Marketing e CRM',      status: 'in-progress', progress: 65, sprint: 2, tasks: ['Cadastro Pacientes ✓', 'Origem/Tags/Preferências ✓', 'Linha do Tempo ✓', 'Pós-venda/NPS ✓'] },
  { id: 13, name: 'Omnichannel Real',     status: 'pending',     progress:  0, sprint: 7, tasks: ['WhatsApp API', 'Inbox Única', 'Chatbot IA'] },
  { id: 14, name: 'E-commerce/Catálogo',  status: 'pending',     progress:  0, sprint: 7, tasks: ['Vitrine Online', 'Link Pagamento', 'Retirada em Loja'] },
  { id: 15, name: 'Integ. Pagamento',     status: 'pending',     progress:  0, sprint: 4, tasks: ['Mercado Pago', 'Pix Automático', 'Cartão Recorrente'] },
  { id: 16, name: 'Conciliação Bancária', status: 'partial',     progress: 30, sprint: 6, tasks: ['Caixa Diário ✓', 'Fluxo Semanal ✓', 'Importação OFX', 'Open Finance'] },
  { id: 17, name: 'BI e Indicadores',     status: 'in-progress', progress: 55, sprint: 7, tasks: ['Receita Diária ✓', 'NPS Chart ✓', 'Top Produtos ✓', 'Formas Pagamento ✓', 'DRE/EBITDA'] },
  { id: 18, name: 'Importação/Migração',  status: 'pending',     progress:  0, sprint: 3, tasks: ['Planilhas Padrão', 'Validação Duplicatas', 'Rollback'] },
  { id: 19, name: 'Exportação de Dados',  status: 'partial',     progress:  5, sprint: 3, tasks: ['PDF/Excel', 'CSV', 'Backup Manual'] },
  { id: 20, name: 'App Mobile / PWA',     status: 'partial',     progress: 20, sprint: 1, tasks: ['Leitor Câmera ✓', 'Modo Offline (Dexie) ✓', 'Notificações Push'] },
  { id: 21, name: 'Ajuda e Onboarding',   status: 'pending',     progress:  0, sprint: 8, tasks: ['Tour Inicial', 'Tutoriais', 'FAQ'] },
  { id: 22, name: 'Backoffice SaaS',      status: 'partial',     progress: 30, sprint: 1, tasks: ['Dev OS Dashboard ✓', 'Impersonate', 'Gestão Planos'] },
  { id: 23, name: 'IA Aplicada',          status: 'partial',     progress: 15, sprint: 7, tasks: ['Scan Receita (Gemini) ✓', 'Previsão Demanda', 'Assistente Dono'] },
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
  { id: 20, date: '16/05/2026 03:30', action: 'Analytics completo: receita diária, tendência, top produtos, NPS e formas de pagamento', user: 'Antigravity', type: 'success', category: 'Sprint 7' },
  { id: 21, date: '16/05/2026 03:20', action: 'Módulo Financeiro: caixa diário, fluxo semanal, lançamentos recentes e breakdown por pagamento', user: 'Antigravity', type: 'success', category: 'Sprint 6' },
  { id: 22, date: '16/05/2026 03:10', action: 'Sidebar: item "Financeiro" adicionado; rota /financial registrada no App.tsx', user: 'Antigravity', type: 'success', category: 'Frontend' },
  { id: 14, date: '16/05/2026 02:00', action: 'Sprint 3 iniciada — Módulo Compras: pedidos, recebimento e atualização de estoque', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 15, date: '16/05/2026 01:50', action: 'PurchaseOrderModal: criar pedido + dar entrada com atualização automática do estoque', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
  { id: 16, date: '16/05/2026 01:40', action: 'purchases.service.ts: offline-first (Dexie v8) + Supabase + sync queue', user: 'Antigravity', type: 'success', category: 'Sprint 3' },
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
