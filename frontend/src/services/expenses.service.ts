import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Expense, ExpenseFormData } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export async function getExpenses(monthStart?: string, monthEnd?: string): Promise<Expense[]> {
  const company_id = getCompanyId()

  if (navigator.onLine) {
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('company_id', company_id)
        .order('due_date', { ascending: true })

      if (monthStart) query = query.gte('due_date', monthStart)
      if (monthEnd)   query = query.lte('due_date', monthEnd)

      const { data } = await query
      if (data) {
        await db.expenses.bulkPut(data as Expense[])
        return data as Expense[]
      }
    } catch {}
  }

  let local = db.expenses.where('company_id').equals(company_id)
  if (monthStart) local = local.and(e => e.due_date >= monthStart!)
  if (monthEnd)   local = local.and(e => e.due_date <= monthEnd!)
  return (await local.toArray()).sort((a, b) => a.due_date.localeCompare(b.due_date)) as Expense[]
}

export async function createExpense(formData: ExpenseFormData): Promise<Expense> {
  const company_id = getCompanyId()
  const profile    = useAuthStore.getState().profile
  const now        = new Date().toISOString()

  const expense: Expense = {
    ...formData,
    id:         generateId(),
    company_id,
    created_by: profile?.id,
    created_at: now,
    updated_at: now,
  }

  await db.expenses.put(expense)
  await enqueue('expenses', 'insert', expense.id, expense as unknown as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      await supabase.from('expenses').insert(expense)
    } catch {}
  }

  return expense
}

export async function updateExpense(id: string, patch: Partial<Expense>): Promise<void> {
  const now = new Date().toISOString()
  const full = { ...patch, updated_at: now }

  await db.expenses.update(id, full)
  await enqueue('expenses', 'update', id, full as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      await supabase.from('expenses').update(full).eq('id', id)
    } catch {}
  }
}

export async function markExpensePaid(id: string): Promise<void> {
  await updateExpense(id, { is_paid: true, paid_at: new Date().toISOString() })
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id)
  await enqueue('expenses', 'delete', id, {})

  if (navigator.onLine) {
    try {
      await supabase.from('expenses').delete().eq('id', id)
    } catch {}
  }
}
