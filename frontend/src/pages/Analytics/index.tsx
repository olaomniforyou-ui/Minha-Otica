import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, DollarSign, ShoppingCart, Star, BarChart3, Users, Award } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, cn } from '@/lib/utils'
import { PAYMENT_LABELS } from '@/types'
import type { PaymentMethod } from '@/types'

const PERIOD_OPTIONS = [
  { label: '7 dias',  days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
]

const PAYMENT_COLORS: Record<string, string> = {
  dinheiro:       '#10b981',
  pix:            '#3b82f6',
  cartao_credito: '#8b5cf6',
  cartao_debito:  '#06b6d4',
  boleto:         '#f59e0b',
  convenio:       '#6366f1',
  outro:          '#94a3b8',
}

const NPS_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']

interface DailyStat { date: string; receita: number; vendas: number }
interface PaymentStat { method: string; label: string; total: number; count: number }
interface TopProduct { name: string; quantidade: number; receita: number }
interface NpsData { label: string; count: number; color: string }

function formatShortDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AnalyticsPage() {
  const company = useAuthStore(s => s.company)
  const [period,     setPeriod]     = useState(30)
  const [loading,    setLoading]    = useState(true)

  const [daily,      setDaily]      = useState<DailyStat[]>([])
  const [payments,   setPayments]   = useState<PaymentStat[]>([])
  const [topProds,   setTopProds]   = useState<TopProduct[]>([])
  const [npsData,    setNpsData]    = useState<NpsData[]>([])
  const [summary,    setSummary]    = useState({ total: 0, count: 0, avg: 0, patients: 0 })

  useEffect(() => {
    if (!company) return
    load()
  }, [company, period])

  async function load() {
    if (!company) return
    setLoading(true)
    const since = new Date()
    since.setDate(since.getDate() - period)
    const sinceStr = since.toISOString()

    const [salesRes, itemsRes, npsRes, patientsRes] = await Promise.all([
      supabase
        .from('sales')
        .select('id, total_amount, payment_method, payments, created_at')
        .eq('company_id', company.id)
        .gte('created_at', sinceStr)
        .order('created_at'),
      supabase
        .from('sale_items')
        .select('description, quantity, total_price, sale_id')
        .in('sale_id',
          (await supabase.from('sales').select('id').eq('company_id', company.id).gte('created_at', sinceStr)).data?.map(s => s.id) ?? []
        ),
      supabase
        .from('post_sales')
        .select('nps_score')
        .eq('company_id', company.id)
        .eq('type', 'nps')
        .gte('created_at', sinceStr),
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .gte('created_at', sinceStr),
    ])

    const sales = salesRes.data ?? []

    // Daily stats
    const byDate: Record<string, { receita: number; vendas: number }> = {}
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      byDate[key] = { receita: 0, vendas: 0 }
    }
    for (const s of sales) {
      const key = s.created_at.slice(0, 10)
      if (byDate[key]) {
        byDate[key].receita += s.total_amount
        byDate[key].vendas  += 1
      }
    }
    setDaily(Object.entries(byDate).map(([date, v]) => ({ date: formatShortDate(date), ...v })))

    // Summary
    const total = sales.reduce((s, v) => s + v.total_amount, 0)
    setSummary({
      total,
      count:    sales.length,
      avg:      sales.length > 0 ? total / sales.length : 0,
      patients: patientsRes.count ?? 0,
    })

    // Payment methods
    const payMap: Record<string, { total: number; count: number }> = {}
    for (const s of sales) {
      if (s.payments && Array.isArray(s.payments)) {
        for (const p of s.payments as { method: string; amount: number }[]) {
          if (!payMap[p.method]) payMap[p.method] = { total: 0, count: 0 }
          payMap[p.method].total += p.amount
          payMap[p.method].count += 1
        }
      } else if (s.payment_method) {
        const m = s.payment_method
        if (!payMap[m]) payMap[m] = { total: 0, count: 0 }
        payMap[m].total += s.total_amount
        payMap[m].count += 1
      }
    }
    setPayments(
      Object.entries(payMap)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([method, v]) => ({
          method,
          label: PAYMENT_LABELS[method as PaymentMethod] ?? method,
          ...v,
        }))
    )

    // Top products
    const prodMap: Record<string, { quantidade: number; receita: number }> = {}
    for (const item of itemsRes.data ?? []) {
      if (!prodMap[item.description]) prodMap[item.description] = { quantidade: 0, receita: 0 }
      prodMap[item.description].quantidade += item.quantity
      prodMap[item.description].receita    += item.total_price
    }
    setTopProds(
      Object.entries(prodMap)
        .sort((a, b) => b[1].receita - a[1].receita)
        .slice(0, 8)
        .map(([name, v]) => ({ name, ...v }))
    )

    // NPS
    const npsGroups = [
      { label: 'Detratores (1-6)', min: 1, max: 6, color: '#ef4444' },
      { label: 'Neutros (7-8)',    min: 7, max: 8, color: '#f59e0b' },
      { label: 'Promotores (9-10)',min: 9, max: 10,color: '#22c55e' },
    ]
    setNpsData(npsGroups.map(g => ({
      label: g.label,
      count: (npsRes.data ?? []).filter(n => n.nps_score >= g.min && n.nps_score <= g.max).length,
      color: g.color,
    })))

    setLoading(false)
  }

  if (loading) return <PageLoader />

  const npsTotal = npsData.reduce((s, n) => s + n.count, 0)
  const promotors = npsData.find(n => n.label.startsWith('Promotores'))?.count ?? 0
  const detractors = npsData.find(n => n.label.startsWith('Detratores'))?.count ?? 0
  const npsScore = npsTotal > 0 ? Math.round(((promotors - detractors) / npsTotal) * 100) : null

  return (
    <div className="space-y-6">
      {/* Header + período */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios & Analytics</h1>
          <p className="text-sm text-slate-500">Visão geral do desempenho da ótica</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p.days}
              onClick={() => setPeriod(p.days)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                period === p.days
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Receita Total',   value: formatCurrency(summary.total),         icon: DollarSign,  color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Vendas Realizadas',value: String(summary.count),                 icon: ShoppingCart, color: 'text-blue-600',    bg: 'bg-blue-100' },
          { label: 'Ticket Médio',    value: formatCurrency(summary.avg),            icon: TrendingUp,  color: 'text-violet-600',  bg: 'bg-violet-100' },
          { label: 'Novos Pacientes', value: String(summary.patients),              icon: Users,        color: 'text-amber-600',   bg: 'bg-amber-100' },
        ].map(kpi => (
          <Card key={kpi.label} className="p-5 flex items-center gap-4">
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', kpi.bg)}>
              <kpi.icon size={22} className={kpi.color} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{kpi.label}</p>
              <p className="text-xl font-black text-slate-900">{kpi.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Gráfico de receita diária */}
      <Card className="p-6">
        <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
          <BarChart3 size={18} className="text-blue-500" />
          Receita Diária
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={period > 30 ? 6 : period > 14 ? 3 : 1} />
              <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} width={50} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Receita']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Linha de tendência + pagamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Tendência de vendas */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-violet-500" />
            Tendência de Vendas
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={period > 14 ? 4 : 1} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={30} />
                <Tooltip
                  formatter={(v: number) => [v, 'Vendas']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Line
                  type="monotone"
                  dataKey="vendas"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Formas de pagamento */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-500" />
            Formas de Pagamento
          </h3>
          {payments.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
              Sem vendas no período
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map(p => {
                const totalAll = payments.reduce((s, x) => s + x.total, 0)
                const pct = totalAll > 0 ? Math.round((p.total / totalAll) * 100) : 0
                return (
                  <div key={p.method}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700">{p.label}</span>
                      <span className="text-xs font-bold text-slate-900">{formatCurrency(p.total)} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: PAYMENT_COLORS[p.method] ?? '#94a3b8' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Top produtos + NPS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top produtos */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            Top Produtos / Serviços
          </h3>
          {topProds.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              Sem dados no período
            </div>
          ) : (
            <div className="space-y-2.5">
              {topProds.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-black text-slate-400 flex-shrink-0 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.quantidade} un</p>
                  </div>
                  <span className="text-xs font-bold text-slate-700 flex-shrink-0">{formatCurrency(p.receita)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* NPS */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Star size={18} className="text-amber-500" />
            Net Promoter Score (NPS)
          </h3>
          {npsTotal === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              Sem avaliações no período
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center w-28 h-28 rounded-full border-8 border-slate-100">
                <div className="text-center">
                  <p className={cn(
                    'text-3xl font-black',
                    npsScore !== null && npsScore >= 50 ? 'text-emerald-600' :
                    npsScore !== null && npsScore >= 0 ? 'text-amber-600' : 'text-red-600',
                  )}>
                    {npsScore !== null ? npsScore : '—'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">NPS</p>
                </div>
              </div>
              <div className="w-full space-y-2">
                {npsData.map(n => (
                  <div key={n.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: n.color }} />
                      <span className="text-slate-600">{n.label}</span>
                    </div>
                    <span className="font-bold text-slate-900">{n.count}</span>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400 pt-1">{npsTotal} avaliações no período</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
