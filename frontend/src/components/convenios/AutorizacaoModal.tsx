import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getPatients } from '@/services/patients.service'
import { createAutorizacao, updateAutorizacao } from '@/services/convenio-autorizacoes.service'
import type { Convenio, ConvenioAutorizacao, ConvenioAutorizacaoFormData, AutorizacaoStatus } from '@/types'
import { AUTORIZACAO_STATUS_LABELS } from '@/types'

interface Props {
  open: boolean
  convenios: Convenio[]
  autorizacao?: ConvenioAutorizacao | null
  onClose: () => void
  onSuccess: () => void
}

const EMPTY: ConvenioAutorizacaoFormData = {
  convenio_id: '',
  patient_id:  '',
  auth_number: '',
  procedure:   '',
  valid_from:  '',
  valid_until: '',
  status:      'pendente',
  notes:       '',
}

export function AutorizacaoModal({ open, convenios, autorizacao, onClose, onSuccess }: Props) {
  const [form,     setForm]     = useState<ConvenioAutorizacaoFormData>(EMPTY)
  const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    if (!open) return
    setError(null)
    if (autorizacao) {
      setForm({
        convenio_id: autorizacao.convenio_id,
        patient_id:  autorizacao.patient_id,
        auth_number: autorizacao.auth_number,
        procedure:   autorizacao.procedure ?? '',
        valid_from:  autorizacao.valid_from ?? '',
        valid_until: autorizacao.valid_until ?? '',
        status:      autorizacao.status,
        notes:       autorizacao.notes ?? '',
      })
    } else {
      setForm(EMPTY)
    }
    getPatients().then(list => setPatients(list.map(p => ({ id: p.id, full_name: p.full_name }))))
  }, [open, autorizacao])

  const filteredPatients = search
    ? patients.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase()))
    : patients

  function set(key: keyof ConvenioAutorizacaoFormData, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.convenio_id || !form.patient_id || !form.auth_number) {
      setError('Convênio, paciente e número de autorização são obrigatórios.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (autorizacao) {
        await updateAutorizacao(autorizacao.id, form)
      } else {
        await createAutorizacao(form)
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Erro ao salvar autorização.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-900">
            {autorizacao ? 'Editar Autorização' : 'Nova Autorização'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {/* Convênio */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Convênio *</label>
            <select
              value={form.convenio_id}
              onChange={e => set('convenio_id', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {convenios.filter(c => c.is_active).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Paciente */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Paciente *</label>
            <Input
              placeholder="Buscar paciente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="mb-1"
            />
            <select
              value={form.patient_id}
              onChange={e => set('patient_id', e.target.value)}
              size={4}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {filteredPatients.slice(0, 50).map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>

          {/* Número + Procedimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nº Autorização *</label>
              <Input
                value={form.auth_number}
                onChange={e => set('auth_number', e.target.value)}
                placeholder="Ex: AUTH-2026-001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Procedimento</label>
              <Input
                value={form.procedure ?? ''}
                onChange={e => set('procedure', e.target.value)}
                placeholder="Ex: Óculos grau"
              />
            </div>
          </div>

          {/* Vigência */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Válido de</label>
              <input
                type="date"
                value={form.valid_from ?? ''}
                onChange={e => set('valid_from', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Válido até</label>
              <input
                type="date"
                value={form.valid_until ?? ''}
                onChange={e => set('valid_until', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value as AutorizacaoStatus)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(AUTORIZACAO_STATUS_LABELS) as AutorizacaoStatus[]).map(s => (
                <option key={s} value={s}>{AUTORIZACAO_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observações</label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Informações adicionais..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit as any} disabled={saving}>
            {saving ? 'Salvando...' : autorizacao ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
