import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  DollarSign, TrendingUp, Calendar, CreditCard, AlertCircle,
  ArrowUpRight, ArrowDownRight, Plus, CheckCircle2, Pencil, Trash2, Download, FileInput, Zap, X,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { ExpenseModal } from '@/components/financial/ExpenseModal'
import { ImportOfxModal } from '@/components/financial/ImportOfxModal'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { getExpenses, markExpensePaid, deleteExpense, createExpense } from '@/services/expenses.service'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { exportExpensesCsv } from '@/lib/exportCsv'
import { PAYMENT_LABELS, EXPENSE_CATEGORY_LABELS } from '@/types'
import type { PaymentMethod, Expense, ExpenseCategory } from '@/types'
import { getBankTransactions, reconcileTransaction, unreconcileTransaction } from '@/services/bank-transactions.service'
import type { BankTransaction } from '@/services/bank-transactions.service'

type Tab = 'caixa' | 'despesas' | 'dre' | 'conciliacao' | 'contas'

type AccountType = 'corrente' | 'poupanca' | 'investimento' | 'caixa'

interface BankAccount {
  id: string
  name: string
  bank: string
  type: AccountType
  balance: number
  updated_at: string
}

const BANK_ACCOUNTS_KEY = 'minha-otica:bank-accounts'

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  corrente:     'Conta Corrente',
  poupanca:     'Poupança',
  investimento: 'Investimento',
  caixa:        'Caixa Físico',
}

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  corrente:     'bg-blue-100 text-blue-700',
  poupanca:     'bg-emerald-100 text-emerald-700',
  investimento: 'bg-violet-100 text-violet-700',
  caixa:        'bg-amber-100 text-amber-700',
}

const BANKS = [
  'Bradesco', 'Itaú', 'Santander', 'Banco do Brasil',
  'Caixa Econômica', 'Nubank', 'Inter', 'Sicoob',
  'BTG Pactual', 'XP Investimentos', 'Outro',
]

function loadBankAccounts(): BankAccount[] {
  try { return JSON.parse(localStorage.getItem(BANK_ACCOUNTS_KEY) ?? '[]') } catch { return [] }
}
function saveBankAccounts(accs: BankAccount[]) {
  localStorage.setItem(BANK_ACCOUNTS_KEY, JSON.stringify(accs))
}

const PAYMENT_BADGE: Record<string, string> = {
  dinheiro:       'bg-emerald-100 text-emerald-700',
  pix:            'bg-blue-100 text-blue-700',
  cartao_credito: 'bg-violet-100 text-violet-700',
  cartao_debito:  'bg-cyan-100 text-cyan-700',
  boleto:         'bg-amber-100 text-amber-700',
  convenio:       'bg-indigo-100 text-indigo-700',
  outro:          'bg-slate-100 text-slate-600',
}

const CATEGORY_BADGE: Record<string, string> = {
  aluguel:    'bg-rose-100 text-rose-700',
  energia:    'bg-amber-100 text-amber-700',
  agua:       'bg-cyan-100 text-cyan-700',
  internet:   'bg-blue-100 text-blue-700',
  fornecedor: 'bg-violet-100 text-violet-700',
  salario:    'bg-indigo-100 text-indigo-700',
  marketing:  'bg-pink-100 text-pink-700',
  manutencao: 'bg-orange-100 text-orange-700',
  impostos:   'bg-slate-100 text-slate-700',
  outro:      'bg-slate-100 text-slate-500',
}

function currentMonthRange() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { start, end }
}

