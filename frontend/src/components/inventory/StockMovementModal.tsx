import { useState, useEffect, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { moveStock } from '@/services/stock.service'
import { getProducts } from '@/services/products.service'
import type { Product, StockMovementType } from '@/types'
import { STOCK_MOVEMENT_LABELS } from '@/types'
import { cn } from '@/lib/utils'

interface StockMovementModalProps {
  open:       boolean
  onClose:    () => void
  productId?: string   // pré-seleciona produto
  onSaved:    () => void
}

const TYPES: StockMovementType[] = ['entrada', 'saida', 'ajuste', 'devolucao']

const TYPE_COLORS: Record<StockMovementType, string> = {
  entrada:   'bg-emerald-100 text-emerald-700 border-emerald-300',
  saida:     'bg-red-100 text-red-700 border-red-300',
  ajuste:    'bg-blue-100 text-blue-700 border-blue-300',
  devolucao: 'bg-amber-100 text-amber-700 border-amber-300',
}

export function StockMovementModal({ open, onClose, productId, onSaved }: StockMovementModalProps) {
  const [products,   setProducts]   = useState<Product[]>([])
  const [selProduct, setSelProduct] = useState(productId ?? '')
  const [type,       setType]       = useState<StockMovementType>('entrada')
  const [quantity,   setQuantity]   = useState('1')
  const [unitCost,   setUnitCost]   = useState('')
  const [reason,     setReason]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const currentProduct = products.find(p => p.id === selProduct)

  useEffect(() => {
    if (!open) return
    getProducts().then(setProducts)
    setSelProduct(productId ?? '')
    setType('entrada')
    setQuantity('1')
    setUnitCost('')
    setReason('')
    setError(null)
  }, [open, productId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selProduct) { setError('Selecione um produto.'); return }
    setLoading(true)
    setError(null)
    try {
      await moveStock({
        product_id: selProduct,
        type,
        quantity:   parseInt(quantity, 10),
        unit_cost:  unitCost ? parseFloat(unitCost) : undefined,
        reason:     reason || undefined,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao movimentar estoque.')
    } finally {
      setLoading(false)
    }
  }

  const qtyLabel =
    type === 'ajuste'
      ? 'Quantidade Final (novo total)'
      : `Quantidade a ${type === 'entrada' || type === 'devolucao' ? 'adicionar' : 'retirar'}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Movimentação de Estoque"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button form="stock-form" type="submit" loading={loading}>
            Confirmar movimentação
          </Button>
        </div>
      }
    >
      <form id="stock-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Tipo */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Tipo de Movimentação</p>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(t => (
              <button
                key={t} type="button"
                onClick={() => setType(t)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-semibold transition-all',
                  type === t ? TYPE_COLORS[t] : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                )}
              >
                {STOCK_MOVEMENT_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Produto */}
        <Select
          label="Produto" required
          value={selProduct}
          onChange={e => setSelProduct(e.target.value)}
          placeholder="Selecione o produto..."
          options={products.map(p => ({
            value: p.id,
            label: `${p.name}${p.brand ? ` — ${p.brand}` : ''} (${p.stock_quantity} un.)`,
          }))}
        />

        {/* Estoque atual */}
        {currentProduct && (
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-500">Estoque atual: </span>
            <span className="font-bold text-slate-800">{currentProduct.stock_quantity} unidades</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={qtyLabel} required type="number" min="1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
          />
          {(type === 'entrada' || type === 'devolucao') && (
            <Input
              label="Custo Unitário (R$)" type="number" min="0" step="0.01"
              value={unitCost}
              onChange={e => setUnitCost(e.target.value)}
              placeholder="0,00"
            />
          )}
        </div>

        <Textarea
          label="Motivo / Observação" rows={2}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Ex: Compra NF 1234, ajuste de inventário..."
        />
      </form>
    </Modal>
  )
}
