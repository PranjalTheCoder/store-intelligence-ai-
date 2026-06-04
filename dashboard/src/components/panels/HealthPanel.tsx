/**
 * HealthPanel.tsx
 *
 * Root cause fix: previous code checked store.status (wrong field).
 * Correct field is store.feed_status (ACTIVE | STALE_FEED | NO_DATA).
 * last_event_timestamp is the primary field; last_event is fallback.
 */
import type { HealthResponse, StoreHealth } from '@/types/api'
import clsx from 'clsx'

interface Props {
  data: HealthResponse
}

function StoreRow({ store }: { store: StoreHealth }) {
  const isActive = store.feed_status === 'ACTIVE'
  const isStale  = store.feed_status === 'STALE_FEED'

  const lastEvent = store.last_event_timestamp ?? store.last_event
  const lastStr   = lastEvent ? new Date(lastEvent).toLocaleTimeString() : '—'

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <div>
        <div className="text-sm font-medium text-gray-800">{store.store_id}</div>
        <div className="text-xs text-gray-400">Last event: {lastStr}</div>
        {store.lag_minutes != null && (
          <div className="text-xs text-gray-400">Lag: {store.lag_minutes.toFixed(1)} min</div>
        )}
      </div>
      <span className={clsx(
        'rounded-full px-3 py-1 text-xs font-semibold',
        isActive ? 'bg-green-100 text-green-700'
          : isStale ? 'bg-red-100 text-red-700'
          : 'bg-gray-200 text-gray-500'
      )}>
        {store.feed_status}
      </span>
    </div>
  )
}

export function HealthPanel({ data }: Props) {
  const overallOk = data.status === 'healthy'

  return (
    <div>
      {/* System status badge */}
      <div className={clsx(
        'mb-4 flex items-center gap-2 rounded-lg p-3 text-sm font-medium',
        overallOk
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      )}>
        <span className={clsx(
          'inline-block w-2.5 h-2.5 rounded-full',
          overallOk ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        )} />
        System {data.status.toUpperCase()}
      </div>

      {/* Per-store rows */}
      <div className="space-y-2">
        {(data.stores ?? []).map((s) => (
          <StoreRow key={s.store_id} store={s} />
        ))}
        {(data.stores ?? []).length === 0 && (
          <div className="text-sm text-gray-400 text-center py-4">
            No store feeds detected yet.
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-400 text-right">
        Checked: {new Date(data.checked_at).toLocaleTimeString()}
      </div>
    </div>
  )
}
