import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, ClipboardList, CheckCircle2, Package, Sparkles, Zap, Building2, Users, TrendingUp, ExternalLink } from 'lucide-react'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { WeeklyChart } from '@/components/dashboard/WeeklyChart'
import { LowStockAlert } from '@/components/dashboard/LowStockAlert'
import { RecentOrders } from '@/components/dashboard/RecentOrders'
import { PageLoader } from '@/components/ui/Spinner'
import { formatCurrency } from '@/lib/utils'
import { getDashboardStats } from '@/services/orders.service'
import { getLowStockProducts } from '@/services/products.service'
import type { DashboardStats } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

interface NetworkStats {
  totalRevenue: number
  totalPatients: number
  totalOs: number
  companiesCount: number
  byCompany: { name: string; revenue: number }[]
}

export default function Dashboard() {
  const profile = useAuthStore((s) => s.profile)
  const availableProfiles = useAuthStore((s) => s.availableProfiles)
  const [stats,        setStats]        = useState<DashboardStats | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [orderStats, lowStock] = await Promise.all([
          getDashboardStats(),
          getLowStockProducts(),
        ])
        setStats({ ...orderStats, low_stock_products: lowStock })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (availableProfiles.length < 2) return
    const ids = availableProfiles.map(p => p.company_id)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    Promise.all([
      supabase.from('sales').select('total_amount, company_id').in('company_id', ids).gte('created_at', startOfMonth.toISOString()),
      supabase.from('patients').select('id').in('company_id', ids),
      supabase.from('service_orders').select('id').in('company_id', ids).not('status', 'eq', 'cancelado'),
    ]).then(([salesRes, patientsRes, osRes]) => {
      const sales = salesRes.data ?? []
      setNetworkStats({
        totalRevenue:   sales.reduce((s, x) => s + (x.total_amount ?? 0), 0),
        totalPatients:  patientsRes.data?.length ?? 0,
        totalOs:        osRes.data?.length ?? 0,
        companiesCount: ids.length,
        byCompany: availableProfiles.map(p => ({
          name:    p.company?.name ?? 'Ótica',
          revenue: sales.filter(s => s.company_id === p.company_id).reduce((acc, x) => acc + (x.total_amount ?? 0), 0),
        })),
      })
    })
  }, [availableProfiles])

  if (loading) return <PageLoader />

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Sparkles size={40} className="mb-4 opacity-20" />
        <p>Não foi possível carregar os dados do dashboard.</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-primary-700 font-medium">Tentar novamente</button>
      </div>
    )
  }

  const s = stats

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Principal</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Bem-vindo de volta,{' '}
          <span className="font-medium text-slate-700">{profile?.full_name ?? 'Usuário'}</span>.
        </p>
      </div>

      {/* Grid superior: stats + alertas */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Stats cards (coluna esquerda + central) */}
        <div className="space-y-5 lg:col-span-2">
          {/* Cards de métricas */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatsCard
              title="Vendas Hoje"
              value={formatCurrency(s.sales_today)}
              trend={s.sales_today_growth}
              icon={<DollarSign size={20} className="text-primary-700" />}
              iconBg="bg-primary-100"
            />
            <StatsCard
              title="OS Geradas"
              value={s.orders_generated}
              subtitle={`${s.orders_pending} Pendentes`}
              icon={<ClipboardList size={20} className="text-amber-600" />}
              iconBg="bg-amber-100"
            />
            <StatsCard
              title="Finalizadas"
              value={s.orders_completed}
              subtitle={`${s.orders_goal_pct}% Meta`}
              icon={<CheckCircle2 size={20} className="text-emerald-600" />}
              iconBg="bg-emerald-100"
            />
          </div>

          {/* Gráfico semanal */}
          <WeeklyChart data={s.weekly_data} />
        </div>

        {/* Coluna direita: alertas */}
        <div className="space-y-5">
          {/* Alerta de estoque */}
          {s.low_stock_products.length > 0 && (
            <LowStockAlert products={s.low_stock_products} />
          )}

          {/* Card destaque */}
          <div className="rounded-xl bg-primary-900 p-5 text-white">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-200">
              <Sparkles size={10} />
              Novidade Tech
            </span>
            <h3 className="mt-3 text-xl font-extrabold leading-tight">
              Lentes Anti-Reflexo 4.0
            </h3>
            <p className="mt-2 text-sm text-primary-200">
              Chegaram os novos lotes com tecnologia de filtragem de luz azul avançada.
            </p>
            <a
              href="/inventory"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-50 transition-colors"
            >
              Ver Estoque
            </a>
          </div>
        </div>
      </div>

      {/* Ordens recentes */}
      <RecentOrders orders={s.recent_orders} />

      {/* Visão Consolidada da Rede — exibida apenas para usuários com múltiplas óticas */}
      {networkStats && (
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-blue-500" />
            <p className="text-sm font-bold text-slate-800">Visão Consolidada da Rede</p>
            <span className="ml-auto text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
              {networkStats.companiesCount} óticas — mês atual
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Faturamento total',  value: formatCurrency(networkStats.totalRevenue), icon: TrendingUp, color: 'text-emerald-600' },
              { label: 'Clientes cadastrados', value: String(networkStats.totalPatients),       icon: Users,      color: 'text-blue-600'    },
              { label: 'OS em andamento',    value: String(networkStats.totalOs),              icon: ClipboardList, color: 'text-indigo-600' },
            ].map(k => (
              <div key={k.label} className="flex flex-col items-center gap-1 bg-white/60 rounded-xl p-3">
                <k.icon size={16} className={k.color} />
                <p className={`text-xl font-extrabold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-slate-500 text-center">{k.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {networkStats.byCompany.map(b => (
              <div key={b.name} className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="flex-1 font-medium truncate">{b.name}</span>
                <span className="font-semibold text-slate-800">{formatCurrency(b.revenue)}</span>
              </div>
            ))}
          </div>
          <Link
            to="/relatorio-rede"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white/70 py-2 text-xs font-semibold text-blue-700 hover:bg-white transition-colors"
          >
            <ExternalLink size={11} /> Ver relatório completo
          </Link>
        </div>
      )}

      {/* Novidades do Sistema */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-indigo-500" />
          <p className="text-sm font-bold text-slate-800">Novidades do Sistema</p>
          <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">Mai 2026</span>
        </div>
        <ul className="space-y-2">
          {[
            'Assistente IA agora responde perguntas de acompanhamento',
            'Importação de Produtos via CSV com preview e validação',
            'Análise por dia da semana e retenção de clientes em Relatórios',
            'Contas Bancárias no Financeiro com controle de patrimônio',
            'Tour interativo disponível na Central de Ajuda',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
              <CheckCircle2 size={13} className="text-indigo-400 shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
