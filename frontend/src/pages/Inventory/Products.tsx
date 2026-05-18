import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Package, AlertTriangle, Pencil, ArrowLeftRight, Download, Upload, X, CheckCircle2, Share2, Printer } from 'lucide-react'
import { exportProductsCsv } from '@/lib/exportCsv'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { ProductModal } from '@/components/inventory/ProductModal'
import { StockMovementModal } from '@/components/inventory/StockMovementModal'
import { getProducts, createProduct } from '@/services/products.service'
import { formatCurrency, isLowStock } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Product } from '@/types'

interface CsvRow { name: string; sale_price: number; cost_price?: number; stock_quantity: number; min_stock_quantity: number; valid: boolean; error?: string }

function parseCsvProducts(text: string): CsvRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  // Detecta e ignora linha de cabeçalho
  const start = lines[0].toLowerCase().includes('nome') || isNaN(Number(lines[0].split(',')[1])) ? 1 : 0
  return lines.slice(start).map(line => {
    const [name, sale_price_str, cost_price_str, stock_str, min_str] = line.split(',').map(s => s.trim())
    const sale_price = parseFloat(sale_price_str?.replace(',', '.') ?? '')
    const cost_price = cost_price_str ? parseFloat(cost_price_str.replace(',', '.')) : undefined
    const stock_quantity = parseInt(stock_str ?? '0', 10)
    const min_stock_quantity = parseInt(min_str ?? '0', 10)
    if (!name) return { name: '', sale_price: 0, stock_quantity: 0, min_stock_quantity: 0, valid: false, error: 'Nome vazio' }
    if (isNaN(sale_price) || sale_price < 0) return { name, sale_price: 0, stock_quantity: 0, min_stock_quantity: 0, valid: false, error: 'Preço inválido' }
    return { name, sale_price, cost_price: isNaN(cost_price!) ? undefined : cost_price, stock_quantity: isNaN(stock_quantity) ? 0 : stock_quantity, min_stock_quantity: isNaN(min_stock_quantity) ? 0 : min_stock_quantity, valid: true }
  })
}

