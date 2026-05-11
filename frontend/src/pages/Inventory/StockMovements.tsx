import { useState, useEffect, useCallback } from 'react'
import { Plus, ArrowLeftRight, TrendingUp, TrendingDown, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { StockMovementModal } from '@/components/inventory/StockMovementModal'
import { getStockMovements } from '@/services/stock.service'
import { formatDateTime, formatCurrency, cn } from '@/lib/utils'
import type { StockMovement, StockMovementType } from '@/types'
import { STOCK_MOVEMENT_LABELS } from '@/types'

const ICONS: Record<StockMovementType, React.ElementType> = {
  entrada:   TrendingUp,
  saida:     TrendingDown,
  ajuste:    RefreshCw,
  devolucao: RotateCcw,
}

const TYPE_COLORS: Record<StockMovementType, string> = {
  entrada:   'text-emerald-600 bg-emerald-50',
  saida:     'text-red-600 bg-red-50',
  ajuste:    'text-blue-600 bg-blue-50',
  devolucao: 'text-amber-600 bg-amber-50',
}

export default function MovementsTab() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getStockMovements()
    setMovements(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{movements.length} movimentação{movements.length !== 1 ? 'ões' : ''}</p>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal(true)}>
          Nova Movimentação
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : movements.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ArrowLeftRight size={36} className="text-slate-300" />
          <p className="text-slate-500">Nenhuma movimentação registrada.</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="mt-4 hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {['Tipo', 'Produto', 'Qtd', 'Antes', 'Depois', 'Custo Unit.', 'Motivo', 'Data'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements.map(m => {
                      const Icon = ICONS[m.type]
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', TYPE_COLORS[m.type])}>
                              <Icon size={12} />
                              {STOCK_MOVEMENT_LABELS[m.type]}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {m.product?.name ?? m.product_id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">{m.quantity}</td>
                          <td className="px-4 py-3 text-slate-500">{m.previous_qty}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{m.new_qty}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {m.unit_cost ? formatCurrency(m.unit_cost) : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{m.reason ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {formatDateTime(m.created_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile: cards */}
          <div className="mt-3 space-y-3 md:hidden">
            {movements.map(m => {
              const Icon = ICONS[m.type]
              return (
                <Card key={m.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg', TYPE_COLORS[m.type])}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {m.product?.name ?? 'Produto'}
                        </p>
                        <p className="text-xs text-slate-500">{STOCK_MOVEMENT_LABELS[m.type]}</p>
                        {m.reason && <p className="text-xs text-slate-400 mt-0.5">{m.reason}</p>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-slate-900">
                        {m.type === 'saida' ? '-' : '+'}{m.quantity}
                      </p>
                      <p className="text-xs text-slate-400">{m.previous_qty} → {m.new_qty}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(m.created_at)}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <StockMovementModal open={modal} onClose={() => setModal(false)} onSaved={load} />
    </>
  )
}
