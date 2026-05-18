import { useState } from 'react'
import { CheckCircle2, X, Zap, Building2, Star, CreditCard, Lock, CheckCircle, Receipt } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useSubscription } from '@/hooks/useSubscription'

interface PlanFeature {
  label: string
  starter: boolean | string
  pro: boolean | string
  enterprise: boolean | string
}

const FEATURES: PlanFeature[] = [
  { label: 'Pacientes',             starter: '100',         pro: '1.000',       enterprise: 'Ilimitados' },
  { label: 'Usuários',              starter: '2',           pro: '10',          enterprise: 'Ilimitados' },
  { label: 'Ordens de Serviço',     starter: true,          pro: true,          enterprise: true },
  { label: 'Vendas / PDV',          starter: true,          pro: true,          enterprise: true },
  { label: 'Prontuário Óptico',     starter: true,          pro: true,          enterprise: true },
  { label: 'Controle de Estoque',   starter: true,          pro: true,          enterprise: true },
  { label: 'Laboratório/Produção',  starter: true,          pro: true,          enterprise: true },
  { label: 'Financeiro completo',   starter: false,         pro: true,          enterprise: true },
  { label: 'Comissões',             starter: false,         pro: true,          enterprise: true },
  { label: 'Convênios',             starter: false,         pro: true,          enterprise: true },
  { label: 'Relatórios avançados',  starter: false,         pro: true,          enterprise: true },
  { label: 'Exportação CSV/PDF',    starter: 'Básico',      pro: true,          enterprise: true },
  { label: 'Importação CSV',        starter: false,         pro: true,          enterprise: true },
  { label: 'BI e Indicadores',      starter: false,         pro: true,          enterprise: true },
  { label: 'Assistente IA',         starter: false,         pro: true,          enterprise: true },
  { label: 'Backup automático',     starter: false,         pro: 'Semanal',     enterprise: 'Diário' },
  { label: 'Suporte',               starter: 'E-mail',      pro: 'Chat + E-mail', enterprise: 'Dedicado' },
  { label: 'Multiempresa',          starter: false,         pro: false,         enterprise: true },
  { label: 'API / Webhooks',        starter: false,         pro: false,         enterprise: true },
  { label: 'SLA garantido',         starter: false,         pro: false,         enterprise: '99,9%' },
]

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Star,
    color: 'border-slate-200',
    highlight: false,
    badge: null,
    price: 'R$ 149',
    period: '/mês',
    desc: 'Ideal para óticas pequenas iniciando sua gestão digital.',
    cta: 'Começar grátis',
    ctaClass: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
  },
  {
    id: 'pro',
    name: 'Profissional',
    icon: Zap,
    color: 'border-indigo-500 ring-2 ring-indigo-500/20',
    highlight: true,
    badge: 'Mais popular',
    price: 'R$ 349',
    period: '/mês',
    desc: 'Gestão completa para óticas em crescimento acelerado.',
    cta: 'Assinar agora',
    ctaClass: 'bg-indigo-600 text-white hover:bg-indigo-700',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Building2,
    color: 'border-slate-200',
    highlight: false,
    badge: null,
    price: 'Sob consulta',
    period: '',
    desc: 'Para redes de óticas com múltiplas filiais e necessidades específicas.',
    cta: 'Falar com comercial',
    ctaClass: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
  },
]

function FeatureCell({ val }: { val: boolean | string }) {
  if (val === false) return <X size={16} className="text-slate-300 mx-auto" />
  if (val === true)  return <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
  return <span className="text-xs font-medium text-slate-700">{val}</span>
}

interface CheckoutPlan { id: string; name: string; price: string }

