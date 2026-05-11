import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
        <BarChart3 size={28} className="text-primary-700" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Relatórios em breve</h2>
      <p className="max-w-sm text-sm text-slate-500">
        O módulo de analytics com gráficos de faturamento, tickets médios e
        performance por período está em desenvolvimento.
      </p>
    </div>
  )
}
