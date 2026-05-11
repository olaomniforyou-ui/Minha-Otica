import { useState, useEffect, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { createModel, updateModel } from '@/services/models.service'
import { getBrands } from '@/services/brands.service'
import type { Model, Brand } from '@/types'

interface ModelModalProps {
  open:       boolean
  onClose:    () => void
  model?:     Model | null
  defaultBrandId?: string
  onSaved:    () => void
}

export function ModelModal({ open, onClose, model, defaultBrandId, onSaved }: ModelModalProps) {
  const [name,        setName]        = useState('')
  const [brandId,     setBrandId]     = useState('')
  const [description, setDescription] = useState('')
  const [brands,      setBrands]      = useState<Brand[]>([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    getBrands().then(setBrands)
    setName(model?.name ?? '')
    setBrandId(model?.brand_id ?? defaultBrandId ?? '')
    setDescription(model?.description ?? '')
    setError(null)
  }, [open, model, defaultBrandId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = {
        name: name.trim(),
        brand_id: brandId || undefined,
        description: description.trim() || undefined,
      }
      if (model) {
        await updateModel(model.id, data)
      } else {
        await createModel(data)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar modelo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={model ? 'Editar Modelo' : 'Novo Modelo'}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button form="model-form" type="submit" loading={loading}>
            {model ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      }
    >
      <form id="model-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <Select
          label="Marca"
          value={brandId}
          onChange={e => setBrandId(e.target.value)}
          placeholder="Selecione a marca..."
          options={brands.map(b => ({ value: b.id, label: b.name }))}
        />
        <Input
          label="Nome do Modelo" required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Aviator, Clubmaster, RB3025..."
        />
        <Textarea
          label="Descrição"
          rows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Informações adicionais do modelo..."
        />
      </form>
    </Modal>
  )
}
