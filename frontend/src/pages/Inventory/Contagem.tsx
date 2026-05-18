import { useState, useEffect, useMemo } from 'react'
import {
  ClipboardCheck, Search, RefreshCw, Save,
  CheckCircle2, AlertCircle, Minus, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getProducts } from '@/services/products.service'
import { moveStock } from '@/services/stock.service'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

interface CountRow {
  product:  Product
  contado:  string
  status:   'idle' | 'saving' | 'saved' | 'error'
}

function diff(row: CountRow): number | null {
  if (row.contado === '') return null
  return Number(row.contado) - row.product.stock_quantity
}

export default function ContagemTab() {
  const [rows,    setRows]    = useState<CountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [search,  setSearch]  = useState('')
  const [result,  setResult]  = useState<{ ok: number; err: number } | null>(null)
  const [onlyDiff, setOnlyDiff] = useState(false)

  async function load() {
    setLoading(true)
    setResult(null)
    const products = await getProducts()
    setRows(
      products
        .filter(p => p.is_active)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(p => ({ product: p, contado: '', status: 'idle' }))
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function setContado(id: string, val: string) {
    setRows(prev => prev.map(r =>
      r.product.id === id ? { ...r, contado: val, status: 'idle' } : r
    ))
    setResult(null)
  }

  function adjust(id: string, delta: number) {
    setRows(prev => prev.map(r => {
      if (r.product.id !== id) return r
      const base = r.contado === '' ? r.product.stock_quantity : Number(r.contado)
      return { ...r, contado: String(Math.max(0, base + delta)), status: 'idle' }
    }))
    setResult(null)
  }

  async function saveAdjustments() {
    const changed = rows.filter(r => {
      const d = diff(r)
      return d !== null && d !== 0
    })
    if (changed.length === 0) return

    setSaving(true)
    setResult(null)
    let ok = 0, err = 0

    for (const row of changed) {
      setRows(prev => prev.map(r => r.product.id === row.product.id ? { ...r, status: 'saving' } : r))
      try {
        await moveStock({
          product_id: row.product.id,
          type:       'ajuste',
          quantity:   Number(row.contado),
          reason:     'Inventário cíclico',
        })
        setRows(prev => prev.map(r =>
          r.product.id === row.product.id
            ? { ...r, status: 'saved', product: { ...r.product, stock_quantity: Number(r.contado) }, contado: '' }
            : r
        ))
        ok++
      } catch {
        setRows(prev => prev.map(r => r.product.id === row.product.id ? { ...r, status: 'error' } : r))
        err++
      }
    }

    setSaving(false)
    setResult({ ok, err })
  }

  const filtered = useMemo(() => {
    let list = rows
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.product.name.toLowerCase().includes(q) ||
        (r.product.sku ?? '').toLowerCase().includes(q)
      )
    }
    if (onlyDiff) {
      list = list.filter(r => {
        const d = diff(r)
        return d !== null && d !== 0
      })
    }
    return list
  }, [rows, search, onlyDiff])

  const changedCount   = rows.filter(r => { const d = diff(r); return d !== null && d !== 0 }).length
  const countedCount   = rows.filter(r => r.contado !== '').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <ClipboardCheck size={18} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Inventário Cíclico</p>
            <p className="text-xs text-slate-500">
              {countedCount} de {rows.length} contado{countedCount !== 1 ? 's' : ''}
              {changedCount > 0 && <span className="ml-2 text-amber-600 font-semibold">· {changedCount} com diferença</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw size={14} />
          </Button>
          <Button
            size="sm"
            loading={saving}
            disabled={changedCount === 0}
            onClick={saveAdjustments}
          >
            <Save size={14} className="mr-1" />
            Registrar {changedCount > 0 ? `${changedCount} ajuste${changedCount !== 1 ? 's' : ''}` : 'Ajustes'}
          </Button>
        </div>
      </div>

      {/* Resultado */}
      {result && (
        <div className={cn(
          'flex items-center gap-2 rounded-lg px-4 py-3 text-sm',
          result.err === 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-amber-50 border border-amber-200 text-amber-700'
        )}>
          {result.err === 0
            ? <><CheckCircle2 size={16} /> {result.ok} ajuste{result.ok !== 1 ? 's' : ''} registrado{result.ok !== 1 ? 's' : ''} com sucesso.</>
            : <><AlertCircle size={16} /> {result.ok} registrado{result.ok !== 1 ? 's' : ''}, {result.err} com erro.</>
          }
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-8 text-sm"
            placeholder="Buscar produto ou SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyDiff}
            onChange={e => setOnlyDiff(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          Só com diferença
        </label>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Sistema = Contado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Diferença</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Falta (negativo)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-200 inline-block" /> Não contado</span>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-10">Carregando produtos...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-10">Nenhum produto encontrado.</p>
      ) : (
        <>
          {/* Tabela desktop */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Produto</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">SKU</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Estoque Sistema</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Qtd Contada</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Diferença</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(row => {
                  const d = diff(row)
                  return (
                    <tr key={row.product.id} className={cn(
                      'transition-colors',
                      row.status === 'saved' ? 'bg-emerald-50' :
                      row.status === 'error' ? 'bg-red-50' :
                      d !== null && d !== 0 ? 'bg-amber-50' : 'hover:bg-slate-50'
                    )}>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{row.product.name}</td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{row.product.sku ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700">{row.product.stock_quantity}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => adjust(row.product.id, -1)}
                            className="rounded-md border border-slate-200 p-0.5 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
                          ><Minus size={12} /></button>
                          <input
                            type="number"
                            min={0}
                            value={row.contado}
                            onChange={e => setContado(row.product.id, e.target.value)}
                            placeholder={String(row.product.stock_quantity)}
                            className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm text-center focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none"
                          />
                          <button
                            onClick={() => adjust(row.product.id, 1)}
                            className="rounded-md border border-slate-200 p-0.5 text-slate-400 hover:text-emerald-500 hover:border-emerald-200 transition-colors"
                          ><Plus size={12} /></button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold">
                        {d === null ? (
                          <span className="text-slate-300">—</span>
                        ) : d === 0 ? (
                          <span className="text-emerald-600">✓</span>
                        ) : (
                          <span className={d > 0 ? 'text-amber-600' : 'text-red-600'}>
                            {d > 0 ? `+${d}` : d}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {row.status === 'saving' && <span className="text-slate-400 text-xs">Salvando...</span>}
                        {row.status === 'saved'  && <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />}
                        {row.status === 'error'  && <AlertCircle size={16} className="text-red-500 mx-auto" />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="md:hidden space-y-3">
            {filtered.map(row => {
              const d = diff(row)
              return (
                <div key={row.product.id} className={cn(
                  'rounded-xl border p-4 bg-white space-y-3',
                  d !== null && d !== 0 ? 'border-amber-300' :
                  row.status === 'saved' ? 'border-emerald-300' : 'border-slate-200'
                )}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{row.product.name}</p>
                      {row.product.sku && <p className="text-xs text-slate-400 font-mono">{row.product.sku}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Sistema</p>
                      <p className="font-bold text-slate-900">{row.product.stock_quantity}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => adjust(row.product.id, -1)}
                      className="rounded-md border border-slate-200 p-1 text-slate-400 hover:text-red-500 transition-colors">
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={row.contado}
                      onChange={e => setContado(row.product.id, e.target.value)}
                      placeholder={String(row.product.stock_quantity)}
                      className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-center focus:border-indigo-400 outline-none"
                    />
                    <button onClick={() => adjust(row.product.id, 1)}
                      className="rounded-md border border-slate-200 p-1 text-slate-400 hover:text-emerald-500 transition-colors">
                      <Plus size={14} />
                    </button>
                    {d !== null && (
                      <span className={cn(
                        'text-sm font-bold w-10 text-center',
                        d === 0 ? 'text-emerald-600' : d > 0 ? 'text-amber-600' : 'text-red-600'
                      )}>
                        {d === 0 ? '✓' : d > 0 ? `+${d}` : d}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
