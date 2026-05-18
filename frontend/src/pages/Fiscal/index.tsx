import { useState, useMemo } from 'react'
import {
  FileText, Plus, Download, Settings, Receipt, AlertCircle,
  CheckCircle2, X, Trash2, ChevronDown, Search, Eye, Printer, FileCode,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

// ── Storage ──────────────────────────────────────────────────────
const NF_KEY    = 'fiscal_nfs_v1'
const DAS_KEY   = 'fiscal_das_v1'
const CFG_KEY   = 'fiscal_config_v1'

// ── Types ─────────────────────────────────────────────────────────
type NfStatus   = 'emitida' | 'cancelada' | 'inutilizada' | 'pendente'
type NfSerie    = '1' | '2' | '3' | '001'
type Regime     = 'simples' | 'presumido' | 'real' | 'mei'
type DasStatus  = 'pago' | 'pendente' | 'vencido'

interface NfRecord {
  id: string
  numero: string
  serie: NfSerie
  emissao: string
  cliente: string
  descricao: string
  valor: number
  status: NfStatus
  chave?: string
}

interface DasRecord {
  id: string
  competencia: string  // MM/YYYY
  vencimento: string
  valor: number
  status: DasStatus
  tipo: 'DAS' | 'DARF-ISS' | 'DARF-IRPJ' | 'ICMS' | 'ISS' | 'Outro'
  pago_em?: string
}

interface FiscalConfig {
  cnpj: string
  razaoSocial: string
  regime: Regime
  crt: '1' | '2' | '3'
  aliquotaIss: string
  aliquotaIcms: string
  municipio: string
  uf: string
  inscricaoMunicipal: string
  inscricaoEstadual: string
}

// ── Load/Save ─────────────────────────────────────────────────────
function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}
function save(key: string, data: unknown) { localStorage.setItem(key, JSON.stringify(data)) }

const DEFAULT_CFG: FiscalConfig = {
  cnpj: '', razaoSocial: '', regime: 'simples', crt: '1',
  aliquotaIss: '5', aliquotaIcms: '12', municipio: '', uf: '',
  inscricaoMunicipal: '', inscricaoEstadual: '',
}

