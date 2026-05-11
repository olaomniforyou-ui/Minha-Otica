import { useEffect, useState } from 'react'
import { Search, ToggleLeft, ToggleRight, Loader2, Users } from 'lucide-react'
import { listAllUsers, toggleUserStatus } from '@/services/admin.service'

const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
const roleColor: Record<string,string> = { admin:'#6366f1', gerente:'#8b5cf6', atendente:'#06b6d4', tecnico:'#f59e0b' }
const roleLabel: Record<string,string> = { admin:'Admin', gerente:'Gerente', atendente:'Atendente', tecnico:'Técnico' }

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => { listAllUsers().then(setUsers).finally(() => setLoading(false)) }, [])

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.company?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleToggle(u: any) {
    setToggling(u.id)
    try {
      await toggleUserStatus(u.id, !u.is_active)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x))
    } finally { setToggling(null) }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-white">Usuários</h1>
        <p className="text-sm text-slate-500 mt-0.5">{users.length} usuários em todas as empresas</p>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por nome ou empresa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
          style={CARD}
        />
      </div>

      <div className="rounded-2xl overflow-hidden" style={CARD}>
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users size={40} className="text-slate-700" />
            <p className="text-sm text-slate-500">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <div className="col-span-4">Usuário</div>
              <div className="col-span-3">Empresa</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Desde</div>
              <div className="col-span-1 text-right">Status</div>
            </div>
            {filtered.map(u => (
              <div key={u.id} className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors">
                <div className="col-span-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: u.is_active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#374151' }}>
                    {u.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{u.full_name}</p>
                  </div>
                </div>
                <div className="col-span-3 text-xs text-slate-400 truncate">{u.company?.name || '—'}</div>
                <div className="col-span-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: roleColor[u.role] || '#94a3b8', background: `${roleColor[u.role] || '#94a3b8'}18` }}>
                    {roleLabel[u.role] || u.role}
                  </span>
                </div>
                <div className="col-span-2 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString('pt-BR')}</div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => handleToggle(u)} disabled={toggling === u.id} className="text-slate-500 hover:text-white transition-colors">
                    {toggling === u.id
                      ? <Loader2 size={16} className="animate-spin" />
                      : u.is_active
                      ? <ToggleRight size={20} className="text-emerald-400" />
                      : <ToggleLeft size={20} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
