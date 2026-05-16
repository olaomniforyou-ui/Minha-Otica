import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Patient, PatientFormData } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export interface PatientFilters {
  search?: string
  origin?: string
  is_recurring?: boolean
  is_active?: boolean
}

export async function getPatients(filters: PatientFilters = {}): Promise<Patient[]> {
  const company_id = getCompanyId()
  const { search, origin, is_recurring, is_active = true } = filters

  // Fallback: se Dexie estiver vazio, busca no Supabase
  const count = await db.patients.where('company_id').equals(company_id).count()
  if (count === 0 && navigator.onLine) {
    try {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('company_id', company_id)
        .order('full_name')
      if (data?.length) await db.patients.bulkPut(data.map((p: any) => ({ ...p, _pending_sync: false })))
    } catch {}
  }

  let collection = db.patients.filter(p => p.company_id === company_id)

  if (is_active !== undefined) {
    collection = collection.filter(p => p.is_active === is_active)
  }

  if (search) {
    const term = search.toLowerCase()
    collection = collection.filter(p => 
      p.full_name.toLowerCase().includes(term) ||
      (p.cpf ?? '').includes(term) ||
      (p.phone ?? '').includes(term)
    )
  }

  if (origin) {
    collection = collection.filter(p => p.origin === origin)
  }

  if (is_recurring !== undefined) {
    collection = collection.filter(p => p.is_recurring === is_recurring)
  }

  return collection.toArray()
}

export async function getPatientById(id: string): Promise<Patient | undefined> {
  return db.patients.get(id)
}

export async function createPatient(data: PatientFormData): Promise<Patient> {
  const company_id = getCompanyId()
  const now = new Date().toISOString()

  const patient: Patient = {
    ...data,
    id: generateId(),
    company_id,
    is_active: true,
    created_at: now,
    updated_at: now,
  }

  await db.patients.add({ ...patient, _pending_sync: true })
  await enqueue('patients', 'insert', patient.id, patient as unknown as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('patients').insert(patient)
      if (!error) {
        await db.patients.update(patient.id, { _pending_sync: false })
        await db.sync_queue.where('record_id').equals(patient.id).delete()
      }
    } catch {}
  }

  return patient
}

export async function updatePatient(id: string, data: Partial<PatientFormData>): Promise<Patient> {
  const now = new Date().toISOString()
  const updates = { ...data, updated_at: now }

  await db.patients.update(id, { ...updates, _pending_sync: true })
  await enqueue('patients', 'update', id, updates as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('patients').update(updates).eq('id', id)
      if (!error) {
        await db.patients.update(id, { _pending_sync: false })
        await db.sync_queue.where('record_id').equals(id).delete()
      }
    } catch {}
  }

  const updated = await db.patients.get(id)
  return updated as Patient
}

export async function deletePatient(id: string): Promise<void> {
  await updatePatient(id, { is_active: false } as Partial<PatientFormData>)
}

export async function getLowStockAlert(): Promise<Patient[]> {
  return []
}
