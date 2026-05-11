import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Building2, ArrowRight, LogOut } from 'lucide-react'
import { signOut } from '@/services/auth.service'
import { db } from '@/db'

export default function SelectCompany() {
  const navigate = useNavigate()
  const { availableProfiles, setProfile, setCompany, session } = useAuthStore()

  useEffect(() => {
    // Se não houver sessão, volta pro login
    if (!session) {
      navigate('/login')
    }
    // Se só tiver um perfil, seleciona ele automaticamente e vai pro dashboard
    if (availableProfiles.length === 1) {
      handleSelect(availableProfiles[0])
    }
  }, [availableProfiles, session])

  async function handleSelect(profile: any) {
    // Antes de trocar, limpamos o Dexie para garantir integridade (opcional, mas seguro)
    // await db.delete().then(() => db.open())
    
    setProfile(profile)
    setCompany(profile.company)
    navigate('/')
  }

  if (availableProfiles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <p className="text-slate-600">Nenhuma empresa vinculada a este usuário.</p>
          <Button variant="outline" icon={<LogOut size={16} />} onClick={() => signOut()}>
            Sair
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Bem-vindo de volta!</h1>
          <p className="text-slate-500">Selecione qual ótica deseja acessar agora:</p>
        </div>

        <div className="grid gap-3">
          {availableProfiles.map((p) => (
            <button
              key={p.company_id}
              onClick={() => handleSelect(p)}
              className="group flex items-center gap-4 w-full p-4 bg-white border border-slate-200 rounded-xl hover:border-primary-500 hover:shadow-md transition-all text-left"
            >
              <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                <Building2 size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{p.company?.name || 'Ótica sem nome'}</p>
                <p className="text-xs text-slate-500 capitalize">{p.role}</p>
              </div>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>

        <div className="pt-4 flex justify-center">
          <Button variant="ghost" size="sm" icon={<LogOut size={14} />} onClick={() => signOut()}>
            Entrar com outra conta
          </Button>
        </div>
      </div>
    </div>
  )
}
