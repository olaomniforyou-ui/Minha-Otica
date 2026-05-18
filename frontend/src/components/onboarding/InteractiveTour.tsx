import { useEffect, useState, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TourStep {
  selector: string
  title: string
  desc: string
}

const STEPS: TourStep[] = [
  { selector: '[data-tour="nav-dashboard"]',  title: 'Painel Principal',  desc: 'Veja as métricas do dia: receita, vendas, OS pendentes e alertas de estoque.' },
  { selector: '[data-tour="nav-patients"]',   title: 'Clientes',          desc: 'Cadastre pacientes, registre receitas ópticas e acompanhe o histórico de compras.' },
  { selector: '[data-tour="nav-sales"]',      title: 'Vendas / PDV',      desc: 'Registre vendas rapidamente. O estoque é atualizado e o comprovante é gerado automaticamente.' },
  { selector: '[data-tour="nav-orders"]',     title: 'Orçamentos / OS',   desc: 'Crie ordens de serviço, aprove orçamentos e envie pedidos ao laboratório com um clique.' },
  { selector: '[data-tour="nav-lab"]',        title: 'Laboratório',       desc: 'Acompanhe o status de produção no kanban e avise clientes pelo WhatsApp quando o pedido estiver pronto.' },
  { selector: '[data-tour="nav-financial"]',  title: 'Financeiro',        desc: 'Controle caixa, contas a pagar, DRE completo e importe extratos bancários OFX.' },
  { selector: '[data-tour="nav-analytics"]',  title: 'Relatórios',        desc: 'DRE, NPS, previsão de demanda por regressão linear e ranking de produtos mais vendidos.' },
  { selector: '[data-tour="quick-order"]',    title: 'Atalho Rápido',     desc: 'Crie um novo orçamento ou OS de qualquer página sem precisar navegar pelo menu lateral.' },
]

const PAD = 8

interface Props {
  active: boolean
  onClose: () => void
}

export function InteractiveTour({ active, onClose }: Props) {
  const [step, setStep]   = useState(0)
  const [rect, setRect]   = useState<DOMRect | null>(null)

  const snapToElement = useCallback((idx: number) => {
    const el = document.querySelector(STEPS[idx].selector)
    if (!el) { setRect(null); return }
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setTimeout(() => setRect(el.getBoundingClientRect()), 160)
  }, [])

  useEffect(() => {
    if (active) { setStep(0); snapToElement(0) }
  }, [active, snapToElement])

  useEffect(() => {
    if (active) snapToElement(step)
  }, [step, active, snapToElement])

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else onClose()
  }

  function prev() {
    if (step > 0) setStep(s => s - 1)
  }

  if (!active) return null

  const current = STEPS[step]

  // Position tooltip to the right of the highlighted element, clamped to viewport
  const tooltipW = 288
  let tooltipTop  = 8
  let tooltipLeft = 8

  if (rect) {
    tooltipTop  = Math.max(8, Math.min(window.innerHeight - 260, rect.top + rect.height / 2 - 100))
    const rightPos = rect.right + PAD + 12
    tooltipLeft = rightPos + tooltipW > window.innerWidth - 8
      ? Math.max(8, rect.left - tooltipW - PAD - 12)
      : rightPos
  } else {
    tooltipTop  = window.innerHeight / 2 - 100
    tooltipLeft = window.innerWidth  / 2 - tooltipW / 2
  }

  return (
    <>
      {/* Spotlight — box-shadow cria overlay com buraco */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            top:    rect.top  - PAD,
            left:   rect.left - PAD,
            width:  rect.width  + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.52)',
            border: '2px solid #3b82f6',
            zIndex: 10000,
            pointerEvents: 'none',
            transition: 'top .2s, left .2s, width .2s, height .2s',
          }}
        />
      )}

      {/* Clique fora fecha o tour */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
        onClick={onClose}
      />

      {/* Tooltip */}
      <div
        style={{ position: 'fixed', top: tooltipTop, left: tooltipLeft, width: tooltipW, zIndex: 10001 }}
        className="rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden pointer-events-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">
            {step + 1} / {STEPS.length}
          </span>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-2">
          <p className="font-bold text-slate-900">{current.title}</p>
          <p className="text-sm text-slate-600 leading-relaxed">{current.desc}</p>
        </div>

        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={prev}
            disabled={step === 0}
            className={cn(
              'flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors',
              step === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <button
            onClick={next}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            {step < STEPS.length - 1 ? <>Próximo <ChevronRight size={14} /></> : 'Concluir'}
          </button>
        </div>
      </div>
    </>
  )
}
