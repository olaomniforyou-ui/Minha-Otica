import { useState, useEffect, useRef } from 'react'
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, X, ScanLine, Shield } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { createPatient, updatePatient } from '@/services/patients.service'
import { recordConsent } from '@/services/lgpd.service'
import type { Patient, PatientFormData } from '@/types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

interface PatientModalProps {
  open:       boolean
  onClose:    () => void
  onSuccess?: (patient: Patient) => void
  patient?:   Patient | null
}

const ORIGIN_OPTIONS = [
  { value: '',          label: 'Não informado' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google',    label: 'Google' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'walk_in',   label: 'Walk-in (entrou na loja)' },
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'convenio',  label: 'Convênio' },
  { value: 'outro',     label: 'Outro' },
]

const empty: PatientFormData = {
  full_name: '', cpf: '', phone: '', whatsapp: '',
  email: '', gender: 'M', notes: '', is_active: true,
  origin: undefined, tags: [], frame_preference: '', lens_preference: '',
  next_repurchase_date: '', is_recurring: false,
}

type ScanState = 'idle' | 'loading' | 'success' | 'error'

async function toBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [header, data] = result.split(',')
      const mediaType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg'
      resolve({ data, mediaType })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function PatientModal({ open, onClose, onSuccess, patient }: PatientModalProps) {
  const [formData,    setFormData]    = useState<PatientFormData>(empty)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [scanState,   setScanState]   = useState<ScanState>('idle')
  const [scanError,   setScanError]   = useState<string | null>(null)
  const [preview,     setPreview]     = useState<string | null>(null)
  const [lgpdOk,      setLgpdOk]      = useState(false)
  const [tagInput,    setTagInput]     = useState('')
  const [showCRM,     setShowCRM]     = useState(false)

  const fileRef   = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null); setScanState('idle'); setScanError(null); setLgpdOk(false); setTagInput('')
    clearPreview()
    if (patient) {
      setFormData({
        full_name:            patient.full_name,
        cpf:                  patient.cpf                   || '',
        phone:                patient.phone,
        whatsapp:             patient.whatsapp              || '',
        email:                patient.email                 || '',
        gender:               patient.gender                || 'M',
        notes:                patient.notes                 || '',
        is_active:            patient.is_active,
        origin:               patient.origin,
        tags:                 patient.tags                  || [],
        frame_preference:     patient.frame_preference      || '',
        lens_preference:      patient.lens_preference       || '',
        next_repurchase_date: patient.next_repurchase_date  || '',
        is_recurring:         patient.is_recurring          || false,
      })
      setShowCRM(!!(patient.origin || patient.tags?.length || patient.frame_preference || patient.lens_preference))
    } else {
      setFormData(empty)
      setShowCRM(false)
    }
  }, [patient, open])

  const set = (k: keyof PatientFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData(prev => ({ ...prev, [k]: e.target.value }))

  function clearPreview() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setScanState('idle')
    setScanError(null)
  }

  async function handleDocumentFile(file: File) {
    setScanState('loading')
    setScanError(null)
    setPreview(URL.createObjectURL(file))
    try {
      const { data, mediaType } = await toBase64(file)
      const res = await fetch(`${API_URL}/api/document/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: data, mediaType }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro na extração.' }))
        throw new Error(err.error ?? 'Erro na extração.')
      }
      const { data: parsed } = await res.json()
      setFormData(prev => ({
        ...prev,
        ...(parsed.full_name  ? { full_name:  parsed.full_name }  : {}),
        ...(parsed.cpf        ? { cpf:        parsed.cpf }        : {}),
        ...(parsed.rg         ? { rg:         parsed.rg }         : {}),
        ...(parsed.birth_date ? { birth_date: parsed.birth_date } : {}),
        ...(parsed.gender     ? { gender:     parsed.gender }     : {}),
      }))
      setScanState('success')
    } catch (err: any) {
      setScanError(err.message ?? 'Falha ao processar documento.')
      setScanState('error')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleDocumentFile(file)
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (patient) {
        const updated = await updatePatient(patient.id, formData)
        onSuccess?.(updated)
      } else {
        const created = await createPatient(formData)
        if (lgpdOk) recordConsent(created.id).catch(() => {})
        onSuccess?.(created)
      }
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar paciente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={patient ? 'Editar Paciente' : 'Novo Paciente'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Leitor de documento */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ScanLine size={14} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Ler documento (RG / CNH / CPF)</span>
            </div>
            <div className="flex items-center gap-2">
              {scanState === 'loading' && (
                <span className="flex items-center gap-1 text-xs text-blue-600">
                  <Loader2 size={12} className="animate-spin" /> Lendo...
                </span>
              )}
              {scanState === 'success' && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 size={12} /> Preenchido!
                </span>
              )}
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                disabled={scanState === 'loading'}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <Camera size={12} /> Câmera
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={scanState === 'loading'}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <Upload size={12} /> Upload
              </button>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-2">
              <img src={preview} alt="Documento" className="h-16 w-16 rounded object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                {scanState === 'loading' && <p className="text-xs text-slate-500">Analisando com IA...</p>}
                {scanState === 'success' && <p className="text-xs text-emerald-700 font-medium">Campos preenchidos! Confira e corrija se necessário.</p>}
                {scanState === 'error' && (
                  <div className="flex items-start gap-1">
                    <AlertCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-600">{scanError}</p>
                  </div>
                )}
              </div>
              <button type="button" onClick={clearPreview} className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Campos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nome Completo" required
            value={formData.full_name} onChange={set('full_name')}
            placeholder="Ex: João Silva"
          />
          <Input
            label="CPF"
            value={formData.cpf} onChange={set('cpf')}
            placeholder="000.000.000-00"
          />
          <Input
            label="Telefone" required
            value={formData.phone} onChange={set('phone')}
            placeholder="(00) 00000-0000"
          />
          <Input
            label="WhatsApp"
            value={formData.whatsapp} onChange={set('whatsapp')}
            placeholder="(00) 00000-0000"
          />
          <Input
            label="E-mail" type="email"
            value={formData.email} onChange={set('email')}
            placeholder="cliente@email.com"
          />
          <Select
            label="Gênero"
            value={formData.gender}
            onChange={set('gender')}
            options={[
              { value: 'M',     label: 'Masculino' },
              { value: 'F',     label: 'Feminino'  },
              { value: 'outro', label: 'Outro'     },
            ]}
          />
        </div>

        <Input
          label="Observações"
          value={formData.notes} onChange={set('notes')}
          placeholder="Alergias, preferências, etc."
        />

        {/* Seção CRM — colapsível */}
        <div className="rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setShowCRM(v => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <span>Informações CRM (origem, tags, preferências)</span>
            <span className="text-slate-400">{showCRM ? '▲' : '▼'}</span>
          </button>
          {showCRM && (
            <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Origem do Cliente</label>
                  <select
                    value={formData.origin ?? ''}
                    onChange={e => setFormData(prev => ({ ...prev, origin: e.target.value as any || undefined }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none bg-white"
                  >
                    {ORIGIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <Input
                  label="Próxima Recompra"
                  type="date"
                  value={formData.next_repurchase_date ?? ''}
                  onChange={e => setFormData(prev => ({ ...prev, next_repurchase_date: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Preferência de Armação"
                  value={formData.frame_preference ?? ''}
                  onChange={e => setFormData(prev => ({ ...prev, frame_preference: e.target.value }))}
                  placeholder="Ex: acetato, titanio, sem aro..."
                />
                <Input
                  label="Preferência de Lente"
                  value={formData.lens_preference ?? ''}
                  onChange={e => setFormData(prev => ({ ...prev, lens_preference: e.target.value }))}
                  placeholder="Ex: antirreflexo, transitions..."
                />
              </div>
              {/* Tags */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(formData.tags ?? []).map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {tag}
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) }))} className="hover:text-blue-900">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        const tag = tagInput.trim()
                        if (tag && !(formData.tags ?? []).includes(tag)) {
                          setFormData(prev => ({ ...prev, tags: [...(prev.tags ?? []), tag] }))
                        }
                        setTagInput('')
                      }
                    }}
                    placeholder="Digite e pressione Enter..."
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none"
                  />
                </div>
              </div>
              {/* Recorrente */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_recurring ?? false}
                  onChange={e => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span className="text-xs text-slate-700 font-medium">Cliente recorrente</span>
              </label>
            </div>
          )}
        </div>

        {/* Consentimento LGPD — apenas no cadastro */}
        {!patient && (
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer hover:border-indigo-300 transition-colors">
            <input
              type="checkbox"
              checked={lgpdOk}
              onChange={e => setLgpdOk(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex items-start gap-2">
              <Shield size={14} className="mt-0.5 shrink-0 text-indigo-500" />
              <span className="text-xs text-slate-700">
                O paciente foi informado e concordou com os{' '}
                <span className="font-semibold text-indigo-600">Termos de Uso e Política de Privacidade</span>{' '}
                (LGPD — Lei 13.709/2018). O consentimento será registrado com data e hora.
              </span>
            </div>
          </label>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading} disabled={!patient && !lgpdOk}>
            {patient ? 'Salvar Alterações' : 'Cadastrar Paciente'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
