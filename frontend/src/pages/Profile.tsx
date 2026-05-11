import { useState } from 'react'
import { User, Phone, Mail, Building, ShieldCheck, Loader2, Save } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { updateProfile } from '@/services/auth.service'
import { AvatarUpload } from '@/components/ui/AvatarUpload'

export default function ProfilePage() {
  const { profile, session } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    avatar_url: profile?.avatar_url || '',
  })

  const roleLabels = {
    admin: 'Administrador',
    gerente: 'Gerente',
    atendente: 'Atendente',
    tecnico: 'Técnico',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.id) return

    setLoading(true)
    setSuccess(false)
    setError('')

    try {
      await updateProfile(profile.id, form)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end gap-6 pb-6 border-b border-slate-100">
        <AvatarUpload
          size="lg"
          currentUrl={form.avatar_url}
          onUpload={(url) => setForm({ ...form, avatar_url: url })}
          onRemove={() => setForm({ ...form, avatar_url: '' })}
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{profile?.full_name}</h1>
          <p className="text-slate-500 flex items-center gap-1.5 mt-1">
            <Mail size={14} /> {session?.user?.email}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100 flex items-center gap-1">
              <ShieldCheck size={12} /> {roleLabels[profile?.role || 'atendente']}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-100 flex items-center gap-1">
              <Building size={12} /> {profile?.company?.name}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Dados Pessoais */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Dados Pessoais</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-1">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-1">Telefone / WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 text-sm border border-emerald-100">
                  Perfil atualizado com sucesso!
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-primary-900 text-white px-6 py-2.5 rounded-xl font-semibold transition-all hover:bg-black active:scale-95 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          {/* Empresa */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Sua Empresa</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Building size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{profile?.company?.name}</p>
                  <p className="text-xs text-slate-500">CNPJ: {profile?.company?.cnpj || 'Não informado'}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-50">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Plano Atual</p>
                <div className="p-3 rounded-xl bg-primary-50 border border-primary-100">
                  <p className="text-sm font-bold text-primary-900">Profissional</p>
                  <p className="text-[10px] text-primary-600 font-medium">Assinatura Ativa</p>
                </div>
              </div>
            </div>
          </div>

          {/* Segurança */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Segurança</h3>
            <button className="w-full text-left px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Alterar Senha
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
