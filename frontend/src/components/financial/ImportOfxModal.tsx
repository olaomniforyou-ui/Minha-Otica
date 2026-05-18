import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Upload, TrendingUp, TrendingDown, Info, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveBankTransactions } from '@/services/bank-transactions.service'

interface OfxTransaction {
  id: string
  type: 'CREDIT' | 'DEBIT' | 'OTHER'
  date: string
  amount: number
  memo: string
}

function parseOfx(text: string): OfxTransaction[] {
  const transactions: OfxTransaction[] = []

  // Remove SGML header and grab OFX body
  const body = text.replace(/[\r\n]+/g, '\n')

  const stmtBlocks = body.split(/<STMTTRN>/i).slice(1)

  for (const block of stmtBlocks) {
    const end = block.indexOf('</STMTTRN>')
    const raw = end >= 0 ? block.slice(0, end) : block

    const get = (tag: string) => {
      const m = raw.match(new RegExp(`<${tag}>([^<\n]+)`, 'i'))
      return m ? m[1].trim() : ''
    }

    const trntype = get('TRNTYPE').toUpperCase()
    const dtposted = get('DTPOSTED')
    const trnamt   = get('TRNAMT')
    const fitid    = get('FITID')
    const memo     = get('MEMO') || get('NAME') || 'Sem descrição'

    if (!dtposted || !trnamt) continue

    // Parse date: YYYYMMDD or YYYYMMDDHHmmss
    const ds = dtposted.slice(0, 8)
    const date = `${ds.slice(0, 4)}-${ds.slice(4, 6)}-${ds.slice(6, 8)}`

    const amount = parseFloat(trnamt.replace(',', '.'))
    if (isNaN(amount)) continue

    const type: OfxTransaction['type'] =
      trntype === 'CREDIT' || amount > 0 ? 'CREDIT' :
      trntype === 'DEBIT'  || amount < 0 ? 'DEBIT'  : 'OTHER'

    transactions.push({
      id:     fitid || `${date}-${Math.random().toString(36).slice(2)}`,
      type,
      date,
      amount: Math.abs(amount),
      memo,
    })
  }

  return transactions.sort((a, b) => b.date.localeCompare(a.date))
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  try { return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return iso }
}

interface Props {
  open:    boolean
  onClose: () => void
  onSaved?: () => void
}

export function ImportOfxModal({ open, onClose, onSaved }: Props) {
  const [transactions, setTransactions] = useState<OfxTransaction[]>([])
  const [fileName,     setFileName]     = useState('')
  const [error,        setError]        = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setTransactions([])
    setFileName('')
    setError('')
    setSaved(false)
  }

  async function handleSave() {
    if (transactions.length === 0) return
    setSaving(true)
    setError('')
    const batch = `${Date.now()}`
    try {
      await saveBankTransactions(transactions.map(t => ({
        import_batch: batch,
        external_id:  t.id,
        type:         t.type,
        date:         t.date,
        amount:       t.amount,
        memo:         t.memo,
      })))
      setSaved(true)
      onSaved?.()
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar transações.')
    } finally {
      setSaving(false)
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError('')
    try {
      const text = await file.text()
      const parsed = parseOfx(text)
      if (parsed.length === 0) {
        setError('Nenhuma transação encontrada. Verifique se o arquivo é um OFX válido.')
        setTransactions([])
      } else {
        setTransactions(parsed)
        setFileName(file.name)
      }
    } catch {
      setError('Erro ao ler o arquivo. Certifique-se que é um OFX válido.')
    }
  }

  const credits = transactions.filter(t => t.type === 'CREDIT')
  const debits  = transactions.filter(t => t.type === 'DEBIT')
  const totalIn  = credits.reduce((s, t) => s + t.amount, 0)
  const totalOut = debits.reduce((s, t) => s + t.amount, 0)

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Importar Extrato OFX" size="lg">
      <div className="space-y-4 py-2">

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 flex gap-2">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            Importe extratos bancários no formato <strong>OFX</strong> (Open Financial Exchange).
            Disponível em praticamente todos os bancos em Internet Banking → Extrato.
          </span>
        </div>

        {transactions.length === 0 && (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
          >
            <Upload size={28} className="text-slate-400" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">Clique para selecionar o arquivo OFX</p>
              <p className="text-xs text-slate-400 mt-0.5">Arquivos .ofx ou .OFX</p>
            </div>
          </div>
        )}

        <input ref={fileRef} type="file" accept=".ofx,.OFX" onChange={handleFile} className="hidden" />

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {transactions.length > 0 && (
          <>
            {/* Sumário */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">{fileName}</p>
                <p className="text-xs text-slate-400">{transactions.length} transações encontradas</p>
              </div>
              <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">
                Trocar arquivo
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-3">
                <TrendingUp size={18} className="text-emerald-600" />
                <div>
                  <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">Entradas</p>
                  <p className="font-bold text-emerald-700">{fmt(totalIn)}</p>
                  <p className="text-[10px] text-emerald-500">{credits.length} lançamentos</p>
                </div>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-center gap-3">
                <TrendingDown size={18} className="text-red-500" />
                <div>
                  <p className="text-[10px] text-red-500 font-semibold uppercase tracking-wide">Saídas</p>
                  <p className="font-bold text-red-600">{fmt(totalOut)}</p>
                  <p className="text-[10px] text-red-400">{debits.length} lançamentos</p>
                </div>
              </div>
            </div>

            {/* Lista de transações */}
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className={cn(
                    'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
                    t.type === 'CREDIT' ? 'bg-emerald-100' : 'bg-red-100'
                  )}>
                    {t.type === 'CREDIT'
                      ? <TrendingUp size={13} className="text-emerald-600" />
                      : <TrendingDown size={13} className="text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{t.memo}</p>
                    <p className="text-[10px] text-slate-400">{fmtDate(t.date)}</p>
                  </div>
                  <span className={cn(
                    'text-sm font-bold flex-shrink-0',
                    t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-500'
                  )}>
                    {t.type === 'CREDIT' ? '+' : '-'}{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>

            {saved ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 flex items-center gap-2 text-sm text-emerald-700 font-medium">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                {transactions.length} transações salvas com sucesso! Acesse a aba Conciliação para vincular.
              </div>
            ) : (
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700 flex gap-2">
                <Info size={13} className="flex-shrink-0 mt-0.5" />
                <span>Salve as transações para conciliar manualmente com despesas e vendas na aba <strong>Conciliação</strong>.</span>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={() => { reset(); onClose() }}>Fechar</Button>
          {transactions.length > 0 && !saved && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : `Salvar ${transactions.length} transações`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
