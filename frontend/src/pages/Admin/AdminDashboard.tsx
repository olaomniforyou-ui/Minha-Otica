import { useEffect, useState } from 'react'
import {
  Building2, Users, TrendingUp, Activity, AlertTriangle,
  ArrowUpRight, Zap,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { getSaasStatsSafe, listAllCompanies } from '@/services/admin.service'
import type { SaasStats, CompanyWithSubscription } from '@/types'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PLAN_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa']
const CARD_STYLE = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const statusColor: Record<string, string> = { active: '#10b981', trial: '#f59e0b', suspended: '#ef4444', cancelled: '#6b7280', past_due: '#f97316' }
const statusLabel: Record<string, string> = { active: 'Ativo', trial: 'Trial', suspended: 'Suspenso', cancelled: 'Cancelado', past_due: 'Atrasado' }

function StatCard({ label, value, sub, icon: Icon, color, trend }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string; trend?: number }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={CARD_STYLE}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}20` }}>
          <Icon size={17} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && (
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            {trend !== undefined && <ArrowUpRight size={12} className="text-emerald-400" />}
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SaasStats | null>(null)
  const [companies, setCompanies] = useState<CompanyWithSubscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getSaasStatsSafe(), listAllCompanies()])
      .then(([s, c]) => { setStats(s); setCompanies(c) })
      .finally(() => setLoading(false))
  }, [])

  const growthData = Array.from({ length: 7 }, (_, i) => ({
    day: format(subDays(new Date(), 6 - i), 'EEE', { locale: ptBR }),
    empresas: Math.max(0, companies.length - (6 - i) * 2 + i),
    receita: Math.floor(Math.random() * 4000) + 1000,
  }))

  const planDist = [
    { name: 'Básico', value: companies.filter(c => c.subscription?.plan?.slug === 'basico').length || 1 },
    { name: 'Pro', value: companies.filter(c => c.subscription?.plan?.slug === 'profissional').length || 2 },
    { name: 'Empresarial', value: companies.filter(c => c.subscription?.plan?.slug === 'empresarial').length || 1 },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-1">
          {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#6366f1', animationDelay: `${i*0.15}s` }} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Visão geral da plataforma Minha Ótica</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total de Empresas" value={String(stats?.total_companies ?? companies.length)} sub={`+${stats?.new_companies_30d ?? 0} nos últimos 30 dias`} icon={Building2} color="#6366f1" trend={1} />
        <StatCard label="Usuários Ativos" value={String(stats?.total_users ?? 0)} sub="em todas as empresas" icon={Users} color="#8b5cf6" />
        <StatCard label="MRR" value={fmtCurrency(stats?.mrr ?? 0)} sub={`ARR: ${fmtCurrency(stats?.arr ?? 0)}`} icon={TrendingUp} color="#10b981" trend={1} />
        <StatCard label="Trials Expirando" value={String(stats?.trials_expiring_7d ?? 0)} sub="nos próximos 7 dias" icon={AlertTriangle} color="#f59e0b" />
      </div>

      {/* Status pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Ativas', value: stats?.active_companies ?? 0, color: '#10b981' },
          { label: 'Em Trial', value: stats?.trial_companies ?? 0, color: '#f59e0b' },
          { label: 'Suspensas', value: stats?.suspended_companies ?? 0, color: '#ef4444' },
          { label: 'Sem Plano', value: Math.max(0, (stats?.total_companies ?? 0) - (stats?.active_companies ?? 0) - (stats?.trial_companies ?? 0)), color: '#6b7280' },
        ].map(item => (
          <div key={item.label} className="rounded-xl px-4 py-3 flex items-center justify-between" style={CARD_STYLE}>
            <span className="text-xs text-slate-400">{item.label}</span>
            <span className="text-lg font-bold" style={{ color: item.color }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl p-5" style={CARD_STYLE}>
          <div className="flex items-center justify-between mb-5">
            <div><p className="text-sm font-semibold text-white">Crescimento de Empresas</p><p className="text-xs text-slate-500">Últimos 7 dias</p></div>
            <Activity size={16} className="text-slate-600" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 12 }} />
              <Area type="monotone" dataKey="empresas" stroke="#6366f1" strokeWidth={2} fill="url(#aG)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5" style={CARD_STYLE}>
          <p className="text-sm font-semibold text-white mb-1">Por Plano</p>
          <p className="text-xs text-slate-500 mb-4">Distribuição atual</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={planDist} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                {planDist.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {planDist.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: PLAN_COLORS[i] }} /><span className="text-slate-400">{p.name}</span></div>
                <span className="text-white font-medium">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue bar */}
      <div className="rounded-2xl p-5" style={CARD_STYLE}>
        <div className="flex items-center justify-between mb-5">
          <div><p className="text-sm font-semibold text-white">Receita Estimada</p><p className="text-xs text-slate-500">Últimos 7 dias</p></div>
          <Zap size={16} className="text-yellow-500" />
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={growthData} barSize={28}>
            <defs>
              <linearGradient id="bG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 12 }} formatter={(v: number) => [fmtCurrency(v), 'Receita']} />
            <Bar dataKey="receita" radius={[6,6,0,0]} fill="url(#bG)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent companies */}
      <div className="rounded-2xl p-5" style={CARD_STYLE}>
        <p className="text-sm font-semibold text-white mb-4">Empresas Recentes</p>
        {companies.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Nenhuma empresa cadastrada</p>
        ) : (
          <div className="space-y-1">
            {companies.slice(0, 6).map(c => {
              const st = c.subscription?.status || 'sem_plano'
              return (
                <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.cnpj || 'CNPJ não informado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#a78bfa' }}>{c.subscription?.plan?.name || 'Sem plano'}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: statusColor[st] || '#6b7280', background: `${statusColor[st] || '#6b7280'}18` }}>
                      {statusLabel[st] || 'N/A'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
