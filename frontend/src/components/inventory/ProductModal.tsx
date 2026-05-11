import { useState, useEffect, type FormEvent } from 'react'
import { ImageIcon, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { createProduct, updateProduct } from '@/services/products.service'
import { getCategories } from '@/services/categories.service'
import { getSuppliers } from '@/services/suppliers.service'
import { getBrands } from '@/services/brands.service'
import { getModels } from '@/services/models.service'
import { supabase } from '@/lib/supabase'
import type { Product, ProductCategory, Supplier, Brand, Model } from '@/types'

interface ProductModalProps {
  open:      boolean
  onClose:   () => void
  product?:  Product | null
  onSaved:   () => void
}

const empty = {
  name: '', sku: '', barcode: '', description: '', color: '', size: '',
  sale_price: 0, cost_price: 0,
  stock_quantity: 0, min_stock_quantity: 2,
  category_id: '', supplier_id: '', brand_id: '', model_id: '',
  image_url: '',
  is_active: true,
}

export function ProductModal({ open, onClose, product, onSaved }: ProductModalProps) {
  const [form,       setForm]       = useState(empty)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [suppliers,  setSuppliers]  = useState<Supplier[]>([])
  const [brands,     setBrands]     = useState<Brand[]>([])
  const [models,     setModels]     = useState<Model[]>([])
  const [loading,    setLoading]    = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    Promise.all([getCategories(), getSuppliers(), getBrands()]).then(([cats, sups, brds]) => {
      setCategories(cats)
      setSuppliers(sups)
      setBrands(brds)
    })
    const f = product
      ? {
          name:               product.name,
          sku:                product.sku ?? '',
          barcode:            product.barcode ?? '',
          description:        product.description ?? '',
          color:              product.color ?? '',
          size:               product.size ?? '',
          sale_price:         product.sale_price,
          cost_price:         product.cost_price ?? 0,
          stock_quantity:     product.stock_quantity,
          min_stock_quantity: product.min_stock_quantity,
          category_id:        product.category_id ?? '',
          supplier_id:        product.supplier_id ?? '',
          brand_id:           product.brand_id ?? '',
          model_id:           product.model_id ?? '',
          image_url:          product.image_url ?? '',
          is_active:          product.is_active,
        }
      : empty
    setForm(f)
    if (f.brand_id) getModels(f.brand_id).then(setModels)
    else setModels([])
    setError(null)
  }, [open, product])

  async function handleBrandChange(brandId: string) {
    setForm(f => ({ ...f, brand_id: brandId, model_id: '' }))
    if (brandId) setModels(await getModels(brandId))
    else setModels([])
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
      setForm(f => ({ ...f, image_url: publicUrl }))
    } catch (err: any) {
      setError('Erro ao fazer upload: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = {
        ...form,
        sale_price:         Number(form.sale_price),
        cost_price:         Number(form.cost_price) || undefined,
        stock_quantity:     Number(form.stock_quantity),
        min_stock_quantity: Number(form.min_stock_quantity),
        category_id:        form.category_id || undefined,
        supplier_id:        form.supplier_id || undefined,
        brand_id:           form.brand_id    || undefined,
        model_id:           form.model_id    || undefined,
        image_url:          form.image_url   || undefined,
      }
      if (product) {
        await updateProduct(product.id, data)
      } else {
        await createProduct(data)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto.')
    } finally {
      setLoading(false)
    }
  }

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Editar Produto' : 'Novo Produto'}
      subtitle="Preencha os dados do produto"
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button form="product-form" type="submit" loading={loading}>
            {product ? 'Salvar alterações' : 'Criar produto'}
          </Button>
        </div>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Imagem do produto */}
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="h-24 w-24 rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center">
              {form.image_url ? (
                <img src={form.image_url} alt="Produto" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon size={28} className="text-slate-300" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs text-slate-500">
                  Enviando…
                </div>
              )}
            </div>
            <div className="mt-2 flex gap-1">
              <label className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition-colors">
                {form.image_url ? 'Alterar' : 'Adicionar'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
              {form.image_url && (
                <button type="button" onClick={() => set('image_url', '')}
                  className="rounded-lg px-2 py-1 text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {/* Nome */}
            <Input
              label="Nome do Produto" required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: Óculos Aviador Dourado" />
          </div>
        </div>

        {/* Marca e Modelo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Marca"
            value={form.brand_id}
            onChange={e => handleBrandChange(e.target.value)}
            placeholder="Selecione a marca..."
            options={brands.map(b => ({ value: b.id, label: b.name }))}
          />
          <Select
            label="Modelo"
            value={form.model_id}
            onChange={e => set('model_id', e.target.value)}
            placeholder={form.brand_id ? 'Selecione o modelo...' : 'Selecione uma marca primeiro'}
            options={models.map(m => ({ value: m.id, label: m.name }))}
            disabled={!form.brand_id}
          />
        </div>

        {/* Categoria e Fornecedor */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Categoria"
            value={form.category_id}
            onChange={e => set('category_id', e.target.value)}
            placeholder="Selecione..."
            options={categories.map(c => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="Fornecedor"
            value={form.supplier_id}
            onChange={e => set('supplier_id', e.target.value)}
            placeholder="Selecione..."
            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
          />
        </div>

        {/* SKU e Código de barras */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="SKU" value={form.sku}
            onChange={e => set('sku', e.target.value)} placeholder="Ex: RB-3025-001" />
          <Input label="Código de Barras" value={form.barcode}
            onChange={e => set('barcode', e.target.value)} placeholder="EAN / UPC" />
        </div>

        {/* Preços */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Preço de Venda (R$)" required type="number" min="0" step="0.01"
            value={String(form.sale_price)}
            onChange={e => set('sale_price', e.target.value)} placeholder="0,00" />
          <Input label="Preço de Custo (R$)" type="number" min="0" step="0.01"
            value={String(form.cost_price)}
            onChange={e => set('cost_price', e.target.value)} placeholder="0,00" />
        </div>

        {/* Estoque */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Estoque Atual" type="number" min="0"
            value={String(form.stock_quantity)}
            onChange={e => set('stock_quantity', e.target.value)} />
          <Input label="Estoque Mínimo" type="number" min="0"
            value={String(form.min_stock_quantity)}
            onChange={e => set('min_stock_quantity', e.target.value)}
            hint="Dispara alerta de baixo estoque" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cor" value={form.color}
              onChange={e => set('color', e.target.value)} placeholder="Ex: Preto" />
            <Input label="Tamanho" value={form.size}
              onChange={e => set('size', e.target.value)} placeholder="Ex: M" />
          </div>
        </div>

        {/* Descrição */}
        <Textarea label="Descrição" rows={3} value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Detalhes adicionais do produto..." />

        {/* Status */}
        <div className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={e => set('is_active', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
            Produto ativo
          </label>
        </div>
      </form>
    </Modal>
  )
}
