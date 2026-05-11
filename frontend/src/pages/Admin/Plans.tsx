import { useEffect, useState } from 'react'
import { Check, Plus, Pencil, Trash2, Star, Loader2, X } from 'lucide-react'
import { listPlans, upsertPlan, deletePlan } from '@/services/admin.service'
import type { Plan, PlanFormData } from '@/types'

const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
const EMPTY_FORM: PlanFormData = {
  name: '', slug: '', description: '', price_monthly: 0, price_yearly: 0,
  max_users: 5, max_patients: 1000, features: [], is_active: true, is_popular: false, sort_order: 0,
}

function PlanModal({ plan, onClose, onSaved }: { plan?: Plan; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<PlanFormData>(plan
    ? { name: plan.name, slug: plan.slug, description: plan.description || '', price_monthly: plan.price_monthly, price_yearly: plan.price_yearly, max_users: plan.max_users, max_patients: plan.max_patients, features: plan.features, is_active: plan.is_active, is_popular: plan.is_popular, sort_order: plan.sort_order }
    : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [featInput, setFeatInput] = useState('')

  function addFeature() {
    if (!featInput.trim()) return
    setForm(f => ({ ...f, features: [...f.features, featInput.trim()] }))
    setFeatInput('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try { await upsertPlan(form, plan?.id); onSaved() }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">{plan ? 'Editar Plano' : 'Novo Plano'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Nome</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={CARD} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Slug</label>
              <input required value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={CARD} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Preço Mensal (R$)</label>
              <input type="number" required value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: +e.target.value }))} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={CARD} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Preço Anual (R$)</label>
              <input type="number" required value={form.price_yearly} onChange={e => setForm(f => ({ ...f, price_yearly: +e.target.value }))} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={CARD} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Máx. Usuários</label>
              <input type="number" value={form.max_users} onChange={e => setForm(f => ({ ...f, max_users: +e.target.value }))} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={CARD} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Máx. Pacientes</label>
              <input type="number" value={form.max_patients} onChange={e => setForm(f => ({ ...f, max_patients: +e.target.value }))} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={CARD} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Descrição</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={CARD} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Features</label>
            <div className="flex gap-2 mb-2">
              <input value={featInput} onChange={e => setFeatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())} placeholder="Adicionar feature..." className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none placeholder-slate-600" style={CARD} />
              <button type="button" onClick={addFeature} className="px-3 py-2 rounded-xl text-xs font-medium text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>+</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.features.map((f, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-indigo-300 bg-indigo-500/15">
                  {f}
                  <button type="button" onClick={() => setForm(fm => ({ ...fm, features: fm.features.filter((_, j) => j !== i) }))} className="text-indigo-400 hover:text-red-400"><X size={10} /></button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input type="checkbox" checked={form.is_popular} onChange={e => setForm(f => ({ ...f, is_popular: e.target.checked }))} className="rounded" />
              Mais popular
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              Ativo
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors" style={CARD}>Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar Plano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; plan?: Plan }>({ open: false })
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = () => listPlans().then(setPlans).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Remover este plano?')) return
    setDeleting(id)
    try { await deletePlan(id); await load() } finally { setDeleting(null) }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Planos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie os planos disponíveis no SaaS</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <Plus size={16} /> Novo Plano
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div
              key={plan.id}
              className="relative rounded-2xl p-5 flex flex-col gap-4 transition-transform hover:-translate-y-0.5"
              style={plan.is_popular
                ? { background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.4)' }
                : CARD}
            >
              {plan.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    <Star size={9} /> MAIS POPULAR
                  </span>
                </div>
              )}
              <div>
                <p className="text-base font-bold text-white">{plan.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
              </div>
              <div>
                <span className="text-3xl font-black text-white">R${plan.price_monthly}</span>
                <span className="text-slate-500 text-sm">/mês</span>
                <p className="text-xs text-slate-600 mt-0.5">ou R${plan.price_yearly}/ano</p>
              </div>
              <div className="space-y-1.5 flex-1">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                    <Check size={12} className="text-indigo-400 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-2 border-t border-white/5">
                <span>👥 {plan.max_users} usuários</span>
                <span>🧑 {plan.max_patients >= 99999 ? '∞' : plan.max_patients} pacientes</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModal({ open: true, plan })} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors" style={CARD}>
                  <Pencil size={12} /> Editar
                </button>
                <button onClick={() => handleDelete(plan.id)} disabled={deleting === plan.id} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 transition-colors bg-red-500/10">
                  {deleting === plan.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <PlanModal
          plan={modal.plan}
          onClose={() => setModal({ open: false })}
          onSaved={() => { setModal({ open: false }); load() }}
        />
      )}
    </div>
  )
}
