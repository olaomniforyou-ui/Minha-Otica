import { useState, useMemo, useEffect, useRef } from 'react'
import { MessageCircle, Send, Copy, Check, Search, User, Edit3, RotateCcw, Users, Clock, Trash2, ExternalLink, Bot, Megaphone, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

const API_URL = ((import.meta.env.VITE_API_URL ?? 'http://localhost:3001') as string).replace(/\/$/, '') + '/api/v1'

interface PatientHit { id: string; full_name: string; phone?: string }

const TEMPLATES_STORAGE_KEY = 'whatsapp_templates_v1'
const HISTORY_KEY = 'whatsapp_history_v1'

interface SentMessage {
  id: string
  templateTitle: string
  templateCategory: string
  recipient: string
  phone: string
  message: string
  sentAt: string
}

function loadHistory(): SentMessage[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}
function saveHistory(h: SentMessage[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 100)))
}

interface Template {
  id: string
  category: 'os' | 'lab' | 'cobranca' | 'marketing' | 'posVenda' | 'custom'
  title: string
  body: string
  vars: string[]
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'os_pronta',
    category: 'os',
    title: 'OS Pronta para Retirada',
    body: 'Olá, {nome}! 👓 Sua ordem de serviço está pronta para retirada na {otica}. Estamos te esperando! Horário: seg-sex das 9h às 18h.',
    vars: ['nome', 'otica'],
  },
  {
    id: 'os_em_producao',
    category: 'lab',
    title: 'OS em Produção',
    body: 'Olá, {nome}! Informamos que seus óculos já estão em produção no laboratório. Prazo estimado: {prazo}. Qualquer dúvida, estamos à disposição! 😊',
    vars: ['nome', 'prazo'],
  },
  {
    id: 'lab_defeito',
    category: 'lab',
    title: 'Defeito Identificado',
    body: 'Olá, {nome}. Identificamos um problema no seu pedido e estamos em contato com o laboratório para resolução. Em breve entramos em contato com mais informações.',
    vars: ['nome'],
  },
  {
    id: 'aniversario',
    category: 'marketing',
    title: 'Feliz Aniversário 🎂',
    body: 'Feliz Aniversário, {nome}! 🎉 A {otica} deseja a você um dia maravilhoso! Como presente, oferecemos {desconto}% de desconto na sua próxima visita. Válido por 30 dias.',
    vars: ['nome', 'otica', 'desconto'],
  },
  {
    id: 'retorno',
    category: 'marketing',
    title: 'Está na hora de uma nova consulta',
    body: 'Olá, {nome}! Faz um tempo que não te vemos por aqui na {otica}. Sua última visita foi em {data}. Que tal agendar um check-up da visão? 👁️',
    vars: ['nome', 'otica', 'data'],
  },
  {
    id: 'cobranca',
    category: 'cobranca',
    title: 'Lembrete de Pagamento',
    body: 'Olá, {nome}. Passando para lembrar que temos um valor de R$ {valor} em aberto referente a {descricao}. Por favor, entre em contato para regularizarmos. Obrigado!',
    vars: ['nome', 'valor', 'descricao'],
  },
  {
    id: 'nps',
    category: 'posVenda',
    title: 'Pesquisa de Satisfação (NPS)',
    body: 'Olá, {nome}! Esperamos que esteja amando seus óculos 😊 Em uma escala de 0 a 10, o quanto você recomendaria a {otica} para um amigo? Sua opinião é muito importante para nós!',
    vars: ['nome', 'otica'],
  },
  {
    id: 'garantia_acionada',
    category: 'posVenda',
    title: 'Garantia Acionada',
    body: 'Olá, {nome}. Recebemos seu pedido de garantia e já estamos providenciando a troca/reparo. Assim que houver novidades, entraremos em contato. Pedimos desculpas pelo transtorno!',
    vars: ['nome'],
  },
]

const CAT_LABELS: Record<string, string> = {
  os: 'Ordem de Serviço',
  lab: 'Laboratório',
  cobranca: 'Cobrança',
  marketing: 'Marketing',
  posVenda: 'Pós-Venda',
  custom: 'Personalizado',
}

const CAT_COLORS: Record<string, string> = {
  os: 'bg-indigo-100 text-indigo-700',
  lab: 'bg-violet-100 text-violet-700',
  cobranca: 'bg-red-100 text-red-700',
  marketing: 'bg-emerald-100 text-emerald-700',
  posVenda: 'bg-amber-100 text-amber-700',
  custom: 'bg-slate-100 text-slate-600',
}

