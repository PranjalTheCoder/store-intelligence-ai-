/**
 * DashboardPage.tsx
 *
 * All widgets read from live backend data via React Query hooks.
 * NO mock data anywhere in this file.
 *
 * Root cause fixes applied:
 *   • MetricCard values come from metrics.unique_visitors, etc. — not mock arrays
 *   • FunnelChart reads data.entry / data.zone_visit / etc. — not data.funnel[]
 *   • HeatmapGrid reads data.zones[] — not a hardcoded zone list
 *   • AnomaliesPanel reads data.anomalies[] — not data.alerts[]
 *   • HealthPanel reads store.feed_status — not store.status
 *   • All polling intervals active (5s / 15s)
 */
import { useState } from 'react'
import {
  Users, TrendingUp, ShoppingCart, AlertTriangle,
  Activity, LogIn, LogOut,
} from 'lucide-react'

import { useMetrics, useFunnel, useHeatmap, useAnomalies, useHealth } from '@/hooks/queries/useStoreQueries'
import { MetricCard } from '@/components/cards/MetricCard'
import { FunnelChart } from '@/components/charts/FunnelChart'
import { HeatmapGrid } from '@/components/charts/HeatmapGrid'
import { AnomaliesPanel } from '@/components/panels/AnomaliesPanel'
import { HealthPanel } from '@/components/panels/HealthPanel'
import { Spinner, ErrorBox, SectionCard } from '@/components/ui'

const DEFAULT_STORE = import.meta.env.VITE_DEFAULT_STORE ?? 'ST1008'

export function DashboardPage() {
  const [storeId, setStoreId] = useState(DEFAULT_STORE)

  const metrics   = useMetrics(storeId)
  const funnel    = useFunnel(storeId)
  const heatmap   = useHeatmap(storeId)
  const anomalies = useAnomalies(storeId)
  const health    = useHealth()

  const m = metrics.data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Store Intelligence</h1>
          </div>

          {/* Store selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500" htmlFor="store-select">Store</label>
            <select
              id="store-select"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
              {['ST1008', 'STORE_1', 'STORE_2', 'ST1076'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Live indicator */}
            {health.data && (
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                health.data.status === 'healthy'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                <span className={`h-2 w-2 rounded-full ${
                  health.data.status === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`} />
                {health.data.status === 'healthy' ? 'LIVE' : 'DEGRADED'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">

        {/* ── Metric cards row ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Unique Visitors"
            value={m?.unique_visitors ?? '—'}
            sub={m ? `${m.total_entries} entries · ${m.total_exits} exits` : undefined}
            icon={<Users className="h-4 w-4" />}
            loading={metrics.isLoading}
          />
          <MetricCard
            label="Conversion Rate"
            value={m ? `${m.conversion_rate.toFixed(1)}%` : '—'}
            sub={m ? `${m.converted_visitors} converted` : undefined}
            icon={<TrendingUp className="h-4 w-4" />}
            loading={metrics.isLoading}
            color="bg-green-50"
          />
          <MetricCard
            label="Queue Depth"
            value={m?.current_queue_depth ?? '—'}
            sub={m?.abandonment_rate != null
              ? `${m.abandonment_rate.toFixed(1)}% abandon rate`
              : undefined}
            icon={<ShoppingCart className="h-4 w-4" />}
            loading={metrics.isLoading}
            color={m && m.current_queue_depth > 5 ? 'bg-red-50' : 'bg-white'}
          />
          <MetricCard
            label="Avg Basket"
            value={m ? `₹${m.avg_basket_value_inr.toFixed(0)}` : '—'}
            sub="per converted visitor"
            icon={<AlertTriangle className="h-4 w-4" />}
            loading={metrics.isLoading}
          />
        </div>

        {metrics.error && <ErrorBox message={String(metrics.error)} />}

        {/* ── Funnel + Anomalies ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Conversion Funnel">
            {funnel.isLoading && (
              <div className="flex h-40 items-center justify-center">
                <Spinner />
              </div>
            )}
            {funnel.error && <ErrorBox message={String(funnel.error)} />}
            {funnel.data && <FunnelChart data={funnel.data} />}
          </SectionCard>

          <SectionCard
            title="Active Anomalies"
            badge={
              anomalies.data?.anomalies.length
                ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                    {anomalies.data.anomalies.length}
                  </span>
                : undefined
            }
          >
            {anomalies.isLoading && (
              <div className="flex h-40 items-center justify-center">
                <Spinner />
              </div>
            )}
            {anomalies.error && <ErrorBox message={String(anomalies.error)} />}
            {anomalies.data && <AnomaliesPanel data={anomalies.data} />}
          </SectionCard>
        </div>

        {/* ── Heatmap ── */}
        <SectionCard
          title="Zone Heatmap"
          badge={
            heatmap.data && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                heatmap.data.data_confidence === 'HIGH'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {heatmap.data.data_confidence} confidence
              </span>
            )
          }
        >
          {heatmap.isLoading && (
            <div className="flex h-40 items-center justify-center">
              <Spinner />
            </div>
          )}
          {heatmap.error && <ErrorBox message={String(heatmap.error)} />}
          {heatmap.data && <HeatmapGrid data={heatmap.data} />}
        </SectionCard>

        {/* ── Health ── */}
        <SectionCard title="System Health">
          {health.isLoading && (
            <div className="flex h-24 items-center justify-center">
              <Spinner />
            </div>
          )}
          {health.error && <ErrorBox message={String(health.error)} />}
          {health.data && <HealthPanel data={health.data} />}
        </SectionCard>

      </main>
    </div>
  )
}
