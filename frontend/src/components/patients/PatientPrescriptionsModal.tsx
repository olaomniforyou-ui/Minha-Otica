import { useState, useEffect, useCallback } from 'react'
import { Plus, FileText, Pencil, Trash2, AlertTriangle, Clock, CheckCircle2, Loader2, Paperclip, Printer } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PrescriptionModal } from './PrescriptionModal'
import { getPatientPrescriptions, deletePrescription } from '@/services/prescriptions.service'
import { formatDate, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Patient, Prescription } from '@/types'

interface Props {
  open:    boolean
  onClose: () => void
  patient: Patient
}

// ─── Validade ─────────────────────────────────────────────────────────────
function ValidityBadge({ validUntil }: { validUntil?: string }) {
  if (!validUntil) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
        Sem validade
      </span>
    )
  }

  const today    = new Date()
  const expiry   = new Date(validUntil)
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
        <AlertTriangle size={10} /> Expirada
      </span>
    )
  }
  if (diffDays <= 30) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        <Clock size={10} /> Vence em {diffDays}d
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      <CheckCircle2 size={10} /> Válida até {formatDate(validUntil)}
    </span>
  )
}

// ─── Formatação de valor óptico ───────────────────────────────────────────
function fmtOpt(v?: number): string {
  if (v === undefined || v === null) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}`
}

function fmtInt(v?: number): string {
  return v !== undefined && v !== null ? String(v) : '—'
}

// ─── Imprimir receita ────────────────────────────────────────────────────
function printPrescription(rx: Prescription, patientName: string, companyName: string) {
  const fmtOpt = (v?: number) => v !== undefined && v !== null ? (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)) : '—'
  const fmtInt = (v?: number) => v !== undefined && v !== null ? String(v) : '—'
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Receita Óptica — ${patientName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 32px; max-width: 700px; margin: auto; }
  h1 { font-size: 18px; font-weight: 700; color: #3730a3; margin-bottom: 2px; }
  .sub { font-size: 11px; color: #64748b; margin-bottom: 20px; }
  .section { margin-bottom: 16px; }
  .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #94a3b8; margin-bottom: 4px; }
  .value { font-size: 13px; font-weight: 600; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center; font-size: 12px; }
  th { background: #f8fafc; font-weight: 700; font-size: 11px; }
  .eye-od { background: #eff6ff; font-weight: 700; color: #1d4ed8; }
  .eye-oe { background: #eef2ff; font-weight: 700; color: #4338ca; }
  .notes { margin-top: 12px; padding: 10px 12px; background: #f8fafc; border-left: 3px solid #6366f1; font-style: italic; color: #475569; font-size: 12px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
  .sig { margin-top: 48px; text-align: center; font-size: 11px; color: #64748b; }
  .sig-line { border-top: 1px solid #94a3b8; width: 200px; margin: 0 auto 4px; }
  @media print { body { padding: 16px; } }
</style></head><body>
  <h1>${companyName}</h1>
  <p class="sub">Receita Óptica</p>
  <div style="display:flex;gap:24px;margin-bottom:16px">
    <div class="section"><p class="label">Paciente</p><p class="value">${patientName}</p></div>
    ${rx.exam_date ? `<div class="section"><p class="label">Data do Exame</p><p class="value">${formatDate(rx.exam_date)}</p></div>` : ''}
    ${rx.valid_until ? `<div class="section"><p class="label">Válida até</p><p class="value">${formatDate(rx.valid_until)}</p></div>` : ''}
  </div>
  <table>
    <thead><tr><th></th><th>Esférico</th><th>Cilíndrico</th><th>Eixo</th><th>Add</th><th>DNP</th><th>Altura</th></tr></thead>
    <tbody>
      <tr><td class="eye-od">OD</td><td>${fmtOpt(rx.od_esf)}</td><td>${fmtOpt(rx.od_cil)}</td><td>${fmtInt(rx.od_eixo)}${rx.od_eixo !== undefined && rx.od_eixo !== null ? '°' : ''}</td><td>${fmtOpt(rx.od_add)}</td><td>${fmtOpt(rx.od_dnp)}</td><td>${fmtInt(rx.od_altura)}</td></tr>
      <tr><td class="eye-oe">OE</td><td>${fmtOpt(rx.oe_esf)}</td><td>${fmtOpt(rx.oe_cil)}</td><td>${fmtInt(rx.oe_eixo)}${rx.oe_eixo !== undefined && rx.oe_eixo !== null ? '°' : ''}</td><td>${fmtOpt(rx.oe_add)}</td><td>${fmtOpt(rx.oe_dnp)}</td><td>${fmtInt(rx.oe_altura)}</td></tr>
    </tbody>
  </table>
  ${rx.lens_type ? `<p style="margin-top:10px;font-size:12px;color:#475569">Tipo de lente: <strong>${rx.lens_type}</strong></p>` : ''}
  ${rx.notes ? `<div class="notes">${rx.notes}</div>` : ''}
  ${rx.doctor_name ? `<div class="sig"><div class="sig-line"></div><p>Dr(a). ${rx.doctor_name}${rx.crm ? ` · CRM ${rx.crm}` : ''}</p></div>` : ''}
  <div class="footer"><span>Gerado por Minha Ótica</span><span>${new Date().toLocaleDateString('pt-BR')}</span></div>
</body></html>`
  const w = window.open('', '_blank', 'width=780,height=600')
  if (!w) return
  w.document.write(html)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 400)
}

