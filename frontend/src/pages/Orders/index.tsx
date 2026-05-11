import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Plus, ChevronRight, FileText, ShoppingCart, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { OrderModal } from '@/components/orders/OrderModal'
import { formatDate, formatCurrency, getInitials, cn } from '@/lib/utils'
import { getOrders, getOrderById, updateOrderStatus, convertOrderToSale } from '@/services/orders.service'
import { pullFromServer } from '@/services/sync.service'
import { downloadAllPdfs } from '@/lib/generatePdf'
import { useAuthStore } from '@/store/authStore'
import type { ServiceOrder, ServiceOrderStatus } from '@/types'
import { SERVICE_TYPE_LABELS } from '@/types'

const FILTERS: { value: ServiceOrderStatus | 'todas'; label: string }[] = [
  { value: 'todas',       label: 'Todas' },
  { value: 'orcamento',   label: 'Orçamento' },
  { value: 'aprovado',    label: 'Aprovado' },
  { value: 'producao',    label: 'Em Produção' },
  { value: 'laboratorio', label: 'Laboratório' },
  { value: 'pronto',      label: 'Pronto' },
  { value: 'entregue',    label: 'Entregue' },
]

const STATUS_FLOW: ServiceOrderStatus[] = [
  'orcamento', 'aprovado', 'producao', 'laboratorio', 'pronto', 'entregue',
]

const NEXT_LABEL: Partial<Record<ServiceOrderStatus, string>> = {
  orcamento:   'Aprovar',
  aprovado:    'Produção',
  producao:    'Laboratório',
  laboratorio: 'Pronto',
  pronto:      'Entregar',
}

const COLORS = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-cyan-500']
function colorOf(name: string) {
  return COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
}

export default function OrdersPage() {
  const [orders,      setOrders]      = useState<ServiceOrder[]>([])
  const [filter,      setFilter]      = useState<ServiceOrderStatus | 'todas'>('todas')
  const [loading,     setLoading]     = useState(true)
  const [ready,       setReady]       = useState(!navigator.onLine)
  const [modal,       setModal]       = useState(false)
  const [converting,  setConverting]  = useState<string | null>(null)

  useEffect(() => {
    if (!navigator.onLine) { setReady(true); return }
    pullFromServer().catch(() => {}).finally(() => setReady(true))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setOrders(await getOrders(filter === 'todas' ? undefined : filter))
    setLoading(false)
  }, [filter])

  useEffect(() => { if (ready) load() }, [load, ready])

  async function advance(order: ServiceOrder) {
    const idx = STATUS_FLOW.indexOf(order.status)
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return
    await updateOrderStatus(order.id, STATUS_FLOW[idx + 1])
    load()
  }

  async function handleGenerateSale(order: ServiceOrder) {
    if (order.sale_id) return
    setConverting(order.id)
    try {
      await convertOrderToSale(order.id)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao gerar venda.')
    } finally {
      setConverting(null)
    }
  }

  async function handlePdf(order: ServiceOrder) {
    const company = useAuthStore.getState().company
    if (!company) return
    const full = await getOrderById(order.id)
    if (!full) return
    await downloadAllPdfs(full, company, full.prescription)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orçamentos</h1>
          <p className="text-sm text-slate-500">
            {orders.length} ordem{orders.length !== 1 ? 's' : ''} · óculos de grau, lentes, reparos
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModal(true)}>Novo Orçamento</Button>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              filter === f.value
                ? 'bg-primary-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ClipboardList size={40} className="text-slate-300" />
          <p className="text-slate-500">
            {filter === 'todas' ? 'Nenhum orçamento cadastrado.' : 'Nenhum orçamento neste status.'}
          </p>
          {filter === 'todas' && (
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal(true)}>
              Criar orçamento
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {['OS', 'Paciente', 'Tipo', 'Entrega Prev.', 'Total', 'Status', 'PDF', 'Venda', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-semibold text-primary-700">#{o.order_number}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white', colorOf(o.patient?.full_name ?? ''))}>
                              {getInitials(o.patient?.full_name ?? '?')}
                            </div>
                            <span className="font-medium text-slate-800">{o.patient?.full_name ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{SERVICE_TYPE_LABELS[o.service_type]}</td>
                        <td className="px-4 py-3 text-slate-600">{o.estimated_delivery ? formatDate(o.estimated_delivery) : '—'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(o.total_amount)}</td>
                        <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handlePdf(o)}
                            title="Gerar 3 PDFs"
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                          >
                            <FileText size={12} /> PDF
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {o.sale_id ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                              <CheckCircle2 size={12} /> Venda gerada
                            </span>
                          ) : (o.status === 'pronto' || o.status === 'entregue') ? (
                            <button
                              onClick={() => handleGenerateSale(o)}
                              disabled={converting === o.id}
                              className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            >
                              <ShoppingCart size={12} />
                              {converting === o.id ? '…' : 'Gerar Venda'}
                            </button>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {NEXT_LABEL[o.status] && (
                            <button
                              onClick={() => advance(o)}
                              className="flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
                            >
                              {NEXT_LABEL[o.status]} <ChevronRight size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {orders.map(o => (
              <Card key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-primary-700">#{o.order_number}</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{o.patient?.full_name ?? '—'}</p>
                    <p className="text-xs text-slate-500">{SERVICE_TYPE_LABELS[o.service_type]}</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{formatCurrency(o.total_amount)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <OrderStatusBadge status={o.status} />
                    {o.estimated_delivery && (
                      <p className="text-[11px] text-slate-400">{formatDate(o.estimated_delivery)}</p>
                    )}
                    <button
                      onClick={() => handlePdf(o)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <FileText size={11} /> PDF
                    </button>
                    {o.sale_id ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <CheckCircle2 size={11} /> Venda gerada
                      </span>
                    ) : (o.status === 'pronto' || o.status === 'entregue') ? (
                      <button
                        onClick={() => handleGenerateSale(o)}
                        disabled={converting === o.id}
                        className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <ShoppingCart size={11} />
                        {converting === o.id ? '…' : 'Gerar Venda'}
                      </button>
                    ) : null}
                    {NEXT_LABEL[o.status] && (
                      <button
                        onClick={() => advance(o)}
                        className="flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                      >
                        {NEXT_LABEL[o.status]} <ChevronRight size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <OrderModal open={modal} onClose={() => setModal(false)} onSaved={load} />
    </div>
  )
}
