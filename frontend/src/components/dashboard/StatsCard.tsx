import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  badge?: React.ReactNode
  icon?: React.ReactNode
  iconBg?: string
  trend?: number
}

export function StatsCard({ title, value, subtitle, badge, icon, iconBg, trend }: StatsCardProps) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        {/* Ícone */}
        {icon && (
          <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl', iconBg ?? 'bg-primary-100')}>
            {icon}
          </div>
        )}

        {/* Badge de tendência */}
        {trend !== undefined && (
          <span
            className={cn(
              'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
              trend >= 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-600',
            )}
          >
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}

        {badge}
      </div>

      <div className="mt-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  )
}
