import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Search, RefreshCw, Pencil, Trash2, ToggleLeft, ToggleRight, ClipboardCheck, Receipt, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConvenioModal } from '@/components/convenios/ConvenioModal'
import { AutorizacaoModal } from '@/components/convenios/AutorizacaoModal'
import { getConvenios, deleteConvenio, updateConvenio } from '@/services/convenios.service'
import { getAutorizacoes, deleteAutorizacao } from '@/services/convenio-autorizacoes.service'
import { getSales } from '@/services/sales.service'
import { formatDate, cn } from '@/lib/utils'
import { CONVENIO_TIPO_LABELS, AUTORIZACAO_STATUS_LABELS } from '@/types'
import type { Convenio, ConvenioAutorizacao, AutorizacaoStatus, Sale } from '@/types'

const AUTH_STATUS_COLOR: Record<AutorizacaoStatus, string> = {
  pendente: 'bg-amber-50 text-amber-700',
  aprovado: 'bg-emerald-50 text-emerald-700',
  negado:   'bg-red-50 text-red-600',
  vencido:  'bg-slate-100 text-slate-500',
}

function fmtBrl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function currentYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function ConveniosPage() {
  const [activeTab,   setActiveTab]   = useState<'convenios' | 'autorizacoes' | 'faturamento'>('convenios')
  const [convenios,   setConvenios]   = useState<Convenio[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filterAtivo, setFilterAtivo] = useState<'todos' | 'ativos' | 'inativos'>('ativos')
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editing,     setEditing]     = useState<Convenio | null>(null)
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)

  const [autorizacoes,   setAutorizacoes]   = useState<ConvenioAutorizacao[]>([])
  const [authLoading,    setAuthLoading]    = useState(false)
  const [authModal,      setAuthModal]      = useState(false)
  const [editingAuth,    setEditingAuth]    = useState<ConvenioAutorizacao | null>(null)
  const [authSearch,     setAuthSearch]     = useState('')

  const [faturPeriod,  setFaturPeriod]  = useState(currentYearMonth)
  const [faturSales,   setFaturSales]   = useState<Sale[]>([])
  const [faturLoading, setFaturLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setConvenios(await getConvenios())
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAuth = useCallback(async () => {
    setAuthLoading(true)
    try {
      setAutorizacoes(await getAutorizacoes())
    } catch {
      setAutorizacoes([])
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const loadFaturamento = useCallback(async () => {
    setFaturLoading(true)
    try {
      const all = await getSales()
      setFaturSales(all.filter(s =>
        s.payment_method === 'convenio' && s.created_at.startsWith(faturPeriod)
      ))
    } catch {
      setFaturSales([])
    } finally {
      setFaturLoading(false)
    }
  }, [faturPeriod])

  function exportCsv() {
    const rows = [
      ['Data', 'Nº Venda', 'Paciente', 'Total', 'Desconto', 'Pago'].join(';'),
      ...faturSales.map(s => [
        formatDate(s.created_at),
        s.sale_number,
        s.patient?.full_name ?? s.customer_name ?? '—',
        s.total_amount.toFixed(2).replace('.', ','),
        s.discount_amount.toFixed(2).replace('.', ','),
        s.paid_amount.toFixed(2).replace('.', ','),
      ].join(';')),
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `faturamento-convenio-${faturPeriod}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (activeTab === 'autorizacoes') loadAuth() }, [activeTab, loadAuth])
  useEffect(() => { if (activeTab === 'faturamento') loadFaturamento() }, [activeTab, loadFaturamento])

  const filtered = useMemo(() => {
    let list = convenios
    if (filterAtivo === 'ativos')   list = list.filter(c => c.is_active)
    if (filterAtivo === 'inativos') list = list.filter(c => !c.is_active)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.cnpj ?? '').includes(q) ||
        (c.contato_nome ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [convenios, filterAtivo, search])

  async function handleToggle(c: Convenio) {
    try {
      await updateConvenio(c.id, { is_active: !c.is_active })
      setConvenios(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x))
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  async function handleDelete(c: Convenio) {
    if (!window.confirm(`Excluir o convênio "${c.name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteConvenio(c.id)
      setConvenios(prev => prev.filter(x => x.id !== c.id))
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  function openNew() { setEditing(null); setModalOpen(true) }
  function openEdit(c: Convenio) { setEditing(c); setModalOpen(true) }

  async function handleDeleteAuth(a: ConvenioAutorizacao) {
    if (!window.confirm('Excluir esta autorização?')) return
    try {
      await deleteAutorizacao(a.id)
      setAutorizacoes(prev => prev.filter(x => x.id !== a.id))
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  const filteredAuth = authSearch
    ? autorizacoes.filter(a =>
        (a.patient?.full_name ?? '').toLowerCase().includes(authSearch.toLowerCase()) ||
        (a.convenio?.name ?? '').toLowerCase().includes(authSearch.toLowerCase()) ||
        a.auth_number.toLowerCase().includes(authSearch.toLowerCase())
      )
    : autorizacoes

  const ativoCount   = convenios.filter(c => c.is_active).length
  const inativoCount = convenios.filter(c => !c.is_active).length

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Convênios</h1>
            <p className="text-xs text-slate-500">{ativoCount} ativo{ativoCount !== 1 ? 's' : ''} · {inativoCount} inativo{inativoCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={
            activeTab === 'convenios' ? load :
            activeTab === 'autorizacoes' ? loadAuth : loadFaturamento
          }>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {activeTab === 'convenios' ? (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Convênio
            </Button>
          ) : activeTab === 'autorizacoes' ? (
            <Button size="sm" onClick={() => { setEditingAuth(null); setAuthModal(true) }}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Autorização
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={faturSales.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setActiveTab('convenios')}
          className={cn('rounded-lg px-4 py-1.5 text-xs font-bold transition-all',
            activeTab === 'convenios' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
        >
          Convênios
        </button>
        <button
          onClick={() => setActiveTab('autorizacoes')}
          className={cn('flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all',
            activeTab === 'autorizacoes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
        >
          <ClipboardCheck size={12} /> Autorizações
        </button>
        <button
          onClick={() => setActiveTab('faturamento')}
          className={cn('flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all',
            activeTab === 'faturamento' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
        >
          <Receipt size={12} /> Faturamento
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex justify-between">
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} className="ml-3 font-bold">×</button>
        </div>
      )}

      {/* ── TAB CONVÊNIOS ─────────────────────────────────── */}
      {activeTab === 'convenios' && <>
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, CNPJ ou contato..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            {(['todos', 'ativos', 'inativos'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterAtivo(f)}
                className={`px-4 py-2 font-medium transition-colors ${
                  filterAtivo === f ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela desktop */}
        <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Desconto</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Contato</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">CNPJ</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhum convênio encontrado.</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700">
                      {CONVENIO_TIPO_LABELS[c.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.desconto_percentual > 0 ? `${c.desconto_percentual}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.contato_nome
                      ? <span>{c.contato_nome}{c.contato_telefone && <span className="text-xs text-slate-400 ml-1">({c.contato_telefone})</span>}</span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{c.cnpj || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {c.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleToggle(c)} title={c.is_active ? 'Desativar' : 'Ativar'}
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        {c.is_active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                      <button onClick={() => openEdit(c)} title="Editar"
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(c)} title="Excluir"
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards mobile */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <p className="text-center text-slate-400 py-8">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Nenhum convênio encontrado.</p>
          ) : filtered.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700">
                      {CONVENIO_TIPO_LABELS[c.tipo]}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {c.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                {c.desconto_percentual > 0 && (
                  <span className="text-lg font-bold text-blue-600">{c.desconto_percentual}%</span>
                )}
              </div>
              {(c.contato_nome || c.cnpj) && (
                <div className="text-xs text-slate-500 space-y-0.5">
                  {c.contato_nome && <p>Contato: {c.contato_nome} {c.contato_telefone && `· ${c.contato_telefone}`}</p>}
                  {c.cnpj && <p>CNPJ: {c.cnpj}</p>}
                </div>
              )}
              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <button onClick={() => handleToggle(c)}
                  className="flex-1 text-xs font-medium py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50">
                  {c.is_active ? 'Desativar' : 'Ativar'}
                </button>
                <button onClick={() => openEdit(c)}
                  className="flex-1 text-xs font-medium py-1.5 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50">
                  Editar
                </button>
                <button onClick={() => handleDelete(c)}
                  className="flex-1 text-xs font-medium py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </>}

      {/* ── TAB AUTORIZAÇÕES ──────────────────────────────── */}
      {activeTab === 'autorizacoes' && <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por paciente, convênio ou nº autorização..."
            value={authSearch}
            onChange={e => setAuthSearch(e.target.value)}
          />
        </div>

        {/* Tabela desktop */}
        <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Paciente</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Convênio</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nº Autorização</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Procedimento</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Validade</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {authLoading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : filteredAuth.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhuma autorização encontrada.</td></tr>
              ) : filteredAuth.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{a.patient?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{a.convenio?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{a.auth_number}</td>
                  <td className="px-4 py-3 text-slate-600">{a.procedure || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{a.valid_until ? formatDate(a.valid_until) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${AUTH_STATUS_COLOR[a.status]}`}>
                      {AUTORIZACAO_STATUS_LABELS[a.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditingAuth(a); setAuthModal(true) }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteAuth(a)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards mobile */}
        <div className="md:hidden space-y-3">
          {authLoading ? (
            <p className="text-center text-slate-400 py-8">Carregando...</p>
          ) : filteredAuth.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Nenhuma autorização encontrada.</p>
          ) : filteredAuth.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{a.patient?.full_name ?? '—'}</p>
                  <p className="text-xs text-slate-500">{a.convenio?.name ?? '—'}</p>
                  <p className="text-xs font-mono text-slate-700 mt-0.5">{a.auth_number}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${AUTH_STATUS_COLOR[a.status]}`}>
                  {AUTORIZACAO_STATUS_LABELS[a.status]}
                </span>
              </div>
              {a.valid_until && (
                <p className="text-xs text-slate-400">Válido até: {formatDate(a.valid_until)}</p>
              )}
              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <button onClick={() => { setEditingAuth(a); setAuthModal(true) }}
                  className="flex-1 text-xs font-medium py-1.5 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50">
                  Editar
                </button>
                <button onClick={() => handleDeleteAuth(a)}
                  className="flex-1 text-xs font-medium py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </>}

      {/* ── TAB FATURAMENTO ──────────────────────────────── */}
      {activeTab === 'faturamento' && (() => {
        const totalRec  = faturSales.reduce((s, x) => s + x.total_amount, 0)
        const totalDesc = faturSales.reduce((s, x) => s + x.discount_amount, 0)
        const totalPago = faturSales.reduce((s, x) => s + x.paid_amount, 0)

        // Agrupamento por paciente
        const byPatient = new Map<string, { name: string; count: number; total: number }>()
        for (const s of faturSales) {
          const key  = s.patient_id ?? s.customer_name ?? 'Anônimo'
          const name = s.patient?.full_name ?? s.customer_name ?? 'Anônimo'
          const cur  = byPatient.get(key) ?? { name, count: 0, total: 0 }
          byPatient.set(key, { name, count: cur.count + 1, total: cur.total + s.total_amount })
        }
        const grouped = Array.from(byPatient.values()).sort((a, b) => b.total - a.total)

        return (
          <div className="space-y-4">
            {/* Seletor de período */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-semibold text-slate-700">Período:</label>
              <input
                type="month"
                value={faturPeriod}
                onChange={e => setFaturPeriod(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-400">{faturSales.length} venda{faturSales.length !== 1 ? 's' : ''} via convênio</span>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Total Faturado',   value: fmtBrl(totalRec),  color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { label: 'Descontos',         value: fmtBrl(totalDesc), color: 'bg-amber-50 border-amber-200 text-amber-700' },
                { label: 'Valor Recebido',    value: fmtBrl(totalPago), color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
              ].map(c => (
                <div key={c.label} className={`rounded-xl border p-3 ${c.color}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{c.label}</p>
                  <p className="text-lg font-bold mt-0.5">{c.value}</p>
                </div>
              ))}
            </div>

            {faturLoading ? (
              <p className="text-center text-slate-400 py-8">Carregando...</p>
            ) : faturSales.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Receipt size={36} className="text-slate-300" />
                <p className="text-slate-500 text-sm">Nenhuma venda via convênio em {faturPeriod}.</p>
              </div>
            ) : (
              <>
                {/* Agrupado por paciente */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Por Paciente</p>
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Paciente</th>
                          <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vendas</th>
                          <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {grouped.map((g, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-medium text-slate-800">{g.name}</td>
                            <td className="px-4 py-2.5 text-right text-slate-500">{g.count}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{fmtBrl(g.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Detalhe por venda */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lançamentos</p>
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            {['Data', 'Nº Venda', 'Paciente', 'Total', 'Desconto', 'Pago'].map(h => (
                              <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {faturSales.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(s.created_at)}</td>
                              <td className="px-4 py-2.5 font-mono text-xs text-blue-700">{s.sale_number}</td>
                              <td className="px-4 py-2.5 text-slate-800">{s.patient?.full_name ?? s.customer_name ?? '—'}</td>
                              <td className="px-4 py-2.5 font-semibold text-slate-800">{fmtBrl(s.total_amount)}</td>
                              <td className="px-4 py-2.5 text-amber-600">{s.discount_amount > 0 ? fmtBrl(s.discount_amount) : '—'}</td>
                              <td className="px-4 py-2.5 text-emerald-700 font-semibold">{fmtBrl(s.paid_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )
      })()}

      <ConvenioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
        convenio={editing}
      />
      <AutorizacaoModal
        open={authModal}
        convenios={convenios}
        autorizacao={editingAuth}
        onClose={() => setAuthModal(false)}
        onSuccess={loadAuth}
      />
    </div>
  )
}