// ─── Card de receita ─────────────────────────────────────────────────────
function PrescriptionCard({
  prescription,
  onEdit,
  onDelete,
  onPrint,
}: {
  prescription: Prescription
  onEdit:       () => void
  onDelete:     () => void
  onPrint:      () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 hover:border-blue-200 transition-colors">
      {/* Topo: data + validade */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-700">
          Exame: {prescription.exam_date ? formatDate(prescription.exam_date) : formatDate(prescription.created_at)}
        </span>
        <ValidityBadge validUntil={prescription.valid_until} />
      </div>

      {/* Médico */}
      {prescription.doctor_name && (
        <p className="text-xs text-slate-500">
          Dr(a). {prescription.doctor_name}
          {prescription.crm && <span className="ml-1 text-slate-400">· CRM {prescription.crm}</span>}
        </p>
      )}

      {/* Tabela OD / OE */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="pb-1 w-10" />
              {['Esf', 'Cil', 'Eixo', 'Add', 'DNP', 'Alt'].map(h => (
                <th key={h} className="pb-1 text-center text-[10px] font-semibold text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pr-2 py-0.5">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">OD</span>
              </td>
              {[
                fmtOpt(prescription.od_esf),
                fmtOpt(prescription.od_cil),
                fmtInt(prescription.od_eixo) + (prescription.od_eixo !== undefined ? '°' : ''),
                fmtOpt(prescription.od_add),
                fmtOpt(prescription.od_dnp),
                fmtInt(prescription.od_altura),
              ].map((v, i) => (
                <td key={i} className="py-0.5 text-center font-mono text-slate-700">{v}</td>
              ))}
            </tr>
            <tr>
              <td className="pr-2 py-0.5">
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">OE</span>
              </td>
              {[
                fmtOpt(prescription.oe_esf),
                fmtOpt(prescription.oe_cil),
                fmtInt(prescription.oe_eixo) + (prescription.oe_eixo !== undefined ? '°' : ''),
                fmtOpt(prescription.oe_add),
                fmtOpt(prescription.oe_dnp),
                fmtInt(prescription.oe_altura),
              ].map((v, i) => (
                <td key={i} className="py-0.5 text-center font-mono text-slate-700">{v}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notas */}
      {prescription.notes && (
        <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-2">{prescription.notes}</p>
      )}

      {/* Ações */}
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrint}
            className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <Printer size={11} /> Imprimir
          </button>
          {prescription.attachment_url && (
            <a
              href={prescription.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              <Paperclip size={11} /> Ver Anexo
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <>
              <span className="text-xs text-red-600 font-medium mr-1">Excluir definitivamente?</span>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Não
              </Button>
              <Button size="sm" variant="danger" onClick={onDelete}>
                Sim, excluir
              </Button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Pencil size={11} /> Editar
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={11} /> Excluir
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal principal ──────────────────────────────────────────────────────
export function PatientPrescriptionsModal({ open, onClose, patient }: Props) {
  const company = useAuthStore(s => s.company)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading,       setLoading]       = useState(true)
  const [editTarget,    setEditTarget]    = useState<Prescription | null>(null)
  const [formOpen,      setFormOpen]      = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setPrescriptions(await getPatientPrescriptions(patient.id))
    setLoading(false)
  }, [patient.id])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  async function handleDelete(id: string) {
    await deletePrescription(id)
    setPrescriptions(prev => prev.filter(p => p.id !== id))
  }

  function openNew() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(p: Prescription) {
    setEditTarget(p)
    setFormOpen(true)
  }

  function handleSaved(saved: Prescription) {
    setPrescriptions(prev => {
      const idx = prev.findIndex(p => p.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
  }

  return (
    <>
      <Modal
        open={open && !formOpen}
        onClose={onClose}
        title={`Receitas — ${patient.full_name}`}
        size="xl"
      >
        <div className="space-y-4 py-2">
          {/* Header com contagem + botão */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {loading
                ? 'Carregando...'
                : `${prescriptions.length} receita${prescriptions.length !== 1 ? 's' : ''} encontrada${prescriptions.length !== 1 ? 's' : ''}`}
            </p>
            <Button size="sm" icon={<Plus size={14} />} onClick={openNew}>
              Nova Receita
            </Button>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText size={36} className="text-slate-200" />
              <p className="text-sm text-slate-500">Nenhuma receita cadastrada para este paciente.</p>
              <Button size="sm" icon={<Plus size={14} />} onClick={openNew}>
                Cadastrar Primeira Receita
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {prescriptions.map(p => (
                <PrescriptionCard
                  key={p.id}
                  prescription={p}
                  onEdit={() => openEdit(p)}
                  onDelete={() => handleDelete(p.id)}
                  onPrint={() => printPrescription(p, patient.full_name, company?.name ?? 'Minha Ótica')}
                />
              ))}
            </div>
          )}
        </div>
      </Modal>

      <PrescriptionModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        patient={patient}
        prescription={editTarget}
        onSuccess={saved => {
          handleSaved(saved)
          setFormOpen(false)
        }}
      />
    </>
  )
}
