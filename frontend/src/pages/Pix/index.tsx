import { useState, useEffect } from 'react'
import { QrCode, Copy, Check, Smartphone, CreditCard, TrendingUp, Plus, Trash2, Save, Share2, MessageCircle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

const PIX_KEY_KEY  = 'pix_settings_v1'
const PIX_HIST_KEY = 'pix_history_v1'

type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'

interface PixSettings {
  keyType: PixKeyType
  keyValue: string
  receiverName: string
  city: string
}

interface PixPayment {
  id: string
  amount: number
  description: string
  date: string
  status: 'pago' | 'pendente'
}

function loadSettings(): PixSettings {
  try { return JSON.parse(localStorage.getItem(PIX_KEY_KEY) ?? 'null') ?? { keyType: 'aleatoria', keyValue: '', receiverName: '', city: '' } }
  catch { return { keyType: 'aleatoria', keyValue: '', receiverName: '', city: '' } }
}
function saveSettings(s: PixSettings) { localStorage.setItem(PIX_KEY_KEY, JSON.stringify(s)) }

function loadHistory(): PixPayment[] {
  try { return JSON.parse(localStorage.getItem(PIX_HIST_KEY) ?? '[]') } catch { return [] }
}
function saveHistory(h: PixPayment[]) { localStorage.setItem(PIX_HIST_KEY, JSON.stringify(h)) }

const KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Chave Aleatória',
}

