import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Package, AlertTriangle, Pencil, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { ProductModal } from '@/components/inventory/ProductModal'
import { StockMovementModal } from '@/components/inventory/StockMovementModal'
import { getProducts } from '@/services/products.service'
import { formatCurrency, isLowStock } from '@/lib/utils'
import type { Product } from '@/types'

export default function ProductsTab() {
  const [products,      setProducts]      = useState<Product[]>([])
  const [search,        setSearch]        = useState('')
  const [loading,       setLoading]       = useState(true)
  const [productModal,  setProductModal]  = useState(false)
  const [movModal,      setMovModal]      = useState(false)
  const [selected,      setSelected]      = useState<Product | null>(null)
  const [movProductId,  setMovProductId]  = useState<string | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getProducts(search || undefined)
    setProducts(data)
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  function openEdit(p: Product) { setSelected(p); setProductModal(true) }
  function openNew()            { setSelected(null); setProductModal(true) }
  function openMov(id?: string) { setMovProductId(id); setMovModal(true) }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {products.length} produto{products.length !== 1 ? 's' : ''}
          {products.filter(p => isLowStock(p.stock_quantity, p.min_stock_quantity)).length > 0 && (
            <span className="ml-2 text-amber-600 font-medium">
              · {products.filter(p => isLowStock(p.stock_quantity, p.min_stock_quantity)).length} com estoque baixo
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<ArrowLeftRight size={14} />} onClick={() => openMov()}>
            Movimentação
          </Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={openNew}>
            Novo Produto
          </Button>
        </div>
      </div>

      <Input
        className="mt-3"
        placeholder="Buscar por nome, marca ou SKU…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        icon={<Search size={16} />}
      />

      {loading ? (
        <PageLoader />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Package size={40} className="text-slate-300" />
          <p className="text-slate-500">
            {search ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda.'}
          </p>
          <Button size="sm" icon={<Plus size={14} />} onClick={openNew}>Cadastrar produto</Button>
        </div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="mt-4 hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {['Produto', 'Categoria', 'SKU', 'Estoque', 'Custo', 'Venda', 'Status', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map(p => {
                      const low = isLowStock(p.stock_quantity, p.min_stock_quantity)
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 overflow-hidden">
                                {p.image_url
                                  ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                                  : <Package size={14} />}
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{p.name}</p>
                                {p.brand && <p className="text-xs text-slate-500">{p.brand}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{p.category?.name ?? '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {low && <AlertTriangle size={13} className="text-amber-500" />}
                              <span className={low ? 'font-semibold text-amber-700' : 'text-slate-700'}>
                                {p.stock_quantity} un.
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{p.cost_price ? formatCurrency(p.cost_price) : '—'}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(p.sale_price)}</td>
                          <td className="px-4 py-3">
                            {low
                              ? <Badge variant="warning">Estoque Baixo</Badge>
                              : <Badge variant="success">Normal</Badge>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openMov(p.id)}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Movimentar estoque">
                                <ArrowLeftRight size={14} />
                              </button>
                              <button onClick={() => openEdit(p)}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Editar">
                                <Pencil size={14} />
                              </button>
                            </div>
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
            {products.map(p => {
              const low = isLowStock(p.stock_quantity, p.min_stock_quantity)
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                      {p.brand && <p className="text-xs text-slate-500">{p.brand}</p>}
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-800">{formatCurrency(p.sale_price)}</span>
                        <span className={`text-xs font-medium flex items-center gap-1 ${low ? 'text-amber-600' : 'text-slate-500'}`}>
                          {low && <AlertTriangle size={11} />}
                          {p.stock_quantity} un.
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {low ? <Badge variant="warning">Baixo</Badge> : <Badge variant="success">Normal</Badge>}
                      <div className="flex gap-1">
                        <button onClick={() => openMov(p.id)} className="rounded p-1 text-slate-400 hover:text-slate-700">
                          <ArrowLeftRight size={14} />
                        </button>
                        <button onClick={() => openEdit(p)} className="rounded p-1 text-slate-400 hover:text-slate-700">
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <ProductModal
        open={productModal}
        onClose={() => setProductModal(false)}
        product={selected}
        onSaved={load}
      />
      <StockMovementModal
        open={movModal}
        onClose={() => setMovModal(false)}
        productId={movProductId}
        onSaved={load}
      />
    </>
  )
}
