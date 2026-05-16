import { useState, useEffect, useCallback } from 'react'
import { Plus, ShoppingCart, PackageCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { PurchaseOrderModal } from '@/components/inventory/PurchaseOrderModal'
import { getPurchaseOrders, updatePurchaseOrderStatus } from '@/services/purchases.service'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types'
import { PURCHASE_STATUS_LABELS } from '@/types'

const STATUS_COLOR: Record<PurchaseOrderStatus, string> = {
  rascunho:  'bg-slate-100 text-slate-600',
  enviado:   'bg-blue-100 text-blue-700',
  parcial:   'bg-amber-100 text-amber-700',
  recebido:  'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-red-100 text-red-600',
}

export default function PurchasesTab() {
  const [orders,   setOrders]   = useState<PurchaseOrder[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setOrders(await getPurchaseOrders())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSend(id: string) {
    await updatePurchaseOrderStatus(id, 'enviado')
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'enviado' } : o))
  }

  async function handleCancel(id: string) {
    await updatePurchaseOrderStatus(id, 'cancelado')
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelado' } : o))
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {loading ? 'Carregando...' : `${orders.length} pedido${orders.length !== 1 ? 's' : ''}`}
          </p>
          <Button icon={<Plus size={15} />} onClick={() => setModal(true)}>
            Novo Pedido
          </Button>
        </div>

        {loading ? <PageLoader /> : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ShoppingCart size={36} className="text-slate-300" />
            <p className="text-slate-500">Nenhum pedido de compra ainda.</p>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal(true)}>
              Criar Primeiro Pedido
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <Card key={order.id} className="overflow-hidden">
                {/* Linha principal */}
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">{order.order_number}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_COLOR[order.status])}>
                        {PURCHASE_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      {order.supplier && <span>{order.supplier.name}</span>}
                      <span>{formatDate(order.created_at)}</span>
                      {order.expected_delivery && <span>Entrega: {formatDate(order.expected_delivery)}</span>}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-900">{formatCurrency(order.total_amount)}</p>
                    <p className="text-[10px] text-slate-400">{order.items?.length ?? 0} itens</p>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {order.status === 'rascunho' && (
                      <button
                        onClick={() => handleSend(order.id)}
                        className="rounded-lg border border-blue-200 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        Enviar
                      </button>
                    )}
                    {(order.status === 'enviado' || order.status === 'parcial') && (
                      <button
                        onClick={() => setReceiving(order)}
                        className="flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <PackageCheck size={11} /> Receber
                      </button>
                    )}
                    {order.status === 'rascunho' && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        className="rounded-lg border border-red-200 px-2 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(prev => prev === order.id ? null : order.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      {expanded === order.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Itens expandidos */}
                {expanded === order.id && order.items && order.items.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                    <div className="space-y-1.5">
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700">{item.description}</span>
                          <div className="flex items-center gap-4 text-slate-500">
                            <span>{item.quantity} un × {formatCurrency(item.unit_cost)}</span>
                            {item.quantity_received !== undefined && (
                              <span className={cn(
                                'font-medium',
                                item.quantity_received >= item.quantity ? 'text-emerald-600' : 'text-amber-600',
                              )}>
                                Recebido: {item.quantity_received}/{item.quantity}
                              </span>
                            )}
                            <span className="font-semibold text-slate-700">{formatCurrency(item.total_cost)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {order.notes && (
                      <p className="mt-2 text-[11px] text-slate-400 italic">{order.notes}</p>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <PurchaseOrderModal
        open={modal}
        onClose={() => setModal(false)}
        onSuccess={load}
      />

      {receiving && (
        <PurchaseOrderModal
          open={!!receiving}
          onClose={() => setReceiving(null)}
          onSuccess={() => { setReceiving(null); load() }}
          receiving={receiving}
        />
      )}
    </>
  )
}