function weekStart() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function FinancialPage() {
  const company = useAuthStore(s => s.company)
  const [activeTab, setActiveTab] = useState<Tab>('caixa')
  const [ofxModal,  setOfxModal]  = useState(false)

  // Contas Bancárias
  const [bankAccounts,  setBankAccounts]  = useState<BankAccount[]>(loadBankAccounts)
  const [showAccForm,   setShowAccForm]   = useState(false)
  const [editingAcc,    setEditingAcc]    = useState<BankAccount | null>(null)
  const [accForm, setAccForm] = useState({ name: '', bank: BANKS[0], type: 'corrente' as AccountType, balance: '' })

  function openAddAcc() {
    setEditingAcc(null)
    setAccForm({ name: '', bank: BANKS[0], type: 'corrente', balance: '' })
    setShowAccForm(true)
  }

  function openEditAcc(acc: BankAccount) {
    setEditingAcc(acc)
    setAccForm({ name: acc.name, bank: acc.bank, type: acc.type, balance: String(acc.balance) })
    setShowAccForm(true)
  }

  function saveAcc() {
    const bal = parseFloat(accForm.balance.replace(',', '.')) || 0
    const now = new Date().toISOString()
    let updated: BankAccount[]
    if (editingAcc) {
      updated = bankAccounts.map(a =>
        a.id === editingAcc.id ? { ...a, name: accForm.name, bank: accForm.bank, type: accForm.type, balance: bal, updated_at: now } : a
      )
    } else {
      updated = [...bankAccounts, { id: Date.now().toString(), name: accForm.name, bank: accForm.bank, type: accForm.type, balance: bal, updated_at: now }]
    }
    saveBankAccounts(updated)
    setBankAccounts(updated)
    setShowAccForm(false)
  }

  function deleteAcc(id: string) {
    const updated = bankAccounts.filter(a => a.id !== id)
    saveBankAccounts(updated)
    setBankAccounts(updated)
  }

  // Caixa
  const [loadingCaixa, setLoadingCaixa] = useState(true)
  const [todayIn,    setTodayIn]    = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [, setWeekTotal]  = useState(0)
  const [monthTotal, setMonthTotal] = useState(0)
  const [entries,    setEntries]    = useState<{id:string;description:string;amount:number;method?:string;date:string}[]>([])
  const [weekChart,  setWeekChart]  = useState<{label:string;receita:number}[]>([])
  const [byMethod,   setByMethod]   = useState<{method:string;label:string;total:number}[]>([])
  const [pendingOS,  setPendingOS]  = useState(0)
  const [pendingAmt, setPendingAmt] = useState(0)

  // Despesas
  const [expenses,       setExpenses]       = useState<Expense[]>([])
  const [loadingExp,     setLoadingExp]     = useState(true)
  const [expenseModal,   setExpenseModal]   = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  // Importação CSV de Despesas
  interface CsvExpenseRow { description: string; amount: string; due_date: string; category: string }
  const [csvModal,    setCsvModal]    = useState(false)
  const [csvRows,     setCsvRows]     = useState<CsvExpenseRow[]>([])
  const [csvLoading,  setCsvLoading]  = useState(false)
  const [csvDone,     setCsvDone]     = useState(false)

  function parseCsvExpenses(text: string): CsvExpenseRow[] {
    const lines = text.trim().split('\n')
    const isHeader = lines[0].toLowerCase().includes('descri')
    const data = isHeader ? lines.slice(1) : lines
    return data
      .map(l => l.split(/[;,]/).map(c => c.trim().replace(/^"|"$/g, '')))
      .filter(cols => cols.length >= 3 && cols[0])
      .map(cols => ({
        description: cols[0],
        amount:      cols[1],
        due_date:    cols[2],
        category:    cols[3] ?? 'outro',
      }))
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setCsvRows(parseCsvExpenses(text))
      setCsvModal(true)
      setCsvDone(false)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  async function importCsvExpenses() {
    if (!company) return
    setCsvLoading(true)
    for (const row of csvRows) {
      const amount = parseFloat(row.amount.replace(',', '.'))
      if (isNaN(amount) || amount <= 0) continue
      await createExpense({
        description: row.description,
        amount,
        due_date:    row.due_date,
        category:    (row.category as ExpenseCategory) ?? 'outro',
        is_paid:     false,
      })
    }
    setCsvLoading(false)
    setCsvDone(true)
    await loadExpenses()
  }

  // Conciliação
  const [bankTxs,       setBankTxs]       = useState<BankTransaction[]>([])
  const [loadingConc,   setLoadingConc]   = useState(false)
  const [concFilter,    setConcFilter]    = useState<'todos' | 'pendente' | 'conciliado'>('pendente')

  useEffect(() => { if (company) loadCaixa() }, [company])
  useEffect(() => { if (company && activeTab === 'despesas') loadExpenses() }, [company, activeTab])
  useEffect(() => { if (company && activeTab === 'conciliacao') loadConciliacao() }, [company, activeTab])

  async function loadCaixa() {
    if (!company) return
    setLoadingCaixa(true)
    const today     = new Date().toISOString().slice(0, 10)
    const weekSince = weekStart()
    const { start: mStart } = currentMonthRange()

    const [salesRes, osRes, monthRes] = await Promise.all([
      supabase.from('sales').select('id,total_amount,paid_amount,payment_method,payments,customer_name,created_at')
        .eq('company_id', company.id).gte('created_at', weekSince).order('created_at', { ascending: false }),
      supabase.from('service_orders').select('id,total_amount,paid_amount,status')
        .eq('company_id', company.id).not('status', 'in', '("cancelado","entregue")'),
      supabase.from('sales').select('paid_amount').eq('company_id', company.id).gte('created_at', mStart),
    ])

    const sales = salesRes.data ?? []
    const todaySales = sales.filter(s => s.created_at.slice(0, 10) === today)
    setTodayIn(todaySales.reduce((s, v) => s + v.paid_amount, 0))
    setTodayCount(todaySales.length)
    setWeekTotal(sales.reduce((s, v) => s + v.paid_amount, 0))
    setMonthTotal((monthRes.data ?? []).reduce((s, v) => s + v.paid_amount, 0))

    // Gráfico
    const dayMap: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      dayMap[d.toISOString().slice(0, 10)] = 0
    }
    for (const s of sales) {
      const k = s.created_at.slice(0, 10)
      if (dayMap[k] !== undefined) dayMap[k] += s.paid_amount
    }
    setWeekChart(Object.entries(dayMap).map(([k, r]) => ({
      label:   new Date(k + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }),
      receita: r,
    })))

    setEntries(sales.slice(0, 20).map(s => ({
      id: s.id, description: s.customer_name ?? 'Venda',
      amount: s.paid_amount, method: s.payment_method, date: s.created_at,
    })))

    const methodMap: Record<string, number> = {}
    for (const s of sales) {
      if (s.payments && Array.isArray(s.payments)) {
        for (const p of s.payments as {method:string;amount:number}[]) methodMap[p.method] = (methodMap[p.method] ?? 0) + p.amount
      } else if (s.payment_method) {
        methodMap[s.payment_method] = (methodMap[s.payment_method] ?? 0) + s.paid_amount
      }
    }
    setByMethod(Object.entries(methodMap).sort((a,b)=>b[1]-a[1]).map(([method,total])=>({
      method, label: PAYMENT_LABELS[method as PaymentMethod] ?? method, total,
    })))

    const os = osRes.data ?? []
    setPendingOS(os.length)
    setPendingAmt(os.reduce((s, o) => s + (o.total_amount - (o.paid_amount ?? 0)), 0))

    setLoadingCaixa(false)
  }

  const loadExpenses = useCallback(async () => {
    if (!company) return
    setLoadingExp(true)
    const { start, end } = currentMonthRange()
    setExpenses(await getExpenses(start, end))
    setLoadingExp(false)
  }, [company])

  async function handlePaid(expense: Expense) {
    await markExpensePaid(expense.id)
    setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, is_paid: true, paid_at: new Date().toISOString() } : e))
  }

  async function handleDelete(id: string) {
    await deleteExpense(id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  async function loadConciliacao() {
    setLoadingConc(true)
    try { setBankTxs(await getBankTransactions()) } catch { setBankTxs([]) }
    finally { setLoadingConc(false) }
  }

  async function handleReconcile(tx: BankTransaction, expenseId: string) {
    await reconcileTransaction(tx.id, { matched_expense_id: expenseId })
    setBankTxs(prev => prev.map(t => t.id === tx.id ? { ...t, matched_expense_id: expenseId, is_reconciled: true } : t))
  }

  async function handleUnreconcile(id: string) {
    await unreconcileTransaction(id)
    setBankTxs(prev => prev.map(t => t.id === id ? { ...t, matched_expense_id: undefined, matched_sale_id: undefined, is_reconciled: false } : t))
  }

  const [autoReconciling, setAutoReconciling] = useState(false)
  const [autoMatched,     setAutoMatched]     = useState<number | null>(null)

  async function autoReconcile() {
    const unreconciled = bankTxs.filter(t => !t.is_reconciled && t.type === 'DEBIT')
    const unpaid       = expenses.filter(e => !e.is_paid)
    if (unreconciled.length === 0 || unpaid.length === 0) { setAutoMatched(0); return }

    setAutoReconciling(true)
    let count = 0
    for (const tx of unreconciled) {
      const match = unpaid.find(e => Math.abs(e.amount - tx.amount) / tx.amount <= 0.05)
      if (match) {
        await reconcileTransaction(tx.id, { matched_expense_id: match.id })
        setBankTxs(prev => prev.map(t => t.id === tx.id ? { ...t, matched_expense_id: match.id, is_reconciled: true } : t))
        count++
      }
    }
    setAutoReconciling(false)
    setAutoMatched(count)
    setTimeout(() => setAutoMatched(null), 4000)
  }

  // DRE
  const totalReceita = monthTotal
  const totalDespesas = expenses.reduce((s, e) => s + e.amount, 0)
  const lucroLiquido = totalReceita - totalDespesas

  const TABS: {id:Tab;label:string}[] = [
    { id: 'caixa',        label: 'Caixa / Receitas' },
    { id: 'despesas',     label: 'Contas a Pagar' },
    { id: 'dre',          label: 'DRE Simplificado' },
    { id: 'conciliacao',  label: 'Conciliação OFX' },
    { id: 'contas',       label: 'Contas Bancárias' },
  ]

  const filteredTxs = concFilter === 'todos'
    ? bankTxs
    : concFilter === 'conciliado'
    ? bankTxs.filter(t => t.is_reconciled)
    : bankTxs.filter(t => !t.is_reconciled)

  const pendingExpenses = expenses.filter(e => !e.is_paid)
  const overdueExpenses = pendingExpenses.filter(e => e.due_date < new Date().toISOString().slice(0, 10))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-sm text-slate-500">Caixa, despesas e resultado da ótica</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOfxModal(true)}>
          <FileInput size={14} className="mr-1.5" /> Importar OFX
        </Button>
      </div>

      {/* KPI Cards — sempre visíveis */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Caixa Hoje',   value: formatCurrency(todayIn),    sub: `${todayCount} venda${todayCount!==1?'s':''}`,  icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Receita/Mês', value: formatCurrency(monthTotal),  sub: 'Mês corrente',                                icon: Calendar,   color: 'text-blue-600',    bg: 'bg-blue-100' },
          { label: 'Despesas/Mês',value: formatCurrency(totalDespesas),sub: `${pendingExpenses.length} a pagar`,           icon: TrendingUp, color: 'text-rose-600',    bg: 'bg-rose-100' },
          { label: 'Resultado',   value: formatCurrency(lucroLiquido), sub: lucroLiquido >= 0 ? 'Superávit' : 'Déficit',  icon: AlertCircle,color: lucroLiquido>=0?'text-emerald-600':'text-red-600', bg: lucroLiquido>=0?'bg-emerald-100':'bg-red-100' },
        ].map(kpi => (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{kpi.label}</p>
              <div className={cn('p-2 rounded-lg', kpi.bg)}>
                <kpi.icon size={15} className={kpi.color} />
              </div>
            </div>
            <p className={cn('text-xl font-black', kpi.color === 'text-emerald-600' || kpi.color === 'text-blue-600' ? 'text-slate-900' : kpi.color)}>{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            )}>
            {t.label}
            {t.id === 'despesas' && overdueExpenses.length > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                {overdueExpenses.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── CAIXA ── */}
      {activeTab === 'caixa' && (
        loadingCaixa ? <PageLoader /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Receita — Últimos 7 dias</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekChart} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} width={48} />
                      <Tooltip formatter={(v:number)=>[formatCurrency(v),'Receita']} contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #e2e8f0' }} />
                      <Bar dataKey="receita" fill="#10b981" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <CreditCard size={15} className="text-blue-500" />
                  Por Pagamento (semana)
                </h3>
                {byMethod.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-8">Sem vendas</p>
                ) : (
                  <div className="space-y-2.5">
                    {byMethod.map(m => (
                      <div key={m.method} className="flex items-center justify-between">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', PAYMENT_BADGE[m.method] ?? 'bg-slate-100 text-slate-600')}>{m.label}</span>
                        <span className="text-sm font-bold text-slate-800">{formatCurrency(m.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {pendingOS > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                      <AlertCircle size={12} /> {pendingOS} OS em aberto — {formatCurrency(pendingAmt)}
                    </p>
                  </div>
                )}
              </Card>
            </div>

            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Lançamentos Recentes</h3>
              {entries.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">Nenhum lançamento na semana.</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {entries.map(e => (
                    <div key={e.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                        <ArrowUpRight size={13} className="text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{e.description}</p>
                        <p className="text-[10px] text-slate-400">{new Date(e.date).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</p>
                      </div>
                      {e.method && (
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:block', PAYMENT_BADGE[e.method] ?? 'bg-slate-100 text-slate-600')}>
                          {PAYMENT_LABELS[e.method as PaymentMethod] ?? e.method}
                        </span>
                      )}
                      <p className="text-sm font-bold text-emerald-600 flex-shrink-0">+{formatCurrency(e.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )
      )}

      {/* ── DESPESAS ── */}
      {activeTab === 'despesas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                {loadingExp ? '...' : `${pendingExpenses.length} a pagar · ${formatCurrency(pendingExpenses.reduce((s,e)=>s+e.amount,0))}`}
              </p>
              {overdueExpenses.length > 0 && (
                <p className="text-xs text-red-600 font-semibold mt-0.5">{overdueExpenses.length} vencida{overdueExpenses.length!==1?'s':''}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" icon={<Download size={14}/>} onClick={() => exportExpensesCsv(expenses)}>
                CSV
              </Button>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <FileInput size={14} /> Importar CSV
                <input type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvFile} />
              </label>
              <Button icon={<Plus size={15}/>} onClick={() => { setEditingExpense(null); setExpenseModal(true) }}>
                Nova Despesa
              </Button>
            </div>
          </div>

          {loadingExp ? <PageLoader /> : expenses.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <ArrowDownRight size={36} className="text-slate-300" />
              <p className="text-slate-500">Nenhuma despesa lançada este mês.</p>
              <Button size="sm" icon={<Plus size={14}/>} onClick={() => { setEditingExpense(null); setExpenseModal(true) }}>
                Lançar Primeira Despesa
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map(exp => {
                const overdue = !exp.is_paid && exp.due_date < new Date().toISOString().slice(0, 10)
                return (
                  <Card key={exp.id} className={cn('flex items-center gap-4 p-4', exp.is_paid && 'opacity-60')}>
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      exp.is_paid ? 'bg-emerald-100' : overdue ? 'bg-red-100' : 'bg-slate-100'
                    )}>
                      {exp.is_paid
                        ? <CheckCircle2 size={15} className="text-emerald-600" />
                        : <ArrowDownRight size={15} className={overdue ? 'text-red-500' : 'text-slate-500'} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold truncate', exp.is_paid ? 'text-slate-500 line-through' : 'text-slate-800')}>{exp.description}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', CATEGORY_BADGE[exp.category] ?? 'bg-slate-100 text-slate-500')}>
                          {EXPENSE_CATEGORY_LABELS[exp.category]}
                        </span>
                        <span className={cn('text-[10px] font-medium', overdue ? 'text-red-600' : 'text-slate-400')}>
                          {exp.is_paid ? `Pago em ${new Date(exp.paid_at!).toLocaleDateString('pt-BR')}` : `Vence ${new Date(exp.due_date+'T12:00:00').toLocaleDateString('pt-BR')}${overdue?' (VENCIDA)':''}`}
                        </span>
                      </div>
                    </div>
                    <p className={cn('text-sm font-black flex-shrink-0', exp.is_paid ? 'text-slate-400' : overdue ? 'text-red-600' : 'text-slate-800')}>
                      {formatCurrency(exp.amount)}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!exp.is_paid && (
                        <button onClick={() => handlePaid(exp)}
                          className="rounded-lg border border-emerald-200 px-2 py-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 transition-colors">
                          Pagar
                        </button>
                      )}
                      <button onClick={() => { setEditingExpense(exp); setExpenseModal(true) }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(exp.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DRE ── */}
      {activeTab === 'dre' && (
        <Card className="p-6 max-w-lg">
          <h3 className="text-base font-bold text-slate-800 mb-6">
            DRE Simplificado — {new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Receita Bruta (Vendas)</span>
              <span className="text-sm font-bold text-emerald-700">+{formatCurrency(totalReceita)}</span>
            </div>
            {Object.keys(EXPENSE_CATEGORY_LABELS).map(cat => {
              const total = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
              if (total === 0) return null
              return (
                <div key={cat} className="flex justify-between py-1.5">
                  <span className="text-sm text-slate-500 pl-2">{EXPENSE_CATEGORY_LABELS[cat as keyof typeof EXPENSE_CATEGORY_LABELS]}</span>
                  <span className="text-sm font-medium text-red-600">−{formatCurrency(total)}</span>
                </div>
              )
            })}
            <div className="flex justify-between py-2 border-t border-slate-200">
              <span className="text-sm font-semibold text-slate-700">Total Despesas</span>
              <span className="text-sm font-bold text-red-600">−{formatCurrency(totalDespesas)}</span>
            </div>
            <div className={cn(
              'flex justify-between py-3 px-4 rounded-xl border-2',
              lucroLiquido >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
            )}>
              <span className="text-sm font-black text-slate-800">{lucroLiquido >= 0 ? 'Lucro Líquido' : 'Prejuízo'}</span>
              <span className={cn('text-lg font-black', lucroLiquido >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                {lucroLiquido >= 0 ? '+' : ''}{formatCurrency(lucroLiquido)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 text-center pt-1">
              Baseado em vendas e despesas lançadas no mês corrente.
            </p>
          </div>
        </Card>
      )}

      {/* ── ABA CONCILIAÇÃO OFX ──────────────────────────────── */}
      {activeTab === 'conciliacao' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {(['todos', 'pendente', 'conciliado'] as const).map(f => (
                <button key={f} onClick={() => setConcFilter(f)}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-bold transition-all capitalize',
                    concFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                  {f === 'todos' ? 'Todas' : f === 'pendente' ? 'Pendentes' : 'Conciliadas'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {autoMatched !== null && (
                <span className={cn(
                  'text-xs font-semibold px-2 py-1 rounded-full',
                  autoMatched > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                )}>
                  {autoMatched > 0 ? `✓ ${autoMatched} vinculada${autoMatched !== 1 ? 's' : ''} automaticamente` : 'Nenhuma correspondência encontrada'}
                </span>
              )}
              <button
                onClick={autoReconcile}
                disabled={autoReconciling || bankTxs.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {autoReconciling
                  ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analisando…</>
                  : <><Zap size={12} /> Auto-conciliar</>
                }
              </button>
              <p className="text-xs text-slate-400">{filteredTxs.length} transações</p>
            </div>
          </div>

          {loadingConc ? (
            <p className="text-center text-slate-400 py-10">Carregando...</p>
          ) : bankTxs.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-slate-500 text-sm">Nenhuma transação importada ainda.</p>
              <p className="text-slate-400 text-xs mt-1">Use "Importar OFX" e salve as transações para conciliar aqui.</p>
            </Card>
          ) : filteredTxs.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-slate-500 text-sm">Nenhuma transação {concFilter === 'pendente' ? 'pendente' : 'conciliada'}.</p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {['Data', 'Descrição', 'Tipo', 'Valor', 'Status', 'Ação'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTxs.map(tx => (
                      <tr key={tx.id} className={cn('hover:bg-slate-50/60 transition-colors', tx.is_reconciled && 'bg-emerald-50/30')}>
                        <td className="px-4 py-3 text-xs text-slate-500">{formatDate(tx.date)}</td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <p className="text-slate-800 text-xs font-medium truncate">{tx.memo}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold',
                            tx.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600',
                          )}>
                            {tx.type === 'CREDIT' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className={cn('px-4 py-3 font-bold text-sm', tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-500')}>
                          {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                        <td className="px-4 py-3">
                          {tx.is_reconciled ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 size={9} /> Conciliada
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {tx.is_reconciled ? (
                            <button
                              onClick={() => handleUnreconcile(tx.id)}
                              className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
                            >
                              Desfazer
                            </button>
                          ) : tx.type === 'DEBIT' && expenses.length > 0 ? (
                            <select
                              defaultValue=""
                              onChange={e => e.target.value && handleReconcile(tx, e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Vincular despesa...</option>
                              {expenses.filter(e => !e.is_paid).map(e => (
                                <option key={e.id} value={e.id}>{e.description} — {formatCurrency(e.amount)}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── ABA CONTAS BANCÁRIAS ──────────────────────────────── */}
      {activeTab === 'contas' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Contas Bancárias</h3>
              <p className="text-xs text-slate-500 mt-0.5">Gerencie seus saldos por conta para controle financeiro completo</p>
            </div>
            <Button size="sm" onClick={openAddAcc}>
              <Plus size={14} className="mr-1.5" /> Nova Conta
            </Button>
          </div>

          {/* Card total */}
          {bankAccounts.length > 0 && (
            <Card className="p-5 flex items-center gap-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <CreditCard size={22} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Patrimônio Total</p>
                <p className="text-2xl font-black text-slate-900">
                  {formatCurrency(bankAccounts.reduce((s, a) => s + a.balance, 0))}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{bankAccounts.length} conta{bankAccounts.length !== 1 ? 's' : ''} cadastrada{bankAccounts.length !== 1 ? 's' : ''}</p>
              </div>
            </Card>
          )}

          {/* Formulário inline */}
          {showAccForm && (
            <Card className="p-5 border-blue-200 bg-blue-50/40 space-y-4">
              <p className="text-sm font-bold text-slate-800">{editingAcc ? 'Editar Conta' : 'Nova Conta Bancária'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Nome da Conta</label>
                  <input
                    type="text"
                    placeholder="Ex: Conta Corrente Principal"
                    value={accForm.name}
                    onChange={e => setAccForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Banco</label>
                  <select
                    value={accForm.bank}
                    onChange={e => setAccForm(f => ({ ...f, bank: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 outline-none"
                  >
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Tipo</label>
                  <select
                    value={accForm.type}
                    onChange={e => setAccForm(f => ({ ...f, type: e.target.value as AccountType }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 outline-none"
                  >
                    {(Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Saldo Atual (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={accForm.balance}
                    onChange={e => setAccForm(f => ({ ...f, balance: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowAccForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={saveAcc} disabled={!accForm.name.trim()}>
                  {editingAcc ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </Card>
          )}

          {/* Lista de contas */}
          {bankAccounts.length === 0 && !showAccForm ? (
            <div className="text-center py-16 text-slate-400">
              <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma conta cadastrada</p>
              <p className="text-xs mt-1">Adicione suas contas para acompanhar o patrimônio financeiro</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankAccounts.map(acc => (
                <Card key={acc.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{acc.name}</p>
                      <p className="text-xs text-slate-500">{acc.bank}</p>
                    </div>
                    <span className={cn('shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full', ACCOUNT_TYPE_COLORS[acc.type])}>
                      {ACCOUNT_TYPE_LABELS[acc.type]}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Saldo Atual</p>
                    <p className={cn('text-xl font-black mt-0.5', acc.balance >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {formatCurrency(acc.balance)}
                    </p>
                  </div>
                  <div className="flex gap-1 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => openEditAcc(acc)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                    <button
                      onClick={() => deleteAcc(acc.id)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors ml-auto"
                    >
                      <Trash2 size={12} /> Excluir
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-400 text-center">
            Os saldos são atualizados manualmente. Importe extratos OFX na aba "Conciliação OFX" para conciliar transações.
          </p>
        </div>
      )}

      {/* Modal importar CSV de despesas */}
      {csvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">Importar Despesas via CSV</p>
                <p className="text-xs text-slate-500 mt-0.5">{csvRows.length} registro{csvRows.length !== 1 ? 's' : ''} encontrado{csvRows.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => { setCsvModal(false); setCsvRows([]); setCsvDone(false) }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {csvDone ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-500" />
                </div>
                <p className="font-bold text-slate-800">Importação concluída!</p>
                <p className="text-sm text-slate-500">{csvRows.length} despesa{csvRows.length !== 1 ? 's' : ''} importada{csvRows.length !== 1 ? 's' : ''} com sucesso.</p>
                <button
                  onClick={() => { setCsvModal(false); setCsvRows([]); setCsvDone(false) }}
                  className="mt-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
                  <strong>Formato esperado:</strong> descrição; valor; data_vencimento (AAAA-MM-DD); categoria
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Descrição', 'Valor', 'Vencimento', 'Categoria'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-slate-500 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {csvRows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-800 font-medium truncate max-w-[140px]">{r.description}</td>
                          <td className="px-3 py-2 text-slate-700">{r.amount}</td>
                          <td className="px-3 py-2 text-slate-600">{r.due_date}</td>
                          <td className="px-3 py-2 text-slate-500">{r.category || 'outro'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 p-4 border-t border-slate-100">
                  <button
                    onClick={importCsvExpenses}
                    disabled={csvLoading || csvRows.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {csvLoading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importando…</>
                      : <><FileInput size={14} /> Importar {csvRows.length} despesa{csvRows.length !== 1 ? 's' : ''}</>
                    }
                  </button>
                  <button
                    onClick={() => { setCsvModal(false); setCsvRows([]); setCsvDone(false) }}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ExpenseModal
        open={expenseModal}
        onClose={() => { setExpenseModal(false); setEditingExpense(null) }}
        onSuccess={() => { loadExpenses() }}
        expense={editingExpense}
      />
      <ImportOfxModal
        open={ofxModal}
        onClose={() => setOfxModal(false)}
        onSaved={() => { setOfxModal(false); setActiveTab('conciliacao') }}
      />
    </div>
  )
}