// ── CSV Export ────────────────────────────────────────────────────
function exportNfsCsv(nfs: NfRecord[]) {
  const rows = [
    ['Número', 'Série', 'Emissão', 'Cliente', 'Descrição', 'Valor', 'Status', 'Chave'],
    ...nfs.map(n => [n.numero, n.serie, n.emissao, n.cliente, n.descricao, n.valor.toFixed(2), n.status, n.chave ?? '']),
  ]
  const csv = rows.map(r => r.join(';')).join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
  a.download = `nfs_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
}

const STATUS_META: Record<NfStatus, { label: string; cls: string }> = {
  emitida:     { label: 'Emitida',     cls: 'bg-emerald-100 text-emerald-700' },
  pendente:    { label: 'Pendente',    cls: 'bg-amber-100 text-amber-700'     },
  cancelada:   { label: 'Cancelada',   cls: 'bg-red-100 text-red-700'         },
  inutilizada: { label: 'Inutilizada', cls: 'bg-slate-100 text-slate-500'     },
}

const DAS_META: Record<DasStatus, { label: string; cls: string }> = {
  pago:     { label: 'Pago',     cls: 'bg-emerald-100 text-emerald-700' },
  pendente: { label: 'Pendente', cls: 'bg-amber-100 text-amber-700'     },
  vencido:  { label: 'Vencido',  cls: 'bg-red-100 text-red-700'         },
}

const REGIME_LABELS: Record<Regime, string> = {
  simples:  'Simples Nacional',
  presumido: 'Lucro Presumido',
  real:     'Lucro Real',
  mei:      'MEI',
}

function printNf(nf: NfRecord, cfg: FiscalConfig) {
  const w = window.open('', '_blank', 'width=800,height=600')
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head><title>NF ${nf.numero}</title><style>
    body{font-family:Arial,sans-serif;padding:40px;color:#333;max-width:700px;margin:0 auto}
    .header{border-bottom:2px solid #333;padding-bottom:16px;margin-bottom:24px}
    .company{font-size:18px;font-weight:bold}
    .title{text-align:center;font-size:15px;font-weight:bold;margin:20px 0;background:#f5f5f5;padding:10px;border-radius:6px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
    .field label{font-size:10px;text-transform:uppercase;color:#888;font-weight:bold}
    .field p{font-size:14px;margin:4px 0 0}
    .total{border-top:2px solid #333;padding-top:16px;text-align:right;font-size:22px;font-weight:bold}
    .chave{font-family:monospace;font-size:10px;word-break:break-all;background:#f5f5f5;padding:8px;border-radius:4px;margin-top:16px}
    .footer{text-align:center;margin-top:40px;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:12px}
    @media print{button{display:none}}
  </style></head><body>
    <div class="header">
      <p class="company">${cfg.razaoSocial || 'Empresa'}</p>
      <p style="font-size:12px;color:#666;margin-top:4px">CNPJ: ${cfg.cnpj || '—'} · ${cfg.municipio}/${cfg.uf}</p>
    </div>
    <div class="title">NOTA FISCAL Nº ${nf.numero} · SÉRIE ${nf.serie}</div>
    <div class="grid">
      <div class="field"><label>Cliente / Destinatário</label><p>${nf.cliente}</p></div>
      <div class="field"><label>Status</label><p>${STATUS_META[nf.status].label}</p></div>
      <div class="field"><label>Data de Emissão</label><p>${nf.emissao}</p></div>
      <div class="field"><label>Regime Tributário</label><p>${REGIME_LABELS[cfg.regime]}</p></div>
    </div>
    ${nf.descricao ? `<div class="field"><label>Descrição</label><p style="margin-top:4px">${nf.descricao}</p></div><br>` : ''}
    <div class="total">Total: R$ ${nf.valor.toFixed(2).replace('.', ',')}</div>
    ${nf.chave ? `<div class="chave"><strong>Chave NF-e:</strong> ${nf.chave}</div>` : ''}
    <div class="footer">Documento gerado por Minha Ótica · ${new Date().toLocaleDateString('pt-BR')}</div>
  </body></html>`)
  w.document.close()
  setTimeout(() => w.print(), 400)
}

function exportXml(nf: NfRecord, cfg: FiscalConfig) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe${nf.chave ?? nf.id}">
      <ide>
        <nNF>${nf.numero}</nNF>
        <serie>${nf.serie}</serie>
        <dhEmi>${nf.emissao}</dhEmi>
        <tpAmb>2</tpAmb>
      </ide>
      <emit>
        <CNPJ>${cfg.cnpj.replace(/\D/g, '')}</CNPJ>
        <xNome>${cfg.razaoSocial}</xNome>
        <CRT>${cfg.crt}</CRT>
      </emit>
      <dest>
        <xNome>${nf.cliente}</xNome>
      </dest>
      <total>
        <ICMSTot>
          <vNF>${nf.valor.toFixed(2)}</vNF>
        </ICMSTot>
      </total>
      <infAdic>
        <infCpl>${nf.descricao}</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
