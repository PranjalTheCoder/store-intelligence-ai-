/**
 * types/api.ts
 *
 * Single source of truth for all backend response shapes.
 * Field names MUST match backend JSON exactly — no camelCase conversion.
 *
 * Root cause fix: previous codebase had duplicate, divergent interfaces
 * in AnalyticsService.ts, MetricsService.ts, StoreIntelligenceService.ts —
 * all with different field names → data rendered as undefined.
 */

// ── /stores/{id}/metrics ─────────────────────────────────────────────────────
export interface MetricsResponse {
  store_id:             string
  unique_visitors:      number
  conversion_rate:      number   // percentage 0-100
  avg_dwell_seconds:    number
  avg_dwell_per_zone:   Record<string, number>
  current_queue_depth:  number
  abandonment_rate:     number   // percentage 0-100
  total_entries:        number
  total_exits:          number
  converted_visitors:   number
  avg_basket_value_inr: number
  window_start?:        string | null
  window_end?:          string | null
}

// ── /stores/{id}/funnel ──────────────────────────────────────────────────────
export interface FunnelDropOff {
  entry_to_zone:     number  // % dropped from entry to zone
  zone_to_queue:     number
  queue_to_purchase: number
}

export interface FunnelResponse {
  store_id:      string
  entry:         number
  zone_visit:    number
  billing_queue: number
  purchase:      number
  drop_off:      FunnelDropOff
}

// ── /stores/{id}/heatmap ─────────────────────────────────────────────────────
export interface ZoneHeat {
  zone_id:           string
  zone_name?:        string
  visits:            number
  visit_frequency?:  number  // alias for visits
  avg_dwell_seconds: number
  avg_dwell?:        number  // alias
  score:             number  // normalised 0-100
  normalized_score?: number  // alias
}

export interface HeatmapResponse {
  store_id:        string
  session_count:   number
  data_confidence: 'LOW' | 'HIGH'
  zones:           ZoneHeat[]
}

// ── /stores/{id}/anomalies ───────────────────────────────────────────────────
export type Severity = 'INFO' | 'WARN' | 'WARNING' | 'CRITICAL' | 'HIGH'

export interface Anomaly {
  type:             string
  severity:         Severity
  zone_id?:         string | null
  message:          string
  suggested_action: string
  value?:           number | null
  threshold?:       number | null
}

export interface AnomaliesResponse {
  store_id:   string
  checked_at: string
  anomalies:  Anomaly[]
}

// ── /health ──────────────────────────────────────────────────────────────────
export type FeedStatus = 'ACTIVE' | 'STALE_FEED' | 'NO_DATA'

export interface StoreHealth {
  store_id:             string
  last_event?:          string | null       // backward compat
  last_event_timestamp?: string | null      // primary field
  feed_status:          FeedStatus
  events_last_hour?:    number
  lag_minutes?:         number | null
}

export interface HealthResponse {
  status:     'healthy' | 'degraded'
  stores:     StoreHealth[]
  checked_at: string
}
