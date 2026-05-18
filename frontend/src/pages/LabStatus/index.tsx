import { useState, useEffect, useCallback } from 'react'
import { FlaskConical, ChevronRight, RefreshCw, LayoutGrid, List, MessageCircle, Clock, AlertTriangle, Loader2, CheckSquare } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LabStatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate, cn } from '@/lib/utils'
import { getLabTrackings, updateLabStatus } from '@/services/labTracking.service'
import type { LabTracking, LabStatus } from '@/types'

const STATUS_FLOW: LabStatus[] = [
  'aguardando_envio', 'enviado', 'em_producao', 'pronto_retorno', 'retornado',
]

const NEXT_LABEL: Partial<Record<LabStatus, string>> = {
  aguardando_envio: 'Marcar Enviado',
  enviado:          'Em Produção',
  em_producao:      'Pronto p/ Retorno',
  pronto_retorno:   'Registrar Retorno',
}

const STATUS_FILTERS: { value: LabStatus | 'todos'; label: string }[] = [
  { value: 'todos',            label: 'Todos' },
  { value: 'aguardando_envio', label: 'Aguardando' },
  { value: 'enviado',          label: 'Enviados' },
  { value: 'em_producao',      label: 'Em Produção' },
  { value: 'pronto_retorno',   label: 'Pronto p/ Retorno' },
  { value: 'retornado',        label: 'Retornados' },
  { value: 'com_defeito',      label: 'Com Defeito' },
]

function daysInfo(t: LabTracking): { days: number; overdue: boolean; warn: boolean } | null {
  if (!t.sent_at || t.status === 'retornado' || t.status === 'com_defeito') return null
  const days = Math.floor((Date.now() - new Date(t.sent_at).getTime()) / 86_400_000)
  const overdue = !!t.expected_return && new Date(t.expected_return) < new Date()
  const warn    = !!t.expected_return && !overdue &&
    Math.ceil((new Date(t.expected_return).getTime() - Date.now()) / 86_400_000) <= 2
  return { days, overdue, warn }
}

