import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { ConvenioAutorizacao, ConvenioAutorizacaoFormData } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export async function getAutorizacoes(): Promise<ConvenioAutorizacao[]> {
  const company_id = getCompanyId()
  const { data } = await supabase
    .from('convenio_autorizacoes')
    .select('*, convenio:convenios!convenio_id(id, name), patient:patients!patient_id(id, full_name)')
    .eq('company_id', company_id)
    .order('created_at', { ascending: false })
  return (data ?? []) as ConvenioAutorizacao[]
}

export async function createAutorizacao(form: ConvenioAutorizacaoFormData): Promise<ConvenioAutorizacao> {
  const company_id = getCompanyId()
  const { data, error } = await supabase
    .from('convenio_autorizacoes')
    .insert({ ...form, company_id })
    .select('*, convenio:convenios!convenio_id(id, name), patient:patients!patient_id(id, full_name)')
    .single()
  if (error) throw error
  return data as ConvenioAutorizacao
}

export async function updateAutorizacao(id: string, patch: Partial<ConvenioAutorizacaoFormData>): Promise<void> {
  const { error } = await supabase
    .from('convenio_autorizacoes')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteAutorizacao(id: string): Promise<void> {
  const { error } = await supabase
    .from('convenio_autorizacoes')
    .delete()
    .eq('id', id)
  if (error) throw error
}
