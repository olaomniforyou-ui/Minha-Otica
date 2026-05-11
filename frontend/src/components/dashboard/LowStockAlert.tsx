import { ShoppingCart, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { Product } from '@/types'

interface LowStockAlertProps {
  products: Product[]
}

export function LowStockAlert({ products }: LowStockAlertProps) {
  if (!products.length) return null

  return (
    <Card className="border border-red-100 bg-red-50/60">
      <CardHeader>
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <CardTitle className="text-red-700">Alerta de Estoque Baixo</CardTitle>
        </div>

        <ul className="mt-3 space-y-2">
          {products.slice(0, 4).map((product) => (
            <li
              key={product.id}
              className="flex items-center gap-3 rounded-lg bg-white/80 px-3 py-2 shadow-sm"
            >
              {/* Ícone placeholder */}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <span className="text-[10px] font-bold">
                  {product.name.substring(0, 2).toUpperCase()}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{product.name}</p>
                <p className="text-[10px] text-red-500 font-medium">
                  {product.stock_quantity} unidade{product.stock_quantity !== 1 ? 's' : ''} restando
                </p>
              </div>

              <button
                className="flex-shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Solicitar reposição"
              >
                <ShoppingCart size={14} />
              </button>
            </li>
          ))}
        </ul>
      </CardHeader>
    </Card>
  )
}
