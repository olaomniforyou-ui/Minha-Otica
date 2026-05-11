import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Building2, ChevronRight, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { listAllCompanies, toggleCompanyStatus } from '@/services/admin.service'
import type { CompanyWithSubscription } from '@/types'

const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
const statusColor: Record<string, string> = { active: '#10b981', trial: '#f59e0b', suspended: '#ef4444', cancelled: '#6b7280', past_due: '#f97316' }
const statusLabel: Record<string, string> = { active: 'Ativo', trial: 'Trial', suspended: 'Suspenso', cancelled: 'Cancelado', past_due: 'Atrasado' }

export default function AdminCompanies() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<CompanyWithSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => { listAllCompanies().then(setCompanies).finally(() => setLoading(false)) }, [])

  const filtered = companies.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.cnpj || '').includes(search)
    const matchFilter = filter === 'all' || c.subscription?.status === filter || (filter === 'no_plan' && !c.subscription)
    return matchSearch && matchFilter
  })

  async function handleToggle(c: CompanyWithSubscription) {
    setToggling(c.id)
    try {
      await toggleCompanyStatus(c.id, !c.is_active)
      setCompanies(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x))
    } finally { setToggling(null) }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Empresas</h1>
          <p className="text-sm text-slate-500 mt-0.5">{companies.length} tenants cadastrados</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
            style={CARD}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['all','Todos'],['trial','Trial'],['active','Ativos'],['suspended','Suspensos'],['no_plan','Sem plano']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={filter === v
                ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }
                : { ...CARD, color: '#94a3b8' }}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={CARD}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Building2 size={40} className="text-slate-700" />
            <p className="text-sm text-slate-500">Nenhuma empresa encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {/* Header */}
            <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <div className="col-span-4">Empresa</div>
              <div className="col-span-2">Plano</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Criada em</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>
            {filtered.map(c => {
              const st = c.subscription?.status || 'no_plan'
              return (
                <div key={c.id} className="grid grid-cols-12 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors">
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: c.is_active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#374151' }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      <p className="text-xs text-slate-500 truncate">{c.cnpj || c.email || '—'}</p>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs font-medium" style={{ color: '#a78bfa' }}>
                      {c.subscription?.plan?.name || <span className="text-slate-600">Sem plano</span>}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: statusColor[st] || '#6b7280', background: `${statusColor[st] || '#6b7280'}18` }}>
                      {statusLabel[st] || 'N/A'}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-slate-500">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleToggle(c)}
                      disabled={toggling === c.id}
                      className="text-slate-500 hover:text-white transition-colors"
                      title={c.is_active ? 'Desativar' : 'Ativar'}
                    >
                      {toggling === c.id
                        ? <Loader2 size={16} className="animate-spin" />
                        : c.is_active
                        ? <ToggleRight size={20} className="text-emerald-400" />
                        : <ToggleLeft size={20} />}
                    </button>
                    <button
                      onClick={() => navigate(`/admin/companies/${c.id}`)}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Ver <ChevronRight size={14} />
                    </button>
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
