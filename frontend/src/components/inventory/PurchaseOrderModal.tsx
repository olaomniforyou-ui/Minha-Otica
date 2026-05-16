import { useState, useEffect } from 'react'
import { Plus, Trash2, PackageCheck, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { createPurchaseOrder, receivePurchaseOrder } from '@/services/purchases.service'
import { formatCurrency, generateId } from '@/lib/utils'
import type { PurchaseOrder, PurchaseItem, Supplier, Product, PurchaseItemFormData } from '@/types'

interface Props {
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
  receiving?: PurchaseOrder | null
}

interface DraftItem extends PurchaseItemFormData {
  _key: string
}

const emptyItem = (): DraftItem => ({
  _key:               generateId(),
  product_id:         undefined,
  description:        '',
  quantity:           1,
  quantity_received:  undefined,
  unit_cost:          0,
  total_cost:         0,
})

export function PurchaseOrderModal({ open, onClose, onSuccess, receiving }: Props) {
  const company = useAuthStore(s => s.company)

  const [supplierId,       setSupplierId]       = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes,            setNotes]            = useState('')
  const [items,            setItems]            = useState<DraftItem[]>([emptyItem()])
  const [saving,           setSaving]           = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products,  setProducts]  = useState<Product[]>([])

  // Receive mode state
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!open || !company) return
    Promise.all([
      supabase.from('suppliers').select('id,name').eq('company_id', company.id).eq('is_active', true).order('name'),
      supabase.from('products').select('id,name,sku,cost_price').eq('company_id', company.id).eq('is_active', true).order('name'),
    ]).then(([sup, prod]) => {
      setSuppliers((sup.data ?? []) as Supplier[])
      setProducts((prod.data ?? []) as Product[])
    })

    if (receiving) {
      const initial: Record<string, number> = {}
      receiving.items?.forEach(i => { initial[i.id] = i.quantity_received ?? 0 })
      setReceiveQtys(initial)
    } else {
      setSupplierId(''); setExpectedDelivery(''); setNotes('')
      setItems([emptyItem()]); setError(null)
    }
  }, [open, company, receiving])

  function setItemField(key: string, field: keyof DraftItem, value: unknown) {
    setItems(prev => prev.map(it => {
      if (it._key !== key) return it
      const updated = { ...it, [field]: value }
      if (field === 'quantity' || field === 'unit_cost') {
        updated.total_cost = (Number(updated.quantity) || 0) * (Number(updated.unit_cost) || 0)
      }
      return updated
    }))
  }

  function pickProduct(key: string, productId: string) {
    const prod = products.find(p => p.id === productId)
    setItems(prev => prev.map(it => {
      if (it._key !== key) return it
      const qty = it.quantity || 1
      const cost = prod?.cost_price ?? 0
      return {
        ...it,
        product_id:  productId,
        description: prod?.name ?? it.description,
        unit_cost:   cost,
        total_cost:  qty * cost,
      }
    }))
  }

  function removeItem(key: string) {
    setItems(prev => prev.length === 1 ? prev : prev.filter(i => i._key !== key))
  }

  const total = items.reduce((s, i) => s + (i.total_cost || 0), 0)

  async function handleSave() {
    if (items.every(i => !i.description)) {
      setError('Adicione ao menos um item.'); return
    }
    setSaving(true); setError(null)
    try {
      await createPurchaseOrder({
        supplier_id:       supplierId || undefined,
        notes:             notes || undefined,
        expected_delivery: expectedDelivery || undefined,
        items: items.map(({ _key, ...rest }) => rest),
      })
      onSuccess(); onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleReceive() {
    if (!receiving) return
    setSaving(true); setError(null)
    try {
      const payload = (receiving.items ?? []).map((i: PurchaseItem) => ({
        id:                i.id,
        quantity_received: receiveQtys[i.id] ?? 0,
        unit_cost:         i.unit_cost,
      }))
      await receivePurchaseOrder(receiving.id, payload)
      onSuccess(); onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (receiving) {
    return (
      <Modal open={open} onClose={onClose} title={`Dar Entrada — ${receiving.order_number}`} size="lg">
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-500">Informe as quantidades efetivamente recebidas.</p>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {(receiving.items ?? []).map((item: PurchaseItem) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{item.description}</p>
                  <p className="text-xs text-slate-400">Pedido: {item.quantity} un · {formatCurrency(item.unit_cost)}/un</p>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={receiveQtys[item.id] ?? 0}
                    onChange={e => setReceiveQtys(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-center focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button loading={saving} icon={<PackageCheck size={14} />} onClick={handleReceive}>
              Confirmar Recebimento
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Pedido de Compra" size="xl">
      <div className="space-y-5 py-2">

        {/* Cabeçalho do pedido */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Fornecedor</label>
            <select
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none bg-white"
            >
              <option value="">Selecionar fornecedor…</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Entrega Prevista</label>
            <Input
              type="date"
              value={expectedDelivery}
              onChange={e => setExpectedDelivery(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Observações</label>
            <Input
              placeholder="Nota opcional…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Itens */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Itens do Pedido</label>
            <button
              type="button"
              onClick={() => setItems(prev => [...prev, emptyItem()])}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Plus size={13} /> Adicionar item
            </button>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {items.map(item => (
              <div key={item._key} className="grid grid-cols-12 gap-2 items-start">
                {/* Produto (opcional) */}
                <div className="col-span-3">
                  <select
                    value={item.product_id ?? ''}
                    onChange={e => pickProduct(item._key, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none bg-white"
                  >
                    <option value="">Produto (opcional)</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* Descrição */}
                <div className="col-span-4">
                  <input
                    type="text"
                    placeholder="Descrição *"
                    value={item.description}
                    onChange={e => setItemField(item._key, 'description', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none"
                  />
                </div>

                {/* Qtd */}
                <div className="col-span-2">
                  <input
                    type="number"
                    min={1}
                    placeholder="Qtd"
                    value={item.quantity}
                    onChange={e => setItemField(item._key, 'quantity', Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs text-right focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none"
                  />
                </div>

                {/* Custo unit */}
                <div className="col-span-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Custo"
                    value={item.unit_cost}
                    onChange={e => setItemField(item._key, 'unit_cost', Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs text-right focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none"
                  />
                </div>

                {/* Remover */}
                <div className="col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(item._key)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-end border-t border-slate-100 pt-3">
          <div className="text-right">
            <p className="text-xs text-slate-400 font-medium">Total do Pedido</p>
            <p className="text-xl font-black text-slate-900">{formatCurrency(total)}</p>
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>Criar Pedido</Button>
        </div>
      </div>
    </Modal>
  )
}
