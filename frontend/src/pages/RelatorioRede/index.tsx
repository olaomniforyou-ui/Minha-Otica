import { useState, useEffect } from 'react'
import { Building2, TrendingUp, Users, ClipboardList, AlertCircle, RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

type Period = 'mes_atual' | 'mes_anterior' | '3_meses' | '6_meses'

const PERIODS: { id: Period; label: string }[] = [
  { id: 'mes_atual',    label: 'Mês atual' },
  { id: 'mes_anterior', label: 'Mês anterior' },
  { id: '3_meses',      label: 'Últimos 3 meses' },
  { id: '6_meses',      label: 'Últimos 6 meses' },
]

function getDateRange(period: Period): { start: string; label: string } {
  const now = new Date()
  if (period === 'mes_atual') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start: start.toISOString(), label: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
  }
  if (period === 'mes_anterior') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return { start: start.toISOString(), label: start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
  }
  if (period === '3_meses') {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return { start: start.toISOString(), label: 'Últimos 3 meses' }
  }
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  return { start: start.toISOString(), label: 'Últimos 6 meses' }
}

interface FilialData {
  id: string
  name: string
  revenue: number
  sales: number
  os: number
  patients: number
}

const COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#8b5cf6', '#a855f7', '#ec4899']

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export default function RelatorioRedePage() {
  const { availableProfiles } = useAuthStore()
  const [loading,  setLoading]  = useState(true)
  const [filiais,  setFiliais]  = useState<FilialData[]>([])
  const [error,    setError]    = useState('')
  const [period,   setPeriod]   = useState<Period>('mes_atual')

  async function load(p: Period) {
    setLoading(true)
    setError('')
    try {
      const ids = availableProfiles.map(x => x.company_id)
      if (ids.length === 0) { setLoading(false); return }

      const { start: startDate } = getDateRange(p)

      const [salesRes, osRes, patientsRes] = await Promise.all([
        supabase.from('sales').select('total_amount, company_id').in('company_id', ids).gte('created_at', startDate),
        supabase.from('service_orders').select('id, company_id').in('company_id', ids).gte('created_at', startDate),
        supabase.from('patients').select('id, company_id').in('company_id', ids),
      ])

      const result: FilialData[] = availableProfiles.map((p, idx) => {
        const cid = p.company_id
        const sales  = (salesRes.data ?? []).filter(s => s.company_id === cid)
        const os     = (osRes.data ?? []).filter(o => o.company_id === cid)
        const pats   = (patientsRes.data ?? []).filter(x => x.company_id === cid)
        return {
          id: cid,
          name: (p as any).company?.name ?? `Filial ${idx + 1}`,
          revenue:  sales.reduce((s, x) => s + (x.total_amount ?? 0), 0),
          sales:    sales.length,
          os:       os.length,
          patients: pats.length,
        }
      })

      setFiliais(result)
    } catch {
      setError('Erro ao carregar dados da rede.')
    }
    setLoading(false)
  }

  useEffect(() => { load(period) }, [availableProfiles, period]) // eslint-disable-line

  if (availableProfiles.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle size={40} className="text-slate-300" />
        <p className="text-slate-600 font-semibold">Disponível apenas para redes com múltiplas filiais.</p>
        <p className="text-slate-400 text-sm">Associe mais de uma empresa ao seu perfil para ver o relatório consolidado.</p>
      </div>
    )
  }

  const total = filiais.reduce(
    (acc, f) => ({ revenue: acc.revenue + f.revenue, sales: acc.sales + f.sales, os: acc.os + f.os, patients: acc.patients + f.patients }),
    { revenue: 0, sales: 0, os: 0, patients: 0 }
  )

  const SUMMARY = [
    { label: 'Faturamento no mês', value: fmt(total.revenue), icon: TrendingUp,    color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Vendas no mês',      value: total.sales,         icon: ClipboardList, color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'OS abertas',         value: total.os,            icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Pacientes cadastrados', value: total.patients,   icon: Users,         color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={22} className="text-indigo-500" /> Relatório da Rede
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Consolidado de {filiais.length} filiais — {getDateRange(period).label}
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-1 flex-wrap justify-end">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  period === p.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(period)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </div>

      {loading ? <PageLoader /> : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {SUMMARY.map(s => {
              const Icon = s.icon
              return (
                <Card key={s.label} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-2.5 ${s.bg}`}>
                      <Icon size={18} className={s.color} />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
                      <p className="text-lg font-bold text-slate-900">{s.value}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Gráfico faturamento por filial */}
          <Card className="p-5">
            <p className="text-sm font-bold text-slate-700 mb-4">Faturamento por Filial ({getDateRange(period).label})</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={filiais} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="revenue" name="Faturamento" radius={[6, 6, 0, 0]}>
                  {filiais.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Tabela por filial */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['Filial', 'Faturamento', 'Vendas', 'OS', 'Pacientes', '% Faturamento'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filiais.map((f, i) => {
                    const pct = total.revenue > 0 ? ((f.revenue / total.revenue) * 100).toFixed(1) : '0.0'
                    return (
                      <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="font-semibold text-slate-800">{f.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-indigo-700">{fmt(f.revenue)}</td>
                        <td className="px-4 py-3 text-slate-700">{f.sales}</td>
                        <td className="px-4 py-3 text-slate-700">{f.os}</td>
                        <td className="px-4 py-3 text-slate-700">{f.patients}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 font-medium">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {/* Linha total */}
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-4 py-3 font-bold text-slate-900">Total da Rede</td>
                    <td className="px-4 py-3 font-bold text-indigo-700">{fmt(total.revenue)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{total.sales}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{total.os}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{total.patients}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
