/**
 * FunnelChart.tsx
 *
 * Root cause fix: previous version mapped data.funnel[] (old array format)
 * instead of the actual backend fields: entry, zone_visit, billing_queue, purchase.
 */
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import type { FunnelResponse } from '@/types/api'

interface Props {
  data: FunnelResponse
}

const STAGES = [
  { key: 'entry',         label: 'Entry',        color: '#6366f1' },
  { key: 'zone_visit',    label: 'Zone Visit',   color: '#8b5cf6' },
  { key: 'billing_queue', label: 'Billing Queue',color: '#ec4899' },
  { key: 'purchase',      label: 'Purchase',     color: '#f59e0b' },
] as const

export function FunnelChart({ data }: Props) {
  const chartData = STAGES.map(({ key, label, color }) => ({
    label,
    value: data[key] ?? 0,
    color,
  }))

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 40 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(v: number) => [v.toLocaleString(), 'Visitors']}
            cursor={{ fill: '#f3f4f6' }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
            <LabelList dataKey="value" position="right" style={{ fontSize: 12, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Drop-off badges */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: 'Entry→Zone',  pct: data.drop_off?.entry_to_zone ?? 0 },
          { label: 'Zone→Queue',  pct: data.drop_off?.zone_to_queue ?? 0 },
          { label: 'Queue→Buy',   pct: data.drop_off?.queue_to_purchase ?? 0 },
        ].map(({ label, pct }) => (
          <div key={label} className="rounded-lg bg-red-50 px-3 py-2 text-center">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-sm font-bold text-red-600">−{pct.toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}
