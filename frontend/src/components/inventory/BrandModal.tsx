import { useState, useEffect, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createBrand, updateBrand } from '@/services/brands.service'
import type { Brand } from '@/types'

interface BrandModalProps {
  open:    boolean
  onClose: () => void
  brand?:  Brand | null
  onSaved: () => void
}

export function BrandModal({ open, onClose, brand, onSaved }: BrandModalProps) {
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(brand?.name ?? '')
    setError(null)
  }, [open, brand])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      if (brand) {
        await updateBrand(brand.id, { name: name.trim() })
      } else {
        await createBrand({ name: name.trim() })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar marca.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={brand ? 'Editar Marca' : 'Nova Marca'}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button form="brand-form" type="submit" loading={loading}>
            {brand ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      }
    >
      <form id="brand-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <Input
          label="Nome da Marca" required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Ray-Ban, Oakley, Transitions..."
        />
      </form>
    </Modal>
  )
}