</nfeProc>`
  const blob = new Blob([xml], { type: 'application/xml' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `NF_${nf.numero}_serie${nf.serie}_${nf.emissao}.xml`
  a.click()
  URL.revokeObjectURL(a.href)
}

type Tab = 'nfe' | 'guias' | 'config'

export default function FiscalPage() {
  const [tab, setTab] = useState<Tab>('nfe')

  // NF state
  const [nfs, setNfs]           = useState<NfRecord[]>(() => load(NF_KEY, []))
  const [showNfForm, setShowNfForm] = useState(false)
  const [nfSearch, setNfSearch]  = useState('')
  const [detailNf, setDetailNf]  = useState<NfRecord | null>(null)
  const [nfForm, setNfForm]      = useState<Partial<NfRecord>>({
    serie: '1', status: 'pendente', emissao: new Date().toISOString().slice(0, 10),
  })

  // DAS state
  const [das, setDas]            = useState<DasRecord[]>(() => load(DAS_KEY, []))
  const [showDasForm, setShowDasForm] = useState(false)
  const [dasForm, setDasForm]    = useState<Partial<DasRecord>>({
    tipo: 'DAS', status: 'pendente',
    competencia: `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
    vencimento: new Date().toISOString().slice(0, 10),
  })

  // Config state
  const [cfg, setCfg]            = useState<FiscalConfig>(() => load(CFG_KEY, DEFAULT_CFG))
  const [cfgSaved, setCfgSaved]  = useState(false)

  // ── NF handlers ──────────────────────────────────────────────
  function saveNf() {
    if (!nfForm.numero || !nfForm.cliente || !nfForm.valor) return
    const record: NfRecord = {
      id: `${Date.now()}`,
      numero: nfForm.numero!,
      serie: nfForm.serie! as NfSerie,
      emissao: nfForm.emissao!,
      cliente: nfForm.cliente!,
      descricao: nfForm.descricao ?? '',
      valor: Number(nfForm.valor),
      status: nfForm.status! as NfStatus,
      chave: nfForm.chave,
    }
    const next = [record, ...nfs]
    setNfs(next); save(NF_KEY, next)
    setNfForm({ serie: '1', status: 'pendente', emissao: new Date().toISOString().slice(0, 10) })
    setShowNfForm(false)
  }

  function updateNfStatus(id: string, status: NfStatus) {
    const next = nfs.map(n => n.id === id ? { ...n, status } : n)
    setNfs(next); save(NF_KEY, next)
  }

  function deleteNf(id: string) {
    const next = nfs.filter(n => n.id !== id); setNfs(next); save(NF_KEY, next)
  }

  // ── DAS handlers ─────────────────────────────────────────────
  function saveDas() {
    if (!dasForm.competencia || !dasForm.valor) return
    const record: DasRecord = {
      id: `${Date.now()}`,
      competencia: dasForm.competencia!,
      vencimento: dasForm.vencimento!,
      valor: Number(dasForm.valor),
      status: dasForm.status! as DasStatus,
      tipo: dasForm.tipo! as DasRecord['tipo'],
      pago_em: dasForm.pago_em,
    }
    const next = [record, ...das]
    setDas(next); save(DAS_KEY, next)
    setDasForm({ tipo: 'DAS', status: 'pendente',
      competencia: `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
      vencimento: new Date().toISOString().slice(0, 10) })
    setShowDasForm(false)
  }

  function toggleDasStatus(id: string) {
    const next = das.map(d => {
      if (d.id !== id) return d
      const status = d.status === 'pago' ? 'pendente' : 'pago'
      return { ...d, status, pago_em: status === 'pago' ? new Date().toISOString().slice(0, 10) : undefined }
    }) as DasRecord[]
    setDas(next); save(DAS_KEY, next)
  }

  function deleteDas(id: string) {
    const next = das.filter(d => d.id !== id); setDas(next); save(DAS_KEY, next)
  }

  // ── Config ───────────────────────────────────────────────────
  function saveCfg() {
    save(CFG_KEY, cfg); setCfgSaved(true); setTimeout(() => setCfgSaved(false), 2000)
  }

  // ── Derived ──────────────────────────────────────────────────
  const filteredNfs = useMemo(() =>
    nfs.filter(n => !nfSearch || n.numero.includes(nfSearch) || n.cliente.toLowerCase().includes(nfSearch.toLowerCase())),
    [nfs, nfSearch])

  const totalEmitido  = nfs.filter(n => n.status === 'emitida').reduce((s, n) => s + n.valor, 0)
  const totalPendente = das.filter(d => d.status === 'pendente').reduce((s, d) => s + d.valor, 0)
  const totalVencido  = das.filter(d => d.status === 'vencido').reduce((s, d) => s + d.valor, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText size={20} className="text-indigo-600" /> Fiscal &amp; Tributário
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Controle de NF-e/NFS-e e guias tributárias.{' '}
            <span className="text-amber-600 font-medium text-xs">Registro manual — emissão requer integração Sefaz.</span>
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'NFs emitidas (total)', value: formatCurrency(totalEmitido), icon: Receipt, color: 'text-emerald-600 bg-emerald-50', count: nfs.filter(n => n.status === 'emitida').length },
          { label: 'Guias pendentes',       value: formatCurrency(totalPendente), icon: AlertCircle, color: 'text-amber-600 bg-amber-50', count: das.filter(d => d.status === 'pendente').length },
          { label: 'Guias vencidas',        value: formatCurrency(totalVencido),  icon: X,           color: 'text-red-600 bg-red-50',    count: das.filter(d => d.status === 'vencido').length },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
            <div className={cn('rounded-xl p-2.5', c.color.split(' ')[1])}>
              <c.icon size={18} className={c.color.split(' ')[0]} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className="text-lg font-bold text-slate-900">{c.value}</p>
              <p className="text-[11px] text-slate-400">{c.count} registro{c.count !== 1 ? 's' : ''}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['nfe','NF-e / NFS-e'],['guias','Guias & DAS'],['config','Configuração']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
            {label}
          </button>
        ))}
      </div>

      {/* ── NF-e ──────────────────────────────────────────────── */}
      {tab === 'nfe' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar NF ou cliente..." value={nfSearch} onChange={e => setNfSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-400" />
            </div>
            <button onClick={() => exportNfsCsv(filteredNfs)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <Download size={13} /> CSV
            </button>
            <button onClick={() => setShowNfForm(v => !v)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
              <Plus size={14} /> Registrar NF
            </button>
          </div>

          {/* Formulário */}
          {showNfForm && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-5 space-y-3">
              <p className="text-sm font-bold text-slate-800">Nova Nota Fiscal</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Número *</label>
                  <input type="text" value={nfForm.numero ?? ''} onChange={e => setNfForm(f => ({ ...f, numero: e.target.value }))}
                    placeholder="000001" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Série</label>
                  <select value={nfForm.serie} onChange={e => setNfForm(f => ({ ...f, serie: e.target.value as NfSerie }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
                    {(['1','2','3','001'] as NfSerie[]).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Emissão</label>
                  <input type="date" value={nfForm.emissao ?? ''} onChange={e => setNfForm(f => ({ ...f, emissao: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Status</label>
                  <select value={nfForm.status} onChange={e => setNfForm(f => ({ ...f, status: e.target.value as NfStatus }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
                    {(Object.keys(STATUS_META) as NfStatus[]).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-500 mb-1">Cliente / Destinatário *</label>
                  <input type="text" value={nfForm.cliente ?? ''} onChange={e => setNfForm(f => ({ ...f, cliente: e.target.value }))}
                    placeholder="Nome ou CNPJ" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Valor (R$) *</label>
                  <input type="number" step="0.01" value={nfForm.valor ?? ''} onChange={e => setNfForm(f => ({ ...f, valor: parseFloat(e.target.value) }))}
                    placeholder="0,00" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Chave NF-e (44 dígitos)</label>
                  <input type="text" value={nfForm.chave ?? ''} onChange={e => setNfForm(f => ({ ...f, chave: e.target.value }))}
                    placeholder="Opcional" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] text-slate-500 mb-1">Descrição dos Serviços/Produtos</label>
                  <input type="text" value={nfForm.descricao ?? ''} onChange={e => setNfForm(f => ({ ...f, descricao: e.target.value }))}
                    placeholder="Ex: Venda de armação + lentes" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={saveNf} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">Salvar</button>
                <button onClick={() => setShowNfForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              </div>
            </div>
          )}

          {/* Tabela NFs */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {filteredNfs.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FileText size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">{nfSearch ? 'Nenhuma NF encontrada.' : 'Nenhuma nota fiscal registrada.'}</p>
              </div>
            ) : (
              <>
                <div className="hidden sm:grid grid-cols-[80px_60px_110px_1fr_100px_100px_130px] gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <span>Número</span><span>Série</span><span>Emissão</span><span>Cliente</span><span>Valor</span><span>Status</span><span></span>
                </div>
                <div className="divide-y divide-slate-50">
                  {filteredNfs.map(n => (
                    <div key={n.id} className="flex flex-col sm:grid sm:grid-cols-[80px_60px_110px_1fr_100px_100px_130px] gap-2 items-start sm:items-center px-5 py-3 hover:bg-slate-50/60 transition-colors">
                      <span className="font-mono text-sm font-bold text-slate-800">{n.numero}</span>
                      <span className="text-xs text-slate-500">{n.serie}</span>
                      <span className="text-xs text-slate-600">{n.emissao}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{n.cliente}</p>
                        {n.descricao && <p className="text-[11px] text-slate-400 truncate">{n.descricao}</p>}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(n.valor)}</span>
                      <div className="relative group">
                        <button className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1', STATUS_META[n.status].cls)}>
                          {STATUS_META[n.status].label} <ChevronDown size={10} />
                        </button>
                        <div className="absolute top-full left-0 mt-1 z-10 hidden group-hover:block bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-36">
                          {(Object.keys(STATUS_META) as NfStatus[]).map(s => (
                            <button key={s} onClick={() => updateNfStatus(n.id, s)}
                              className="block w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors">
                              {STATUS_META[s].label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDetailNf(n)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="Ver detalhes">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => printNf(n, cfg)} className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors" title="Imprimir NF">
                          <Printer size={14} />
                        </button>
                        <button onClick={() => exportXml(n, cfg)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="Exportar XML">
                          <FileCode size={14} />
                        </button>
                        <button onClick={() => deleteNf(n.id)} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── GUIAS / DAS ──────────────────────────────────────── */}
      {tab === 'guias' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setShowDasForm(v => !v)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
              <Plus size={14} /> Registrar Guia
            </button>
          </div>

          {showDasForm && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-5 space-y-3">
              <p className="text-sm font-bold text-slate-800">Nova Guia / Tributo</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Tipo</label>
                  <select value={dasForm.tipo} onChange={e => setDasForm(f => ({ ...f, tipo: e.target.value as DasRecord['tipo'] }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
                    {['DAS','DARF-ISS','DARF-IRPJ','ICMS','ISS','Outro'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Competência</label>
                  <input type="text" value={dasForm.competencia ?? ''} onChange={e => setDasForm(f => ({ ...f, competencia: e.target.value }))}
                    placeholder="MM/YYYY" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Vencimento</label>
                  <input type="date" value={dasForm.vencimento ?? ''} onChange={e => setDasForm(f => ({ ...f, vencimento: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Valor (R$) *</label>
                  <input type="number" step="0.01" value={dasForm.valor ?? ''} onChange={e => setDasForm(f => ({ ...f, valor: parseFloat(e.target.value) }))}
                    placeholder="0,00" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={saveDas} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">Salvar</button>
                <button onClick={() => setShowDasForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {das.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Receipt size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhuma guia registrada.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {das.map(d => (
                  <div key={d.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{d.tipo}</span>
                        <span className="text-xs text-slate-500">· {d.competencia}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Vencimento: {d.vencimento}
                        {d.pago_em && <> · Pago em: {d.pago_em}</>}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(d.valor)}</p>
                    <button onClick={() => toggleDasStatus(d.id)}
                      className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors', DAS_META[d.status].cls)}>
                      {DAS_META[d.status].label}
                    </button>
                    <button onClick={() => deleteDas(d.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONFIGURAÇÃO ─────────────────────────────────────── */}
      {tab === 'config' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 max-w-2xl">
          <p className="text-sm font-bold text-slate-800">Dados Fiscais da Empresa</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Razão Social', key: 'razaoSocial', placeholder: 'Nome da empresa' },
              { label: 'CNPJ',         key: 'cnpj',        placeholder: '00.000.000/0001-00' },
              { label: 'Município',    key: 'municipio',   placeholder: 'São Paulo' },
              { label: 'UF',           key: 'uf',          placeholder: 'SP' },
              { label: 'Inscrição Municipal', key: 'inscricaoMunicipal', placeholder: '000.000.000-0' },
              { label: 'Inscrição Estadual',  key: 'inscricaoEstadual',  placeholder: '000.000.000.000' },
              { label: 'Alíquota ISS (%)',    key: 'aliquotaIss',        placeholder: '5' },
              { label: 'Alíquota ICMS (%)',   key: 'aliquotaIcms',       placeholder: '12' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-slate-500 mb-1.5">{f.label}</label>
                <input type="text" value={(cfg as any)[f.key]} onChange={e => setCfg(c => ({ ...c, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
              </div>
            ))}

            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Regime Tributário</label>
              <select value={cfg.regime} onChange={e => setCfg(c => ({ ...c, regime: e.target.value as Regime }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
                {(Object.entries(REGIME_LABELS)).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1.5">CRT (Código de Regime Tributário)</label>
              <select value={cfg.crt} onChange={e => setCfg(c => ({ ...c, crt: e.target.value as FiscalConfig['crt'] }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
                <option value="1">1 — Simples Nacional</option>
                <option value="2">2 — Simples Nacional (excesso)</option>
                <option value="3">3 — Regime Normal</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>A emissão automática de NF-e/NFS-e requer integração com a Sefaz e certificado digital A1/A3. Esta tela registra os dados fiscais para controle manual e futura integração.</span>
          </div>

          <button onClick={saveCfg}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
            {cfgSaved ? <CheckCircle2 size={14} /> : <Settings size={14} />}
            {cfgSaved ? 'Configuração salva!' : 'Salvar Configuração'}
          </button>
        </div>
      )}

      {/* ── Modal Detalhe NF-e ── */}
      {detailNf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDetailNf(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-slate-50">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" />
                <div>
                  <p className="font-bold text-slate-900">NF Nº {detailNf.numero}</p>
                  <p className="text-xs text-slate-500">Série {detailNf.serie}</p>
                </div>
              </div>
              <button onClick={() => setDetailNf(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Emissão</p>
                  <p className="text-sm font-semibold text-slate-800">{detailNf.emissao}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Valor</p>
                  <p className="text-sm font-bold text-indigo-700">{formatCurrency(detailNf.valor)}</p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Cliente / Destinatário</p>
                <p className="text-sm font-semibold text-slate-800">{detailNf.cliente}</p>
              </div>

              {detailNf.descricao && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Descrição</p>
                  <p className="text-sm text-slate-700">{detailNf.descricao}</p>
                </div>
              )}

              {detailNf.chave && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Chave NF-e</p>
                  <p className="text-[11px] font-mono text-slate-600 break-all">{detailNf.chave}</p>
                </div>
              )}

              {/* Alterar status */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Alterar Status</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_META) as NfStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => { updateNfStatus(detailNf.id, s); setDetailNf(prev => prev ? { ...prev, status: s } : null) }}
                      className={cn(
                        'text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all',
                        detailNf.status === s
                          ? STATUS_META[s].cls + ' border-transparent ring-2 ring-offset-1 ring-indigo-400'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
                      )}
                    >
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-6 pb-5">
              <button
                onClick={() => setDetailNf(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => { deleteNf(detailNf.id); setDetailNf(null) }}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
