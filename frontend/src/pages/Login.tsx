import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye as EyeIcon, EyeOff, Mail, Lock, Eye } from 'lucide-react'
import { signIn } from '@/services/auth.service'
import { cn } from '@/lib/utils'

export default function Login() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { isAdmin } = await signIn(email.trim(), password)
      if (isAdmin) {
        navigate('/admin', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Lado esquerdo: visual ───────────────────────── */}
      <div className="relative hidden lg:flex lg:w-[55%] flex-col justify-between overflow-hidden bg-primary-950 p-10">
        {/* Padrão de fundo */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-800/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary-700/20 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-900/40 blur-2xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Eye className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">Minha Ótica</span>
        </div>

        {/* Texto central */}
        <div className="relative">
          <h2 className="text-4xl font-extrabold leading-tight text-white">
            Precisão em<br />cada detalhe.
          </h2>
          <p className="mt-4 text-base text-primary-200">
            A nova era da gestão óptica chegou para transformar sua visão de negócios.
          </p>
        </div>

        {/* Footer */}
        <p className="relative text-xs text-primary-400">
          © {new Date().getFullYear()} Minha Ótica. Todos os direitos reservados.
        </p>
      </div>

      {/* ── Lado direito: formulário ─────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 sm:px-12">
        {/* Logo mobile */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-900">
            <Eye className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-slate-900">Minha Ótica</span>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Acesse sua conta para gerenciar sua ótica.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* E-mail */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@optica.com"
                  className={cn(
                    'h-11 w-full rounded-xl border bg-slate-50 pl-9 pr-4 text-sm text-slate-900 outline-none transition',
                    'placeholder:text-slate-400',
                    'focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100',
                    error ? 'border-red-400' : 'border-slate-200',
                  )}
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Senha</label>
                <button
                  type="button"
                  className="text-xs font-semibold text-primary-700 hover:text-primary-900"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={cn(
                    'h-11 w-full rounded-xl border bg-slate-50 pl-9 pr-10 text-sm text-slate-900 outline-none transition',
                    'focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100',
                    error ? 'border-red-400' : 'border-slate-200',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary-800 text-sm font-semibold text-white transition hover:bg-primary-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Link de registro */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Ainda não tem uma conta?{' '}
            <Link
              to="/register"
              className="font-semibold text-primary-700 hover:text-primary-900"
            >
              Cadastrar minha ótica
            </Link>
          </p>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-400">
            <button className="hover:text-slate-600">Termos de Uso</button>
            <button className="hover:text-slate-600">Privacidade</button>
            <button className="hover:text-slate-600">Segurança</button>
          </div>
        </div>
      </div>
    </div>
  )
}
