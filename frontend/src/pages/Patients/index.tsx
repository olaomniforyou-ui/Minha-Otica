import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Phone, Mail, UserCircle2, Pencil, FileText, Shield, Clock, Star, Filter, ChevronDown, ChevronUp, X, Sparkles, Download, Upload, AlertTriangle, Bot, Printer, Loader2 } from 'lucide-react'

const API_URL = ((import.meta.env.VITE_API_URL ?? 'http://localhost:3001') as string).replace(/\/$/, '') + '/api/v1'
import { exportPatientsCsv } from '@/lib/exportCsv'
import { ImportPatientsModal } from '@/components/patients/ImportPatientsModal'
import { addYears, isAfter, parseISO } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { PatientModal } from '@/components/patients/PatientModal'
import { PatientPrescriptionsModal } from '@/components/patients/PatientPrescriptionsModal'
import { getPatientPrescriptions } from '@/services/prescriptions.service'
import { useAuthStore } from '@/store/authStore'
import { PatientLGPDModal } from '@/components/patients/PatientLGPDModal'
import { PatientTimelineModal } from '@/components/patients/PatientTimelineModal'
import { PatientPostSaleModal } from '@/components/patients/PatientPostSaleModal'
import { formatDate, formatPhone, getInitials, cn } from '@/lib/utils'
import { getPatients, type PatientFilters } from '@/services/patients.service'
import { pullFromServer } from '@/services/sync.service'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import type { Patient } from '@/types'

const COLORS = [
  'bg-blue-500','bg-emerald-500','bg-violet-500',
  'bg-rose-500','bg-amber-500','bg-cyan-500',
]
function colorOf(name: string) {
  return COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
}

const ORIGIN_OPTIONS = [
  { value: 'indicacao', label: 'Indicação' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google',    label: 'Google' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'walk_in',   label: 'Walk-in' },
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'convenio',  label: 'Convênio' },
]

