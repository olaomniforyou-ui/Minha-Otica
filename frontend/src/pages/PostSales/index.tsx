import { useState, useEffect, useMemo } from 'react'
import { Star, RefreshCw, CheckCircle2, Clock, Filter, Download, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getAllPostSales, resolvePostSale } from '@/services/postsale.service'
import { POST_SALE_LABELS } from '@/types'
import type { PostSale, PostSaleType } from '@/types'

type WithPatient = PostSale & { patient?: { id: string; full_name: string } }

const TYPE_COLORS: Record<PostSaleType, string> = {
  nps:         'bg-blue-100 text-blue-700',
  garantia:    'bg-amber-100 text-amber-700',
  assistencia: 'bg-violet-100 text-violet-700',
  ajuste:      'bg-slate-100 text-slate-700',
  reclamacao:  'bg-red-100 text-red-700',
  recompra:    'bg-emerald-100 text-emerald-700',
}

function NpsStars({ score }: { score?: number }) {
  if (score === undefined || score === null) return <span className="text-slate-400 text-xs">—</span>
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className={`text-[10px] ${i < score ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-700">{score}/10</span>
    </span>
  )
}

function exportCsv(rows: WithPatient[]) {
  const header = ['Paciente', 'Tipo', 'NPS', 'Notas', 'Status', 'Data']
  const lines = rows.map(r => [
    r.patient?.full_name ?? r.patient_id,
    POST_SALE_LABELS[r.type],
    r.nps_score ?? '',
    (r.notes ?? '').replace(/,/g, ';'),
    r.resolved ? 'Resolvido' : 'Pendente',
    new Date(r.created_at).toLocaleDateString('pt-BR'),
  ].join(','))
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pos-venda-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function PostSalesPage() {
  const [records, setRecords]   = useState<WithPatient[]>([])
  const [loading, setLoading]   = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const [waModal,   setWaModal]   = useState<{ message: string } | null>(null)
  const [waPhone,   setWaPhone]   = useState('')
  const [typeFilter, setTypeFilter]     = useState<PostSaleType | 'todos'>('todos')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendentes' | 'resolvidos'>('todos')
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'tudo'>('30d')

  async function load() {
    setLoading(true)
    try {
      setRecords(await getAllPostSales())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function buildWaMsg(r: WithPatient): string {
    const name = r.patient?.full_name?.split(' ')[0] ?? 'cliente'
    if (r.type === 'nps')
      return `Olá, ${name}! 😊 Esperamos que esteja adorando seus óculos! Em uma escala de 0 a 10, o quanto você recomendaria nossa ótica para um amigo? Sua opinião é muito importante para nós!`
    if (r.type === 'garantia')
      return `Olá, ${name}! Acompanhando seu pedido de garantia. Gostaríamos de saber se o problema foi resolvido. Qualquer dúvida, estamos à disposição!`
    if (r.type === 'reclamacao')
      return `Olá, ${name}! Lamentamos pelo inconveniente. Gostaríamos de entender melhor como podemos ajudar. Pode nos contar o que aconteceu?`
    if (r.type === 'recompra')
      return `Olá, ${name}! 👓 Faz um tempo que não nos vemos. Temos novidades e gostaríamos de convidar você para uma nova visita!`
    return `Olá, ${name}! Passando para verificar se está tudo bem com seus óculos. Estamos à disposição!`
  }

  function openWa(r: WithPatient) {
    setWaModal({ message: buildWaMsg(r) })
    setWaPhone('')
  }

  async function handleResolve(id: string) {
    setResolving(id)
    await resolvePostSale(id)
    setRecords(prev => prev.map(r => r.id === id ? { ...r, resolved: true } : r))
    setResolving(null)
  }

  const periodStart = useMemo(() => {
    if (period === 'tudo') return null
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d
  }, [period])

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (typeFilter !== 'todos' && r.type !== typeFilter) return false
      if (statusFilter === 'pendentes' && r.resolved) return false
      if (statusFilter === 'resolvidos' && !r.resolved) return false
      if (periodStart && new Date(r.created_at) < periodStart) return false
      return true
    })
  }, [records, typeFilter, statusFilter, periodStart])

  const npsRecords = filtered.filter(r => r.type === 'nps' && r.nps_score !== undefined)
  const npsAvg = npsRecords.length > 0
    ? (npsRecords.reduce((s, r) => s + (r.nps_score ?? 0), 0) / npsRecords.length).toFixed(1)
    : null
  const pending = filtered.filter(r => !r.resolved).length
  const mostCommon = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(r => { counts[r.type] = (counts[r.type] ?? 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as PostSaleType | undefined
  }, [filtered])

  const PERIOD_OPTS = [
    { v: '7d',  l: '7 dias' },
    { v: '30d', l: '30 dias' },
    { v: '90d', l: '90 dias' },
    { v: 'tudo', l: 'Tudo' },
  ] as const

  const TYPE_OPTS: { v: PostSaleType | 'todos'; l: string }[] = [
    { v: 'todos',       l: 'Todos' },
    { v: 'nps',         l: 'NPS' },
    { v: 'garantia',    l: 'Garantia' },
    { v: 'assistencia', l: 'Assistência' },
    { v: 'ajuste',      l: 'Ajuste' },
    { v: 'reclamacao',  l: 'Reclamação' },
    { v: 'recompra',    l: 'Recompra' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Star className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Pós-venda</h1>
            <p className="text-xs text-slate-500">NPS, garantias, assistências e acompanhamento de clientes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exportCsv(filtered)} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">NPS Médio</p>
          {npsAvg
            ? <p className="text-2xl font-bold text-amber-500 mt-1">{npsAvg}/10</p>
            : <p className="text-2xl font-bold text-slate-300 mt-1">—</p>
          }
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Pendentes</p>
          <p className={`text-2xl font-bold mt-1 ${pending > 0 ? 'text-red-500' : 'text-slate-900'}`}>{pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Tipo mais freq.</p>
          {mostCommon
            ? <p className="text-sm font-bold text-violet-600 mt-2">{POST_SALE_LABELS[mostCommon]}</p>
            : <p className="text-2xl font-bold text-slate-300 mt-1">—</p>
          }
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <Filter className="h-3.5 w-3.5" />
          Filtros
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
            {PERIOD_OPTS.map(o => (
              <button
                key={o.v}
                onClick={() => setPeriod(o.v)}
                className={`px-3 py-1.5 font-medium transition-colors ${period === o.v ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
            {(['todos', 'pendentes', 'resolvidos'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 font-medium capitalize transition-colors ${statusFilter === s ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_OPTS.map(o => (
            <button
              key={o.v}
              onClick={() => setTypeFilter(o.v)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                typeFilter === o.v
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela desktop */}
      <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Paciente</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">NPS</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Data</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Notas</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhum registro encontrado.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {r.patient?.full_name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[r.type]}`}>
                    {POST_SALE_LABELS[r.type]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <NpsStars score={r.nps_score} />
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(r.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate">
                  {r.notes ?? '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {r.resolved
                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Resolvido</span>
                    : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><Clock className="h-3.5 w-3.5" /> Pendente</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      onClick={() => openWa(r)}
                      className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
                    >
                      <MessageCircle size={11} /> WhatsApp
                    </button>
                    {!r.resolved && (
                      <Button size="sm" variant="ghost" onClick={() => handleResolve(r.id)} disabled={resolving === r.id}>
                        {resolving === r.id ? '...' : 'Resolver'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-center text-slate-400 py-8">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Nenhum registro encontrado.</p>
        ) : filtered.map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900 text-sm">{r.patient?.full_name ?? '—'}</p>
                <p className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[r.type]}`}>
                {POST_SALE_LABELS[r.type]}
              </span>
            </div>
            {r.type === 'nps' && <NpsStars score={r.nps_score} />}
            {r.notes && <p className="text-xs text-slate-600 line-clamp-2">{r.notes}</p>}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              {r.resolved
                ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Resolvido</span>
                : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><Clock className="h-3.5 w-3.5" /> Pendente</span>
              }
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openWa(r)}
                  className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
                >
                  <MessageCircle size={11} />
                </button>
                {!r.resolved && (
                  <Button size="sm" variant="ghost" onClick={() => handleResolve(r.id)} disabled={resolving === r.id}>
                    {resolving === r.id ? '...' : 'Resolver'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal WhatsApp */}
      {waModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-800 flex items-center gap-2">
                <MessageCircle size={16} className="text-green-500" /> Enviar via WhatsApp
              </p>
              <button onClick={() => setWaModal(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 leading-relaxed">
              {waModal.message}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone do paciente</label>
              <input
                type="tel"
                placeholder="(11) 9 9999-9999"
                value={waPhone}
                onChange={e => setWaPhone(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
              />
            </div>
            <button
              disabled={!waPhone.replace(/\D/g, '')}
              onClick={() => {
                window.open(`https://wa.me/55${waPhone.replace(/\D/g, '')}?text=${encodeURIComponent(waModal.message)}`, '_blank')
                setWaModal(null)
              }}
              className="w-full rounded-xl bg-green-500 py-2.5 text-sm font-bold text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Abrir WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
