import { useState, useEffect, useCallback } from 'react'
import { Plus, Tag, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { BrandModal } from '@/components/inventory/BrandModal'
import { getBrands, deleteBrand } from '@/services/brands.service'
import type { Brand } from '@/types'

const COLORS = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-cyan-500']
const colorOf = (name: string) =>
  COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]

export default function BrandsTab() {
  const [brands,  setBrands]  = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [selected,setSelected]= useState<Brand | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setBrands(await getBrands())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openEdit(b: Brand) { setSelected(b); setModal(true) }
  function openNew()          { setSelected(null); setModal(true) }

  async function handleDelete(b: Brand) {
    if (!confirm(`Excluir marca "${b.name}"? Os produtos vinculados não serão excluídos.`)) return
    await deleteBrand(b.id)
    load()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{brands.length} marca{brands.length !== 1 ? 's' : ''}</p>
        <Button size="sm" icon={<Plus size={14} />} onClick={openNew}>Nova Marca</Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Tag size={36} className="text-slate-300" />
          <p className="text-slate-500">Nenhuma marca cadastrada.</p>
          <Button size="sm" icon={<Plus size={14} />} onClick={openNew}>Criar marca</Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map(b => (
            <Card key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${colorOf(b.name)}`}>
                  {b.name.slice(0, 2).toUpperCase()}
                </div>
                <p className="font-semibold text-slate-800 truncate">{b.name}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button onClick={() => openEdit(b)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(b)}
                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BrandModal open={modal} onClose={() => setModal(false)} brand={selected} onSaved={load} />
    </>
  )
}