function loadCustomTemplates(): Template[] {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_STORAGE_KEY) ?? '[]') } catch { return [] }
}
function saveCustomTemplates(t: Template[]) {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(t))
}

export default function WhatsAppPage() {
  const company  = useAuthStore(s => s.company)
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Template | null>(null)
  const [phone, setPhone] = useState('')
  const [vars, setVars] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState('')
  const [custom, setCustom] = useState<Template[]>(loadCustomTemplates)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [tab, setTab] = useState<'templates' | 'historico' | 'ia' | 'campanha'>('templates')
  const [history, setHistory] = useState<SentMessage[]>(loadHistory)

  // Campanha em massa
  type CampSegment = 'todos' | 'aniversariantes' | 'recompra'
  interface CampPatient { id: string; full_name: string; phone?: string }
  const [campSegment,  setCampSegment]  = useState<CampSegment>('todos')
  const [campTemplate, setCampTemplate] = useState<Template | null>(null)
  const [campPatients, setCampPatients] = useState<CampPatient[]>([])
  const [campLoading,  setCampLoading]  = useState(false)
  const [campSent,     setCampSent]     = useState<Set<string>>(new Set())

  async function loadCampPatients() {
    if (!company) return
    setCampLoading(true)
    setCampPatients([])
    setCampSent(new Set())

    let query = supabase
      .from('patients')
      .select('id, full_name, phone, birth_date, is_active, created_at')
      .eq('company_id', company.id)
      .not('phone', 'is', null)
      .order('full_name')

    if (campSegment === 'todos') {
      query = query.eq('is_active', true)
    } else if (campSegment === 'aniversariantes') {
      const month = new Date().getMonth() + 1
      const pad = String(month).padStart(2, '0')
      query = query.eq('is_active', true).ilike('birth_date', `%-${pad}-%`)
    } else if (campSegment === 'recompra') {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      query = query.eq('is_active', true).lt('created_at', sixMonthsAgo.toISOString())
    }

    const { data } = await query.limit(200)
    setCampPatients((data ?? []) as CampPatient[])
    setCampLoading(false)
  }

  function campSend(p: CampPatient) {
    if (!campTemplate || !p.phone) return
    const otica = company?.name ?? ''
    const msg = campTemplate.body
      .replace(/\{nome\}/g, p.full_name)
      .replace(/\{otica\}/g, otica)
    window.open(`https://wa.me/55${p.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
    setCampSent(prev => new Set([...prev, p.id]))
  }

  // IA Chat
  interface AiMsg { role: 'user' | 'assistant'; content: string }
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([])
  const [aiInput,    setAiInput]    = useState('')
  const [aiLoading,  setAiLoading]  = useState(false)
  const aiEndRef = useRef<HTMLDivElement>(null)

  // Patient search
  const [patSearch, setPatSearch]     = useState('')
  const [patients,  setPatients]      = useState<PatientHit[]>([])
  const [showPicker, setShowPicker]   = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!company || patSearch.length < 2) { setPatients([]); return }
    supabase
      .from('patients')
      .select('id, full_name, phone')
      .eq('company_id', company.id)
      .ilike('full_name', `%${patSearch}%`)
      .limit(8)
      .then(({ data }) => setPatients((data ?? []) as PatientHit[]))
  }, [patSearch, company])

  useEffect(() => {
    if (!showPicker) return
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

  function pickPatient(p: PatientHit) {
    setPhone(p.phone ?? '')
    setVars(prev => ({ ...prev, nome: p.full_name }))
    setPatSearch(p.full_name)
    setShowPicker(false)
  }

  const allTemplates = useMemo(() => [...DEFAULT_TEMPLATES, ...custom], [custom])

  const filtered = useMemo(() => allTemplates.filter(t => {
    const matchCat = !catFilter || t.category === catFilter
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.body.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  }), [allTemplates, catFilter, search])

  function select(t: Template) {
    setSelected(t)
    setVars(Object.fromEntries(t.vars.map(v => [v, v === 'otica' ? (company?.name ?? '') : ''])))
    setEditing(false)
    setEditBody(t.body)
    setCopied(false)
  }

  function buildMessage(): string {
    const body = editing ? editBody : (selected?.body ?? '')
    return body.replace(/\{(\w+)\}/g, (_, k) => vars[k] || `{${k}}`)
  }

  function sendWhatsApp() {
    const num = phone.replace(/\D/g, '')
    const msg = buildMessage()
    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(msg)}`, '_blank')
    const entry: SentMessage = {
      id: `sent_${Date.now()}`,
      templateTitle: selected?.title ?? 'Mensagem personalizada',
      templateCategory: selected?.category ?? 'custom',
      recipient: patSearch || phone,
      phone: num,
      message: msg,
      sentAt: new Date().toISOString(),
    }
    const next = [entry, ...history].slice(0, 100)
    setHistory(next)
    saveHistory(next)
  }

  function copyMessage() {
    navigator.clipboard.writeText(buildMessage()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function addCustom() {
    if (!newTitle.trim() || !newBody.trim()) return
    const vars = [...newBody.matchAll(/\{(\w+)\}/g)].map(m => m[1])
    const t: Template = { id: `custom_${Date.now()}`, category: 'custom', title: newTitle, body: newBody, vars: [...new Set(vars)] }
    const next = [...custom, t]
    setCustom(next)
    saveCustomTemplates(next)
    setNewTitle('')
    setNewBody('')
    setShowNew(false)
    select(t)
  }

  function deleteCustom(id: string) {
    const next = custom.filter(t => t.id !== id)
    setCustom(next)
    saveCustomTemplates(next)
    if (selected?.id === id) setSelected(null)
  }

  const preview = buildMessage()

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages])

  async function sendAiMessage() {
    const text = aiInput.trim()
    if (!text || aiLoading) return
    const next: AiMsg[] = [...aiMessages, { role: 'user', content: text }]
    setAiMessages(next)
    setAiInput('')
    setAiLoading(true)
    try {
      const res = await fetch(`${API_URL}/ai/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.text ?? 'Sem resposta.' }])
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar com a IA.' }])
    }
    setAiLoading(false)
  }

  function reSend(msg: SentMessage) {
    window.open(`https://wa.me/55${msg.phone}?text=${encodeURIComponent(msg.message)}`, '_blank')
  }

  function clearHistory() {
    saveHistory([])
    setHistory([])
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle size={20} className="text-green-500" /> WhatsApp
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Templates prontos e histórico de envios.</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'templates' && (
            <button
              onClick={() => setShowNew(v => !v)}
              className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
            >
              <Edit3 size={14} /> Novo Template
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('templates')}
          className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
            tab === 'templates' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
        >
          <MessageCircle size={14} /> Templates
        </button>
        <button
          onClick={() => setTab('historico')}
          className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
            tab === 'historico' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
        >
          <Clock size={14} /> Histórico
          {history.length > 0 && (
            <span className="ml-1 bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 rounded-full">{history.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab('ia')}
          className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
            tab === 'ia' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
        >
          <Bot size={14} /> IA
        </button>
        <button
          onClick={() => setTab('campanha')}
          className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
            tab === 'campanha' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
        >
          <Megaphone size={14} /> Campanha
        </button>
      </div>

      {/* ── Aba Templates ── */}
      {tab === 'templates' && <>

      {/* Formulário novo template */}
      {showNew && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-800">Criar template personalizado</p>
          <input
            type="text"
            placeholder="Título do template"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
          />
          <textarea
            placeholder="Corpo da mensagem. Use {nome}, {otica}, {valor} etc. para variáveis."
            value={newBody}
            onChange={e => setNewBody(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={addCustom} className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-colors">
              Salvar
            </button>
            <button onClick={() => setShowNew(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Painel esquerdo — lista de templates */}
        <div className="lg:col-span-2 space-y-3">
          {/* Busca */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar template..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
            />
          </div>

          {/* Filtros de categoria */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setCatFilter('')}
              className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors', !catFilter ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
            >
              Todos
            </button>
            {Object.entries(CAT_LABELS).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setCatFilter(k === catFilter ? '' : k)}
                className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors', catFilter === k ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map(t => (
              <div
                key={t.id}
                onClick={() => select(t)}
                className={cn(
                  'rounded-xl border p-3 cursor-pointer transition-all',
                  selected?.id === t.id
                    ? 'border-green-400 bg-green-50 ring-2 ring-green-400/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{t.title}</p>
                  {t.category === 'custom' && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteCustom(t.id) }}
                      className="text-slate-300 hover:text-red-400 flex-shrink-0"
                    >✕</button>
                  )}
                </div>
                <span className={cn('inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full', CAT_COLORS[t.category])}>
                  {CAT_LABELS[t.category]}
                </span>
                <p className="mt-1.5 text-[11px] text-slate-500 line-clamp-2">{t.body}</p>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum template encontrado.</p>
            )}
          </div>
        </div>

        {/* Painel direito — composer */}
        <div className="lg:col-span-3 space-y-4">
          {selected ? (
            <>
              {/* Header template selecionado */}
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{selected.title}</p>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', CAT_COLORS[selected.category])}>
                    {CAT_LABELS[selected.category]}
                  </span>
                </div>
                <button onClick={() => { setEditing(v => !v); setEditBody(selected.body) }} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">
                  <Edit3 size={13} /> {editing ? 'Cancelar edição' : 'Editar'}
                </button>
                <button onClick={() => { setSelected(null); setVars({}) }} className="text-slate-300 hover:text-slate-500">
                  <RotateCcw size={13} />
                </button>
              </div>

              {/* Variáveis */}
              {selected.vars.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Variáveis da mensagem</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.vars.map(v => (
                      <div key={v}>
                        <label className="block text-[11px] text-slate-500 mb-1">{`{${v}}`}</label>
                        <input
                          type="text"
                          placeholder={v}
                          value={vars[v] ?? ''}
                          onChange={e => setVars(prev => ({ ...prev, [v]: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-green-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Editor (quando ativo) */}
              {editing && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <p className="text-xs font-bold text-amber-700">Editar corpo da mensagem</p>
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    rows={5}
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 resize-none"
                  />
                </div>
              )}

              {/* Preview */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Preview da mensagem</p>
                <div className="rounded-2xl rounded-bl-sm bg-white border border-slate-200 p-4 text-sm text-slate-800 whitespace-pre-line leading-relaxed shadow-sm">
                  {preview}
                </div>
              </div>

              {/* Enviar */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                  <User size={12} /> Destinatário
                </p>

                {/* Busca de paciente */}
                <div className="relative" ref={pickerRef}>
                  <div className="relative">
                    <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar paciente pelo nome..."
                      value={patSearch}
                      onChange={e => { setPatSearch(e.target.value); setShowPicker(true) }}
                      onFocus={() => setShowPicker(true)}
                      className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                    />
                  </div>
                  {showPicker && patients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      {patients.map(p => (
                        <button
                          key={p.id}
                          onClick={() => pickPatient(p)}
                          className="flex items-center justify-between w-full px-3 py-2.5 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <span className="text-sm font-medium text-slate-800">{p.full_name}</span>
                          {p.phone && <span className="text-xs text-slate-400">{p.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="(11) 9 9999-9999"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={sendWhatsApp}
                    disabled={!phone.replace(/\D/g, '')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-bold text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={14} /> Enviar via WhatsApp
                  </button>
                  <button
                    onClick={copyMessage}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3 rounded-2xl border border-dashed border-slate-200">
              <MessageCircle size={36} className="opacity-20" />
              <p className="text-sm">Selecione um template para começar</p>
            </div>
          )}
        </div>
      </div>

      </>}

      {/* ── Aba IA ── */}
      {tab === 'ia' && (
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: 420 }}>
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50">
            <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Assistente de Mensagens IA</p>
              <p className="text-[11px] text-slate-500">Peça sugestões de templates, estratégias e textos para WhatsApp</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {aiMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                <Bot size={40} className="opacity-15" />
                <p className="text-sm text-center text-slate-500">
                  Peça ajuda para criar mensagens para seus clientes.<br />
                  <span className="text-xs text-slate-400">Ex: "Crie uma mensagem de aniversário com desconto"</span>
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    'Mensagem de cobrança gentil',
                    'Template de pós-venda para NPS',
                    'Aviso de OS pronta criativa',
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => setAiInput(s)}
                      className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {aiMessages.map((m, i) => (
              <div key={i} className={cn('flex items-end gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mb-0.5">
                    <Bot size={11} className="text-violet-600" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'bg-green-500 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                )}>
                  {m.content}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={11} className="text-violet-600" />
                </div>
                <div className="flex gap-1 bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={aiEndRef} />
          </div>

          <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder="Peça ajuda para criar mensagens..."
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage() } }}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
            />
            <button
              onClick={sendAiMessage}
              disabled={!aiInput.trim() || aiLoading}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={14} /> Enviar
            </button>
          </div>
        </div>
      )}

      {/* ── Aba Histórico ── */}
      {tab === 'historico' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {history.length === 0 ? 'Nenhuma mensagem enviada ainda.' : `${history.length} envio${history.length !== 1 ? 's' : ''} registrado${history.length !== 1 ? 's' : ''}.`}
            </p>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} /> Limpar histórico
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3 rounded-2xl border border-dashed border-slate-200">
              <Clock size={32} className="opacity-20" />
              <p className="text-sm">Envie uma mensagem para ela aparecer aqui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(msg => (
                <div key={msg.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{msg.templateTitle}</p>
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', CAT_COLORS[msg.templateCategory] ?? CAT_COLORS.custom)}>
                        {CAT_LABELS[msg.templateCategory] ?? 'Personalizado'}
                      </span>
                    </div>
                    <button
                      onClick={() => reSend(msg)}
                      title="Reenviar"
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium flex-shrink-0"
                    >
                      <ExternalLink size={12} /> Reenviar
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <User size={11} />
                    <span className="font-medium text-slate-700">{msg.recipient || msg.phone}</span>
                    {msg.phone && msg.recipient !== msg.phone && (
                      <span className="text-slate-400">{msg.phone}</span>
                    )}
                    <span className="ml-auto">
                      {new Date(msg.sentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 rounded-lg px-3 py-2 whitespace-pre-line">{msg.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Aba Campanha ── */}
      {tab === 'campanha' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><Megaphone size={15} className="text-green-600" /> Configurar Campanha</p>

            {/* Segmento */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Segmento de pacientes</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'todos',          label: 'Todos os ativos',        desc: 'Todos os pacientes com status ativo' },
                  { id: 'aniversariantes', label: 'Aniversariantes do mês', desc: 'Pacientes que fazem aniversário este mês' },
                  { id: 'recompra',       label: 'Reengajamento',          desc: 'Cadastrados há mais de 6 meses' },
                ] as { id: CampSegment; label: string; desc: string }[]).map(seg => (
                  <button
                    key={seg.id}
                    onClick={() => setCampSegment(seg.id)}
                    title={seg.desc}
                    className={cn(
                      'rounded-xl px-3 py-2 text-xs font-semibold border transition-all',
                      campSegment === seg.id
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-green-300',
                    )}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Template de mensagem</p>
              <select
                value={campTemplate?.id ?? ''}
                onChange={e => setCampTemplate(allTemplates.find(t => t.id === e.target.value) ?? null)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400"
              >
                <option value="">Selecione um template...</option>
                {allTemplates.map(t => (
                  <option key={t.id} value={t.id}>{CAT_LABELS[t.category]} — {t.title}</option>
                ))}
              </select>
              {campTemplate && (
                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-line line-clamp-3">
                  {campTemplate.body}
                </div>
              )}
            </div>

            <button
              onClick={loadCampPatients}
              disabled={campLoading}
              className="flex items-center gap-2 rounded-xl bg-green-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {campLoading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Carregando…</>
                : <><Users size={15} /> Carregar pacientes</>
              }
            </button>
          </div>

          {/* Lista de pacientes */}
          {campPatients.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {campPatients.length} paciente{campPatients.length !== 1 ? 's' : ''} encontrado{campPatients.length !== 1 ? 's' : ''}
                  {campSent.size > 0 && <span className="ml-2 text-emerald-600">· {campSent.size} enviado{campSent.size !== 1 ? 's' : ''}</span>}
                </p>
                {!campTemplate && <p className="text-xs text-amber-600 font-medium">Selecione um template para enviar</p>}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-50">
                {campPatients.map(p => {
                  const sent = campSent.has(p.id)
                  return (
                    <div key={p.id} className={cn('flex items-center gap-3 px-4 py-3', sent && 'bg-emerald-50/50')}>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold truncate', sent ? 'text-slate-400' : 'text-slate-800')}>{p.full_name}</p>
                        {p.phone && <p className="text-[11px] text-slate-400">{p.phone}</p>}
                      </div>
                      {sent ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 size={13} /> Enviado
                        </span>
                      ) : (
                        <button
                          onClick={() => campSend(p)}
                          disabled={!campTemplate || !p.phone}
                          className="flex items-center gap-1.5 rounded-xl bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send size={11} /> Enviar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
