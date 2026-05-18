import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Loader2, Sparkles, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

interface Message { role: 'user' | 'assistant'; content: string }

async function fetchBusinessContext(companyId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const todayStr   = today.toISOString()

  const [salesDay, salesMonth, labRes, osRes, expRes, stockRes] = await Promise.all([
    supabase.from('sales').select('total_amount').eq('company_id', companyId).gte('created_at', todayStr),
    supabase.from('sales').select('total_amount').eq('company_id', companyId).gte('created_at', monthStart),
    supabase.from('lab_trackings').select('status').eq('company_id', companyId).not('status', 'in', '("retornado","com_defeito")'),
    supabase.from('service_orders').select('status').eq('company_id', companyId).not('status', 'in', '("entregue","cancelado")'),
    supabase.from('expenses').select('amount').eq('company_id', companyId).eq('is_paid', true).gte('paid_at', monthStart),
    supabase.from('products').select('id').eq('company_id', companyId).filter('stock_quantity', 'lte', 'min_stock'),
  ])

  return {
    revenue_today:  (salesDay.data ?? []).reduce((s, x) => s + x.total_amount, 0),
    sales_today:    salesDay.data?.length ?? 0,
    revenue_month:  (salesMonth.data ?? []).reduce((s, x) => s + x.total_amount, 0),
    sales_month:    salesMonth.data?.length ?? 0,
    pending_orders: osRes.data?.length ?? 0,
    lab_items:      (labRes.data ?? []).filter(l => l.status !== 'com_defeito').length,
    defect_count:   (labRes.data ?? []).filter(l => l.status === 'com_defeito').length,
    expenses_month: (expRes.data ?? []).reduce((s, x) => s + x.amount, 0),
    low_stock:      stockRes.data?.length ?? 0,
  }
}

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001')

export function AIDono() {
  const company   = useAuthStore(s => s.company)
  const [open,    setOpen]    = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const bodyRef   = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, loading])

  useEffect(() => {
    if (open && messages.length > 0) inputRef.current?.focus()
  }, [open, messages.length])

  async function callAPI(body: object): Promise<string> {
    const res = await fetch(`${API_URL}/api/ai/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data.text ?? ''
  }

  async function handleAnalyze() {
    if (!company) return
    setLoading(true)
    setError('')
    setMessages([])
    try {
      const ctx  = await fetchBusinessContext(company.id)
      const text = await callAPI(ctx)
      setMessages([{ role: 'assistant', content: text }])
    } catch (e: any) {
      setError(e.message ?? 'Erro ao conectar ao assistente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setError('')
    const next: Message[] = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setLoading(true)
    try {
      const text = await callAPI({ messages: next })
      setMessages([...next, { role: 'assistant', content: text }])
    } catch (e: any) {
      setError(e.message ?? 'Erro ao enviar pergunta.')
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0 && !loading && !error

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Assistente Dono (IA)"
        className={cn(
          'fixed bottom-5 right-5 z-50 flex items-center justify-center rounded-full shadow-lg transition-all duration-200',
          'bg-gradient-to-br from-indigo-600 to-violet-600 text-white hover:scale-105 active:scale-95',
        )}
        style={{ width: 52, height: 52 }}
      >
        {open ? <X size={20} /> : <Bot size={22} />}
      </button>

      {/* Painel */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white"
          style={{ maxHeight: '80vh' }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-4 py-3 text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Sparkles size={16} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">Assistente Dono</p>
              <p className="text-[10px] opacity-70">Análise IA do seu negócio</p>
            </div>
            {messages.length > 0 && (
              <button onClick={handleAnalyze} title="Nova análise" className="opacity-70 hover:opacity-100 mr-1">
                <RefreshCw size={14} />
              </button>
            )}
            <button onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>

          {/* Mensagens */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {isEmpty && (
              <div className="text-center py-6 space-y-3">
                <Bot size={36} className="text-indigo-200 mx-auto" />
                <p className="text-xs text-slate-500">
                  Clique em <strong>Analisar</strong> para receber insights do seu negócio com base nos dados de hoje.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line',
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 size={14} className="animate-spin text-indigo-500" />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-[11px] text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 p-3 space-y-2 shrink-0">
            {messages.length === 0 ? (
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Analisando...</>
                  : <><Sparkles size={13} /> Analisar meu negócio</>
                }
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Faça uma pergunta..."
                  disabled={loading}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
