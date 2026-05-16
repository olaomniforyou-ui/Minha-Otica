import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { generateId } from '@/lib/utils'

export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')

  const fileName = `${generateId()}-${file.name}`
  const fullPath = `${company.id}/${path}/${fileName}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fullPath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fullPath)

  return publicUrl
}

export async function deleteFile(bucket: string, url: string): Promise<void> {
  // Extrai o path da URL pública
  // Ex: https://.../storage/v1/object/public/prescriptions/COMPANY_ID/prescriptions/FILE.jpg
  const parts = url.split(`/public/${bucket}/`)
  if (parts.length < 2) return

  const path = parts[1]
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}
