import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  DollarSign, TrendingUp, TrendingDown, Calendar, CreditCard,
  CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { PAYMENT_LABELS } from '@/types'
import type { PaymentMethod } from '@/types'

interface CashEntry {
  id: string
  type: 'entrada' | 'saida'
  description: string
  amount: number
  method?: string
  date: string
  reference?: string
}

interface WeekDay { label: string; receita: number }

const PAYMENT_COLORS: Record<string, string> = {
  dinheiro:       'bg-emerald-100 text-emerald-700',
  pix:            'bg-blue-100 text-blue-700',
  cartao_credito: 'bg-violet-100 text-violet-700',
  cartao_debito:  'bg-cyan-100 text-cyan-700',
  boleto:         'bg-amber-100 text-amber-700',
  convenio:       'bg-indigo-100 text-indigo-700',
  outro:          'bg-slate-100 text-slate-600',
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function weekStart() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function FinancialPage() {
  const company  = useAuthStore(s => s.company)
  const [loading, setLoading] = useState(true)

  const [todayIn,    setTodayIn]    = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [weekTotal,  setWeekTotal]  = useState(0)
  const [monthTotal, setMonthTotal] = useState(0)
  const [entries,    setEntries]    = useState<CashEntry[]>([])
  const [weekChart,  setWeekChart]  = useState<WeekDay[]>([])
  const [byMethod,   setByMethod]   = useState<{ method: string; label: string; total: number }[]>([])
  const [pendingOS,  setPendingOS]  = useState(0)
  const [pendingAmt, setPendingAmt] = useState(0)

  useEffect(() => {
    if (!company) return
    load()
  }, [company])

  async function load() {
    if (!company) return
    setLoading(true)

    const today        = todayStr()
    const weekStartStr = weekStart()
    const monthStart   = new Date()
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

    const [salesRes, osRes] = await Promise.all([
      supabase
        .from('sales')
        .select('id, total_amount, paid_amount, payment_method, payments, customer_name, created_at')
        .eq('company_id', company.id)
        .gte('created_at', weekStartStr)
        .order('created_at', { ascending: false }),
      supabase
        .from('service_orders')
        .select('id, total_amount, paid_amount, status')
        .eq('company_id', company.id)
        .not('status', 'in', '("cancelado","entregue")'),
    ])

    const sales = salesRes.data ?? []

    // Hoje
    const todaySales = sales.filter(s => s.created_at.slice(0, 10) === today)
    setTodayIn(todaySales.reduce((s, v) => s + v.paid_amount, 0))
    setTodayCount(todaySales.length)

    // Semana
    setWeekTotal(sales.reduce((s, v) => s + v.paid_amount, 0))

    // Mês (precisa de query extra)
    const monthRes = await supabase
      .from('sales')
      .select('paid_amount')
      .eq('company_id', company.id)
      .gte('created_at', monthStart.toISOString())
    setMonthTotal((monthRes.data ?? []).reduce((s, v) => s + v.paid_amount, 0))

    // Gráfico semanal — últimos 7 dias
    const dayMap: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key  = d.toISOString().slice(0, 10)
      const lbl  = d.toLocaleDateString('pt-BR', { weekday: 'short' })
      dayMap[key] = 0
    }
    for (const s of sales) {
      const key = s.created_at.slice(0, 10)
      if (dayMap[key] !== undefined) dayMap[key] += s.paid_amount
    }
    setWeekChart(Object.entries(dayMap).map(([k, receita]) => ({
      label:   new Date(k + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }),
      receita,
    })))

    // Lançamentos recentes
    setEntries(sales.slice(0, 15).map(s => ({
      id:          s.id,
      type:        'entrada',
      description: s.customer_name ?? 'Venda',
      amount:      s.paid_amount,
      method:      s.payment_method ?? undefined,
      date:        s.created_at,
    })))

    // Breakdown pagamentos
    const methodMap: Record<string, number> = {}
    for (const s of sales) {
      if (s.payments && Array.isArray(s.payments)) {
        for (const p of s.payments as { method: string; amount: number }[]) {
          methodMap[p.method] = (methodMap[p.method] ?? 0) + p.amount
        }
      } else if (s.payment_method) {
        methodMap[s.payment_method] = (methodMap[s.payment_method] ?? 0) + s.paid_amount
      }
    }
    setByMethod(
      Object.entries(methodMap)
        .sort((a, b) => b[1] - a[1])
        .map(([method, total]) => ({
          method,
          label: PAYMENT_LABELS[method as PaymentMethod] ?? method,
          total,
        }))
    )

    // OS pendentes
    const os = osRes.data ?? []
    setPendingOS(os.length)
    setPendingAmt(os.reduce((s, o) => s + (o.total_amount - (o.paid_amount ?? 0)), 0))

    setLoading(false)
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
        <p className="text-sm text-slate-500">Caixa, receitas e resumo financeiro da ótica</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Caixa Hoje</p>
            <div className="p-2 rounded-lg bg-emerald-100">
              <DollarSign size={16} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(todayIn)}</p>
          <p className="text-xs text-slate-400 mt-1">{todayCount} venda{todayCount !== 1 ? 's' : ''} hoje</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Semana</p>
            <div className="p-2 rounded-lg bg-blue-100">
              <TrendingUp size={16} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(weekTotal)}</p>
          <p className="text-xs text-slate-400 mt-1">Últimos 7 dias</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Mês</p>
            <div className="p-2 rounded-lg bg-violet-100">
              <Calendar size={16} className="text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(monthTotal)}</p>
          <p className="text-xs text-slate-400 mt-1">Mês corrente</p>
        </Card>

        <Card className={cn('p-5', pendingOS > 0 ? 'border-amber-200' : '')}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">A Receber (OS)</p>
            <div className={cn('p-2 rounded-lg', pendingOS > 0 ? 'bg-amber-100' : 'bg-slate-100')}>
              <AlertCircle size={16} className={pendingOS > 0 ? 'text-amber-600' : 'text-slate-400'} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(pendingAmt)}</p>
          <p className="text-xs text-slate-400 mt-1">{pendingOS} OS em aberto</p>
        </Card>
      </div>

      {/* Gráfico semana + formas de pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-base font-bold text-slate-800 mb-5">Receita — últimos 7 dias</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekChart} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} width={50} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Receita']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-blue-500" />
            Por Pagamento
          </h3>
          {byMethod.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              Sem vendas na semana
            </div>
          ) : (
            <div className="space-y-2.5">
              {byMethod.map(m => (
                <div key={m.method} className="flex items-center justify-between">
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    PAYMENT_COLORS[m.method] ?? 'bg-slate-100 text-slate-600',
                  )}>
                    {m.label}
                  </span>
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(m.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Lançamentos recentes */}
      <Card className="p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4">Lançamentos Recentes</h3>
        {entries.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            Nenhum lançamento na semana.
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map(e => (
              <div key={e.id} className="flex items-center gap-4 py-2.5 border-b border-slate-50 last:border-0">
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  e.type === 'entrada' ? 'bg-emerald-100' : 'bg-red-100',
                )}>
                  {e.type === 'entrada'
                    ? <ArrowUpRight size={14} className="text-emerald-600" />
                    : <ArrowDownRight size={14} className="text-red-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{e.description}</p>
                  <p className="text-[10px] text-slate-400">{new Date(e.date).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</p>
                </div>
                {e.method && (
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:block',
                    PAYMENT_COLORS[e.method] ?? 'bg-slate-100 text-slate-600',
                  )}>
                    {PAYMENT_LABELS[e.method as PaymentMethod] ?? e.method}
                  </span>
                )}
                <p className={cn(
                  'text-sm font-bold flex-shrink-0',
                  e.type === 'entrada' ? 'text-emerald-600' : 'text-red-600',
                )}>
                  {e.type === 'entrada' ? '+' : '-'}{formatCurrency(e.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
