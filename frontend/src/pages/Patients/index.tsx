import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Phone, Mail, UserCircle2, Pencil, FileText, Shield, Clock, Star, Filter, ChevronDown, ChevronUp, X, Sparkles } from 'lucide-react'
import { addYears, isAfter, parseISO } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { PatientModal } from '@/components/patients/PatientModal'
import { PatientPrescriptionsModal } from '@/components/patients/PatientPrescriptionsModal'
import { PatientLGPDModal } from '@/components/patients/PatientLGPDModal'
import { PatientTimelineModal } from '@/components/patients/PatientTimelineModal'
import { PatientPostSaleModal } from '@/components/patients/PatientPostSaleModal'
import { formatDate, formatPhone, getInitials, cn } from '@/lib/utils'
import { getPatients, type PatientFilters } from '@/services/patients.service'
import { pullFromServer } from '@/services/sync.service'
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
  const [patients, setPatients] = useState<Patient[]>([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [ready,    setReady]    = useState(!navigator.onLine)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<PatientFilters>({
    is_active: true,
  })

  const [modal,               setModal]               = useState(false)
  const [editing,             setEditing]             = useState<Patient | null>(null)
  const [prescriptionsPatient, setPrescriptionsPatient] = useState<Patient | null>(null)
  const [lgpdPatient,      setLgpdPatient]      = useState<Patient | null>(null)
  const [timelinePatient,  setTimelinePatient]  = useState<Patient | null>(null)
  const [postSalePatient,  setPostSalePatient]  = useState<Patient | null>(null)

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

  function openNew() {
    setEditing(null)
    setModal(true)
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
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
          <p className="text-sm text-slate-500">
            {patients.length} paciente{patients.length !== 1 ? 's' : ''} cadastrado{patients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openNew}>
          Novo Paciente
        </Button>
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
    </div>
  )
}