export default function PixPage() {
  const company = useAuthStore(s => s.company)
  const [settings, setSettings] = useState<PixSettings>(loadSettings)
  const [history, setHistory]   = useState<PixPayment[]>(loadHistory)
  const [saved,   setSaved]     = useState(false)
  const [copied,  setCopied]    = useState(false)

  // Cobrança avulsa
  const [amount,       setAmount]       = useState('')
  const [desc,         setDesc]         = useState('')
  const [tab,          setTab]          = useState<'config' | 'cobrar' | 'historico'>('config')
  const [copiedLink,   setCopiedLink]   = useState(false)

  // Estatísticas do mês (via Supabase)
  const [pixMonth, setPixMonth] = useState(0)
  const [pixCount, setPixCount] = useState(0)

  useEffect(() => {
    if (!company) return
    const start = new Date()
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    supabase
      .from('sales')
      .select('total_amount')
      .eq('company_id', company.id)
      .eq('payment_method', 'pix')
      .gte('created_at', start.toISOString())
      .then(({ data }) => {
        const vals = data ?? []
        setPixCount(vals.length)
        setPixMonth(vals.reduce((s, x) => s + (x.total_amount ?? 0), 0))
      })
  }, [company])

  function saveConfig() {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function copyKey() {
    if (!settings.keyValue) return
    navigator.clipboard.writeText(settings.keyValue).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function addPayment() {
    const val = parseFloat(amount.replace(',', '.'))
    if (!val || val <= 0) return
    const payment: PixPayment = {
      id: `${Date.now()}`,
      amount: val,
      description: desc || 'Cobrança Pix',
      date: new Date().toISOString(),
      status: 'pendente',
    }
    const next = [payment, ...history]
    setHistory(next)
    saveHistory(next)
    setAmount('')
    setDesc('')
  }

  function toggleStatus(id: string) {
    const next = history.map(p => p.id === id ? { ...p, status: p.status === 'pago' ? 'pendente' : 'pago' } as PixPayment : p)
    setHistory(next)
    saveHistory(next)
  }

  function removePayment(id: string) {
    const next = history.filter(p => p.id !== id)
    setHistory(next)
    saveHistory(next)
  }

  function shareViaWhatsApp() {
    const val = parseFloat(amount.replace(',', '.'))
    if (!settings.keyValue || !val) return
    const msg = `💰 *Cobrança via Pix*\n\n*Valor:* R$ ${val.toFixed(2).replace('.', ',')}\n*Descrição:* ${desc || 'Pagamento'}\n\n*Chave Pix (${KEY_TYPE_LABELS[settings.keyType]}):*\n${settings.keyValue}\n\nPor favor, realize o pagamento e envie o comprovante. Obrigado! 😊`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function copyPixLink() {
    if (!pixQrLink) return
    navigator.clipboard.writeText(pixQrLink).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  const pendingTotal = history.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0)
  const paidTotal    = history.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)

  const pixQrLink = settings.keyValue
    ? `https://gerarqrcodepix.com.br/api/v1?nome=${encodeURIComponent(settings.receiverName || company?.name || 'Minha Otica')}&cidade=${encodeURIComponent(settings.city || 'SAO PAULO')}&chave=${encodeURIComponent(settings.keyValue)}&valor=${amount ? parseFloat(amount.replace(',', '.')) : ''}&saida=qr`
    : null

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <QrCode size={20} className="text-indigo-600" /> Pix — Recebimentos
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure sua chave Pix e controle cobranças avulsas.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Pix recebidos no mês', value: formatCurrency(pixMonth), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Transações no mês',   value: String(pixCount),          icon: Smartphone,  color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Cobranças pendentes',  value: formatCurrency(pendingTotal), icon: CreditCard, color: 'text-amber-600 bg-amber-50' },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
            <div className={cn('rounded-xl p-2.5', c.color.split(' ')[1])}>
              <c.icon size={18} className={c.color.split(' ')[0]} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className="text-lg font-bold text-slate-900">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['config','Configurar Chave'], ['cobrar','Nova Cobrança'], ['historico','Histórico']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Configurar */}
      {tab === 'config' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 max-w-xl">
          <p className="text-sm font-bold text-slate-800">Dados da Chave Pix</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Tipo de Chave</label>
              <select
                value={settings.keyType}
                onChange={e => setSettings(s => ({ ...s, keyType: e.target.value as PixKeyType }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              >
                {Object.entries(KEY_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Valor da Chave</label>
              <input
                type="text"
                value={settings.keyValue}
                onChange={e => setSettings(s => ({ ...s, keyValue: e.target.value }))}
                placeholder="Ex: meupix@email.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Nome do Recebedor</label>
              <input
                type="text"
                value={settings.receiverName}
                onChange={e => setSettings(s => ({ ...s, receiverName: e.target.value }))}
                placeholder={company?.name ?? 'Nome da loja'}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Cidade</label>
              <input
                type="text"
                value={settings.city}
                onChange={e => setSettings(s => ({ ...s, city: e.target.value }))}
                placeholder="Ex: SAO PAULO"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={saveConfig} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
              {saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? 'Salvo!' : 'Salvar'}
            </button>
            {settings.keyValue && (
              <button onClick={copyKey} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'Copiado!' : `Copiar chave ${KEY_TYPE_LABELS[settings.keyType]}`}
              </button>
            )}
          </div>

          {settings.keyValue && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-700">
              <strong>Chave configurada:</strong> {settings.keyValue} ({KEY_TYPE_LABELS[settings.keyType]})
            </div>
          )}
        </div>
      )}

      {/* Tab: Nova cobrança */}
      {tab === 'cobrar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-sm font-bold text-slate-800">Gerar cobrança</p>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Valor (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 text-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Descrição</label>
              <input
                type="text"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Ex: Venda de armação"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <button
              onClick={addPayment}
              disabled={!amount || parseFloat(amount.replace(',', '.')) <= 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Plus size={15} /> Registrar cobrança
            </button>
          </div>

          {/* QR Code display */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col items-center justify-center gap-4 text-center">
            {settings.keyValue && amount && parseFloat(amount.replace(',', '.')) > 0 ? (
              <>
                <p className="text-xs text-slate-500">QR Code Pix</p>
                <img
                  src={pixQrLink ?? ''}
                  alt="QR Code Pix"
                  className="w-40 h-40 rounded-xl border border-slate-200"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <p className="text-lg font-extrabold text-indigo-700">
                  {formatCurrency(parseFloat(amount.replace(',', '.')))}
                </p>
                <p className="text-xs text-slate-500">{desc || 'Cobrança Pix'}</p>

                {/* Botões de compartilhamento */}
                <div className="flex gap-2 w-full pt-1">
                  <button
                    onClick={shareViaWhatsApp}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2 text-xs font-semibold text-white hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle size={13} /> Enviar por WhatsApp
                  </button>
                  <button
                    onClick={copyPixLink}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {copiedLink ? <Check size={13} className="text-green-500" /> : <Share2 size={13} />}
                    {copiedLink ? 'Copiado!' : 'Copiar QR'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <QrCode size={48} className="text-slate-200" />
                <p className="text-sm text-slate-400">
                  {!settings.keyValue ? 'Configure sua chave Pix primeiro.' : 'Informe um valor para gerar o QR Code.'}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab: Histórico */}
      {tab === 'historico' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-800">Cobranças registradas</p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="text-emerald-600 font-semibold">{formatCurrency(paidTotal)} recebido</span>
              <span className="text-amber-600 font-semibold">{formatCurrency(pendingTotal)} pendente</span>
            </div>
          </div>
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <QrCode size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma cobrança registrada.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {history.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{p.description}</p>
                    <p className="text-xs text-slate-400">{new Date(p.date).toLocaleString('pt-BR')}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(p.amount)}</p>
                  <button
                    onClick={() => toggleStatus(p.id)}
                    className={cn(
                      'text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors',
                      p.status === 'pago'
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200',
                    )}
                  >
                    {p.status === 'pago' ? '✓ Pago' : 'Pendente'}
                  </button>
                  <button onClick={() => removePayment(p.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
