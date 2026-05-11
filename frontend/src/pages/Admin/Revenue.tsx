import { useEffect, useState } from 'react'
import { TrendingUp, CreditCard, AlertCircle, Loader2 } from 'lucide-react'
import { listSubscriptions, getSaasStatsSafe } from '@/services/admin.service'
import type { Subscription, SaasStats } from '@/types'

const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
const statusColor: Record<string, string> = { active: '#10b981', trial: '#f59e0b', suspended: '#ef4444', cancelled: '#6b7280', past_due: '#f97316' }
const statusLabel: Record<string, string> = { active: 'Ativo', trial: 'Trial', suspended: 'Suspenso', cancelled: 'Cancelado', past_due: 'Atrasado' }

export default function AdminRevenue() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [stats, setStats] = useState<SaasStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listSubscriptions(), getSaasStatsSafe()])
      .then(([sub, st]) => {
        setSubscriptions(sub)
        setStats(st)
      })
      .finally(() => setLoading(false))
  }, [])

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-white">Financeiro</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestão de receita e assinaturas</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 flex flex-col gap-2" style={CARD}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">MRR Mensal</span>
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(stats?.mrr || 0)}</p>
          <p className="text-xs text-slate-500">Receita Recorrente Mensal</p>
        </div>
        <div className="rounded-2xl p-5 flex flex-col gap-2" style={CARD}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">ARR Anual</span>
            <CreditCard size={18} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(stats?.arr || 0)}</p>
          <p className="text-xs text-slate-500">Receita Recorrente Anual</p>
        </div>
        <div className="rounded-2xl p-5 flex flex-col gap-2" style={CARD}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Trials Expiring</span>
            <AlertCircle size={18} className="text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats?.trials_expiring_7d || 0}</p>
          <p className="text-xs text-slate-500">Vencem em 7 dias</p>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl overflow-hidden" style={CARD}>
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">Assinaturas Ativas</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
        ) : subscriptions.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-500">Nenhuma assinatura ativa encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02] text-slate-400 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 font-semibold">Empresa</th>
                  <th className="px-5 py-3 font-semibold">Plano</th>
                  <th className="px-5 py-3 font-semibold">Ciclo</th>
                  <th className="px-5 py-3 font-semibold">Valor</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Próximo Venc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-white">{sub.company?.name}</p>
                      <p className="text-xs text-slate-500">{sub.company?.cnpj || '—'}</p>
                    </td>
                    <td className="px-5 py-4 text-indigo-400 font-medium">{sub.plan?.name}</td>
                    <td className="px-5 py-4 text-slate-400">{sub.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}</td>
                    <td className="px-5 py-4 text-white font-medium">{formatCurrency(sub.amount)}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: statusColor[sub.status], background: `${statusColor[sub.status]}15` }}>
                        {statusLabel[sub.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