const KANBAN_COLS: { status: LabStatus; label: string; color: string; bg: string }[] = [
  { status: 'aguardando_envio', label: 'Aguardando Envio', color: 'text-slate-600',   bg: 'bg-slate-50  border-slate-200' },
  { status: 'enviado',          label: 'Enviado',          color: 'text-blue-700',    bg: 'bg-blue-50   border-blue-200' },
  { status: 'em_producao',      label: 'Em Produção',      color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200' },
  { status: 'pronto_retorno',   label: 'Pronto p/ Retorno',color: 'text-amber-700',   bg: 'bg-amber-50  border-amber-200' },
  { status: 'retornado',        label: 'Retornado',        color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
]

export default function LabStatusPage() {
  const [trackings,     setTrackings]     = useState<LabTracking[]>([])
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState<LabStatus | 'todos'>('todos')
  const [advancing,     setAdvancing]     = useState<string | null>(null)
  const [viewMode,      setViewMode]      = useState<'list' | 'kanban'>('list')
  const [selected,      setSelected]      = useState<Set<string>>(new Set())
  const [bulkAdvancing, setBulkAdvancing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setTrackings(await getLabTrackings())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setSelected(new Set()) }, [filter, viewMode])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function advanceBulk() {
    if (selected.size === 0) return
    setBulkAdvancing(true)
    const toAdvance = trackings.filter(t => selected.has(t.id) && NEXT_LABEL[t.status])
    await Promise.all(toAdvance.map(t => {
      const idx = STATUS_FLOW.indexOf(t.status)
      return idx >= 0 && idx < STATUS_FLOW.length - 1
        ? updateLabStatus(t.id, STATUS_FLOW[idx + 1])
        : Promise.resolve()
    }))
    setTrackings(prev =>
      prev.map(t => {
        if (!selected.has(t.id)) return t
        const idx = STATUS_FLOW.indexOf(t.status)
        if (idx === -1 || idx >= STATUS_FLOW.length - 1) return t
        return { ...t, status: STATUS_FLOW[idx + 1] }
      })
    )
    setSelected(new Set())
    setBulkAdvancing(false)
  }

  async function advance(t: LabTracking) {
    const idx = STATUS_FLOW.indexOf(t.status)
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return
    setAdvancing(t.id)
    await updateLabStatus(t.id, STATUS_FLOW[idx + 1])
    setTrackings(prev =>
      prev.map(x => x.id === t.id ? { ...x, status: STATUS_FLOW[idx + 1] } : x)
    )
    setAdvancing(null)
  }

  async function markDefect(t: LabTracking) {
    setAdvancing(t.id)
    await updateLabStatus(t.id, 'com_defeito')
    setTrackings(prev =>
      prev.map(x => x.id === t.id ? { ...x, status: 'com_defeito' as LabStatus } : x)
    )
    setAdvancing(null)
  }

  const filtered = filter === 'todos'
    ? trackings
    : trackings.filter(t => t.status === filter)

  const pending          = trackings.filter(t => t.status !== 'retornado' && t.status !== 'com_defeito').length
  const defects          = trackings.filter(t => t.status === 'com_defeito').length
  const selectableItems  = filtered.filter(t => !!NEXT_LABEL[t.status])
  const allSelected      = selectableItems.length > 0 && selectableItems.every(t => selected.has(t.id))

  const activeTracks     = trackings.filter(t => t.status !== 'retornado' && t.status !== 'com_defeito')
  const withDaysData     = activeTracks.map(daysInfo).filter((d): d is NonNullable<ReturnType<typeof daysInfo>> => d !== null)
  const labAvgDays       = withDaysData.length > 0 ? Math.round(withDaysData.reduce((s, d) => s + d.days, 0) / withDaysData.length) : 0
  const withExpected     = activeTracks.filter(t => !!t.expected_return)
  const onSchedulePct    = withExpected.length > 0
    ? Math.round((withExpected.filter(t => !daysInfo(t)?.overdue).length / withExpected.length) * 100) : 100
  const statusChartData  = [
    { label: 'Aguardando', count: trackings.filter(t => t.status === 'aguardando_envio').length, color: '#64748b' },
    { label: 'Enviado',    count: trackings.filter(t => t.status === 'enviado').length,          color: '#3b82f6' },
    { label: 'Produção',   count: trackings.filter(t => t.status === 'em_producao').length,      color: '#8b5cf6' },
    { label: 'Pronto',     count: trackings.filter(t => t.status === 'pronto_retorno').length,   color: '#f59e0b' },
    { label: 'Retornado',  count: trackings.filter(t => t.status === 'retornado').length,        color: '#10b981' },
  ]

  function toggleSelectAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(selectableItems.map(t => t.id)))
  }

  // ── Card reutilizável ────────────────────────────────────────
  function TrackingCard({ t, compact = false }: { t: LabTracking; compact?: boolean }) {
    return (
      <Card className={cn('p-4', compact && 'shadow-none border border-slate-200 rounded-xl bg-white')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-blue-700">
              OS #{t.service_order_id.slice(0, 8)}
            </p>
            <p className="font-semibold text-slate-900 truncate text-sm">{t.lab_name}</p>
            {t.lab_order_number && (
              <p className="text-xs text-slate-500">Nº {t.lab_order_number}</p>
            )}
            <div className="mt-1 flex gap-3 text-xs text-slate-400 flex-wrap items-center">
              {t.sent_at && <span>Enviado: {formatDate(t.sent_at)}</span>}
              {t.expected_return && <span>Prev.: {formatDate(t.expected_return)}</span>}
              {(() => {
                const d = daysInfo(t)
                if (!d) return null
                return (
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold',
                    d.overdue ? 'bg-red-100 text-red-700' :
                    d.warn    ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-500'
                  )}>
                    {d.overdue ? <AlertTriangle size={9} /> : <Clock size={9} />}
                    {d.days}d
                  </span>
                )
              })()}
            </div>
          </div>
          {!compact && <LabStatusBadge status={t.status} />}
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {NEXT_LABEL[t.status] && (
            <button
              disabled={advancing === t.id}
              onClick={() => advance(t)}
              className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {NEXT_LABEL[t.status]} <ChevronRight size={11} />
            </button>
          )}
          {t.status === 'pronto_retorno' && (() => {
            const patient = (t.service_order as any)?.patient
            const phone   = (patient?.whatsapp || patient?.phone || '').replace(/\D/g, '')
            if (!phone) return null
            const msg = encodeURIComponent(
              `Olá ${patient?.full_name ?? 'cliente'}! Seus óculos estão prontos para retirada. 😊`
            )
            return (
              <a
                href={`https://wa.me/55${phone}?text=${msg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <MessageCircle size={11} /> Avisar Cliente
              </a>
            )
          })()}
          {t.status !== 'com_defeito' && t.status !== 'retornado' && (
            <button
              disabled={advancing === t.id}
              onClick={() => markDefect(t)}
              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Defeito
            </button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laboratório</h1>
          <p className="text-sm text-slate-500">
            {pending} pedido{pending !== 1 ? 's' : ''} em andamento
            {defects > 0 && <span className="ml-2 text-red-500">· {defects} com defeito</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle lista / kanban */}
          <div className="flex gap-1 rounded-lg border border-slate-200 overflow-hidden p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('list')}
              title="Visualização em lista"
              className={cn('rounded-md p-1.5 transition-colors', viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600')}
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              title="Visualização kanban"
              className={cn('rounded-md p-1.5 transition-colors', viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600')}
            >
              <LayoutGrid size={15} />
            </button>
          </div>
          <Button variant="outline" icon={<RefreshCw size={14}/>} onClick={load}>
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Filtros (apenas na lista) */}
      {viewMode === 'list' && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                filter === f.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading ? <PageLoader /> : (
        <>
          {/* KPI Cards + Distribuição */}
          {trackings.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Em Produção', value: activeTracks.filter(t => t.status === 'em_producao').length, color: 'text-violet-600' },
                  { label: 'Retornados',  value: trackings.filter(t => t.status === 'retornado').length,      color: 'text-emerald-600' },
                  { label: 'Prazo Médio', value: `${labAvgDays}d`,                                           color: 'text-blue-600' },
                  { label: '% no Prazo',  value: `${onSchedulePct}%`,                                        color: onSchedulePct >= 80 ? 'text-emerald-600' : 'text-amber-600' },
                ].map(k => (
                  <Card key={k.label} className="p-4">
                    <p className="text-[11px] text-slate-500 font-medium">{k.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                  </Card>
                ))}
              </div>
              <Card className="p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Distribuição por Status</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={statusChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Bar dataKey="count" name="Pedidos" radius={[4, 4, 0, 0]}>
                      {statusChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* ── KANBAN ─────────────────────────────────────────── */}
          {viewMode === 'kanban' && (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {KANBAN_COLS.map(col => {
                  const colItems = trackings.filter(t => t.status === col.status)
                  return (
                    <div key={col.status} className={cn('w-64 rounded-xl border p-3 space-y-3', col.bg)}>
                      <div className="flex items-center justify-between">
                        <p className={cn('text-xs font-bold uppercase tracking-wide', col.color)}>
                          {col.label}
                        </p>
                        <span className={cn('text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center', col.color, 'bg-white/70')}>
                          {colItems.length}
                        </span>
                      </div>
                      {colItems.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-4">Vazio</p>
                      ) : (
                        colItems.map(t => (
                          <TrackingCard key={t.id} t={t} compact />
                        ))
                      )}
                    </div>
                  )
                })}

                {/* Coluna defeitos (se tiver) */}
                {trackings.filter(t => t.status === 'com_defeito').length > 0 && (
                  <div className="w-64 rounded-xl border border-red-200 bg-red-50 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-red-700">Com Defeito</p>
                      <span className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center text-red-700 bg-white/70">
                        {trackings.filter(t => t.status === 'com_defeito').length}
                      </span>
                    </div>
                    {trackings.filter(t => t.status === 'com_defeito').map(t => (
                      <TrackingCard key={t.id} t={t} compact />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── LISTA ──────────────────────────────────────────── */}
          {viewMode === 'list' && (
            filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <FlaskConical size={40} className="text-slate-300" />
                <p className="text-slate-500">Nenhum pedido no laboratório.</p>
              </div>
            ) : (
              <>
                {/* Desktop tabela */}
                <div className="hidden md:block">
                  {/* Bulk toolbar */}
                  {selected.size > 0 && (
                    <div className="mb-3 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
                      <CheckSquare size={15} className="text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-blue-700">
                        {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={advanceBulk}
                        disabled={bulkAdvancing}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                      >
                        {bulkAdvancing
                          ? <Loader2 size={12} className="animate-spin" />
                          : <ChevronRight size={12} />}
                        Avançar selecionados
                      </button>
                      <button
                        onClick={() => setSelected(new Set())}
                        className="ml-auto text-xs text-slate-500 hover:text-slate-700"
                      >
                        Limpar seleção
                      </button>
                    </div>
                  )}
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/60">
                            <th className="px-4 py-3 w-8">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={toggleSelectAll}
                                disabled={selectableItems.length === 0}
                                className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600 cursor-pointer disabled:opacity-30"
                              />
                            </th>
                            {['OS', 'Laboratório', 'Nº Lab', 'Enviado', 'Previsão', 'Prazo', 'Status', 'Ações'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.map(t => (
                            <tr key={t.id} className={cn('hover:bg-slate-50/60 transition-colors', selected.has(t.id) && 'bg-blue-50/40')}>
                              <td className="px-4 py-3">
                                {NEXT_LABEL[t.status] ? (
                                  <input
                                    type="checkbox"
                                    checked={selected.has(t.id)}
                                    onChange={() => toggleSelect(t.id)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600 cursor-pointer"
                                  />
                                ) : <span />}
                              </td>
                              <td className="px-4 py-3 font-semibold text-blue-700">
                                #{t.service_order_id.slice(0, 8)}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-800">{t.lab_name}</td>
                              <td className="px-4 py-3 text-slate-500">{t.lab_order_number ?? '—'}</td>
                              <td className="px-4 py-3 text-slate-500">{t.sent_at ? formatDate(t.sent_at) : '—'}</td>
                              <td className="px-4 py-3 text-slate-500">{t.expected_return ? formatDate(t.expected_return) : '—'}</td>
                              <td className="px-4 py-3">
                                {(() => {
                                  const d = daysInfo(t)
                                  if (!d) return <span className="text-slate-400">—</span>
                                  return (
                                    <span className={cn(
                                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                                      d.overdue ? 'bg-red-100 text-red-700' :
                                      d.warn    ? 'bg-amber-100 text-amber-700' :
                                                  'bg-slate-100 text-slate-600'
                                    )}>
                                      {d.overdue ? <AlertTriangle size={10} /> : <Clock size={10} />}
                                      {d.days}d
                                    </span>
                                  )
                                })()}
                              </td>
                              <td className="px-4 py-3"><LabStatusBadge status={t.status} /></td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {NEXT_LABEL[t.status] && (
                                    <button
                                      disabled={advancing === t.id}
                                      onClick={() => advance(t)}
                                      className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                                    >
                                      {NEXT_LABEL[t.status]} <ChevronRight size={11} />
                                    </button>
                                  )}
                                  {t.status !== 'com_defeito' && t.status !== 'retornado' && (
                                    <button
                                      disabled={advancing === t.id}
                                      onClick={() => markDefect(t)}
                                      className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                                    >
                                      Defeito
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {filtered.map(t => (
                    <TrackingCard key={t.id} t={t} />
                  ))}
                </div>
              </>
            )
          )}
        </>
      )}
    </div>
  )
}
