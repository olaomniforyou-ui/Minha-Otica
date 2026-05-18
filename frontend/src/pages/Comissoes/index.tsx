import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, RefreshCw, Save, ChevronDown, ChevronUp, Medal, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getSales } from '@/services/sales.service'
import { getEmployees } from '@/services/employees.service'
import type { Sale } from '@/types'

const STORAGE_KEY      = 'minha-otica:commission-rules'
const STORAGE_KEY_META = 'minha-otica:commission-meta'

function loadRules(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}
function saveRules(rules: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}
function loadMetas(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_META) ?? '{}') } catch { return {} }
}
function saveMetas(metas: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY_META, JSON.stringify(metas))
}

interface SellerRow {
  seller_id: string
  seller_name: string
  total_vendas: number
  qtd_vendas: number
  percentual: number
  valor_comissao: number
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function exportCsv(rows: SellerRow[], period: string) {
  const header = ['Vendedor', 'Qtd. Vendas', 'Total Vendido', '% Comissão', 'Valor Comissão']
  const lines = rows.map(r => [
    r.seller_name,
    r.qtd_vendas,
    r.total_vendas.toFixed(2),
    r.percentual,
    r.valor_comissao.toFixed(2),
  ].join(','))
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `comissoes-${period}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ComissoesPage() {
  const [sales,      setSales]      = useState<Sale[]>([])
  const [employees,  setEmployees]  = useState<{ id: string; full_name: string }[]>([])
  const [rules,      setRules]      = useState<Record<string, number>>(loadRules)
  const [metas,      setMetas]      = useState<Record<string, number>>(loadMetas)
  const [loading,    setLoading]    = useState(true)
  const [saved,      setSaved]      = useState(false)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)
  const [period,     setPeriod]     = useState<'mes' | 'trimestre' | 'ano'>('mes')
  const [sortField,  setSortField]  = useState<keyof SellerRow>('total_vendas')
  const [sortAsc,    setSortAsc]    = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [s, e] = await Promise.all([getSales(), getEmployees()])
      setSales(s)
      setEmployees(e.map((x: any) => ({ id: x.id, full_name: x.full_name })))
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function getPeriodStart() {
    const now = new Date()
    if (period === 'mes')       return new Date(now.getFullYear(), now.getMonth(), 1)
    if (period === 'trimestre') return new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return new Date(now.getFullYear(), 0, 1)
  }

  const rows = useMemo<SellerRow[]>(() => {
    const start = getPeriodStart()
    const inPeriod = sales.filter(s => new Date(s.created_at) >= start)

    const map: Record<string, { name: string; total: number; qty: number }> = {}

    for (const s of inPeriod) {
      if (!s.seller_id) continue
      const key = s.seller_id
      if (!map[key]) {
        const emp = employees.find(e => e.id === key)
        map[key] = {
          name:  s.seller?.full_name ?? emp?.full_name ?? 'Vendedor',
          total: 0,
          qty:   0,
        }
      }
      map[key].total += s.total_amount
      map[key].qty   += 1
    }

    const result: SellerRow[] = Object.entries(map).map(([seller_id, d]) => {
      const percentual = rules[seller_id] ?? 0
      return {
        seller_id,
        seller_name:    d.name,
        total_vendas:   d.total,
        qtd_vendas:     d.qty,
        percentual,
        valor_comissao: (d.total * percentual) / 100,
      }
    })

    return result.sort((a, b) => {
      const av = a[sortField]
      const bv = b[sortField]
      const diff = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortAsc ? diff : -diff
    })
  }, [sales, employees, rules, period, sortField, sortAsc])

  const totalComissao = rows.reduce((s, r) => s + r.valor_comissao, 0)
  const totalVendas   = rows.reduce((s, r) => s + r.total_vendas, 0)

  function handleRule(seller_id: string, val: string) {
    const n = Math.min(100, Math.max(0, Number(val) || 0))
    setRules(prev => ({ ...prev, [seller_id]: n }))
    setSaved(false)
  }

  function handleMeta(seller_id: string, val: string) {
    const n = Math.max(0, Number(val.replace(',', '.')) || 0)
    setMetas(prev => ({ ...prev, [seller_id]: n }))
    setSaved(false)
  }

  function handleSave() {
    saveRules(rules)
    saveMetas(metas)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleSort(field: keyof SellerRow) {
    if (sortField === field) setSortAsc(prev => !prev)
    else { setSortField(field); setSortAsc(false) }
  }

  function SortIcon({ field }: { field: keyof SellerRow }) {
    if (sortField !== field) return null
    return sortAsc ? <ChevronUp className="h-3.5 w-3.5 inline ml-0.5" /> : <ChevronDown className="h-3.5 w-3.5 inline ml-0.5" />
  }

  const PERIOD_LABELS = { mes: 'Este mês', trimestre: 'Trimestre', ano: 'Este ano' }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Comissões</h1>
            <p className="text-xs text-slate-500">Performance de vendedores e cálculo de comissão</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exportCsv(rows, period)} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button size="sm" onClick={handleSave} variant={saved ? 'ghost' : 'primary'}>
            <Save className="h-4 w-4 mr-1" />
            {saved ? 'Salvo!' : 'Salvar Regras'}
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex justify-between">
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} className="ml-3 font-bold">×</button>
        </div>
      )}

      {/* Filtro período */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Período:</span>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(Object.keys(PERIOD_LABELS) as (keyof typeof PERIOD_LABELS)[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 font-medium transition-colors ${
                period === p ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Vendas</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(totalVendas)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Comissões</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(totalComissao)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm col-span-2 md:col-span-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Vendedores Ativos</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{rows.length}</p>
        </div>
      </div>

      {/* Ranking Top 3 */}
      {rows.length >= 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Medal size={16} className="text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Ranking de Vendedores</h2>
            <span className="text-xs text-slate-400">({PERIOD_LABELS[period]})</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {[...rows]
              .sort((a, b) => b.total_vendas - a.total_vendas)
              .slice(0, 3)
              .map((r, i) => {
                const medals = [
                  { emoji: '🥇', label: '1º', bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-700' },
                  { emoji: '🥈', label: '2º', bg: 'bg-slate-50',   border: 'border-slate-200',  text: 'text-slate-600' },
                  { emoji: '🥉', label: '3º', bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700' },
                ]
                const m = medals[i]
                const pct = totalVendas > 0 ? ((r.total_vendas / totalVendas) * 100).toFixed(1) : '0'
                return (
                  <div key={r.seller_id} className={`flex-1 rounded-xl border ${m.border} ${m.bg} p-3 flex items-center gap-3`}>
                    <span className="text-2xl">{m.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{r.seller_name}</p>
                      <p className={`text-xs font-semibold ${m.text}`}>{fmt(r.total_vendas)}</p>
                      <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{pct}% do total · {r.qtd_vendas} venda{r.qtd_vendas !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      )}

      {/* Tabela desktop */}
      <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none" onClick={() => handleSort('seller_name')}>
                Vendedor <SortIcon field="seller_name" />
              </th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none" onClick={() => handleSort('qtd_vendas')}>
                Qtd. Vendas <SortIcon field="qtd_vendas" />
              </th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none" onClick={() => handleSort('total_vendas')}>
                Total Vendido <SortIcon field="total_vendas" />
              </th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">% Comissão</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Meta Mensal</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none" onClick={() => handleSort('valor_comissao')}>
                Valor Comissão <SortIcon field="valor_comissao" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">Nenhuma venda com vendedor atribuído no período.</td></tr>
            ) : rows.map(r => {
              const meta    = metas[r.seller_id] ?? 0
              const pctMeta = meta > 0 ? Math.min(100, (r.total_vendas / meta) * 100) : null
              const bateu   = pctMeta !== null && pctMeta >= 100
              return (
                <tr key={r.seller_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <span className="flex items-center gap-1.5">
                      {bateu && <span title="Meta batida!">🏆</span>}
                      {r.seller_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.qtd_vendas}</td>
                  <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                    <div>
                      {fmt(r.total_vendas)}
                      {pctMeta !== null && (
                        <div className="mt-1">
                          <div className="h-1 rounded-full bg-slate-200 overflow-hidden w-24 ml-auto">
                            <div
                              className={`h-full rounded-full ${bateu ? 'bg-emerald-500' : 'bg-amber-400'}`}
                              style={{ width: `${pctMeta}%` }}
                            />
                          </div>
                          <p className={`text-[10px] text-right mt-0.5 ${bateu ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                            {pctMeta.toFixed(0)}% da meta
                          </p>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={rules[r.seller_id] ?? 0}
                        onChange={e => handleRule(r.seller_id, e.target.value)}
                        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm text-center focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none"
                      />
                      <span className="text-slate-500 text-xs">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-slate-400 text-xs">R$</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={metas[r.seller_id] ?? ''}
                        onChange={e => handleMeta(r.seller_id, e.target.value)}
                        placeholder="0"
                        className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm text-center focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmt(r.valor_comissao)}</td>
                </tr>
              )
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td className="px-4 py-3 font-bold text-slate-700" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(totalVendas)}</td>
                <td /><td />
                <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmt(totalComissao)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-center text-slate-400 py-8">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Nenhuma venda com vendedor atribuído no período.</p>
        ) : rows.map(r => {
            const meta    = metas[r.seller_id] ?? 0
            const pctMeta = meta > 0 ? Math.min(100, (r.total_vendas / meta) * 100) : null
            const bateu   = pctMeta !== null && pctMeta >= 100
            return (
              <div key={r.seller_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">
                    {bateu && <span className="mr-1">🏆</span>}{r.seller_name}
                  </p>
                  <span className="text-xs text-slate-500">{r.qtd_vendas} venda{r.qtd_vendas !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-400 uppercase tracking-wide">Total Vendido</p>
                    <p className="font-bold text-slate-900">{fmt(r.total_vendas)}</p>
                    {pctMeta !== null && (
                      <>
                        <div className="mt-1 h-1 rounded-full bg-slate-200 overflow-hidden">
                          <div className={`h-full rounded-full ${bateu ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pctMeta}%` }} />
                        </div>
                        <p className={`text-[10px] mt-0.5 ${bateu ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>{pctMeta.toFixed(0)}% da meta</p>
                      </>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase tracking-wide">Comissão</p>
                    <p className="font-bold text-emerald-600">{fmt(r.valor_comissao)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-slate-500">% Com.:</label>
                    <input
                      type="number" min={0} max={100} step={0.5}
                      value={rules[r.seller_id] ?? 0}
                      onChange={e => handleRule(r.seller_id, e.target.value)}
                      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm text-center focus:border-emerald-400 outline-none"
                    />
                    <span className="text-slate-500 text-xs">%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-slate-500">Meta:</label>
                    <span className="text-xs text-slate-400">R$</span>
                    <input
                      type="number" min={0} step={100}
                      value={metas[r.seller_id] ?? ''}
                      onChange={e => handleMeta(r.seller_id, e.target.value)}
                      placeholder="0"
                      className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm text-center focus:border-indigo-400 outline-none"
                    />
                  </div>
                </div>
              </div>
            )
          })}
      </div>

      {rows.length > 0 && (
        <p className="text-xs text-slate-400 text-center">
          Os percentuais de comissão são salvos localmente neste dispositivo.
        </p>
      )}
    </div>
  )
}
