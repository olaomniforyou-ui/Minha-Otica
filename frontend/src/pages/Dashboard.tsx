import { useEffect, useState } from 'react'
import { DollarSign, ClipboardList, CheckCircle2, Package, Sparkles } from 'lucide-react'
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

export default function Dashboard() {
  const profile = useAuthStore((s) => s.profile)
  const [stats,   setStats]   = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

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
    </div>
  )
}
