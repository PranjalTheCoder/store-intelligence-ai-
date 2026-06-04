/**
 * services/api.ts
 *
 * All backend fetch functions in ONE place.
 *
 * Root cause fix: previously split across AnalyticsService.ts,
 * MetricsService.ts, StoreIntelligenceService.ts, VisitorService.ts —
 * each with slightly different endpoint strings and return types, causing
 * React Query hooks to import from different files and get different shapes.
 */
import { apiClient } from './apiClient'
import type {
  MetricsResponse,
  FunnelResponse,
  HeatmapResponse,
  AnomaliesResponse,
  HealthResponse,
} from '@/types/api'

export const api = {
  /** GET /stores/{storeId}/metrics */
  getMetrics: (storeId: string): Promise<MetricsResponse> =>
    apiClient.get(`/stores/${storeId}/metrics`).then((r) => r.data),

  /** GET /stores/{storeId}/funnel */
  getFunnel: (storeId: string): Promise<FunnelResponse> =>
    apiClient.get(`/stores/${storeId}/funnel`).then((r) => r.data),

  /** GET /stores/{storeId}/heatmap */
  getHeatmap: (storeId: string): Promise<HeatmapResponse> =>
    apiClient.get(`/stores/${storeId}/heatmap`).then((r) => r.data),

  /** GET /stores/{storeId}/anomalies */
  getAnomalies: (storeId: string): Promise<AnomaliesResponse> =>
    apiClient.get(`/stores/${storeId}/anomalies`).then((r) => r.data),

  /** GET /health */
  getHealth: (): Promise<HealthResponse> =>
    apiClient.get('/health').then((r) => r.data),
}
