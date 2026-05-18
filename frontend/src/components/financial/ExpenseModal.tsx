import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createExpense, updateExpense } from '@/services/expenses.service'
import type { Expense, ExpenseCategory } from '@/types'
import { EXPENSE_CATEGORY_LABELS } from '@/types'

interface Props {
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
  expense?:  Expense | null
}

const empty = {
  description: '',
  amount:      '' as unknown as number,
  category:    'outro' as ExpenseCategory,
  due_date:    new Date().toISOString().slice(0, 10),
  is_paid:     false,
  notes:       '',
}

export function ExpenseModal({ open, onClose, onSuccess, expense }: Props) {
  const [form,   setForm]   = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (expense) {
      setForm({
        description: expense.description,
        amount:      expense.amount,
        category:    expense.category,
        due_date:    expense.due_date,
        is_paid:     expense.is_paid,
        notes:       expense.notes ?? '',
      })
    } else {
      setForm(empty)
    }
    setError(null)
  }, [open, expense])

  function set(field: keyof typeof empty, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.description.trim()) { setError('Informe a descrição.'); return }
    if (!form.amount || Number(form.amount) <= 0) { setError('Informe o valor.'); return }
    if (!form.due_date) { setError('Informe a data de vencimento.'); return }

    setSaving(true); setError(null)
    try {
      const payload = {
        description: form.description.trim(),
        amount:      Number(form.amount),
        category:    form.category,
        due_date:    form.due_date,
        is_paid:     form.is_paid,
        paid_at:     form.is_paid ? new Date().toISOString() : undefined,
        notes:       form.notes || undefined,
      }

      if (expense) {
        await updateExpense(expense.id, payload)
      } else {
        await createExpense(payload)
      }
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={expense ? 'Editar Despesa' : 'Nova Despesa'}
      size="md"
    >
      <div className="space-y-4 py-2">

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Descrição *</label>
          <Input
            placeholder="Ex: Aluguel de maio, Conta de energia..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Valor (R$) *</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="0,00"
              value={form.amount === ('' as unknown as number) ? '' : form.amount}
              onChange={e => set('amount', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Vencimento *</label>
            <Input
              type="date"
              value={form.due_date}
              onChange={e => set('due_date', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Categoria</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value as ExpenseCategory)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none bg-white"
          >
            {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map(c => (
              <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Observações</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            placeholder="Nota opcional..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none resize-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_paid}
            onChange={e => set('is_paid', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
          />
          <span className="text-sm font-medium text-slate-700">Já foi paga</span>
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>
            {expense ? 'Salvar Alterações' : 'Lançar Despesa'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
