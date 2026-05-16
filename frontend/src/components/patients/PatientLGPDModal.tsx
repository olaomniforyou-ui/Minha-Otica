import { useState, useEffect } from 'react'
import { Shield, Download, Trash2, CheckCircle2, AlertTriangle, Clock, Loader2, FileText } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { getPatientConsents, exportPatientData, forgetPatient, generateConsentPDF } from '@/services/lgpd.service'
import { formatDate } from '@/lib/utils'
import type { Patient, ConsentLog } from '@/types'

interface Props {
  open:    boolean
  onClose: () => void
  patient: Patient
  onForgotten?: () => void
}

type Step = 'menu' | 'confirm-forget'

export function PatientLGPDModal({ open, onClose, patient, onForgotten }: Props) {
  const [step,         setStep]         = useState<Step>('menu')
  const [consents,     setConsents]     = useState<ConsentLog[]>([])
  const [loadingCons,  setLoadingCons]  = useState(true)
  const [exporting,    setExporting]    = useState(false)
  const [forgetting,   setForgetting]   = useState(false)
  const [confirmText,  setConfirmText]  = useState('')
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    if (!open) { setStep('menu'); setConfirmText(''); setError(null); return }
    setLoadingCons(true)
    getPatientConsents(patient.id)
      .then(setConsents)
      .finally(() => setLoadingCons(false))
  }, [open, patient.id])

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      await exportPatientData(patient.id, patient.full_name)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setExporting(false)
    }
  }

  async function handleForget() {
    setForgetting(true)
    setError(null)
    try {
      await forgetPatient(patient.id)
      onForgotten?.()
      onClose()
    } catch (e: any) {
      setError(e.message)
      setForgetting(false)
    }
  }

  const confirmMatch = confirmText.trim().toLowerCase() === patient.full_name.trim().toLowerCase()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="LGPD — Dados do Titular"
      size="lg"
    >
      <div className="space-y-5 py-2">

        {/* Cabeçalho do titular */}
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
            <Shield size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{patient.full_name}</p>
            <p className="text-xs text-slate-500">Titular de dados pessoais e de saúde (LGPD)</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {step === 'menu' && (
          <>
            {/* Consentimentos */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Histórico de Consentimentos</p>
              {loadingCons ? (
                <div className="flex items-center gap-2 py-4 text-slate-400 text-xs">
                  <Loader2 size={14} className="animate-spin" /> Carregando...
                </div>
              ) : consents.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                  <AlertTriangle size={13} />
                  Nenhum consentimento registrado para este paciente.
                </div>
              ) : (
                <div className="space-y-2">
                  {consents.map(c => (
                    <div key={c.id} className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      <CheckCircle2 size={13} />
                      <span>Termos v{c.terms_version} aceitos em {formatDate(c.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Direitos do titular */}
            <div>
              <p className="mb-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Direitos do Titular (LGPD art. 18)</p>
              <div className="space-y-3">

                {/* Exportar dados */}
                <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                      <Download size={15} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Exportar meus dados</p>
                      <p className="text-xs text-slate-500 mt-0.5">Baixa um arquivo JSON com todos os dados cadastrais e receitas do paciente.</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={exporting}
                    onClick={handleExport}
                    icon={<Download size={13} />}
                  >
                    Exportar
                  </Button>
                </div>

                {/* Imprimir termo */}
                <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                      <FileText size={15} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Termo de Consentimento (PDF)</p>
                      <p className="text-xs text-slate-500 mt-0.5">Gera o documento formal de aceite dos termos para assinatura física se necessário.</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => generateConsentPDF(patient)}
                    icon={<FileText size={13} />}
                  >
                    Imprimir
                  </Button>
                </div>

                {/* Direito ao esquecimento */}
                <div className="flex items-start justify-between gap-4 rounded-xl border border-red-100 bg-red-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100">
                      <Trash2 size={15} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Anonimizar cadastro</p>
                      <p className="text-xs text-slate-500 mt-0.5">Remove nome, CPF, contato e dados pessoais. <strong className="text-red-600">Irreversível.</strong></p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setStep('confirm-forget')}
                    icon={<Trash2 size={13} />}
                  >
                    Anonimizar
                  </Button>
                </div>

              </div>
            </div>

            {/* Info legal */}
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 text-[11px] text-slate-500">
              <Clock size={12} className="mt-0.5 shrink-0" />
              Registros fiscais são mantidos por 5 anos conforme obrigação legal. Dados de saúde seguem regulamentação do CFM.
            </div>
          </>
        )}

        {step === 'confirm-forget' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-red-700 font-semibold">
                <AlertTriangle size={16} />
                Confirmação obrigatória
              </div>
              <p className="text-sm text-red-600">
                Esta ação irá anonimizar permanentemente o cadastro de <strong>{patient.full_name}</strong>.
                Nome, CPF, telefone, e-mail e endereço serão removidos. Não é possível desfazer.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Digite o nome do paciente para confirmar:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={patient.full_name}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-400/20 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setStep('menu'); setConfirmText('') }}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                loading={forgetting}
                disabled={!confirmMatch}
                onClick={handleForget}
                icon={<Trash2 size={14} />}
              >
                Confirmar Anonimização
              </Button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  )
}
