import { Link } from 'react-router-dom'
import { MoreVertical, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { formatDate, getInitials, cn } from '@/lib/utils'
import type { ServiceOrder } from '@/types'
import { SERVICE_TYPE_LABELS } from '@/types'

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
  'bg-rose-500', 'bg-amber-500', 'bg-cyan-500',
]

function colorFromName(name: string) {
  const sum = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

interface RecentOrdersProps {
  orders: ServiceOrder[]
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Ordens de Serviço Recentes</CardTitle>
        <Link
          to="/orders"
          className="flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-900"
        >
          Ver todas <ArrowRight size={14} />
        </Link>
      </CardHeader>

      <CardContent className="pt-0 px-0 pb-0">
        {/* Desktop: tabela */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/60">
                {['OS ID', 'Paciente', 'Tipo de Serviço', 'Data Entrega', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      to={`/orders/${order.id}`}
                      className="font-semibold text-primary-700 hover:text-primary-900"
                    >
                      #{order.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
                          colorFromName(order.patient?.full_name ?? ''),
                        )}
                      >
                        {getInitials(order.patient?.full_name ?? '?')}
                      </div>
                      <span className="font-medium text-slate-800">
                        {order.patient?.full_name ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {SERVICE_TYPE_LABELS[order.service_type]}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {order.estimated_delivery
                      ? formatDate(order.estimated_delivery)
                      : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3">
                    <button className="rounded-md p-1 text-slate-400 hover:text-slate-700">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: cards */}
        <div className="space-y-3 px-5 pb-5 md:hidden">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                    colorFromName(order.patient?.full_name ?? ''),
                  )}
                >
                  {getInitials(order.patient?.full_name ?? '?')}
                </div>
                <div>
                  <p className="text-xs font-bold text-primary-700">#{order.order_number}</p>
                  <p className="text-sm font-medium text-slate-800">{order.patient?.full_name}</p>
                  <p className="text-xs text-slate-500">{SERVICE_TYPE_LABELS[order.service_type]}</p>
                </div>
              </div>
              <OrderStatusBadge status={order.status} />
            </Link>
          ))}
        </div>

        {orders.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            Nenhuma ordem de serviço encontrada.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
