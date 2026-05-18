import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export interface BankTransaction {
  id: string
  company_id: string
  import_batch: string
  external_id: string
  type: 'CREDIT' | 'DEBIT' | 'OTHER'
  date: string
  amount: number
  memo: string
  matched_expense_id?: string
  matched_sale_id?: string
  is_reconciled: boolean
  created_at: string
}

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export async function saveBankTransactions(
  transactions: Omit<BankTransaction, 'id' | 'company_id' | 'is_reconciled' | 'created_at'>[],
): Promise<void> {
  const company_id = getCompanyId()
  const rows = transactions.map(t => ({
    ...t,
    company_id,
    is_reconciled: false,
  }))
  const { error } = await supabase.from('bank_transactions').upsert(rows, { onConflict: 'company_id,external_id' })
  if (error) throw error
}

export async function getBankTransactions(): Promise<BankTransaction[]> {
  const company_id = getCompanyId()
  const { data } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('company_id', company_id)
    .order('date', { ascending: false })
  return (data ?? []) as BankTransaction[]
}

export async function reconcileTransaction(
  id: string,
  patch: { matched_expense_id?: string; matched_sale_id?: string },
): Promise<void> {
  const { error } = await supabase
    .from('bank_transactions')
    .update({ ...patch, is_reconciled: true })
    .eq('id', id)
  if (error) throw error
}

export async function unreconcileTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('bank_transactions')
    .update({ matched_expense_id: null, matched_sale_id: null, is_reconciled: false })
    .eq('id', id)
  if (error) throw error
}
