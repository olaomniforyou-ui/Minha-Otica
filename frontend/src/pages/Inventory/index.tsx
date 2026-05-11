import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package, Tag, Bookmark, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pullFromServer } from '@/services/sync.service'
import { PageLoader } from '@/components/ui/Spinner'
import ProductsTab   from './Products'
import CategoriesTab from './Categories'
import BrandsTab     from './Brands'
import ModelsTab     from './Models'

type Tab = 'products' | 'categories' | 'brands' | 'models'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'products',   label: 'Produtos',   icon: Package },
  { id: 'categories', label: 'Categorias', icon: Tag },
  { id: 'brands',     label: 'Marcas',     icon: Bookmark },
  { id: 'models',     label: 'Modelos',    icon: Layers },
]

export default function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const activeTab = (params.get('tab') as Tab) ?? 'products'
  const [ready, setReady] = useState(!navigator.onLine)

  useEffect(() => {
    if (!navigator.onLine) { setReady(true); return }
    pullFromServer().catch(() => {}).finally(() => setReady(true))
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Produtos</h1>
        <p className="text-sm text-slate-500">Gerencie produtos, categorias, marcas e modelos</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setParams({ tab: id })}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === id
                ? 'border-primary-800 text-primary-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300',
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div>
        {!ready ? (
          <PageLoader />
        ) : (
          <>
            {activeTab === 'products'   && <ProductsTab />}
            {activeTab === 'categories' && <CategoriesTab />}
            {activeTab === 'brands'     && <BrandsTab />}
            {activeTab === 'models'     && <ModelsTab />}
          </>
        )}
      </div>
    </div>
  )
}