export default function ProductsTab() {
  const company = useAuthStore(s => s.company)
  const [products,      setProducts]      = useState<Product[]>([])
  const [search,        setSearch]        = useState('')
  const [loading,       setLoading]       = useState(true)
  const [productModal,  setProductModal]  = useState(false)
  const [copied,        setCopied]        = useState(false)
  const [movModal,      setMovModal]      = useState(false)
  const [selected,      setSelected]      = useState<Product | null>(null)
  const [movProductId,  setMovProductId]  = useState<string | undefined>()
  const [showLowOnly,   setShowLowOnly]   = useState(false)
  const [showImport,    setShowImport]    = useState(false)
  const [csvRows,       setCsvRows]       = useState<CsvRow[]>([])
  const [importing,     setImporting]     = useState(false)
  const [importDone,    setImportDone]    = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const rows = parseCsvProducts(ev.target?.result as string)
      setCsvRows(rows)
      setImportDone(false)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleImport() {
    const valid = csvRows.filter(r => r.valid)
    if (!valid.length) return
    setImporting(true)
    for (const row of valid) {
      await createProduct({
        name: row.name,
        sale_price: row.sale_price,
        cost_price: row.cost_price,
        stock_quantity: row.stock_quantity,
        min_stock_quantity: row.min_stock_quantity,
        is_active: true,
      })
    }
    setImporting(false)
    setImportDone(true)
    setCsvRows([])
    if (fileRef.current) fileRef.current.value = ''
    load()
  }

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

  function shareCatalog() {
    if (!company) return
    const url = `${window.location.origin}/catalogo/${company.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const lowCount   = products.filter(p => isLowStock(p.stock_quantity, p.min_stock_quantity)).length
  const displayed  = showLowOnly ? products.filter(p => isLowStock(p.stock_quantity, p.min_stock_quantity)) : products

  function printLabels(items: Product[]) {
    const rows = items.map(p => `
      <div class="label">
        <div>
          <div class="name">${p.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
          <div class="cat">${(p.category?.name ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>
        </div>
        <div class="price">R$ ${p.sale_price.toFixed(2).replace('.',',')}</div>
        <div class="sku">${(p.sku ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>
      </div>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Etiquetas</title>
<style>
  @page{size:A4;margin:10mm}body{margin:0;font-family:Arial,sans-serif}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
  .label{border:1px solid #ccc;border-radius:3px;padding:3mm 2mm;box-sizing:border-box;height:28mm;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}
  .name{font-size:7.5pt;font-weight:bold;line-height:1.2}
  .cat{font-size:6pt;color:#666;margin-top:.5mm}
  .price{font-size:13pt;font-weight:bold;color:#1e40af}
  .sku{font-size:5.5pt;color:#aaa;font-family:monospace}
</style>
</head><body><div class="grid">${rows}</div></body></html>`
    const w = window.open('', '_blank', 'width=800,height=600')
    if (!w) return
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-slate-500">
            {displayed.length}{showLowOnly ? '' : `/${products.length}`} produto{displayed.length !== 1 ? 's' : ''}
          </p>
          {lowCount > 0 && (
            <button
              onClick={() => setShowLowOnly(p => !p)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                showLowOnly
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle size={11} />
              {lowCount} estoque baixo
              {showLowOnly && ' (ver todos)'}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Share2 size={13} />} onClick={shareCatalog}>
            {copied ? 'Link copiado!' : 'Catálogo'}
          </Button>
          <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={() => exportProductsCsv(products)}>
            CSV
          </Button>
          <Button variant="outline" size="sm" icon={<Printer size={13} />} onClick={() => printLabels(displayed)}>
            Etiquetas
          </Button>
          <Button variant="outline" size="sm" icon={<Upload size={13} />} onClick={() => { setShowImport(v => !v); setImportDone(false); setCsvRows([]) }}>
            Importar
          </Button>
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

      {/* Painel de importação CSV */}
      {showImport && (
        <Card className="p-4 border-blue-200 bg-blue-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Importar Produtos via CSV</p>
              <p className="text-xs text-slate-500 mt-0.5">Colunas: <code className="bg-slate-100 px-1 rounded">nome, preco_venda, preco_custo, estoque, estoque_minimo</code></p>
            </div>
            <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
          </div>

          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleCsvFile}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-slate-50" />

          {importDone && (
            <p className="flex items-center gap-2 text-sm text-emerald-600 font-semibold">
              <CheckCircle2 size={16} /> Importação concluída!
            </p>
          )}

          {csvRows.length > 0 && (
            <>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Nome</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Preço Venda</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Estoque</th>
                      <th className="text-center px-3 py-2 font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvRows.map((r, i) => (
                      <tr key={i} className={r.valid ? '' : 'bg-red-50'}>
                        <td className="px-3 py-1.5 text-slate-800">{r.name || '—'}</td>
                        <td className="px-3 py-1.5 text-right">{r.valid ? `R$ ${r.sale_price.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-1.5 text-right">{r.stock_quantity}</td>
                        <td className="px-3 py-1.5 text-center">
                          {r.valid
                            ? <span className="text-emerald-600 font-semibold">OK</span>
                            : <span className="text-red-600 font-semibold">{r.error}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {csvRows.filter(r => r.valid).length} válido{csvRows.filter(r => r.valid).length !== 1 ? 's' : ''},&nbsp;
                  {csvRows.filter(r => !r.valid).length} inválido{csvRows.filter(r => !r.valid).length !== 1 ? 's' : ''}
                </p>
                <Button size="sm" onClick={handleImport} disabled={importing || csvRows.filter(r => r.valid).length === 0}>
                  {importing ? 'Importando...' : `Importar ${csvRows.filter(r => r.valid).length} produto${csvRows.filter(r => r.valid).length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {loading ? (
        <PageLoader />
      ) : displayed.length === 0 ? (
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
                      {['Produto', 'Categoria', 'SKU', 'Estoque', 'Mínimo', 'Custo', 'Venda', 'Status', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayed.map(p => {
                      const low = isLowStock(p.stock_quantity, p.min_stock_quantity)
                      return (
                        <tr key={p.id} className={`hover:bg-slate-50/60 transition-colors ${low ? 'bg-amber-50/30' : ''}`}>
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
                          <td className="px-4 py-3 text-xs text-slate-400">{p.min_stock_quantity} un.</td>
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
            {displayed.map(p => {
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
