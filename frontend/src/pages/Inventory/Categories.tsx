import { useState, useEffect, useCallback } from 'react'
import { Plus, Tag, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { CategoryModal } from '@/components/inventory/CategoryModal'
import { getCategories, deleteCategory } from '@/services/categories.service'
import type { ProductCategory } from '@/types'

export default function CategoriesTab() {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [selected,   setSelected]   = useState<ProductCategory | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setCategories(await getCategories())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openEdit(c: ProductCategory) { setSelected(c); setModal(true) }
  function openNew()                    { setSelected(null); setModal(true) }

  async function handleDelete(c: ProductCategory) {
    if (!confirm(`Excluir categoria "${c.name}"? Os produtos vinculados não serão excluídos.`)) return
    await deleteCategory(c.id)
    load()
  }

  const parentName = (id?: string) =>
    categories.find(c => c.id === id)?.name

  // raízes primeiro, depois subcategorias agrupadas
  const roots = categories.filter(c => !c.parent_id)
  const children = categories.filter(c => c.parent_id)

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{categories.length} categoria{categories.length !== 1 ? 's' : ''}</p>
        <Button size="sm" icon={<Plus size={14} />} onClick={openNew}>Nova Categoria</Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Tag size={36} className="text-slate-300" />
          <p className="text-slate-500">Nenhuma categoria cadastrada.</p>
          <Button size="sm" icon={<Plus size={14} />} onClick={openNew}>Criar categoria</Button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {/* Raízes */}
          {roots.map(root => {
            const subs = children.filter(c => c.parent_id === root.id)
            return (
              <div key={root.id}>
                <Card className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
                      <Tag size={16} className="text-primary-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{root.name}</p>
                      <p className="text-xs text-slate-400">{root.slug}</p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button onClick={() => openEdit(root)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(root)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>

                {/* Subcategorias */}
                {subs.map(sub => (
                  <Card key={sub.id} className="ml-6 mt-1 flex items-center justify-between gap-3 px-4 py-2.5 border-l-2 border-primary-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ChevronRight size={13} className="text-primary-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 truncate">{sub.name}</p>
                        <p className="text-[11px] text-slate-400">{sub.slug}</p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button onClick={() => openEdit(sub)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(sub)}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )
          })}

          {/* Categorias órfãs (parent_id aponta para categoria inexistente) */}
          {children
            .filter(c => !roots.find(r => r.id === c.parent_id))
            .map(c => (
              <Card key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Tag size={16} className="text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">
                      Subcategoria de: {parentName(c.parent_id) ?? '(removida)'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button onClick={() => openEdit(c)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(c)}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
        </div>
      )}

      <CategoryModal
        open={modal}
        onClose={() => setModal(false)}
        category={selected}
        onSaved={load}
      />
    </>
  )
}
