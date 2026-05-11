import { useState, useEffect, useRef } from 'react'
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, X, ScanLine } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { createPatient, updatePatient } from '@/services/patients.service'
import type { Patient, PatientFormData } from '@/types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

interface PatientModalProps {
  open:       boolean
  onClose:    () => void
  onSuccess?: (patient: Patient) => void
  patient?:   Patient | null
}

const empty: PatientFormData = {
  full_name: '', cpf: '', phone: '', whatsapp: '',
  email: '', gender: 'M', notes: '', is_active: true,
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
  const [formData,  setFormData]  = useState<PatientFormData>(empty)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanError, setScanError] = useState<string | null>(null)
  const [preview,   setPreview]   = useState<string | null>(null)

  const fileRef   = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null); setScanState('idle'); setScanError(null)
    clearPreview()
    if (patient) {
      setFormData({
        full_name: patient.full_name,
        cpf:       patient.cpf      || '',
        phone:     patient.phone,
        whatsapp:  patient.whatsapp || '',
        email:     patient.email    || '',
        gender:    patient.gender   || 'M',
        notes:     patient.notes    || '',
        is_active: patient.is_active,
      })
    } else {
      setFormData(empty)
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

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>
            {patient ? 'Salvar Alterações' : 'Cadastrar Paciente'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
