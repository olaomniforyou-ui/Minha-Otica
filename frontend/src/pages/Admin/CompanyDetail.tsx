import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, User, Package, Loader2, Clock, GitBranch, Building2, Check } from 'lucide-react'
import { getCompanyDetail, updateSubscription, listPlans, listAllCompanies, getFiliais, setParentCompany } from '@/services/admin.service'
import type { Plan } from '@/types'

const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
const statusColor: Record<string,string> = { active:'#10b981', trial:'#f59e0b', suspended:'#ef4444', cancelled:'#6b7280', past_due:'#f97316' }
const statusLabel: Record<string,string> = { active:'Ativo', trial:'Trial', suspended:'Suspenso', cancelled:'Cancelado', past_due:'Atrasado' }
const roleLabel: Record<string,string> = { admin:'Admin', gerente:'Gerente', atendente:'Atendente', tecnico:'Técnico' }

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data,      setData]      = useState<any>(null)
  const [plans,     setPlans]     = useState<Plan[]>([])
  const [allCos,    setAllCos]    = useState<any[]>([])
  const [filiais,   setFiliais]   = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [savingHier,setSavingHier]= useState(false)
  const [hierSaved, setHierSaved] = useState(false)
  const [parentId,  setParentId]  = useState<string>('')
  const [form, setForm] = useState({ planId: '', status: 'trial', billingCycle: 'monthly', amount: '0', notes: '' })

  useEffect(() => {
    if (!id) return
    Promise.all([getCompanyDetail(id), listPlans(), listAllCompanies(), getFiliais(id)])
      .then(([d, p, cos, fils]) => {
        setData(d)
        setPlans(p)
        setAllCos(cos.filter((c: any) => c.id !== id))
        setFiliais(fils)
        setParentId(d.company?.parent_company_id ?? '')
        if (d.subscription) {
          setForm({
            planId: d.subscription.plan_id || '',
            status: d.subscription.status || 'trial',
            billingCycle: d.subscription.billing_cycle || 'monthly',
            amount: String(d.subscription.amount || 0),
            notes: d.subscription.notes || '',
          })
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleSaveHierarchy() {
    if (!id) return
    setSavingHier(true)
    try {
      await setParentCompany(id, parentId || null)
      setHierSaved(true)
      setTimeout(() => setHierSaved(false), 2500)
    } finally { setSavingHier(false) }
  }

  async function handleSave() {
    if (!id) return
    setSaving(true)
    try {
      await updateSubscription(id, form.planId, form.status, form.billingCycle, parseFloat(form.amount), form.notes)
      const d = await getCompanyDetail(id)
      setData(d)
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
  if (!data?.company) return <div className="text-slate-400 text-sm">Empresa não encontrada</div>

  const { company, users, patientCount, subscription, history } = data

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/companies')} className="text-slate-500 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{company.name}</h1>
          <p className="text-sm text-slate-500">{company.cnpj || 'CNPJ não informado'} · {company.email || '—'}</p>
        </div>
        {subscription && (
          <span className="ml-auto text-[11px] font-semibold px-3 py-1 rounded-full" style={{ color: statusColor[subscription.status], background: `${statusColor[subscription.status]}18` }}>
            {statusLabel[subscription.status]}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Usuários', value: users.length, icon: Users, color: '#6366f1' },
          { label: 'Pacientes', value: patientCount, icon: User, color: '#8b5cf6' },
          { label: 'Plano atual', value: subscription?.plan?.name || 'Sem plano', icon: Package, color: '#10b981' },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-4 flex items-center gap-3" style={CARD}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0" style={{ background: `${item.color}20` }}>
              <item.icon size={18} style={{ color: item.color }} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="text-lg font-bold text-white">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Subscription editor */}
      <div className="rounded-2xl p-5" style={CARD}>
        <p className="text-sm font-semibold text-white mb-4">Gerenciar Assinatura</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Plano</label>
            <select value={form.planId} onChange={e => setForm(f => ({ ...f, planId: e.target.value }))} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={CARD}>
              <option value="">Sem plano</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} — R${p.price_monthly}/mês</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={CARD}>
              {Object.entries(statusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Ciclo</label>
            <select value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={CARD}>
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Valor (R$)</label>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={CARD} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1.5">Observações</label>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas internas..." className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none" style={CARD} />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {saving ? 'Salvando...' : 'Salvar Assinatura'}
        </button>
      </div>

      {/* Hierarquia Matriz/Filial */}
      <div className="rounded-2xl p-5 space-y-4" style={CARD}>
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <GitBranch size={15} className="text-indigo-400" /> Hierarquia Matriz / Filial
        </p>

        {/* Selecionar empresa-mãe */}
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Empresa Matriz (opcional)</label>
          <div className="flex gap-2">
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              style={CARD}
            >
              <option value="">— Nenhuma (esta é uma Matriz) —</option>
              {allCos.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={handleSaveHierarchy}
              disabled={savingHier}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            >
              {savingHier ? <Loader2 size={14} className="animate-spin" /> : hierSaved ? <Check size={14} /> : null}
              {hierSaved ? 'Salvo!' : 'Salvar'}
            </button>
          </div>
          <p className="text-[11px] text-slate-600 mt-1.5">
            {parentId
              ? `Esta empresa é filial de: ${allCos.find((c: any) => c.id === parentId)?.name ?? '...'}`
              : 'Sem matriz — esta empresa está no topo da hierarquia.'}
          </p>
        </div>

        {/* Filiais desta empresa */}
        {filiais.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-2">Filiais vinculadas ({filiais.length})</p>
            <div className="space-y-1.5">
              {filiais.map((f: any) => (
                <div key={f.id} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <Building2 size={14} className="text-indigo-400 flex-shrink-0" />
                  <span className="text-sm text-white flex-1">{f.name}</span>
                  {f.cnpj && <span className="text-[11px] text-slate-500">{f.cnpj}</span>}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${f.is_active ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 bg-slate-500/10'}`}>
                    {f.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Users table */}
      <div className="rounded-2xl p-5" style={CARD}>
        <p className="text-sm font-semibold text-white mb-4">Usuários da Empresa</p>
        {users.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum usuário</p>
        ) : (
          <div className="divide-y divide-white/5">
            {users.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    {u.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{u.full_name}</p>
                    <p className="text-xs text-slate-500">{roleLabel[u.role] || u.role}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.is_active ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 bg-slate-500/10'}`}>
                  {u.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-2xl p-5" style={CARD}>
          <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Clock size={15} /> Histórico de Assinatura</p>
          <div className="space-y-2">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-indigo-400 font-medium">{h.plan?.name || '—'}</span>
                  <span className="text-slate-500">{statusLabel[h.status] || h.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">R$ {h.amount.toFixed(2)}</span>
                  <span className="text-slate-600">{new Date(h.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
