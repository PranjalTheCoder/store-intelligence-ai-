/**
 * hooks/queries/useStoreQueries.ts
 *
 * All React Query hooks in one file.
 *
 * Root cause fix: previous hooks had:
 *   1. Wrong query keys (e.g. ['metrics'] missing storeId → all stores
 *      returned same cached value)
 *   2. No refetchInterval → data never updated live
 *   3. Imported from stale service files with wrong field names
 *   4. Missing error boundaries → undefined access crashed components
 *
 * Polling intervals per challenge Part E:
 *   metrics / funnel / anomalies / health → 5 s
 *   heatmap → 15 s
 */
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

// ── Query key factory — prevents stale cross-store cache hits ────────────────
export const qk = {
  metrics:   (storeId: string) => ['metrics',   storeId] as const,
  funnel:    (storeId: string) => ['funnel',    storeId] as const,
  heatmap:   (storeId: string) => ['heatmap',   storeId] as const,
  anomalies: (storeId: string) => ['anomalies', storeId] as const,
  health:    ()                => ['health']              as const,
}

// ── useMetrics ───────────────────────────────────────────────────────────────
export function useMetrics(storeId: string) {
  return useQuery({
    queryKey:        qk.metrics(storeId),
    queryFn:         () => api.getMetrics(storeId),
    refetchInterval: 5_000,
    staleTime:       4_000,
    retry:           2,
  })
}

// ── useFunnel ────────────────────────────────────────────────────────────────
export function useFunnel(storeId: string) {
  return useQuery({
    queryKey:        qk.funnel(storeId),
    queryFn:         () => api.getFunnel(storeId),
    refetchInterval: 5_000,
    staleTime:       4_000,
    retry:           2,
  })
}

// ── useHeatmap ───────────────────────────────────────────────────────────────
export function useHeatmap(storeId: string) {
  return useQuery({
    queryKey:        qk.heatmap(storeId),
    queryFn:         () => api.getHeatmap(storeId),
    refetchInterval: 15_000,
    staleTime:       14_000,
    retry:           2,
  })
}

// ── useAnomalies ─────────────────────────────────────────────────────────────
export function useAnomalies(storeId: string) {
  return useQuery({
    queryKey:        qk.anomalies(storeId),
    queryFn:         () => api.getAnomalies(storeId),
    refetchInterval: 5_000,
    staleTime:       4_000,
    retry:           2,
  })
}

// ── useHealth ────────────────────────────────────────────────────────────────
export function useHealth() {
  return useQuery({
    queryKey:        qk.health(),
    queryFn:         api.getHealth,
    refetchInterval: 5_000,
    staleTime:       4_000,
    retry:           2,
  })
}
