import { useState, useMemo } from 'react'
import {
  GitCompareArrows, Plus, Trash2, Trophy,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

interface Supplier {
  id: string
  name: string
}

interface QuoteItem {
  id: string
  description: string
  prices: Record<string, string> // supplier_id → price string
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

function parsePrice(s: string): number | null {
  const n = parseFloat(s.replace(/[^\d,.-]/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

export default function CotacoesTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: genId(), name: 'Fornecedor A' },
    { id: genId(), name: 'Fornecedor B' },
  ])
  const [items, setItems] = useState<QuoteItem[]>([
    { id: genId(), description: '', prices: {} },
  ])
  const [newSupplier, setNewSupplier] = useState('')
  const [sortCol, setSortCol]         = useState<string | null>(null)
  const [sortAsc, setSortAsc]         = useState(true)

  function addSupplier() {
    const name = newSupplier.trim()
    if (!name) return
    setSuppliers(prev => [...prev, { id: genId(), name }])
    setNewSupplier('')
  }

  function removeSupplier(id: string) {
    setSuppliers(prev => prev.filter(s => s.id !== id))
    setItems(prev => prev.map(it => {
      const prices = { ...it.prices }
      delete prices[id]
      return { ...it, prices }
    }))
  }

  function addItem() {
    setItems(prev => [...prev, { id: genId(), description: '', prices: {} }])
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  function setDescription(id: string, val: string) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, description: val } : it))
  }

  function setPrice(itemId: string, supplierId: string, val: string) {
    setItems(prev => prev.map(it =>
      it.id === itemId ? { ...it, prices: { ...it.prices, [supplierId]: val } } : it
    ))
  }

  function handleSort(col: string) {
    if (sortCol === col) setSortAsc(p => !p)
    else { setSortCol(col); setSortAsc(true) }
  }

  // Totais por fornecedor (soma de preços preenchidos)
  const totals = useMemo(() => {
    const map: Record<string, number> = {}
    for (const sup of suppliers) {
      map[sup.id] = items.reduce((acc, it) => {
        const p = parsePrice(it.prices[sup.id] ?? '')
        return acc + (p ?? 0)
      }, 0)
    }
    return map
  }, [suppliers, items])

  // Melhor fornecedor por item (menor preço dentre os preenchidos)
  function bestSupplier(item: QuoteItem): string | null {
    let best: string | null = null
    let bestVal = Infinity
    for (const sup of suppliers) {
      const p = parsePrice(item.prices[sup.id] ?? '')
      if (p !== null && p < bestVal) { bestVal = p; best = sup.id }
    }
    return best
  }

  // Melhor fornecedor geral (menor total)
  const bestTotal = useMemo(() => {
    const filled = suppliers.filter(s => totals[s.id] > 0)
    if (filled.length === 0) return null
    return filled.reduce((a, b) => totals[a.id] <= totals[b.id] ? a : b).id
  }, [suppliers, totals])

  // Ordenação de itens
  const sortedItems = useMemo(() => {
    if (!sortCol) return items
    return [...items].sort((a, b) => {
      if (sortCol === 'description') {
        return sortAsc
          ? a.description.localeCompare(b.description)
          : b.description.localeCompare(a.description)
      }
      const pa = parsePrice(a.prices[sortCol] ?? '') ?? Infinity
      const pb = parsePrice(b.prices[sortCol] ?? '') ?? Infinity
      return sortAsc ? pa - pb : pb - pa
    })
  }, [items, sortCol, sortAsc])

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return null
    return sortAsc
      ? <ChevronUp size={12} className="inline ml-0.5" />
      : <ChevronDown size={12} className="inline ml-0.5" />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white">
            <GitCompareArrows size={18} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Cotação de Fornecedores</p>
            <p className="text-xs text-slate-500">Compare preços de múltiplos fornecedores por item</p>
          </div>
        </div>
        <Button size="sm" onClick={addItem}>
          <Plus size={14} className="mr-1" />
          Adicionar Item
        </Button>
      </div>

      {/* Gerenciar fornecedores */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Fornecedores</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {suppliers.map(s => (
            <span key={s.id} className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 text-violet-800 text-xs font-medium rounded-full px-3 py-1">
              {bestTotal === s.id && <Trophy size={11} className="text-amber-500" />}
              {s.name}
              {suppliers.length > 1 && (
                <button onClick={() => removeSupplier(s.id)} className="text-violet-400 hover:text-red-500 transition-colors ml-0.5">
                  <Trash2 size={11} />
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex gap-2 max-w-sm">
          <Input
            placeholder="Nome do fornecedor..."
            value={newSupplier}
            onChange={e => setNewSupplier(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSupplier()}
            className="text-sm"
          />
          <Button variant="secondary" size="sm" onClick={addSupplier}>
            <Plus size={14} />
          </Button>
        </div>
      </div>

      {/* Tabela de cotação */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th
                  className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort('description')}
                >
                  Item <SortIcon col="description" />
                </th>
                {suppliers.map(s => (
                  <th
                    key={s.id}
                    className="text-right px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => handleSort(s.id)}
                  >
                    <span className="flex items-center justify-end gap-1">
                      {bestTotal === s.id && <Trophy size={12} className="text-amber-500" />}
                      {s.name} <SortIcon col={s.id} />
                    </span>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedItems.map(item => {
                const best = bestSupplier(item)
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => setDescription(item.id, e.target.value)}
                        placeholder="Descrição do item..."
                        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 outline-none"
                      />
                    </td>
                    {suppliers.map(s => {
                      const isBest = best === s.id
                      const p = parsePrice(item.prices[s.id] ?? '')
                      return (
                        <td key={s.id} className="px-4 py-2 text-right">
                          <div className="relative inline-block">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">R$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.prices[s.id] ?? ''}
                              onChange={e => setPrice(item.id, s.id, e.target.value)}
                              placeholder="0,00"
                              className={cn(
                                'w-28 rounded-md border pl-8 pr-2 py-1.5 text-sm text-right focus:ring-2 outline-none transition-colors',
                                isBest && p !== null
                                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold focus:ring-emerald-400/20'
                                  : 'border-slate-200 focus:border-violet-400 focus:ring-violet-400/20'
                              )}
                            />
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Totais */}
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td className="px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wide">Total</td>
                {suppliers.map(s => (
                  <td key={s.id} className={cn(
                    'px-4 py-3 text-right font-bold text-sm',
                    bestTotal === s.id ? 'text-emerald-700' : 'text-slate-700'
                  )}>
                    <span className="flex items-center justify-end gap-1">
                      {bestTotal === s.id && <Trophy size={13} className="text-amber-500" />}
                      {totals[s.id] > 0 ? fmt(totals[s.id]) : '—'}
                    </span>
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Legenda */}
      <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
          Menor preço por item
        </span>
        <span className="flex items-center gap-1.5">
          <Trophy size={12} className="text-amber-500" />
          Melhor fornecedor geral (menor total)
        </span>
      </div>

      <p className="text-xs text-slate-400">
        As cotações são temporárias e não são salvas ao sair da página.
      </p>
    </div>
  )
}
