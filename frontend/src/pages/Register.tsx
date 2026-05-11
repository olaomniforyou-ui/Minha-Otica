import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, Building2, User, Mail, Lock, Phone,
  FileText, ChevronRight, ChevronLeft, CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ── Tipos ─────────────────────────────────────────────────────
interface CompanyData {
  name:  string
  cnpj:  string
  phone: string
  email: string
}
interface AdminData {
  full_name:        string
  email:            string
  password:         string
  confirm_password: string
}
type Step = 1 | 2 | 3

// ── Máscaras ──────────────────────────────────────────────────
function maskCNPJ(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}
function maskPhone(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

// ── Força da senha ────────────────────────────────────────────
function pwStrength(pwd: string) {
  if (!pwd) return { label: '', color: '', width: 'w-0' }
  if (pwd.length < 6)  return { label: 'Fraca',   color: 'bg-red-400',     width: 'w-1/4' }
  if (pwd.length < 8)  return { label: 'Regular', color: 'bg-amber-400',   width: 'w-2/4' }
  const score = [/[A-Z]/.test(pwd), /\d/.test(pwd), /[^A-Za-z0-9]/.test(pwd)].filter(Boolean).length
  if (score >= 2) return { label: 'Forte', color: 'bg-emerald-500', width: 'w-full' }
  return { label: 'Boa', color: 'bg-blue-500', width: 'w-3/4' }
}

// ── Componente principal ──────────────────────────────────────
export default function Register() {
  const navigate  = useNavigate()
  const [step,     setStep]    = useState<Step>(1)
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)
  const [showCfm,  setShowCfm] = useState(false)
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false)

  const [company, setCompany] = useState<CompanyData>({ name: '', cnpj: '', phone: '', email: '' })
  const [admin,   setAdmin]   = useState<AdminData>({ full_name: '', email: '', password: '', confirm_password: '' })

  const strength = pwStrength(admin.password)

  // ── Etapa 1 ───────────────────────────────────────────────
  function handleStep1(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setStep(2)
  }

  // ── Etapa 2 — registro via Supabase direto ────────────────
  async function handleStep2(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (admin.password !== admin.confirm_password) {
      setError('As senhas não coincidem.')
      return
    }
    if (admin.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      // 1. Cria o usuário no Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email:    admin.email,
        password: admin.password,
      })

      if (signUpError) throw new Error(signUpError.message)
      if (!signUpData.user) throw new Error('Erro ao criar usuário.')

      // 2. Se não há sessão, e-mail de confirmação foi enviado
      if (!signUpData.session) {
        setNeedsEmailConfirm(true)
        setStep(3)
        return
      }

      // 3. Chama a função SQL que cria empresa + perfil + categorias
      const { error: rpcError } = await supabase.rpc('register_company', {
        p_company_name:  company.name,
        p_company_cnpj:  company.cnpj.replace(/\D/g, ''),
        p_company_phone: company.phone.replace(/\D/g, ''),
        p_company_email: company.email,
        p_admin_name:    admin.full_name,
      })

      if (rpcError) {
        // Tenta fazer logout para limpar o usuário criado
        await supabase.auth.signOut()
        throw new Error(rpcError.message)
      }

      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Painel esquerdo ──────────────────────────────── */}
      <div className="relative hidden lg:flex lg:w-[42%] flex-col justify-between overflow-hidden bg-primary-950 p-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-800/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary-700/20 blur-3xl" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Eye className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">Minha Ótica</span>
        </div>

        <div className="relative space-y-5">
          <h2 className="text-3xl font-extrabold leading-tight text-white">
            Comece a gerenciar<br />sua ótica hoje.
          </h2>
          <ul className="space-y-3">
            {[
              'Funciona 100% offline com sync automático',
              'Gestão de pacientes, receitas e ordens de serviço',
              'Controle de estoque com alertas de baixo nível',
              'Acompanhamento de laboratório em tempo real',
              'Relatórios e analytics de desempenho',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-primary-200">
                <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-400">
          © {new Date().getFullYear()} Minha Ótica. Todos os direitos reservados.
        </p>
      </div>

      {/* ── Painel direito ────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-white px-6 py-12 sm:px-12">
        {/* Logo mobile */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-900">
            <Eye className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-slate-900">Minha Ótica</span>
        </div>

        <div className="w-full max-w-md">

          {/* ── Etapa 3: Sucesso ────────────────────────── */}
          {step === 3 && (
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={40} className="text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {needsEmailConfirm ? 'Confirme seu e-mail' : 'Conta criada!'}
                </h1>
                <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
                  {needsEmailConfirm
                    ? `Enviamos um link de confirmação para ${admin.email}. Após confirmar, faça login para continuar o cadastro da empresa.`
                    : `Bem-vindo à ${company.name}. Acesse com o e-mail e senha cadastrados.`}
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full h-11 rounded-xl bg-primary-800 text-sm font-semibold text-white hover:bg-primary-900 transition-colors"
              >
                Ir para o Login
              </button>
            </div>
          )}

          {/* ── Etapas 1 e 2 ──────────────────────────── */}
          {step !== 3 && (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-slate-900">Criar conta</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {step === 1 ? 'Dados da sua ótica.' : 'Dados do administrador principal.'}
                </p>

                {/* Stepper */}
                <div className="mt-5 flex items-center gap-2">
                  {[1, 2].map((s) => (
                    <div key={s} className="flex flex-1 items-center gap-2">
                      <div className={cn(
                        'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                        step >= s ? 'bg-primary-900 text-white' : 'bg-slate-100 text-slate-400',
                      )}>
                        {s}
                      </div>
                      <span className={cn('text-xs font-medium', step >= s ? 'text-slate-700' : 'text-slate-400')}>
                        {s === 1 ? 'Empresa' : 'Administrador'}
                      </span>
                      {s < 2 && <div className={cn('flex-1 h-px', step > s ? 'bg-primary-900' : 'bg-slate-200')} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Step 1 ─────────────────────────────── */}
              {step === 1 && (
                <form onSubmit={handleStep1} className="space-y-4">
                  <Field label="Nome da Ótica" required icon={<Building2 size={15} />}
                    placeholder="Ex: Ótica Visão Clara" value={company.name}
                    onChange={(v) => setCompany(c => ({ ...c, name: v }))} />

                  <Field label="CNPJ" required icon={<FileText size={15} />}
                    placeholder="00.000.000/0001-00" value={company.cnpj}
                    inputMode="numeric"
                    onChange={(v) => setCompany(c => ({ ...c, cnpj: maskCNPJ(v) }))} />

                  <Field label="Telefone" required icon={<Phone size={15} />}
                    placeholder="(00) 00000-0000" value={company.phone}
                    inputMode="tel"
                    onChange={(v) => setCompany(c => ({ ...c, phone: maskPhone(v) }))} />

                  <Field label="E-mail da Empresa" required type="email" icon={<Mail size={15} />}
                    placeholder="contato@suaotica.com" value={company.email}
                    onChange={(v) => setCompany(c => ({ ...c, email: v }))} />

                  <button type="submit"
                    className="mt-2 flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-primary-800 text-sm font-semibold text-white hover:bg-primary-900 transition-colors">
                    Próximo <ChevronRight size={16} />
                  </button>
                </form>
              )}

              {/* ── Step 2 ─────────────────────────────── */}
              {step === 2 && (
                <form onSubmit={handleStep2} className="space-y-4">
                  <Field label="Nome Completo" required icon={<User size={15} />}
                    placeholder="Seu nome completo" value={admin.full_name}
                    onChange={(v) => setAdmin(a => ({ ...a, full_name: v }))} />

                  <Field label="E-mail de Acesso" required type="email" icon={<Mail size={15} />}
                    placeholder="admin@suaotica.com" value={admin.email}
                    onChange={(v) => setAdmin(a => ({ ...a, email: v }))} />

                  {/* Senha */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-700">
                      Senha <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPass ? 'text' : 'password'} required minLength={8}
                        value={admin.password}
                        onChange={(e) => setAdmin(a => ({ ...a, password: e.target.value }))}
                        placeholder="Mínimo 8 caracteres"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {admin.password && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className={cn('h-full rounded-full transition-all duration-300', strength.color, strength.width)} />
                        </div>
                        <span className={cn('text-[11px] font-medium', {
                          'text-red-500':     strength.label === 'Fraca',
                          'text-amber-500':   strength.label === 'Regular',
                          'text-blue-500':    strength.label === 'Boa',
                          'text-emerald-600': strength.label === 'Forte',
                        })}>{strength.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Confirmar senha */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-700">
                      Confirmar Senha <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showCfm ? 'text' : 'password'} required
                        value={admin.confirm_password}
                        onChange={(e) => setAdmin(a => ({ ...a, confirm_password: e.target.value }))}
                        placeholder="Repita a senha"
                        className={cn(
                          'h-10 w-full rounded-lg border bg-white pl-9 pr-10 text-sm outline-none transition focus:ring-2',
                          admin.confirm_password && admin.password !== admin.confirm_password
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                            : 'border-slate-200 focus:border-primary-400 focus:ring-primary-100',
                        )}
                      />
                      <button type="button" onClick={() => setShowCfm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showCfm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {admin.confirm_password && admin.password !== admin.confirm_password && (
                      <p className="text-xs text-red-500">As senhas não coincidem.</p>
                    )}
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => { setStep(1); setError(null) }}
                      className="flex items-center gap-1 h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                      <ChevronLeft size={16} /> Voltar
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex flex-1 items-center justify-center gap-2 h-11 rounded-xl bg-primary-800 text-sm font-semibold text-white hover:bg-primary-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                      {loading ? 'Criando conta…' : 'Criar Conta'}
                    </button>
                  </div>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-slate-500">
                Já tem uma conta?{' '}
                <Link to="/login" className="font-semibold text-primary-700 hover:text-primary-900">
                  Entrar
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Campo reutilizável ────────────────────────────────────────
interface FieldProps {
  label:       string
  value:       string
  onChange:    (v: string) => void
  icon?:       React.ReactNode
  placeholder?: string
  type?:       string
  required?:   boolean
  inputMode?:  React.HTMLAttributes<HTMLInputElement>['inputMode']
}

function Field({ label, value, onChange, icon, placeholder, type = 'text', required, inputMode }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          type={type} required={required} value={value} inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={cn(
            'h-10 w-full rounded-lg border border-slate-200 bg-white text-sm text-slate-900 outline-none transition',
            'placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100',
            icon ? 'pl-9 pr-3' : 'px-3',
          )}
        />
      </div>
    </div>
  )
}
