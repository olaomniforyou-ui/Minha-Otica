import { useRef, useState } from 'react'
import { FileText, Camera, Upload, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import type { PrescriptionFormData } from '@/types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

interface Props {
  value: Partial<PrescriptionFormData>
  onChange: (patch: Partial<PrescriptionFormData>) => void
}

function OpticalInput({
  value, onChange, step = '0.25', min, max,
}: {
  value?: number
  onChange: (v: number | undefined) => void
  step?: string
  min?: string
  max?: string
}) {
  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={value ?? ''}
      onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary-500"
    />
  )
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

export function PrescriptionFields({ value, onChange }: Props) {
  const set = (k: keyof PrescriptionFormData) => (v: any) => onChange({ [k]: v })
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanError, setScanError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  async function handleFile(file: File) {
    setScanState('loading')
    setScanError(null)
    setPreview(URL.createObjectURL(file))

    try {
      const { data, mediaType } = await toBase64(file)
      const res = await fetch(`${API_URL}/api/prescription/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: data, mediaType }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro na extração.' }))
        throw new Error(err.error ?? 'Erro na extração.')
      }

      const { data: parsed } = await res.json()

      // Aplica apenas campos não nulos retornados pela IA
      const patch: Partial<PrescriptionFormData> = {}
      const fields: (keyof PrescriptionFormData)[] = [
        'od_esf','od_cil','od_eixo','od_add','od_dnp','od_altura',
        'oe_esf','oe_cil','oe_eixo','oe_add','oe_dnp','oe_altura',
        'doctor_name','crm','exam_date',
      ]
      for (const f of fields) {
        if (parsed[f] !== null && parsed[f] !== undefined) {
          ;(patch as any)[f] = parsed[f]
        }
      }
      onChange(patch)
      setScanState('success')
    } catch (err: any) {
      setScanError(err.message ?? 'Falha ao processar imagem.')
      setScanState('error')
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function clearPreview() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setScanState('idle')
    setScanError(null)
  }

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">Dados da Receita</span>
        </div>

        {/* Botões de scan */}
        <div className="flex items-center gap-2">
          {scanState === 'loading' && (
            <span className="flex items-center gap-1.5 text-xs text-blue-600">
              <Loader2 size={13} className="animate-spin" /> Lendo receita...
            </span>
          )}
          {scanState === 'success' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 size={13} /> Preenchido automaticamente
            </span>
          )}

          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={scanState === 'loading'}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition-colors"
            title="Tirar foto da receita"
          >
            <Camera size={13} /> Câmera
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={scanState === 'loading'}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition-colors"
            title="Upload da receita"
          >
            <Upload size={13} /> Upload
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleInputChange}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      </div>

      {/* Preview da imagem + erro */}
      {preview && (
        <div className="relative flex items-start gap-3 rounded-lg border border-blue-200 bg-white p-2">
          <img src={preview} alt="Receita" className="h-20 w-20 rounded object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            {scanState === 'loading' && (
              <p className="text-xs text-slate-500">Analisando com IA...</p>
            )}
            {scanState === 'success' && (
              <p className="text-xs text-emerald-700 font-medium">
                Campos preenchidos! Confira e corrija se necessário.
              </p>
            )}
            {scanState === 'error' && (
              <div className="flex items-start gap-1.5">
                <AlertCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-600">{scanError}</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={clearPreview}
            className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabela OD / OE */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="pb-1 text-left text-[11px] font-semibold text-slate-500 w-14" />
              <th className="pb-1 text-center text-[11px] font-semibold text-slate-700">Esf</th>
              <th className="pb-1 text-center text-[11px] font-semibold text-slate-700">Cil</th>
              <th className="pb-1 text-center text-[11px] font-semibold text-slate-700">Eixo</th>
              <th className="pb-1 text-center text-[11px] font-semibold text-slate-700">Add</th>
              <th className="pb-1 text-center text-[11px] font-semibold text-slate-700">DNP</th>
              <th className="pb-1 text-center text-[11px] font-semibold text-slate-700">Altura</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pr-2 py-1">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">OD</span>
              </td>
              <td className="px-1 py-1"><OpticalInput value={value.od_esf} onChange={set('od_esf')} min="-25" max="25" /></td>
              <td className="px-1 py-1"><OpticalInput value={value.od_cil} onChange={set('od_cil')} min="-10" max="10" /></td>
              <td className="px-1 py-1"><OpticalInput value={value.od_eixo} onChange={set('od_eixo')} step="1" min="0" max="180" /></td>
              <td className="px-1 py-1"><OpticalInput value={value.od_add} onChange={set('od_add')} min="0" max="4" /></td>
              <td className="px-1 py-1"><OpticalInput value={value.od_dnp} onChange={set('od_dnp')} step="0.5" min="20" max="40" /></td>
              <td className="px-1 py-1"><OpticalInput value={value.od_altura} onChange={set('od_altura')} step="1" min="10" max="40" /></td>
            </tr>
            <tr>
              <td className="pr-2 py-1">
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">OE</span>
              </td>
              <td className="px-1 py-1"><OpticalInput value={value.oe_esf} onChange={set('oe_esf')} min="-25" max="25" /></td>
              <td className="px-1 py-1"><OpticalInput value={value.oe_cil} onChange={set('oe_cil')} min="-10" max="10" /></td>
              <td className="px-1 py-1"><OpticalInput value={value.oe_eixo} onChange={set('oe_eixo')} step="1" min="0" max="180" /></td>
              <td className="px-1 py-1"><OpticalInput value={value.oe_add} onChange={set('oe_add')} min="0" max="4" /></td>
              <td className="px-1 py-1"><OpticalInput value={value.oe_dnp} onChange={set('oe_dnp')} step="0.5" min="20" max="40" /></td>
              <td className="px-1 py-1"><OpticalInput value={value.oe_altura} onChange={set('oe_altura')} step="1" min="10" max="40" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dados do médico */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          label="Médico"
          value={value.doctor_name ?? ''}
          onChange={e => onChange({ doctor_name: e.target.value || undefined })}
          placeholder="Nome do médico"
        />
        <Input
          label="CRM"
          value={value.crm ?? ''}
          onChange={e => onChange({ crm: e.target.value || undefined })}
          placeholder="CRM"
        />
        <Input
          label="Data do Exame"
          type="date"
          value={value.exam_date ?? ''}
          onChange={e => onChange({ exam_date: e.target.value || undefined })}
        />
      </div>
    </div>
  )
}
