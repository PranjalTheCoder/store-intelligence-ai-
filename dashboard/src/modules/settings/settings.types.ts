// ─── General ─────────────────────────────────────────────────────────────────

export interface StoreSettings {
  storeName: string;
  storeId: string;
  location: string;
  timezone: string;
  openingTime: string;
  closingTime: string;
  weekendSameHours: boolean;
  holidayOverride: boolean;
}

// ─── Zone ────────────────────────────────────────────────────────────────────

export interface ZoneConfig {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
  capacity: number;
  alertThreshold: number;
  group: "brand" | "operational";
}

// ─── Camera ──────────────────────────────────────────────────────────────────

export type CameraStatus = "online" | "degraded" | "offline";

export interface CameraConfig {
  id: string;
  zone: string;
  status: CameraStatus;
  resolution: string;
  fps: number;
  detectionEnabled: boolean;
  trackingEnabled: boolean;
  health: number;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsSettings {
  masterEnabled: boolean;
  heatmapsEnabled: boolean;
  visitorTrackingEnabled: boolean;
  sessionTrackingEnabled: boolean;
  dwellTimeEnabled: boolean;
  conversionEnabled: boolean;
  crossZoneJourneyEnabled: boolean;
  repeatVisitorEnabled: boolean;
  eventRetentionDays: number;
  sessionRetentionDays: number;
  heatmapResolution: "high" | "medium" | "low";
  samplingRate: "1:1" | "1:2" | "1:5";
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export interface AlertThresholds {
  crowdingThreshold: number;
  queueLength: number;
  lowEngagement: number;
  highDwellMinutes: number;
  lowConversionPercent: number;
  cameraOfflineMinutes: number;
}

export interface NotificationMethods {
  dashboard: boolean;
  email: boolean;
  slack: boolean;
  push: boolean;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardSettings {
  compactMode: boolean;
  showHeatmap: boolean;
  showLiveTracking: boolean;
  showAlerts: boolean;
  showKpiCards: boolean;
  autoRefresh: boolean;
  refreshInterval: 5 | 10 | 30 | 60;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiSettings {
  baseUrl: string;
  wsUrl: string;
  healthEndpoint: string;
  apiKey: string;
}

export interface ConnectionStatus {
  service: string;
  description: string;
  connected: boolean;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export type UserRole = "Admin" | "Manager" | "Viewer";
export type UserStatus = "active" | "inactive";

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  initials: string;
  avatarColor: string;
}

// ─── System ──────────────────────────────────────────────────────────────────

export interface SystemInfo {
  appVersion: string;
  backendVersion: string;
  pythonRuntime: string;
  uptime: string;
  totalEvents: string;
  totalSessions: string;
  totalVisitors: string;
  databaseSize: string;
  databaseType: string;
  cacheLayer: string;
  mlFramework: string;
  deployment: string;
  os: string;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export type ThemeMode = "dark" | "light" | "system";
export type AccentColor =
  | "indigo"
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "violet";

export interface ThemeSettings {
  mode: ThemeMode;
  accent: AccentColor;
  compactTypography: boolean;
  monospaceInterface: boolean;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface NotificationSettings {
  emailAlerts: boolean;
  pushAlerts: boolean;
  slackAlerts: boolean;
  dailySummary: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  anomalyDigest: boolean;
  reportRecipients: string;
  alertRecipients: string;
}

// ─── Sidebar nav ─────────────────────────────────────────────────────────────

export type SettingsSection =
  | "general"
  | "layout"
  | "cameras"
  | "analytics"
  | "alerts"
  | "dashboard"
  | "api"
  | "users"
  | "system"
  | "backup"
  | "theme"
  | "notifications"
  | "advanced";
