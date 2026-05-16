import { useState, useEffect } from 'react'
import {
  Star, ShieldCheck, Wrench, Settings2, MessageSquareWarning,
  RefreshCw, Plus, CheckCircle2, Loader2, Clock,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { getPatientPostSales, createPostSale, resolvePostSale } from '@/services/postsale.service'
import { formatDate, cn } from '@/lib/utils'
import type { Patient, PostSale, PostSaleType, POST_SALE_LABELS } from '@/types'
import { POST_SALE_LABELS as LABELS } from '@/types'

interface Props {
  open:    boolean
  onClose: () => void
  patient: Patient
}

type Step = 'list' | 'new'

const TYPE_CONFIG: Record<PostSaleType, { icon: React.ReactNode; color: string; bg: string }> = {
  nps:         { icon: <Star size={14} />,                  color: 'text-amber-600',  bg: 'bg-amber-100' },
  garantia:    { icon: <ShieldCheck size={14} />,           color: 'text-emerald-600',bg: 'bg-emerald-100' },
  assistencia: { icon: <Wrench size={14} />,                color: 'text-blue-600',   bg: 'bg-blue-100' },
  ajuste:      { icon: <Settings2 size={14} />,             color: 'text-indigo-600', bg: 'bg-indigo-100' },
  reclamacao:  { icon: <MessageSquareWarning size={14} />,  color: 'text-red-600',    bg: 'bg-red-100' },
  recompra:    { icon: <RefreshCw size={14} />,             color: 'text-violet-600', bg: 'bg-violet-100' },
}

const NPS_LABELS: Record<number, string> = {
  1: 'Péssimo', 2: 'Ruim', 3: 'Ruim', 4: 'Regular', 5: 'Regular',
  6: 'Neutro', 7: 'Bom', 8: 'Bom', 9: 'Excelente', 10: 'Excelente',
}

function npsColor(score: number) {
  if (score >= 9) return 'text-emerald-600'
  if (score >= 7) return 'text-blue-600'
  if (score >= 5) return 'text-amber-600'
  return 'text-red-600'
}

export function PatientPostSaleModal({ open, onClose, patient }: Props) {
  const [step,      setStep]      = useState<Step>('list')
  const [records,   setRecords]   = useState<PostSale[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [type,      setType]      = useState<PostSaleType>('nps')
  const [npsScore,  setNpsScore]  = useState<number>(10)
  const [notes,     setNotes]     = useState('')
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!open) { setStep('list'); resetForm(); return }
    load()
  }, [open, patient.id])

  async function load() {
    setLoading(true)
    setRecords(await getPatientPostSales(patient.id))
    setLoading(false)
  }

  function resetForm() {
    setType('nps'); setNpsScore(10); setNotes(''); setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const saved = await createPostSale({
        patient_id: patient.id,
        type,
        nps_score:  type === 'nps' ? npsScore : undefined,
        notes:      notes || undefined,
        resolved:   false,
      })
      setRecords(prev => [saved, ...prev])
      setStep('list')
      resetForm()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleResolve(id: string) {
    await resolvePostSale(id)
    setRecords(prev => prev.map(r => r.id === id ? { ...r, resolved: true } : r))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pós-venda — ${patient.full_name}`}
      size="lg"
    >
      <div className="space-y-4 py-2">

        {step === 'list' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {loading ? 'Carregando...' : `${records.length} registro${records.length !== 1 ? 's' : ''}`}
              </p>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setStep('new')}>
                Novo Registro
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10 text-slate-400">
                <Loader2 size={22} className="animate-spin" />
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-slate-400">
                <Clock size={32} />
                <p className="text-sm">Nenhum registro de pós-venda ainda.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {records.map(r => {
                  const cfg = TYPE_CONFIG[r.type]
                  return (
                    <div key={r.id} className={cn(
                      'rounded-xl border p-4 space-y-2',
                      r.resolved ? 'border-slate-100 bg-slate-50/50 opacity-70' : 'border-slate-200 bg-white',
                    )}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn('flex h-7 w-7 items-center justify-center rounded-full', cfg.bg, cfg.color)}>
                            {cfg.icon}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">{LABELS[r.type]}</span>
                          {r.type === 'nps' && r.nps_score !== undefined && (
                            <span className={cn('text-xs font-bold', npsColor(r.nps_score))}>
                              {r.nps_score}/10 — {NPS_LABELS[r.nps_score]}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <time className="text-[11px] text-slate-400">{formatDate(r.created_at)}</time>
                          {r.resolved ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 size={10} /> Resolvido
                            </span>
                          ) : (
                            <button
                              onClick={() => handleResolve(r.id)}
                              className="rounded-lg border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              Marcar resolvido
                            </button>
                          )}
                        </div>
                      </div>
                      {r.notes && <p className="text-xs text-slate-500 pl-9">{r.notes}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {step === 'new' && (
          <div className="space-y-4">
            {/* Tipo */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo de Registro</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(TYPE_CONFIG) as PostSaleType[]).map(t => {
                  const cfg = TYPE_CONFIG[t]
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all',
                        type === t
                          ? `${cfg.bg} ${cfg.color} border-transparent ring-2 ring-offset-1`
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                        type === t && t === 'nps'      && 'ring-amber-400',
                        type === t && t === 'garantia' && 'ring-emerald-400',
                        type === t && t === 'assistencia' && 'ring-blue-400',
                        type === t && t === 'ajuste'   && 'ring-indigo-400',
                        type === t && t === 'reclamacao' && 'ring-red-400',
                        type === t && t === 'recompra' && 'ring-violet-400',
                      )}
                    >
                      {cfg.icon}
                      {LABELS[t]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* NPS */}
            {type === 'nps' && (
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Nota de Satisfação — {npsScore}/10 ({NPS_LABELS[npsScore]})
                </label>
                <div className="flex gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNpsScore(n)}
                      className={cn(
                        'flex-1 rounded-lg py-2 text-xs font-bold transition-all',
                        npsScore === n
                          ? n >= 9 ? 'bg-emerald-500 text-white' : n >= 7 ? 'bg-blue-500 text-white' : n >= 5 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Observações</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder={type === 'nps' ? 'O que o cliente comentou?' : 'Descreva o ocorrido...'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setStep('list'); resetForm() }}>Cancelar</Button>
              <Button loading={saving} onClick={handleSave}>Salvar Registro</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
