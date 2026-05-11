import { useState, useRef } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface AvatarUploadProps {
  currentUrl?: string
  onUpload: (url: string) => void
  onRemove: () => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
  bucket?: string
  pathPrefix?: string
  shape?: 'circle' | 'rect'
}

export function AvatarUpload({
  currentUrl, onUpload, onRemove,
  size = 'md', className,
  bucket = 'avatars', pathPrefix = 'avatars',
  shape = 'circle',
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sizes = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const filePath = `${pathPrefix}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      onUpload(publicUrl)
    } catch (error: any) {
      alert('Erro ao fazer upload da imagem: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl'

  return (
    <div className={cn('relative group', sizes[size], className)}>
      <div className={cn('h-full w-full overflow-hidden bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center transition-all group-hover:border-primary-500', roundedClass)}>
        {currentUrl ? (
          <img src={currentUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <Camera className="text-slate-300" size={size === 'sm' ? 20 : 32} />
        )}

        {uploading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="animate-spin text-primary-600" size={20} />
          </div>
        )}
      </div>

      <div className="absolute -bottom-2 -right-2 flex gap-1">
        {currentUrl && (
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors shadow-sm"
            title="Remover foto"
          >
            <X size={14} />
          </button>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="p-1.5 rounded-lg bg-white text-primary-600 border border-slate-200 hover:border-primary-200 hover:bg-primary-50 transition-colors shadow-sm"
          title="Alterar foto"
        >
          <Camera size={14} />
        </button>
      </div>

      <input
        type="file"
        ref={fileRef}
        onChange={handleUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  )
}
