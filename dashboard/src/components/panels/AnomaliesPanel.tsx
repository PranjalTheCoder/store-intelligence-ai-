/**
 * AnomaliesPanel.tsx
 *
 * Root cause fix: previous code accessed data.alerts (wrong field name).
 * Correct field is data.anomalies[].
 * Each anomaly must show: type, severity, suggested_action.
 */
import type { AnomaliesResponse, Anomaly, Severity } from '@/types/api'
import clsx from 'clsx'

interface Props {
  data: AnomaliesResponse
}

const SEV_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-100 border-red-300 text-red-800',
  HIGH:     'bg-red-100 border-red-300 text-red-800',
  WARNING:  'bg-orange-100 border-orange-300 text-orange-800',
  WARN:     'bg-orange-100 border-orange-300 text-orange-800',
  INFO:     'bg-blue-50 border-blue-200 text-blue-700',
}

const SEV_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-red-500',
  WARNING:  'bg-orange-500',
  WARN:     'bg-orange-500',
  INFO:     'bg-blue-400',
}

function AnomalyRow({ a }: { a: Anomaly }) {
  const sev = (a.severity ?? 'INFO').toUpperCase()
  return (
    <div className={clsx('rounded-lg border p-3 text-sm', SEV_STYLES[sev] ?? SEV_STYLES.INFO)}>
      <div className="flex items-center gap-2 mb-1">
        <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', SEV_DOT[sev] ?? 'bg-blue-400')} />
        <span className="font-semibold uppercase tracking-wide text-xs">{a.type}</span>
        {a.zone_id && (
          <span className="ml-auto text-xs opacity-75">{a.zone_id}</span>
        )}
      </div>
      <p className="mb-1 leading-snug">{a.message}</p>
      {a.suggested_action && (
        <p className="text-xs font-medium opacity-80">
          ▶ {a.suggested_action}
        </p>
      )}
      {a.value != null && a.threshold != null && (
        <p className="mt-1 text-xs opacity-60">
          Value: {a.value} · Threshold: {a.threshold}
        </p>
      )}
    </div>
  )
}

export function AnomaliesPanel({ data }: Props) {
  const anomalies = data.anomalies ?? []

  return (
    <div className="space-y-2">
      {anomalies.length === 0 ? (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700 text-center">
          ✓ No active anomalies
        </div>
      ) : (
        anomalies.map((a, i) => <AnomalyRow key={i} a={a} />)
      )}
      <div className="text-xs text-gray-400 text-right">
        Checked: {new Date(data.checked_at).toLocaleTimeString()}
      </div>
    </div>
  )
}
