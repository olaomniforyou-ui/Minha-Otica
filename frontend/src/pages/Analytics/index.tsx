import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, DollarSign, ShoppingCart, Star, BarChart3, Users, Award, FileBarChart2, ClipboardList, Zap } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, cn } from '@/lib/utils'
import { PAYMENT_LABELS, EXPENSE_CATEGORY_LABELS } from '@/types'
import type { PaymentMethod, ExpenseCategory } from '@/types'

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


interface DailyStat { date: string; receita: number; vendas: number }
interface PaymentStat { method: string; label: string; total: number; count: number }
interface TopProduct { name: string; quantidade: number; receita: number }
interface NpsData { label: string; count: number; color: string }
interface OsStat { status: string; label: string; count: number; color: string }
interface DreExpenseRow { category: ExpenseCategory; label: string; total: number }

const OS_STATUS_CONFIG: OsStat[] = [
  { status: 'orcamento',   label: 'Orçamento',   count: 0, color: '#94a3b8' },
  { status: 'aprovado',    label: 'Aprovado',    count: 0, color: '#3b82f6' },
  { status: 'producao',    label: 'Em Produção', count: 0, color: '#8b5cf6' },
  { status: 'laboratorio', label: 'Laboratório', count: 0, color: '#f59e0b' },
  { status: 'pronto',      label: 'Pronto',      count: 0, color: '#10b981' },
  { status: 'entregue',    label: 'Entregue',    count: 0, color: '#14b8a6' },
]

interface ForecastPoint { date: string; receita?: number; previsao?: number }

function buildForecast(daily: DailyStat[], forecastDays = 14): ForecastPoint[] {
  const n = daily.length
  if (n < 5) return daily.map(d => ({ date: d.date, receita: d.receita }))

  // Regressão linear simples
  const sumX  = daily.reduce((s, _, i) => s + i, 0)
  const sumY  = daily.reduce((s, d) => s + d.receita, 0)
  const sumXY = daily.reduce((s, d, i) => s + i * d.receita, 0)
  const sumX2 = daily.reduce((s, _, i) => s + i * i, 0)
  const denom = n * sumX2 - sumX * sumX
  const slope     = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0
  const intercept = (sumY - slope * sumX) / n

  const result: ForecastPoint[] = daily.map((d, i) => ({
    date: d.date, receita: d.receita,
    // Linha de tendência nos dados históricos
    previsao: Math.max(0, slope * i + intercept),
  }))

  const today = new Date()
  for (let i = 1; i <= forecastDays; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const x = n - 1 + i
    result.push({
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      previsao: Math.max(0, slope * x + intercept),
    })
  }
  return result
}

function formatShortDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AnalyticsPage() {
  const company = useAuthStore(s => s.company)
  const [activeTab,  setActiveTab]  = useState<'charts' | 'dre' | 'semana' | 'insights'>('charts')
  const [period,     setPeriod]     = useState(30)
  const [loading,    setLoading]    = useState(true)

  const [daily,      setDaily]      = useState<DailyStat[]>([])
  const [payments,   setPayments]   = useState<PaymentStat[]>([])
  const [topProds,   setTopProds]   = useState<TopProduct[]>([])
  const [npsData,    setNpsData]    = useState<NpsData[]>([])
  const [osStats,    setOsStats]    = useState<OsStat[]>(OS_STATUS_CONFIG)
  const [summary,    setSummary]    = useState({ total: 0, count: 0, avg: 0, patients: 0 })
  const [weekDays,   setWeekDays]   = useState<{ day: string; receita: number; vendas: number; ticket: number }[]>([])
  const [retencao,   setRetencao]   = useState({ novos: 0, retornantes: 0 })

  // ── DRE ──────────────────────────────────────────────────────
  const [dreLoading,   setDreLoading]   = useState(false)
  const [drePeriod,    setDrePeriod]    = useState<'mes' | 'trimestre' | 'ano'>('mes')
  const [dreSales,     setDreSales]     = useState({ bruto: 0, desconto: 0 })
  const [dreExpenses,  setDreExpenses]  = useState<DreExpenseRow[]>([])
  const [cmvPct,       setCmvPct]       = useState(0)

  // Insights IA
  const [insights,        setInsights]        = useState<{ titulo: string; corpo: string; prioridade: string; tipo: string }[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError,   setInsightsError]   = useState('')
  const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')

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

    const [salesRes, itemsRes, npsRes, patientsRes, osRes] = await Promise.all([
      supabase
        .from('sales')
        .select('id, total_amount, payment_method, payments, created_at, patient_id')
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
      supabase
        .from('service_orders')
        .select('status')
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

    // OS Funnel
    const osCountMap: Record<string, number> = {}
    for (const o of osRes.data ?? []) {
      osCountMap[o.status] = (osCountMap[o.status] ?? 0) + 1
    }
    setOsStats(OS_STATUS_CONFIG.map(s => ({ ...s, count: osCountMap[s.status] ?? 0 })))

    // Day of week analysis (Mon-Sun)
    const DOW_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    const byDow = Array.from({ length: 7 }, (_, i) => ({ day: DOW_LABELS[i], receita: 0, vendas: 0 }))
    for (const s of sales) {
      const dow = (new Date(s.created_at).getDay() + 6) % 7 // 0=Mon…6=Sun
      byDow[dow].receita += s.total_amount
      byDow[dow].vendas  += 1
    }
    setWeekDays(byDow.map(d => ({ ...d, ticket: d.vendas > 0 ? d.receita / d.vendas : 0 })))

    // Retention: count patients with >1 sale in period
    const patientSaleCount: Record<string, number> = {}
    for (const s of sales) {
      if (s.patient_id) patientSaleCount[s.patient_id] = (patientSaleCount[s.patient_id] ?? 0) + 1
    }
    const retornantes = Object.values(patientSaleCount).filter(n => n > 1).length
    const unicos = Object.keys(patientSaleCount).length
    setRetencao({ novos: Math.max(0, unicos - retornantes), retornantes })

    setLoading(false)
  }

  function getDreStart() {
    const now = new Date()
    if (drePeriod === 'mes')       return new Date(now.getFullYear(), now.getMonth(), 1)
    if (drePeriod === 'trimestre') return new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return new Date(now.getFullYear(), 0, 1)
  }

  async function loadDre() {
    if (!company) return
    setDreLoading(true)
    const since = getDreStart().toISOString()

    const [salesRes, expensesRes] = await Promise.all([
      supabase
        .from('sales')
        .select('total_amount, discount_amount')
        .eq('company_id', company.id)
        .gte('created_at', since),
      supabase
        .from('expenses')
        .select('category, amount')
        .eq('company_id', company.id)
        .eq('is_paid', true)
        .gte('paid_at', since),
    ])

    const sales = salesRes.data ?? []
    setDreSales({
      bruto:    sales.reduce((s, v) => s + (v.total_amount ?? 0), 0),
      desconto: sales.reduce((s, v) => s + (v.discount_amount ?? 0), 0),
    })

    const expMap: Partial<Record<ExpenseCategory, number>> = {}
    for (const e of expensesRes.data ?? []) {
      expMap[e.category as ExpenseCategory] = (expMap[e.category as ExpenseCategory] ?? 0) + e.amount
    }
    setDreExpenses(
      (Object.entries(expMap) as [ExpenseCategory, number][])
        .sort((a, b) => b[1] - a[1])
        .map(([category, total]) => ({ category, label: EXPENSE_CATEGORY_LABELS[category] ?? category, total }))
    )
    setDreLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'dre' && company) loadDre()
  }, [activeTab, drePeriod, company])

  if (loading && activeTab === 'charts') return <PageLoader />

  const npsTotal = npsData.reduce((s, n) => s + n.count, 0)
  const promotors = npsData.find(n => n.label.startsWith('Promotores'))?.count ?? 0
  const detractors = npsData.find(n => n.label.startsWith('Detratores'))?.count ?? 0
  const npsScore = npsTotal > 0 ? Math.round(((promotors - detractors) / npsTotal) * 100) : null

  const dreReceita   = dreSales.bruto - dreSales.desconto
  const dreCmv       = dreReceita * (cmvPct / 100)
  const dreLucBruto  = dreReceita - dreCmv
  const dreTotalDesp = dreExpenses.reduce((s, e) => s + e.total, 0)
  const dreResultado = dreLucBruto - dreTotalDesp
  const dreMargem    = dreReceita > 0 ? (dreResultado / dreReceita) * 100 : 0

  function fmtDre(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const DRE_PERIOD_LABELS = { mes: 'Este mês', trimestre: 'Trimestre', ano: 'Este ano' }

  return (
    <div className="space-y-6">
      {/* Header + período */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios & Analytics</h1>
          <p className="text-sm text-slate-500">Visão geral do desempenho da ótica</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tabs Gráficos / DRE */}
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('charts')}
              className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                activeTab === 'charts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
            >
              <BarChart3 size={13} /> Gráficos
            </button>
            <button
              onClick={() => setActiveTab('dre')}
              className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                activeTab === 'dre' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
            >
              <FileBarChart2 size={13} /> DRE
            </button>
            <button
              onClick={() => setActiveTab('semana')}
              className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                activeTab === 'semana' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
            >
              <Users size={13} /> Semana
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                activeTab === 'insights' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
            >
              <Zap size={13} /> Insights IA
            </button>
          </div>
          {/* Filtro de período (só nos gráficos) */}
          {activeTab === 'charts' && (
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {PERIOD_OPTIONS.map(p => (
                <button
                  key={p.days}
                  onClick={() => setPeriod(p.days)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                    period === p.days ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DRE ─────────────────────────────────────────────── */}
      {activeTab === 'dre' && (
        <div className="space-y-5">
          {/* Período DRE */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Período:</span>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
              {(Object.keys(DRE_PERIOD_LABELS) as (keyof typeof DRE_PERIOD_LABELS)[]).map(p => (
                <button key={p} onClick={() => setDrePeriod(p)}
                  className={`px-4 py-2 font-medium transition-colors ${drePeriod === p ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                  {DRE_PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {dreLoading ? (
            <p className="text-center text-slate-400 py-10">Calculando DRE...</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Tabela DRE */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-800 px-5 py-3">
                  <p className="text-sm font-bold text-white">Demonstrativo de Resultado (DRE)</p>
                  <p className="text-xs text-slate-400">{DRE_PERIOD_LABELS[drePeriod]} · {new Date().getFullYear()}</p>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: 'Receita Bruta de Vendas',      value: dreSales.bruto,   bold: false, indent: 0,  color: '' },
                      { label: '(−) Descontos Concedidos',      value: -dreSales.desconto, bold: false, indent: 1, color: 'text-red-600' },
                      { label: '= Receita Líquida',             value: dreReceita,       bold: true,  indent: 0,  color: 'text-blue-700', divider: true },
                      { label: `(−) CMV Estimado (${cmvPct}%)`,value: -dreCmv,          bold: false, indent: 1,  color: 'text-red-600' },
                      { label: '= Lucro Bruto',                 value: dreLucBruto,      bold: true,  indent: 0,  color: dreLucBruto >= 0 ? 'text-emerald-700' : 'text-red-700', divider: true },
                      { label: '(−) Despesas Operacionais',     value: -dreTotalDesp,    bold: false, indent: 1,  color: 'text-red-600' },
                      { label: '= Resultado Operacional',       value: dreResultado,     bold: true,  indent: 0,  color: dreResultado >= 0 ? 'text-emerald-700' : 'text-red-700', divider: true },
                    ].map((row, i) => (
                      <tr key={i} className={`${row.divider ? 'border-t-2 border-slate-200 bg-slate-50' : 'border-t border-slate-100'}`}>
                        <td className={`px-5 py-2.5 ${row.indent ? 'pl-8' : ''} ${row.bold ? 'font-bold' : ''} text-slate-700`}>
                          {row.label}
                        </td>
                        <td className={`px-5 py-2.5 text-right font-mono ${row.bold ? 'font-bold' : ''} ${row.color}`}>
                          {fmtDre(Math.abs(row.value))}
                        </td>
                        <td className="px-5 py-2.5 text-right text-xs text-slate-400 w-16">
                          {dreReceita > 0 ? `${Math.abs((row.value / dreReceita) * 100).toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-800">
                      <td className="px-5 py-3 font-bold text-white text-sm">Margem Líquida</td>
                      <td className="px-5 py-3 text-right font-bold text-white font-mono">{fmtDre(dreResultado)}</td>
                      <td className={`px-5 py-3 text-right font-bold text-sm ${dreMargem >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {dreMargem.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Painel lateral */}
              <div className="space-y-4">
                {/* CMV configurável */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Custo das Mercadorias (%)</p>
                  <p className="text-xs text-slate-400">Percentual estimado sobre a receita líquida (ajuste conforme sua margem real)</p>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={80} step={1} value={cmvPct}
                      onChange={e => setCmvPct(Number(e.target.value))}
                      className="flex-1 accent-blue-600" />
                    <span className="text-lg font-bold text-blue-600 w-12 text-right">{cmvPct}%</span>
                  </div>
                </div>

                {/* Breakdown despesas */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Despesas por Categoria</p>
                  {dreExpenses.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Sem despesas pagas no período</p>
                  ) : (
                    <div className="space-y-2">
                      {dreExpenses.map(e => (
                        <div key={e.category} className="flex items-center justify-between">
                          <span className="text-xs text-slate-600 truncate flex-1">{e.label}</span>
                          <span className="text-xs font-semibold text-slate-800 ml-2 flex-shrink-0">{fmtDre(e.total)}</span>
                        </div>
                      ))}
                      <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Total</span>
                        <span className="text-xs font-bold text-red-600">{fmtDre(dreTotalDesp)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* KPI resultado */}
                <div className={`rounded-xl p-4 shadow-sm text-center ${dreResultado >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Resultado Operacional</p>
                  <p className={`text-2xl font-black ${dreResultado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {fmtDre(dreResultado)}
                  </p>
                  <p className={`text-xs mt-1 ${dreResultado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    Margem: {dreMargem.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GRÁFICOS ─────────────────────────────────────────── */}
      {activeTab === 'charts' && <>

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

      {/* Funil de Ordens de Serviço */}
      <Card className="p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ClipboardList size={18} className="text-indigo-500" />
          Funil de Ordens de Serviço
        </h3>
        {osStats.every(s => s.count === 0) ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            Sem ordens de serviço no período
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={osStats} margin={{ left: 10, right: 30, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
                <Tooltip
                  formatter={(v: number) => [v, 'Ordens']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {osStats.map((entry, i) => (
                    <Cell key={`os-${i}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Previsão de Demanda */}
      {daily.length >= 5 && (() => {
        const forecastData = buildForecast(daily, 14)
        const forecastStart = daily.length // index where forecast begins
        const totalRevForecast = forecastData
          .slice(forecastStart)
          .reduce((s, d) => s + (d.previsao ?? 0), 0)
        const avgDailyForecast = forecastData.slice(forecastStart).length > 0
          ? totalRevForecast / forecastData.slice(forecastStart).length
          : 0
        return (
          <Card className="p-6">
            <div className="flex items-start justify-between mb-5">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Zap size={18} className="text-amber-500" />
                Previsão de Demanda (próximos 14 dias)
              </h3>
              <div className="flex items-center gap-4 text-xs flex-shrink-0">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="inline-block w-6 h-0.5 bg-blue-400" /> Realizado
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="inline-block w-6 h-0.5 bg-amber-400" style={{ borderTop: '2px dashed #f59e0b', background: 'none', height: 0 }} /> Previsão
                </span>
              </div>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }}
                    interval={Math.floor(forecastData.length / 8)} />
                  <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: '#94a3b8' }} width={52} />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      formatCurrency(v),
                      name === 'receita' ? 'Realizado' : 'Previsão',
                    ]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <ReferenceLine
                    x={forecastData[forecastStart - 1]?.date}
                    stroke="#94a3b8"
                    strokeDasharray="4 2"
                    label={{ value: 'Hoje', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
                  />
                  <Line type="monotone" dataKey="receita"   stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="previsao"  stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex gap-6 text-xs text-slate-500">
              <span>Receita prevista nos próximos 14 dias: <strong className="text-amber-600">{formatCurrency(totalRevForecast)}</strong></span>
              <span>Média diária estimada: <strong className="text-amber-600">{formatCurrency(avgDailyForecast)}</strong></span>
            </div>
          </Card>
        )
      })()}

      </>}

      {/* ── ABA SEMANA ──────────────────────────────────────────── */}
      {activeTab === 'semana' && (
        <div className="space-y-6">
          {/* Cards de retenção */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(() => {
              const total = retencao.novos + retencao.retornantes
              const pctRetorno = total > 0 ? Math.round((retencao.retornantes / total) * 100) : 0
              const bestDay = weekDays.reduce((best, d) => d.receita > best.receita ? d : best, { day: '—', receita: 0, vendas: 0, ticket: 0 })
              const bestDayTicket = weekDays.reduce((best, d) => d.ticket > best.ticket ? d : best, { day: '—', receita: 0, vendas: 0, ticket: 0 })
              return (
                <>
                  <Card className="p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Clientes Novos</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{retencao.novos}</p>
                    <p className="text-xs text-slate-400 mt-0.5">1ª compra no período</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Retornantes</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{retencao.retornantes}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{pctRetorno}% de retenção</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Melhor Dia</p>
                    <p className="text-2xl font-bold text-violet-600 mt-1">{bestDay.day}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(bestDay.receita)}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Maior Ticket</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{bestDayTicket.day}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(bestDayTicket.ticket)}</p>
                  </Card>
                </>
              )
            })()}
          </div>

          {/* Receita por dia da semana */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
              <BarChart3 size={18} className="text-violet-500" />
              Receita por Dia da Semana
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekDays} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={l => `${l}-feira`} />
                  <Bar dataKey="receita" radius={[6, 6, 0, 0]}>
                    {weekDays.map((d, i) => {
                      const max = Math.max(...weekDays.map(x => x.receita))
                      return <Cell key={i} fill={d.receita === max ? '#8b5cf6' : '#c4b5fd'} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Ticket médio + qtd por dia */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-amber-500" />
                Ticket Médio por Dia
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekDays} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `R$${v.toFixed(0)}`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="ticket" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ShoppingCart size={16} className="text-blue-500" />
                Vendas por Dia
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekDays} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                    <Tooltip formatter={(v: number) => [`${v} venda${v !== 1 ? 's' : ''}`, 'Qtd.']} />
                    <Bar dataKey="vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Tabela resumo */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Resumo por Dia</p>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Dia</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Vendas</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Receita</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Ticket Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {weekDays.map(d => {
                  const maxRec = Math.max(...weekDays.map(x => x.receita))
                  return (
                    <tr key={d.day} className={cn('hover:bg-slate-50', d.receita === maxRec && d.receita > 0 && 'bg-violet-50')}>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">
                        {d.day}{d.receita === maxRec && d.receita > 0 && <span className="ml-1.5 text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-bold">melhor</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{d.vendas}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(d.receita)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{d.vendas > 0 ? formatCurrency(d.ticket) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── ABA INSIGHTS IA ─────────────────────────────────────── */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Zap size={18} className="text-indigo-500" /> Insights de Negócio — IA
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Análise automática com Gemini baseada nos seus dados dos últimos {period} dias.
                </p>
              </div>
              <button
                onClick={async () => {
                  setInsightsLoading(true)
                  setInsightsError('')
                  try {
                    const topProdsText = topProds.slice(0, 5).map(p => `${p.name} (${p.quantidade}x, R$${p.receita.toFixed(2)})`).join(', ')
                    const paymentsText = payments.map(p => `${p.label}: R$${p.total.toFixed(2)}`).join(', ')
                    const npsAvg = npsData.length
                      ? npsData.reduce((s, n) => s + (n.label === 'Promotores' ? 10 : n.label === 'Neutros' ? 7 : 2) * n.count, 0) /
                        Math.max(1, npsData.reduce((s, n) => s + n.count, 0))
                      : null

                    const prevStart = new Date()
                    prevStart.setDate(prevStart.getDate() - period * 2)
                    const prevEnd = new Date()
                    prevEnd.setDate(prevEnd.getDate() - period)
                    const prevSales = company
                      ? await supabase.from('sales').select('total_amount').eq('company_id', company.id)
                          .gte('created_at', prevStart.toISOString()).lte('created_at', prevEnd.toISOString())
                      : null
                    const prevRevenue = (prevSales?.data ?? []).reduce((s: number, x: any) => s + (x.total_amount ?? 0), 0)

                    const res = await fetch(`${API_URL}/api/v1/ai/insights`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        revenue_month:      summary.total,
                        revenue_prev_month: prevRevenue,
                        sales_count:        summary.count,
                        avg_ticket:         summary.avg,
                        patients_count:     summary.patients,
                        top_products:       topProdsText,
                        payment_breakdown:  paymentsText,
                        os_pending:         osStats.filter(o => o.status !== 'entregue').reduce((s, o) => s + o.count, 0),
                        defect_count:       0,
                        nps_avg:            npsAvg?.toFixed(1) ?? null,
                      }),
                    })
                    if (!res.ok) throw new Error('Erro na resposta da API')
                    const data = await res.json()
                    setInsights(data.insights ?? [])
                  } catch {
                    setInsightsError('Não foi possível gerar insights. Verifique se o backend está online e a chave Gemini está configurada.')
                  } finally {
                    setInsightsLoading(false)
                  }
                }}
                disabled={insightsLoading}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                <Zap size={14} className={insightsLoading ? 'animate-pulse' : ''} />
                {insightsLoading ? 'Gerando...' : insights.length ? 'Atualizar Insights' : 'Gerar Insights'}
              </button>
            </div>

            {insightsError && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {insightsError}
              </div>
            )}
          </Card>

          {insights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {insights.map((ins, i) => {
                const colors: Record<string, string> = {
                  alta:  'border-red-300 bg-red-50',
                  media: 'border-amber-300 bg-amber-50',
                  baixa: 'border-emerald-300 bg-emerald-50',
                }
                const typeColors: Record<string, string> = {
                  alerta:       'bg-red-100 text-red-700',
                  oportunidade: 'bg-blue-100 text-blue-700',
                  parabens:     'bg-emerald-100 text-emerald-700',
                  dica:         'bg-indigo-100 text-indigo-700',
                }
                return (
                  <div key={i} className={`rounded-2xl border-2 p-5 space-y-2 ${colors[ins.prioridade] ?? 'border-slate-200 bg-white'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800 leading-tight">{ins.titulo}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${typeColors[ins.tipo] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ins.tipo === 'alerta' ? 'Alerta' : ins.tipo === 'oportunidade' ? 'Oportunidade' : ins.tipo === 'parabens' ? 'Parabéns' : 'Dica'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{ins.corpo}</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                      Prioridade: {ins.prioridade}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {!insightsLoading && insights.length === 0 && !insightsError && (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3 rounded-2xl border border-dashed border-slate-200">
              <Zap size={32} className="opacity-20" />
              <p className="text-sm">Clique em "Gerar Insights" para obter análises automáticas do seu negócio.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
