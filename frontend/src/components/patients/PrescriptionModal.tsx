import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PrescriptionFields } from '@/components/sales/PrescriptionFields'
import { createPrescription, updatePrescription } from '@/services/prescriptions.service'
import type { Patient, Prescription, PrescriptionFormData, LensType } from '@/types'

const LENS_TYPE_OPTIONS: { value: LensType | ''; label: string }[] = [
  { value: '',           label: 'Não especificado' },
  { value: 'monofocal',  label: 'Monofocal' },
  { value: 'bifocal',    label: 'Bifocal' },
  { value: 'multifocal', label: 'Multifocal' },
  { value: 'ocupacional',label: 'Ocupacional' },
  { value: 'solar',      label: 'Solar' },
  { value: 'contato',    label: 'Lente de Contato' },
]

interface Props {
  open:        boolean
  onClose:     () => void
  patient:     Patient
  prescription?: Prescription | null
  onSuccess:   (p: Prescription) => void
}

const emptyFields: Partial<PrescriptionFormData> = {
  od_esf: undefined, od_cil: undefined, od_eixo: undefined,
  od_add: undefined, od_dnp: undefined, od_altura: undefined,
  oe_esf: undefined, oe_cil: undefined, oe_eixo: undefined,
  oe_add: undefined, oe_dnp: undefined, oe_altura: undefined,
  doctor_name: undefined, crm: undefined, exam_date: undefined,
}

export function PrescriptionModal({ open, onClose, patient, prescription, onSuccess }: Props) {
  const [fields,      setFields]      = useState<Partial<PrescriptionFormData>>(emptyFields)
  const [validUntil,  setValidUntil]  = useState('')
  const [notes,       setNotes]       = useState('')
  const [lensType,    setLensType]    = useState<LensType | ''>('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (prescription) {
      setFields({
        od_esf:      prescription.od_esf,
        od_cil:      prescription.od_cil,
        od_eixo:     prescription.od_eixo,
        od_add:      prescription.od_add,
        od_dnp:      prescription.od_dnp,
        od_altura:   prescription.od_altura,
        oe_esf:      prescription.oe_esf,
        oe_cil:      prescription.oe_cil,
        oe_eixo:     prescription.oe_eixo,
        oe_add:      prescription.oe_add,
        oe_dnp:      prescription.oe_dnp,
        oe_altura:   prescription.oe_altura,
        doctor_name: prescription.doctor_name,
        crm:         prescription.crm,
        exam_date:   prescription.exam_date,
      })
      setValidUntil(prescription.valid_until ?? '')
      setNotes(prescription.notes ?? '')
      setLensType(prescription.lens_type ?? '')
    } else {
      setFields(emptyFields)
      setValidUntil('')
      setNotes('')
      setLensType('')
    }
  }, [open, prescription])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      let saved: Prescription
      const lens_type = lensType || undefined
      if (prescription) {
        saved = await updatePrescription(prescription.id, {
          ...fields,
          lens_type,
          valid_until: validUntil || undefined,
          notes:       notes || undefined,
        })
      } else {
        saved = await createPrescription({
          ...fields,
          patient_id:  patient.id,
          lens_type,
          valid_until: validUntil || undefined,
          notes:       notes || undefined,
        } as PrescriptionFormData)
      }
      onSuccess(saved)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar receita.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={prescription ? 'Editar Receita' : 'Nova Receita'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {/* Paciente */}
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
            {patient.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{patient.full_name}</p>
            <p className="text-xs text-slate-500">{patient.phone}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Campos OD/OE + médico + data exame */}
        <PrescriptionFields
          value={fields}
          onChange={patch => setFields(prev => ({ ...prev, ...patch }))}
        />

        {/* Campos extras */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Tipo de Lente</label>
            <select
              value={lensType}
              onChange={e => setLensType(e.target.value as LensType | '')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none bg-white"
            >
              {LENS_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Válida até"
            type="date"
            value={validUntil}
            onChange={e => setValidUntil(e.target.value)}
          />
          <Input
            label="Observações"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Indicação, restrições, etc."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {prescription ? 'Salvar Alterações' : 'Salvar Receita'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
