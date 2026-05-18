import { useState, useEffect } from 'react'
import { Outlet, useNavigate, Link } from 'react-router-dom'
import { UserCog, AlertTriangle, Clock, WifiOff, X, Smartphone, RefreshCw } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AIDono } from '@/components/assistant/AIDono'
import { WelcomeModal, useWelcomeModal } from '@/components/onboarding/WelcomeModal'
import { InteractiveTour } from '@/components/onboarding/InteractiveTour'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuthStore } from '@/store/authStore'
import { useOnline } from '@/hooks/useOnline'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tourActive,  setTourActive]  = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = () => setTourActive(true)
    window.addEventListener('start-tour', handler)
    return () => window.removeEventListener('start-tour', handler)
  }, [])
  const isOnline = useOnline()
  useKeyboardShortcuts()
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showInstall,   setShowInstall]   = useState(false)

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', handler as EventListener)
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
  }, [])

  async function installApp() {
    if (!installPrompt) return
    ;(installPrompt as any).prompt()
    const { outcome } = await (installPrompt as any).userChoice
    if (outcome === 'accepted') { setInstallPrompt(null); setShowInstall(false) }
  }

  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.addEventListener('controllerchange', () => setUpdateAvailable(true))
  }, [])

  const originalCompany  = useAuthStore(s => s.originalCompany)
  const company          = useAuthStore(s => s.company)
  const stopImpersonate  = useAuthStore(s => s.stopImpersonate)
  const { isTrialing, isSuspended, daysLeft } = useSubscription()
  const { show: showWelcome, close: closeWelcome } = useWelcomeModal()

  function handleStopImpersonate() {
    stopImpersonate()
    navigate('/admin/companies')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Banner trial */}
        {!originalCompany && isTrialing && daysLeft !== null && (
          <div className="flex items-center justify-between gap-3 bg-indigo-600 px-4 py-2 text-indigo-50 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm">
              <Clock size={14} />
              <span>
                Período de trial — {daysLeft > 0
                  ? <><strong>{daysLeft} dia{daysLeft !== 1 ? 's' : ''}</strong> restante{daysLeft !== 1 ? 's' : ''}</>
                  : <strong>expira hoje</strong>
                }. Assine um plano para continuar.
              </span>
            </div>
            <Link
              to="/pricing"
              className="flex-shrink-0 rounded-lg bg-white/15 px-3 py-1 text-xs font-bold hover:bg-white/25 transition-colors"
            >
              Ver planos →
            </Link>
          </div>
        )}

        {/* Banner suspenso/cancelado */}
        {!originalCompany && isSuspended && (
          <div className="flex items-center gap-3 bg-red-600 px-4 py-2 text-red-50 flex-shrink-0">
            <AlertTriangle size={14} />
            <span className="text-sm font-medium">
              Conta suspensa ou cancelada. Entre em contato com o suporte para reativar.
            </span>
          </div>
        )}

        {/* Banner de impersonation */}
        {originalCompany && (
          <div className="flex items-center justify-between gap-3 bg-amber-400 px-4 py-2 text-amber-950 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserCog size={15} />
              <span>Impersonando: <strong>{company?.name}</strong></span>
            </div>
            <button
              onClick={handleStopImpersonate}
              className="flex items-center gap-1.5 rounded-lg bg-amber-950/15 px-3 py-1 text-xs font-bold hover:bg-amber-950/25 transition-colors"
            >
              ✕ Sair da Impersonação
            </button>
          </div>
        )}

        {/* Banner offline */}
        {!isOnline && (
          <div className="flex items-center gap-2 bg-amber-500 px-4 py-2 text-amber-950 flex-shrink-0">
            <WifiOff size={14} />
            <span className="text-sm font-medium flex-1">Offline — alterações salvas localmente e sincronizadas ao reconectar.</span>
          </div>
        )}

        {/* Banner instalar PWA */}
        {showInstall && installPrompt && (
          <div className="flex items-center justify-between gap-3 bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Smartphone size={14} className="text-indigo-500 flex-shrink-0" />
              <p className="text-xs text-indigo-700 font-medium">Instale o Minha Ótica para acesso rápido na tela inicial!</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={installApp}
                className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
              >
                Instalar
              </button>
              <button onClick={() => setShowInstall(false)} className="text-indigo-400 hover:text-indigo-600">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Banner nova versão disponível */}
        {updateAvailable && (
          <div className="flex items-center justify-between gap-3 bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <RefreshCw size={14} className="text-emerald-600 flex-shrink-0" />
              <p className="text-xs text-emerald-700 font-medium">Nova versão do sistema disponível!</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
            >
              Atualizar agora
            </button>
          </div>
        )}

        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <AIDono />

      {showWelcome && <WelcomeModal onClose={closeWelcome} />}
      <InteractiveTour active={tourActive} onClose={() => setTourActive(false)} />
    </div>
  )
}
