import { useState, useEffect } from 'react'
import {
  UserPlus, Eye, ShieldCheck, ShoppingBag, Wrench,
  Loader2, Clock,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { getPatientPrescriptions } from '@/services/prescriptions.service'
import { getPatientConsents } from '@/services/lgpd.service'
import { formatDate, cn } from '@/lib/utils'
import type { Patient } from '@/types'

// ─── Tipos internos ───────────────────────────────────────────────────────
type EventType = 'registration' | 'prescription' | 'consent' | 'sale' | 'service_order'

interface TimelineEvent {
  id:          string
  type:        EventType
  date:        string
  title:       string
  description?: string
  badge?:      string
}

// ─── Config visual por tipo ───────────────────────────────────────────────
const EVENT_STYLE: Record<EventType, {
  icon:       React.ReactNode
  dot:        string
  badge:      string
  badgeText:  string
}> = {
  registration: {
    icon:      <UserPlus size={14} />,
    dot:       'bg-emerald-500',
    badge:     'bg-emerald-100 text-emerald-700',
    badgeText: 'Cadastro',
  },
  prescription: {
    icon:      <Eye size={14} />,
    dot:       'bg-blue-500',
    badge:     'bg-blue-100 text-blue-700',
    badgeText: 'Receita',
  },
  consent: {
    icon:      <ShieldCheck size={14} />,
    dot:       'bg-indigo-500',
    badge:     'bg-indigo-100 text-indigo-700',
    badgeText: 'LGPD',
  },
  sale: {
    icon:      <ShoppingBag size={14} />,
    dot:       'bg-amber-500',
    badge:     'bg-amber-100 text-amber-700',
    badgeText: 'Venda',
  },
  service_order: {
    icon:      <Wrench size={14} />,
    dot:       'bg-violet-500',
    badge:     'bg-violet-100 text-violet-700',
    badgeText: 'OS',
  },
}

interface Props {
  open:    boolean
  onClose: () => void
  patient: Patient
}

export function PatientTimelineModal({ open, onClose, patient }: Props) {
  const [events,  setEvents]  = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)

    Promise.all([
      getPatientPrescriptions(patient.id),
      getPatientConsents(patient.id),
    ]).then(([prescriptions, consents]) => {
      const list: TimelineEvent[] = []

      // Evento de cadastro
      list.push({
        id:          `reg-${patient.id}`,
        type:        'registration',
        date:        patient.created_at,
        title:       'Paciente cadastrado',
        description: patient.cpf ? `CPF: ${patient.cpf}` : undefined,
      })

      // Receitas
      for (const p of prescriptions) {
        list.push({
          id:          `presc-${p.id}`,
          type:        'prescription',
          date:        p.exam_date ?? p.created_at,
          title:       'Receita oftalmológica',
          description: p.doctor_name
            ? `Dr(a). ${p.doctor_name}${p.crm ? ` · CRM ${p.crm}` : ''}`
            : 'Sem médico registrado',
          badge: p.valid_until
            ? `Válida até ${formatDate(p.valid_until)}`
            : undefined,
        })
      }

      // Consentimentos LGPD
      for (const c of consents) {
        list.push({
          id:          `consent-${c.id}`,
          type:        'consent',
          date:        c.created_at,
          title:       'Consentimento LGPD registrado',
          description: `Termos de Uso e Privacidade — versão ${c.terms_version}`,
        })
      }

      // Ordena mais recente primeiro
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setEvents(list)
    }).finally(() => setLoading(false))
  }, [open, patient.id, patient.created_at, patient.cpf])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Linha do Tempo — ${patient.full_name}`}
      size="lg"
    >
      <div className="py-2">

        {/* Cabeçalho resumo */}
        <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {Object.entries(EVENT_STYLE).map(([type, style]) => (
            <span key={type} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold', style.badge)}>
              {style.icon} {style.badgeText}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14 text-slate-400">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center text-slate-400">
            <Clock size={32} />
            <p className="text-sm">Nenhum evento encontrado para este paciente.</p>
          </div>
        ) : (
          <div className="relative max-h-[60vh] overflow-y-auto pr-2">
            {/* Linha vertical */}
            <div className="absolute left-[18px] top-0 bottom-0 w-px bg-slate-100" />

            <div className="space-y-4">
              {events.map((ev, idx) => {
                const style = EVENT_STYLE[ev.type]
                return (
                  <div key={ev.id} className="flex gap-4 items-start">
                    {/* Dot */}
                    <div className={cn(
                      'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm',
                      style.dot,
                    )}>
                      {style.icon}
                    </div>

                    {/* Conteúdo */}
                    <div className={cn(
                      'flex-1 rounded-xl border bg-white p-3.5 shadow-sm',
                      idx === 0 ? 'border-slate-300' : 'border-slate-100',
                    )}>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', style.badge)}>
                            {style.badgeText}
                          </span>
                          <p className="text-sm font-semibold text-slate-800">{ev.title}</p>
                        </div>
                        <time className="text-[11px] text-slate-400 shrink-0">
                          {formatDate(ev.date)}
                        </time>
                      </div>

                      {ev.description && (
                        <p className="mt-1 text-xs text-slate-500">{ev.description}</p>
                      )}
                      {ev.badge && (
                        <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {ev.badge}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pé da timeline */}
            <div className="mt-4 flex items-center gap-3 pl-11 text-[11px] text-slate-400">
              <div className="h-px flex-1 bg-slate-100" />
              <span>Início do histórico</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