export default function PricingPage() {
  const { subscription } = useSubscription()
  const planName = (subscription as any)?.plan?.name?.toLowerCase() ?? ''
  const currentPlanId = planName.includes('pro')
    ? 'pro'
    : planName.includes('enterprise')
    ? 'enterprise'
    : subscription
    ? 'starter'
    : null

  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlan | null>(null)
  const [step, setStep] = useState<'form' | 'loading' | 'success'>('form')
  const [form, setForm] = useState({ nome: '', email: '', cpf: '', numero: '', validade: '', cvv: '' })

  // Histórico de faturas (mock gerado em localStorage)
  interface Invoice { id: string; date: string; desc: string; amount: number; status: 'pago' | 'pendente' }
  const INVOICES_KEY = 'minhaotica_invoices_v1'
  function loadInvoices(): Invoice[] {
    try { return JSON.parse(localStorage.getItem(INVOICES_KEY) ?? 'null') ?? [] } catch { return [] }
  }
  function generateMockInvoices(): Invoice[] {
    const plan = currentPlanId === 'pro' ? 349 : currentPlanId === 'enterprise' ? 0 : 149
    if (!plan || currentPlanId === 'enterprise') return []
    const desc = currentPlanId === 'pro' ? 'Plano Profissional' : 'Plano Starter'
    const invoices: Invoice[] = []
    for (let i = 0; i < 3; i++) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      invoices.push({
        id: `INV-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}`,
        date: d.toISOString().slice(0, 10),
        desc,
        amount: plan,
        status: i === 0 ? 'pendente' : 'pago',
      })
    }
    return invoices
  }
  const invoices: Invoice[] = loadInvoices().length > 0 ? loadInvoices() : generateMockInvoices()

  function openCheckout(p: CheckoutPlan) { setCheckoutPlan(p); setStep('form'); setForm({ nome: '', email: '', cpf: '', numero: '', validade: '', cvv: '' }) }
  function closeCheckout() { setCheckoutPlan(null); setStep('form') }

  function submitCheckout(e: React.FormEvent) {
    e.preventDefault()
    setStep('loading')
    setTimeout(() => setStep('success'), 2200)
  }

  const field = (label: string, key: keyof typeof form, ph: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="block text-[11px] font-semibold text-slate-600 mb-1">{label}</label>
      <input
        required
        placeholder={ph}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
        {...extra}
      />
    </div>
  )

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900">Planos e Preços</h1>
        <p className="text-slate-500 text-sm">Escolha o plano ideal para a sua ótica. Sem taxa de setup. Cancele quando quiser.</p>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} /> 14 dias de trial grátis em todos os planos
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(p => {
          const Icon = p.icon
          const isCurrent = currentPlanId === p.id
          return (
            <div
              key={p.id}
              className={cn(
                'relative rounded-2xl border bg-white p-6 flex flex-col gap-4 transition-shadow hover:shadow-lg',
                p.color,
              )}
            >
              {p.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-[11px] font-bold text-white whitespace-nowrap">
                  {p.badge}
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-3 py-0.5 text-[11px] font-bold text-white">
                  Plano atual
                </span>
              )}

              <div className="flex items-center gap-3">
                <div className={cn('rounded-xl p-2', p.highlight ? 'bg-indigo-100' : 'bg-slate-100')}>
                  <Icon size={20} className={p.highlight ? 'text-indigo-600' : 'text-slate-600'} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{p.name}</p>
                  <p className="text-[11px] text-slate-500">{p.desc}</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">{p.price}</span>
                {p.period && <span className="text-sm text-slate-500">{p.period}</span>}
              </div>

              <button
                onClick={() => !isCurrent && p.id !== 'enterprise' && openCheckout({ id: p.id, name: p.name, price: p.price })}
                className={cn(
                  'w-full rounded-xl py-2.5 text-sm font-semibold transition-colors',
                  p.ctaClass,
                  isCurrent && 'opacity-50 cursor-default pointer-events-none',
                )}
                disabled={isCurrent}
              >
                {isCurrent ? 'Plano ativo' : p.cta}
              </button>
            </div>
          )
        })}
      </div>

      {/* Tabela comparativa */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50">
          <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Funcionalidade</div>
          {PLANS.map(p => (
            <div
              key={p.id}
              className={cn('p-4 text-center text-xs font-bold', p.highlight ? 'text-indigo-700' : 'text-slate-600')}
            >
              {p.name}
            </div>
          ))}
        </div>

        {FEATURES.map((f, i) => (
          <div
            key={i}
            className={cn('grid grid-cols-4 border-b border-slate-50', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}
          >
            <div className="p-3 pl-4 text-xs text-slate-700 font-medium flex items-center">{f.label}</div>
            <div className="p-3 flex items-center justify-center"><FeatureCell val={f.starter} /></div>
            <div className={cn('p-3 flex items-center justify-center', 'bg-indigo-50/30')}><FeatureCell val={f.pro} /></div>
            <div className="p-3 flex items-center justify-center"><FeatureCell val={f.enterprise} /></div>
          </div>
        ))}
      </div>

      {/* FAQ mínimo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
        {[
          { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Não há fidelidade ou taxa de cancelamento.' },
          { q: 'Os dados ficam salvos se eu cancelar?', a: 'Você tem 30 dias para exportar todos os seus dados após o cancelamento.' },
          { q: 'Posso mudar de plano depois?', a: 'Sim. O upgrade é imediato e o downgrade ocorre no próximo ciclo.' },
          { q: 'Como funciona o trial?', a: '14 dias com acesso completo ao plano Profissional, sem cartão de crédito.' },
        ].map((item, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
            <p className="text-sm font-semibold text-slate-800">{item.q}</p>
            <p className="text-xs text-slate-500">{item.a}</p>
          </div>
        ))}
      </div>

      {/* ── Histórico de Faturas ── */}
      {invoices.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <Receipt size={14} className="text-slate-500" />
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Histórico de Faturas</p>
          </div>
          <div className="divide-y divide-slate-50">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{inv.desc}</p>
                  <p className="text-[11px] text-slate-400">{inv.id} · {new Date(inv.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                </div>
                <p className="text-sm font-bold text-slate-800 flex-shrink-0">{formatCurrency(inv.amount)}</p>
                <span className={cn(
                  'text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0',
                  inv.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                )}>
                  {inv.status === 'pago' ? 'Pago' : 'Pendente'}
                </span>
                <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex-shrink-0 transition-colors">
                  2ª via
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal Checkout ── */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

            {/* Success */}
            {step === 'success' && (
              <div className="flex flex-col items-center gap-4 p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-slate-900">Plano ativado!</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Bem-vindo ao <strong>{checkoutPlan.name}</strong>. Seu acesso já está liberado.
                  </p>
                </div>
                <button
                  onClick={closeCheckout}
                  className="mt-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors"
                >
                  Começar agora
                </button>
              </div>
            )}

            {/* Loading */}
            {step === 'loading' && (
              <div className="flex flex-col items-center gap-4 p-10">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                <p className="text-sm font-semibold text-slate-700">Processando pagamento…</p>
                <p className="text-xs text-slate-400">Isso pode levar alguns segundos.</p>
              </div>
            )}

            {/* Form */}
            {step === 'form' && (
              <>
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                  <div>
                    <p className="font-bold text-slate-900">Assinar {checkoutPlan.name}</p>
                    <p className="text-sm text-indigo-600 font-semibold">{checkoutPlan.price}<span className="text-xs text-slate-400">/mês</span></p>
                  </div>
                  <button onClick={closeCheckout} className="text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={submitCheckout} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {field('Nome completo', 'nome', 'João Silva')}
                    {field('E-mail', 'email', 'joao@email.com', { type: 'email' })}
                  </div>
                  {field('CPF', 'cpf', '000.000.000-00')}

                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                      <CreditCard size={12} /> Dados do cartão
                    </p>
                    {field('Número do cartão', 'numero', '0000 0000 0000 0000', { maxLength: 19 })}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {field('Validade', 'validade', 'MM/AA', { maxLength: 5 })}
                      {field('CVV', 'cvv', '000', { maxLength: 3 })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Lock size={13} /> Confirmar assinatura
                  </button>
                  <p className="text-center text-[10px] text-slate-400">
                    Ambiente seguro · Cancele quando quiser
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
