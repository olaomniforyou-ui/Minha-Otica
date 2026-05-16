import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Prescription, PrescriptionFormData } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

// ─── Criar ────────────────────────────────────────────────────────────────
export async function createPrescription(data: PrescriptionFormData): Promise<Prescription> {
  const company_id = getCompanyId()
  const profile    = useAuthStore.getState().profile
  const now        = new Date().toISOString()

  const prescription: Prescription = {
    ...data,
    id:         generateId(),
    company_id,
    created_by: profile?.id,
    created_at: now,
  }

  await db.prescriptions.add({ ...prescription, _pending_sync: true } as any)
  await enqueue('prescriptions', 'insert', prescription.id, prescription as unknown as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('prescriptions').insert(prescription)
      if (!error) {
        await db.prescriptions.update(prescription.id, { _pending_sync: false } as any)
        await db.sync_queue.where('record_id').equals(prescription.id).delete()
      }
    } catch {}
  }

  return prescription
}

// ─── Atualizar ────────────────────────────────────────────────────────────
export async function updatePrescription(
  id: string,
  data: Partial<Omit<PrescriptionFormData, 'patient_id'>>,
): Promise<Prescription> {
  await db.prescriptions.update(id, { ...data, _pending_sync: true } as any)
  await enqueue('prescriptions', 'update', id, data as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('prescriptions').update(data).eq('id', id)
      if (!error) {
        await db.prescriptions.update(id, { _pending_sync: false } as any)
        await db.sync_queue.where('record_id').equals(id).delete()
      }
    } catch {}
  }

  const updated = await db.prescriptions.get(id)
  if (!updated) throw new Error('Receita não encontrada localmente.')
  return updated as Prescription
}

// ─── Excluir ──────────────────────────────────────────────────────────────
export async function deletePrescription(id: string): Promise<void> {
  await db.prescriptions.delete(id)
  await enqueue('prescriptions', 'delete', id, {})

  if (navigator.onLine) {
    try {
      await supabase.from('prescriptions').delete().eq('id', id)
    } catch {}
  }
}

// ─── Buscar por ID ────────────────────────────────────────────────────────
export async function getPrescriptionById(id: string): Promise<Prescription | null> {
  const local = await db.prescriptions.get(id)
  if (local) return local as Prescription

  if (navigator.onLine) {
    try {
      const { data } = await supabase.from('prescriptions').select('*').eq('id', id).single()
      if (data) {
        await db.prescriptions.put({ ...data, _pending_sync: false })
        return data as Prescription
      }
    } catch {}
  }

  return null
}

// ─── Receitas de um paciente ──────────────────────────────────────────────
export async function getPatientPrescriptions(patientId: string): Promise<Prescription[]> {
  const local = await db.prescriptions
    .where('patient_id').equals(patientId)
    .toArray()

  if (local.length === 0 && navigator.onLine) {
    try {
      const { data } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
      if (data?.length) {
        await db.prescriptions.bulkPut(data.map((p: any) => ({ ...p, _pending_sync: false })))
        return data as Prescription[]
      }
    } catch {}
  }

  return local.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  ) as Prescription[]
}
