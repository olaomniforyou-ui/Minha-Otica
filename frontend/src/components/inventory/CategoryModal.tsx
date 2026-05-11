import { useState, useEffect, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { createCategory, updateCategory, getCategories } from '@/services/categories.service'
import { slugify } from '@/lib/utils'
import type { ProductCategory } from '@/types'

interface CategoryModalProps {
  open:      boolean
  onClose:   () => void
  category?: ProductCategory | null
  onSaved:   () => void
}

export function CategoryModal({ open, onClose, category, onSaved }: CategoryModalProps) {
  const [name,      setName]      = useState('')
  const [parentId,  setParentId]  = useState('')
  const [allCats,   setAllCats]   = useState<ProductCategory[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    getCategories().then(cats => {
      // exclui a própria categoria do select de pai (evita ciclo)
      setAllCats(cats.filter(c => c.id !== category?.id))
    })
    setName(category?.name ?? '')
    setParentId(category?.parent_id ?? '')
    setError(null)
  }, [open, category])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = {
        name:      name.trim(),
        slug:      slugify(name.trim()),
        parent_id: parentId || undefined,
      }
      if (category) {
        await updateCategory(category.id, data)
      } else {
        await createCategory(data)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar categoria.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'Editar Categoria' : 'Nova Categoria'}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button form="category-form" type="submit" loading={loading}>
            {category ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <Input
          label="Nome da Categoria" required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Armações, Lentes de Grau..."
          hint={name ? `Slug: ${slugify(name)}` : undefined}
        />
        <Select
          label="Categoria Pai (opcional)"
          value={parentId}
          onChange={e => setParentId(e.target.value)}
          placeholder="Nenhuma (categoria raiz)"
          options={allCats.map(c => ({ value: c.id, label: c.name }))}
        />
      </form>
    </Modal>
  )
}
