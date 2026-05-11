import { useState, useEffect, useCallback } from 'react'
import { Plus, Layers, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { ModelModal } from '@/components/inventory/ModelModal'
import { getModels, deleteModel } from '@/services/models.service'
import { getBrands } from '@/services/brands.service'
import type { Model, Brand } from '@/types'

export default function ModelsTab() {
  const [models,      setModels]      = useState<Model[]>([])
  const [brands,      setBrands]      = useState<Brand[]>([])
  const [filterBrand, setFilterBrand] = useState('')
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [selected,    setSelected]    = useState<Model | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [m, b] = await Promise.all([getModels(), getBrands()])
    setModels(m)
    setBrands(b)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openEdit(m: Model) { setSelected(m); setModal(true) }
  function openNew()          { setSelected(null); setModal(true) }

  async function handleDelete(m: Model) {
    if (!confirm(`Excluir modelo "${m.name}"?`)) return
    await deleteModel(m.id)
    load()
  }

  const brandName = (id?: string) =>
    brands.find(b => b.id === id)?.name ?? '—'

  const visible = filterBrand
    ? models.filter(m => m.brand_id === filterBrand)
    : models

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">{visible.length} modelo{visible.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          {brands.length > 0 && (
            <select
              value={filterBrand}
              onChange={e => setFilterBrand(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas as marcas</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <Button size="sm" icon={<Plus size={14} />} onClick={openNew}>Novo Modelo</Button>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Layers size={36} className="text-slate-300" />
          <p className="text-slate-500">
            {filterBrand ? 'Nenhum modelo para essa marca.' : 'Nenhum modelo cadastrado.'}
          </p>
          <Button size="sm" icon={<Plus size={14} />} onClick={openNew}>Criar modelo</Button>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="mt-4 hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {['Modelo', 'Marca', 'Descrição', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visible.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                        <td className="px-4 py-3 text-slate-500">{brandName(m.brand_id)}</td>
                        <td className="px-4 py-3 text-slate-400 max-w-[240px] truncate">{m.description ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(m)}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(m)}
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile: cards */}
          <div className="mt-3 space-y-3 md:hidden">
            {visible.map(m => (
              <Card key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{m.name}</p>
                  <p className="text-xs text-slate-500">{brandName(m.brand_id)}</p>
                  {m.description && <p className="text-xs text-slate-400 truncate">{m.description}</p>}
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <button onClick={() => openEdit(m)}
                    className="rounded p-1.5 text-slate-400 hover:text-slate-700">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(m)}
                    className="rounded p-1.5 text-slate-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ModelModal
        open={modal}
        onClose={() => setModal(false)}
        model={selected}
        defaultBrandId={filterBrand || undefined}
        onSaved={load}
      />
    </>
  )
}
