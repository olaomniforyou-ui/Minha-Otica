import { useState } from 'react'
import { Eye, Users, ShoppingCart, FlaskConical, BarChart3, HelpCircle, ArrowRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const WELCOME_KEY = 'minha-otica-welcomed'

const STEPS = [
  { icon: Users,        color: 'bg-blue-100 text-blue-600',    title: 'Clientes',      desc: 'Cadastre seus pacientes com histórico de receitas e compras.' },
  { icon: ShoppingCart, color: 'bg-emerald-100 text-emerald-600', title: 'Vendas / PDV', desc: 'Registre vendas rapidamente, com gestão automática de estoque.' },
  { icon: FlaskConical, color: 'bg-violet-100 text-violet-600', title: 'Laboratório',   desc: 'Acompanhe pedidos no lab em tempo real e avise o cliente pelo WhatsApp.' },
  { icon: BarChart3,    color: 'bg-amber-100 text-amber-600',   title: 'Relatórios',    desc: 'DRE, comissões, NPS e previsão de demanda — tudo em um painel.' },
]

interface Props { onClose: () => void }

export function WelcomeModal({ onClose }: Props) {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()

  function finish() {
    localStorage.setItem(WELCOME_KEY, '1')
    onClose()
  }

  function goHelp() {
    localStorage.setItem(WELCOME_KEY, '1')
    onClose()
    navigate('/help')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-8 pb-6 text-center"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }}>
          <button
            onClick={finish}
            className="absolute top-4 right-4 text-white/60 hover:text-white"
          >
            <X size={18} />
          </button>
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-white/15 mb-3">
            <Eye size={26} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Bem-vindo ao Minha Ótica!</h2>
          <p className="text-sm text-blue-100 mt-1">Tudo que sua ótica precisa em um só lugar.</p>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-3">
          {step === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {STEPS.map((s, i) => (
                <div key={i} className="rounded-xl border border-slate-100 p-3 space-y-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>
                    <s.icon size={17} />
                  </div>
                  <p className="text-xs font-bold text-slate-800">{s.title}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <HelpCircle size={40} className="text-blue-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">Precisa de ajuda?</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Acesse nossa <strong>Central de Ajuda</strong> com guias, dúvidas frequentes e como usar cada funcionalidade.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-2">
          {step === 0 ? (
            <>
              <button onClick={finish} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Explorar sozinho
              </button>
              <button
                onClick={() => setStep(1)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Próximo <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(0)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Voltar
              </button>
              <button
                onClick={goHelp}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Ver ajuda <HelpCircle size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function useWelcomeModal() {
  const [show, setShow] = useState(() => !localStorage.getItem('minha-otica-welcomed'))
  return { show, close: () => setShow(false) }
}
