/**
 * HeatmapGrid.tsx
 *
 * Root cause fix: previous version imported a hardcoded zones array from
 * StoreMapService.ts instead of using data.zones from /stores/{id}/heatmap.
 *
 * score field (0-100) drives the colour intensity.
 * data_confidence badge shows LOW/HIGH based on session_count.
 */
import type { HeatmapResponse, ZoneHeat } from '@/types/api'
import clsx from 'clsx'

interface Props {
  data: HeatmapResponse
}

function scoreToColor(score: number): string {
  if (score >= 80) return 'bg-red-500 text-white'
  if (score >= 60) return 'bg-orange-400 text-white'
  if (score >= 40) return 'bg-yellow-300 text-gray-900'
  if (score >= 20) return 'bg-green-200 text-gray-800'
  return 'bg-gray-100 text-gray-600'
}

function ZoneCell({ zone }: { zone: ZoneHeat }) {
  const score = zone.score ?? zone.normalized_score ?? 0
  const name  = zone.zone_name ?? zone.zone_id
  const visits = zone.visits ?? zone.visit_frequency ?? 0
  const dwell  = zone.avg_dwell_seconds ?? zone.avg_dwell ?? 0

  return (
    <div
      className={clsx(
        'rounded-lg p-3 flex flex-col gap-1 transition-all',
        scoreToColor(score)
      )}
    >
      <div className="text-xs font-semibold truncate">{name}</div>
      <div className="text-lg font-bold">{score.toFixed(0)}</div>
      <div className="text-xs opacity-75">{visits} visits · {dwell.toFixed(0)}s</div>
    </div>
  )
}

export function HeatmapGrid({ data }: Props) {
  const zones   = data.zones ?? []
  const isLow   = data.data_confidence === 'LOW'

  return (
    <div>
      {/* Confidence badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className={clsx(
          'rounded-full px-3 py-1 text-xs font-semibold',
          isLow ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
        )}>
          Data confidence: {data.data_confidence}
        </span>
        <span className="text-xs text-gray-500">{data.session_count} sessions</span>
      </div>

      {zones.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm">
          No zone data yet. Run the detection pipeline to populate.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {zones.map((z) => (
            <ZoneCell key={z.zone_id} zone={z} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <span>Score:</span>
        {[
          { label: '80+',  cls: 'bg-red-500' },
          { label: '60',   cls: 'bg-orange-400' },
          { label: '40',   cls: 'bg-yellow-300' },
          { label: '20',   cls: 'bg-green-200' },
          { label: '<20',  cls: 'bg-gray-100' },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={clsx('inline-block w-3 h-3 rounded-sm', cls)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