export default function PatientsPage() {
  const company = useAuthStore(s => s.company)
  const { maxPatients, patientCount, patientPct, patientNearLimit, patientAtLimit } = usePlanLimits()
  const [patients, setPatients] = useState<Patient[]>([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [ready,    setReady]    = useState(!navigator.onLine)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<PatientFilters>({
    is_active: true,
  })

  const [modal,               setModal]               = useState(false)
  const [showImport,          setShowImport]          = useState(false)
  const [editing,             setEditing]             = useState<Patient | null>(null)
  const [prescriptionsPatient, setPrescriptionsPatient] = useState<Patient | null>(null)
  const [lgpdPatient,      setLgpdPatient]      = useState<Patient | null>(null)
  const [timelinePatient,  setTimelinePatient]  = useState<Patient | null>(null)
  const [postSalePatient,  setPostSalePatient]  = useState<Patient | null>(null)
  const [aiPatient,  setAiPatient]  = useState<Patient | null>(null)
  const [aiResult,   setAiResult]   = useState('')
  const [aiLoading,  setAiLoading]  = useState(false)

  useEffect(() => {
    if (!navigator.onLine) { setReady(true); return }
    pullFromServer().catch(() => {}).finally(() => setReady(true))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setPatients(await getPatients({ ...filters, search: search || undefined }))
    setLoading(false)
  }, [search, filters])

  useEffect(() => { if (ready) load() }, [load, ready])

  const [printingId, setPrintingId] = useState<string | null>(null)

  async function printProntuario(p: Patient) {
    setPrintingId(p.id)
    const rxList = await getPatientPrescriptions(p.id)
    setPrintingId(null)

    const fmtOpt = (v?: number) => v !== undefined && v !== null ? (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)) : '—'
    const fmtInt = (v?: number) => v !== undefined && v !== null ? `${v}` : '—'

    const rxRows = rxList.map(rx => `
      <div class="rx">
        <div class="rx-header">
          <span>Exame: ${rx.exam_date ?? rx.created_at.slice(0,10)}</span>
          ${rx.doctor_name ? `<span>Dr(a). ${rx.doctor_name}${rx.crm ? ` · CRM ${rx.crm}` : ''}</span>` : ''}
          ${rx.valid_until ? `<span>Válida até ${rx.valid_until}</span>` : ''}
        </div>
        <table>
          <thead><tr><th></th><th>Esf</th><th>Cil</th><th>Eixo</th><th>Add</th><th>DNP</th><th>Alt</th></tr></thead>
          <tbody>
            <tr><td class="eye od">OD</td><td>${fmtOpt(rx.od_esf)}</td><td>${fmtOpt(rx.od_cil)}</td><td>${fmtInt(rx.od_eixo)}${rx.od_eixo != null ? '°' : ''}</td><td>${fmtOpt(rx.od_add)}</td><td>${fmtOpt(rx.od_dnp)}</td><td>${fmtInt(rx.od_altura)}</td></tr>
            <tr><td class="eye oe">OE</td><td>${fmtOpt(rx.oe_esf)}</td><td>${fmtOpt(rx.oe_cil)}</td><td>${fmtInt(rx.oe_eixo)}${rx.oe_eixo != null ? '°' : ''}</td><td>${fmtOpt(rx.oe_add)}</td><td>${fmtOpt(rx.oe_dnp)}</td><td>${fmtInt(rx.oe_altura)}</td></tr>
          </tbody>
        </table>
        ${rx.notes ? `<p class="notes">${rx.notes}</p>` : ''}
      </div>`).join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Prontuário — ${p.full_name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1e293b;padding:28px;max-width:720px;margin:auto}
  h1{font-size:17px;font-weight:700;color:#3730a3}h2{font-size:13px;font-weight:700;color:#334155;margin:16px 0 8px}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:16px}
  .info span{font-size:11px;color:#64748b}.info strong{color:#1e293b}
  .rx{border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:12px}
  .rx-header{display:flex;gap:16px;font-size:10px;color:#64748b;margin-bottom:8px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{border:1px solid #e2e8f0;padding:4px 8px;text-align:center}
  th{background:#f8fafc;font-weight:700;font-size:10px}
  .eye{font-weight:700}.od{background:#eff6ff;color:#1d4ed8}.oe{background:#eef2ff;color:#4338ca}
  .notes{margin-top:8px;font-size:11px;color:#475569;font-style:italic;background:#f8fafc;padding:6px 8px;border-radius:4px}
  .footer{margin-top:24px;padding-top:12px;border-top:1px dashed #cbd5e1;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}
  @media print{body{padding:12px}}
</style></head><body>
  <h1>${company?.name ?? 'Minha Ótica'} — Prontuário Óptico</h1>
  <h2>Dados do Paciente</h2>
  <div class="info">
    <span><strong>${p.full_name}</strong></span>
    ${p.cpf ? `<span>CPF: <strong>${p.cpf}</strong></span>` : ''}
    ${p.phone ? `<span>Telefone: <strong>${p.phone}</strong></span>` : ''}
    ${p.email ? `<span>E-mail: <strong>${p.email}</strong></span>` : ''}
    ${p.birth_date ? `<span>Nascimento: <strong>${new Date(p.birth_date+'T12:00:00').toLocaleDateString('pt-BR')}</strong></span>` : ''}
    <span>Cadastrado em: <strong>${new Date(p.created_at).toLocaleDateString('pt-BR')}</strong></span>
  </div>
  <h2>Receitas Ópticas (${rxList.length})</h2>
  ${rxList.length === 0 ? '<p style="color:#94a3b8;font-style:italic">Nenhuma receita cadastrada.</p>' : rxRows}
  <div class="footer"><span>Gerado por Minha Ótica</span><span>${new Date().toLocaleDateString('pt-BR')}</span></div>
</body></html>`

    const w = window.open('', '_blank', 'width=780,height=650')
    if (!w) return
    w.document.write(html)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 400)
  }

  function openNew() {
    setEditing(null)
    setModal(true)
  }

  async function analyzePatient(p: Patient) {
    setAiPatient(p)
    setAiResult('')
    setAiLoading(true)
    const ctx = `Analise este paciente de ótica e forneça insights práticos de relacionamento:
Nome: ${p.full_name}
Origem: ${p.origin ?? 'não informado'}
Ativo: ${p.is_active ? 'Sim' : 'Não'}
Nascimento: ${p.birth_date ? new Date(p.birth_date).toLocaleDateString('pt-BR') : 'não informado'}
Telefone: ${p.whatsapp || p.phone || 'não informado'}
E-mail: ${p.email ?? 'não informado'}
Cadastrado em: ${new Date(p.created_at).toLocaleDateString('pt-BR')}

Forneça em português (máximo 4 parágrafos curtos):
1. Perfil e comportamento provável deste cliente
2. Melhor canal e abordagem de comunicação
3. Timing recomendado para próximo contato
4. Oportunidade de recompra ou upsell`
    try {
      const res = await fetch(`${API_URL}/ai/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: ctx }] }),
      })
      const data = await res.json()
      setAiResult(data.text ?? 'Sem análise disponível.')
    } catch {
      setAiResult('Erro ao conectar com a IA.')
    }
    setAiLoading(false)
  }

  function openEdit(p: Patient) {
    setEditing(p)
    setModal(true)
  }

  function handleClose() {
    setModal(false)
    setEditing(null)
  }

  return (
    <div className="space-y-5">
      {/* Banner limite de plano */}
      {patientNearLimit && (
        <div className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm border ${
          patientAtLimit
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {patientAtLimit
                ? <>Limite de <strong>{maxPatients}</strong> pacientes atingido. Faça upgrade para cadastrar mais.</>
                : <>Você usou <strong>{patientPct}%</strong> do limite ({patientCount}/{maxPatients} pacientes).</>
              }
            </span>
          </div>
          <a
            href="/profile"
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              patientAtLimit
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            Ver Planos →
          </a>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
          <p className="text-sm text-slate-500">
            {patients.length} paciente{patients.length !== 1 ? 's' : ''} cadastrado{patients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={<Download size={14}/>} onClick={() => exportPatientsCsv(patients)}>
            CSV
          </Button>
          <Button variant="outline" icon={<Upload size={14}/>} onClick={() => setShowImport(true)} disabled={patientAtLimit}>
            Importar
          </Button>
          <Button icon={<Plus size={16} />} onClick={openNew} disabled={patientAtLimit}>
            Novo Paciente
          </Button>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Buscar por nome, CPF ou telefone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all"
            />
          </div>
          <Button
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'h-10 px-3 border border-slate-200',
              showFilters && 'bg-slate-100 border-slate-300'
            )}
          >
            <Filter size={16} className={cn('sm:mr-2', showFilters ? 'text-blue-600' : 'text-slate-500')} />
            <span className="hidden sm:inline">Filtros</span>
            {showFilters ? <ChevronUp size={14} className="ml-1 hidden sm:inline" /> : <ChevronDown size={14} className="ml-1 hidden sm:inline" />}
          </Button>
        </div>

        {showFilters && (
          <Card className="p-4 border-dashed bg-slate-50/50">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Origem</label>
                <select
                  value={filters.origin ?? ''}
                  onChange={e => setFilters(prev => ({ ...prev, origin: e.target.value || undefined }))}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">Todas as origens</option>
                  {ORIGIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</label>
                <select
                  value={filters.is_active === undefined ? '' : filters.is_active ? 'true' : 'false'}
                  onChange={e => setFilters(prev => ({ ...prev, is_active: e.target.value === '' ? undefined : e.target.value === 'true' }))}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">Todos</option>
                  <option value="true">Ativos</option>
                  <option value="false">Inativos</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Recorrência</label>
                <select
                  value={filters.is_recurring === undefined ? '' : filters.is_recurring ? 'true' : 'false'}
                  onChange={e => setFilters(prev => ({ ...prev, is_recurring: e.target.value === '' ? undefined : e.target.value === 'true' }))}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">Todos</option>
                  <option value="true">Recorrentes</option>
                  <option value="false">Não recorrentes</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ is_active: true })}
                  className="h-9 w-full text-slate-500"
                >
                  <X size={14} className="mr-2" /> Limpar Filtros
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <UserCircle2 size={40} className="text-slate-300" />
          <p className="text-slate-500">
            {search ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado ainda.'}
          </p>
          {!search && (
            <Button size="sm" icon={<Plus size={14} />} onClick={openNew}>
              Cadastrar Primeiro Paciente
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {['Paciente', 'CPF', 'Telefone', 'Recorrência', 'Cadastro', ''].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', colorOf(p.full_name))}>
                              {getInitials(p.full_name)}
                            </div>
                            <span className="font-medium text-slate-800">{p.full_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{p.cpf ?? '—'}</td>
                        <td className="px-5 py-3 text-slate-600">{formatPhone(p.phone)}</td>
                        <td className="px-5 py-3">
                          {p.last_purchase ? (
                            (() => {
                              const nextRebuy = addYears(parseISO(p.last_purchase), 1)
                              const overdue = isAfter(new Date(), nextRebuy)
                              return (
                                <div className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  overdue 
                                    ? "bg-rose-50 text-rose-600 border border-rose-100" 
                                    : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                )}>
                                  <Sparkles size={10} />
                                  Sugestão: {formatDate(nextRebuy.toISOString())}
                                </div>
                              )
                            })()
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{formatDate(p.created_at)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setTimelinePatient(p)} title="Linha do tempo" className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors">
                              <Clock size={11} /> Timeline
                            </button>
                            <button onClick={() => setPrescriptionsPatient(p)} className="flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                              <FileText size={11} /> Receitas
                            </button>
                            <button onClick={() => setPostSalePatient(p)} title="Pós-venda / NPS" className="flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors">
                              <Star size={11} /> Pós-venda
                            </button>
                            <button onClick={() => setLgpdPatient(p)} title="LGPD" className="flex items-center gap-1 rounded-lg border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors">
                              <Shield size={11} /> LGPD
                            </button>
                            <button onClick={() => analyzePatient(p)} className="flex items-center gap-1 rounded-lg border border-violet-200 px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50 transition-colors">
                              <Bot size={11} /> IA
                            </button>
                            <button onClick={() => printProntuario(p)} disabled={printingId === p.id} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50">
                              {printingId === p.id ? <Loader2 size={11} className="animate-spin" /> : <Printer size={11} />} PDF
                            </button>
                            <button onClick={() => openEdit(p)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                              <Pencil size={11} /> Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {patients.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', colorOf(p.full_name))}>
                    {getInitials(p.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{p.full_name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      {p.phone && (
                        <span className="flex items-center gap-1"><Phone size={11} />{formatPhone(p.phone)}</span>
                      )}
                      {p.email && (
                        <span className="flex items-center gap-1 truncate"><Mail size={11} />{p.email}</span>
                      )}
                      {p.last_purchase && (
                        (() => {
                          const nextRebuy = addYears(parseISO(p.last_purchase), 1)
                          const overdue = isAfter(new Date(), nextRebuy)
                          return (
                            <span className={cn(
                              "flex items-center gap-1 font-bold",
                              overdue ? "text-rose-600" : "text-emerald-600"
                            )}>
                              <Sparkles size={11} />
                              Recompra: {formatDate(nextRebuy.toISOString())}
                            </span>
                          )
                        })()
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-slate-400">{formatDate(p.created_at)}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setTimelinePatient(p)} className="flex items-center rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50">
                        <Clock size={11} />
                      </button>
                      <button onClick={() => setPrescriptionsPatient(p)} className="flex items-center rounded-lg border border-blue-200 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                        <FileText size={11} />
                      </button>
                      <button onClick={() => setPostSalePatient(p)} className="flex items-center rounded-lg border border-amber-200 px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50">
                        <Star size={11} />
                      </button>
                      <button onClick={() => setLgpdPatient(p)} className="flex items-center rounded-lg border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50">
                        <Shield size={11} />
                      </button>
                      <button onClick={() => analyzePatient(p)} className="flex items-center rounded-lg border border-violet-200 px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50">
                        <Bot size={11} />
                      </button>
                      <button onClick={() => printProntuario(p)} disabled={printingId === p.id} className="flex items-center rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                        {printingId === p.id ? <Loader2 size={11} className="animate-spin" /> : <Printer size={11} />}
                      </button>
                      <button onClick={() => openEdit(p)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                        <Pencil size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <PatientModal
        open={modal}
        onClose={handleClose}
        patient={editing}
        onSuccess={() => { handleClose(); load() }}
      />

      {prescriptionsPatient && (
        <PatientPrescriptionsModal
          open={!!prescriptionsPatient}
          onClose={() => setPrescriptionsPatient(null)}
          patient={prescriptionsPatient}
        />
      )}

      {lgpdPatient && (
        <PatientLGPDModal
          open={!!lgpdPatient}
          onClose={() => setLgpdPatient(null)}
          patient={lgpdPatient}
          onForgotten={load}
        />
      )}

      {timelinePatient && (
        <PatientTimelineModal
          open={!!timelinePatient}
          onClose={() => setTimelinePatient(null)}
          patient={timelinePatient}
        />
      )}

      {postSalePatient && (
        <PatientPostSaleModal
          open={!!postSalePatient}
          onClose={() => setPostSalePatient(null)}
          patient={postSalePatient}
        />
      )}

      <ImportPatientsModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => { setShowImport(false); load() }}
      />

      {/* Modal Análise IA */}
      {aiPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-violet-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Análise IA — {aiPatient.full_name}</p>
                  <p className="text-[11px] text-slate-500">Insights de relacionamento · Powered by Gemini</p>
                </div>
              </div>
              <button onClick={() => { setAiPatient(null); setAiResult('') }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {aiLoading ? (
                <div className="flex flex-col items-center gap-4 py-10">
                  <div className="flex gap-1.5">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <p className="text-sm text-slate-500">Analisando perfil do paciente…</p>
                </div>
              ) : (
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{aiResult}</p>
              )}
            </div>
            {!aiLoading && aiResult && (
              <div className="px-6 pb-5">
                <button
                  onClick={() => { setAiPatient(null); setAiResult('') }}
                  className="w-full rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
