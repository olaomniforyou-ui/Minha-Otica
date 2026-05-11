import { useState, useEffect } from 'react'
import MovementsTab from '@/pages/Inventory/StockMovements'
import { PageLoader } from '@/components/ui/Spinner'
import { pullFromServer } from '@/services/sync.service'

export default function StockPage() {
  const [ready, setReady] = useState(!navigator.onLine)

  useEffect(() => {
    if (!navigator.onLine) { setReady(true); return }
    pullFromServer().catch(() => {}).finally(() => setReady(true))
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestão de Estoque</h1>
        <p className="text-sm text-slate-500">Histórico e registro de movimentações de estoque</p>
      </div>

      {!ready ? <PageLoader /> : <MovementsTab />}
    </div>
  )
}
