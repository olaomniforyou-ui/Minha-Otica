import { useState, useEffect } from 'react'
import SuppliersTab from '@/pages/Inventory/Suppliers'
import { PageLoader } from '@/components/ui/Spinner'
import { pullFromServer } from '@/services/sync.service'

export default function SuppliersPage() {
  const [ready, setReady] = useState(!navigator.onLine)

  useEffect(() => {
    if (!navigator.onLine) { setReady(true); return }
    pullFromServer().catch(() => {}).finally(() => setReady(true))
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fornecedores</h1>
        <p className="text-sm text-slate-500">Gerencie os fornecedores da sua ótica</p>
      </div>

      {!ready ? <PageLoader /> : <SuppliersTab />}
    </div>
  )
}
