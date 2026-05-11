import { useState } from 'react'
import { User, Mail, Shield, Loader2, Save, Clock, LogOut } from 'lucide-react'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import { updateAdminProfile } from '@/services/admin.service'
import { signOut } from '@/services/auth.service'
import { AvatarUpload } from '@/components/ui/AvatarUpload'
import { useNavigate } from 'react-router-dom'

const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }

export default function AdminProfile() {
  const navigate = useNavigate()
  const { admin, setAdmin } = useAdminAuthStore()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    full_name: admin?.full_name || '',
    avatar_url: admin?.avatar_url || '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!admin?.id) return

    setLoading(true)
    setSuccess(false)
    setError('')

    try {
      const updated = await updateAdminProfile(admin.id, form)
      setAdmin(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end gap-6 pb-6 border-b border-white/5">
        <AvatarUpload
          size="lg"
          currentUrl={form.avatar_url}
          onUpload={(url) => setForm({ ...form, avatar_url: url })}
          onRemove={() => setForm({ ...form, avatar_url: '' })}
          className="border-white/10"
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{admin?.full_name}</h1>
          <p className="text-slate-500 flex items-center gap-1.5 mt-1">
            <Mail size={14} /> {admin?.email}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Shield size={12} /> SUPER ADMIN
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20">
              CONTA ATIVA
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl p-6" style={CARD}>
            <h2 className="text-lg font-bold text-white mb-6">Configurações de Perfil</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">E-mail (Super Admin)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                  <input
                    type="email"
                    readOnly
                    value={admin?.email}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm border border-emerald-500/20">
                  Perfil atualizado com sucesso!
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          {/* Histórico de Login */}
          <div className="rounded-2xl p-6" style={CARD}>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Clock size={16} className="text-slate-500" /> Atividade
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Último Login</p>
                <p className="text-xs text-white">
                  {admin?.last_login_at 
                    ? new Date(admin.last_login_at).toLocaleString('pt-BR') 
                    : 'Sem registro'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Conta Criada em</p>
                <p className="text-xs text-white">
                  {admin?.created_at 
                    ? new Date(admin.created_at).toLocaleDateString('pt-BR') 
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Ações de Conta */}
          <div className="rounded-2xl p-6" style={CARD}>
            <h3 className="text-sm font-bold text-white mb-4">Ações</h3>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-red-500/20 text-sm font-medium text-red-400 hover:bg-red-500/5 transition-colors"
            >
              <LogOut size={16} /> Encerrar Sessão
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
