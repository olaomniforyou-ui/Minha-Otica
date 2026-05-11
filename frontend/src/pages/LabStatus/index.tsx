import { useState, useEffect } from 'react'
import { FlaskConical } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { LabStatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { db } from '@/db'
import type { LabTracking } from '@/types'
import { LAB_STATUS_LABELS } from '@/types'

export default function LabStatusPage() {
  const [trackings, setTrackings] = useState<LabTracking[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    db.lab_trackings.toArray().then((data) => {
      setTrackings(data as LabTracking[])
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Laboratório</h1>
        <p className="text-sm text-slate-500">Acompanhe os pedidos enviados ao laboratório</p>
      </div>

      {loading ? (
        <PageLoader />
      ) : trackings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <FlaskConical size={40} className="text-slate-300" />
          <p className="text-slate-500">Nenhum pedido no laboratório.</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {['OS', 'Laboratório', 'Nº Lab', 'Enviado em', 'Previsão', 'Status'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trackings.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3 font-semibold text-primary-700">
                          #{t.service_order_id.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-800">{t.lab_name}</td>
                        <td className="px-5 py-3 text-slate-600">{t.lab_order_number ?? '—'}</td>
                        <td className="px-5 py-3 text-slate-600">{t.sent_at ? formatDate(t.sent_at) : '—'}</td>
                        <td className="px-5 py-3 text-slate-600">{t.expected_return ? formatDate(t.expected_return) : '—'}</td>
                        <td className="px-5 py-3"><LabStatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {trackings.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-primary-700">
                      OS #{t.service_order_id.slice(0, 8)}
                    </p>
                    <p className="font-semibold text-slate-900">{t.lab_name}</p>
                    {t.lab_order_number && (
                      <p className="text-xs text-slate-500">Nº {t.lab_order_number}</p>
                    )}
                    <div className="mt-1 flex gap-3 text-xs text-slate-400">
                      {t.sent_at && <span>Enviado: {formatDate(t.sent_at)}</span>}
                      {t.expected_return && <span>Previsão: {formatDate(t.expected_return)}</span>}
                    </div>
                  </div>
                  <LabStatusBadge status={t.status} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
