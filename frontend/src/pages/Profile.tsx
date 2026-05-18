import { useState } from 'react'
import { User, Phone, Mail, Building, ShieldCheck, Loader2, Save, HardDriveDownload, MapPin, Globe, Copy, ExternalLink } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { updateProfile } from '@/services/auth.service'
import { supabase } from '@/lib/supabase'
import { AvatarUpload } from '@/components/ui/AvatarUpload'
import { getPatients } from '@/services/patients.service'
import { getSales } from '@/services/sales.service'
import { getProducts } from '@/services/products.service'
import { getExpenses } from '@/services/expenses.service'
import {
  exportPatientsCsv, exportSalesCsv,
  exportProductsCsv, exportExpensesCsv,
} from '@/lib/exportCsv'

export default function ProfilePage() {
  const { profile, session, company } = useAuthStore()
  const [loading,       setLoading]       = useState(false)
  const [success,       setSuccess]       = useState(false)
  const [error,         setError]         = useState('')
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupMsg,     setBackupMsg]     = useState('')
  const [catalogCopied, setCatalogCopied] = useState(false)

  const catalogUrl = company?.id ? `${window.location.origin}/catalogo/${company.id}` : ''

  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    avatar_url: profile?.avatar_url || '',
  })

  // Dados da empresa
  const co = company as any
  const [companyForm, setCompanyForm] = useState({
    name:    co?.name    || '',
    phone:   co?.phone   || '',
    email:   co?.email   || '',
    address: co?.address || '',
    city:    co?.city    || '',
    state:   co?.state   || '',
  })
  const [companySaving, setCompanySaving] = useState(false)
  const [companyOk,     setCompanyOk]     = useState(false)
  const [companyErr,    setCompanyErr]    = useState('')

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault()
    if (!company?.id) return
    setCompanySaving(true)
    setCompanyErr('')
    const { error: err } = await supabase
      .from('companies')
      .update({
        name:    companyForm.name,
        phone:   companyForm.phone,
        email:   companyForm.email,
        address: companyForm.address,
        city:    companyForm.city,
        state:   companyForm.state,
      })
      .eq('id', company.id)
    setCompanySaving(false)
    if (err) { setCompanyErr(err.message); return }
    setCompanyOk(true)
    setTimeout(() => setCompanyOk(false), 3000)
  }

  const roleLabels = {
    admin: 'Administrador',
    gerente: 'Gerente',
    atendente: 'Atendente',
    tecnico: 'Técnico',
  }

  async function handleBackup() {
    setBackupLoading(true)
    setBackupMsg('Preparando backup...')
    try {
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

      setBackupMsg('Exportando pacientes...')
      exportPatientsCsv(await getPatients())
      await delay(500)

      setBackupMsg('Exportando vendas...')
      exportSalesCsv(await getSales())
      await delay(500)

      setBackupMsg('Exportando produtos...')
      exportProductsCsv(await getProducts())
      await delay(500)

      setBackupMsg('Exportando despesas...')
      exportExpensesCsv(await getExpenses())

      setBackupMsg('Backup concluído! 4 arquivos baixados.')
      setTimeout(() => setBackupMsg(''), 4000)
    } catch (e: any) {
      setBackupMsg(`Erro: ${e.message}`)
      setTimeout(() => setBackupMsg(''), 4000)
    } finally {
      setBackupLoading(false)
    }
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
          {/* Dados da Empresa */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Building size={18} className="text-slate-400" /> Dados da Empresa
            </h2>
            <form onSubmit={saveCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-1">Nome da Ótica</label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-1">Telefone da loja</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" value={companyForm.phone}
                      onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-1">E-mail da loja</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="email" value={companyForm.email}
                      onChange={e => setCompanyForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="contato@suaotica.com.br"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 text-sm"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-1">Endereço</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" value={companyForm.address}
                      onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="Rua, número, bairro"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-1">Cidade</label>
                  <input type="text" value={companyForm.city}
                    onChange={e => setCompanyForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-1">Estado (UF)</label>
                  <input type="text" maxLength={2} value={companyForm.state}
                    onChange={e => setCompanyForm(f => ({ ...f, state: e.target.value.toUpperCase() }))}
                    placeholder="SP"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 text-sm"
                  />
                </div>
              </div>

              {companyErr && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{companyErr}</div>
              )}
              {companyOk && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 text-sm border border-emerald-100">Dados da empresa atualizados!</div>
              )}

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={companySaving}
                  className="flex items-center gap-2 bg-primary-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-black transition-all disabled:opacity-60"
                >
                  {companySaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {companySaving ? 'Salvando...' : 'Salvar Empresa'}
                </button>
              </div>
            </form>
          </div>

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

          {/* Backup Manual */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <HardDriveDownload size={16} className="text-slate-500" />
              Backup de Dados
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Baixa pacientes, vendas, produtos e despesas em CSV.
            </p>
            <button
              onClick={handleBackup}
              disabled={backupLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-60"
            >
              {backupLoading
                ? <Loader2 size={15} className="animate-spin" />
                : <HardDriveDownload size={15} />
              }
              {backupLoading ? 'Exportando...' : 'Exportar Tudo'}
            </button>
            {backupMsg && (
              <p className={`mt-2 text-xs text-center font-medium ${
                backupMsg.startsWith('Erro') ? 'text-red-600' : 'text-emerald-600'
              }`}>
                {backupMsg}
              </p>
            )}
          </div>

          {/* Catálogo Online */}
          {catalogUrl && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Globe size={16} className="text-slate-500" />
                Catálogo Online
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Compartilhe sua vitrine de produtos com clientes.
              </p>
              <div className="flex justify-center mb-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=148x148&data=${encodeURIComponent(catalogUrl)}`}
                  alt="QR Code do Catálogo"
                  className="w-32 h-32 rounded-xl border border-slate-200"
                />
              </div>
              <p className="text-[10px] text-slate-400 text-center mb-3 break-all font-mono leading-relaxed">
                {catalogUrl}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(catalogUrl)
                    setCatalogCopied(true)
                    setTimeout(() => setCatalogCopied(false), 2000)
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Copy size={12} />
                  {catalogCopied ? 'Copiado!' : 'Copiar link'}
                </button>
                <a
                  href={catalogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <ExternalLink size={12} /> Abrir
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
