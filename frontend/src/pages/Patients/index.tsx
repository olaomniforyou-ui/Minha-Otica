import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Phone, Mail, UserCircle2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { PatientModal } from '@/components/patients/PatientModal'
import { formatDate, formatPhone, getInitials, cn } from '@/lib/utils'
import { getPatients } from '@/services/patients.service'
import { pullFromServer } from '@/services/sync.service'
import type { Patient } from '@/types'

const COLORS = [
  'bg-blue-500','bg-emerald-500','bg-violet-500',
  'bg-rose-500','bg-amber-500','bg-cyan-500',
]
function colorOf(name: string) {
  return COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [ready,    setReady]    = useState(!navigator.onLine)
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState<Patient | null>(null)

  useEffect(() => {
    if (!navigator.onLine) { setReady(true); return }
    pullFromServer().catch(() => {}).finally(() => setReady(true))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setPatients(await getPatients(search || undefined))
    setLoading(false)
  }, [search])

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

      {/* Busca */}
      <Input
        placeholder="Buscar por nome, CPF ou telefone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        icon={<Search size={16} />}
      />

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
                      {['Paciente', 'CPF', 'Telefone', 'E-mail', 'Cadastro', ''].map((h) => (
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
                        <td className="px-5 py-3 text-slate-600">{p.email ?? '—'}</td>
                        <td className="px-5 py-3 text-slate-600">{formatDate(p.created_at)}</td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => openEdit(p)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                          >
                            <Pencil size={11} /> Editar
                          </button>
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
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-slate-400">{formatDate(p.created_at)}</span>
                    <button
                      onClick={() => openEdit(p)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Pencil size={11} /> Editar
                    </button>
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
    </div>
  )
}
