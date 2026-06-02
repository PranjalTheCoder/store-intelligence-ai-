/**
 * settingsMockData.ts
 * ─────────────────────────────────────────────────────────────
 * All mock data for the Settings page.
 * Replace each object/array with a real API call when ready:
 *
 *   GET /settings        → storeSettings, analyticsSettings, dashboardSettings, themeSettings, notificationSettings
 *   GET /settings/alerts → alertThresholds, notificationMethods
 *   GET /settings/api    → apiSettings, connectionStatuses
 *   GET /cameras         → cameras
 *   GET /zones           → zones
 *   GET /users           → users
 *   GET /health          → systemInfo
 */

import type {
  StoreSettings,
  ZoneConfig,
  CameraConfig,
  AnalyticsSettings,
  AlertThresholds,
  NotificationMethods,
  DashboardSettings,
  ApiSettings,
  ConnectionStatus,
  TeamUser,
  SystemInfo,
  ThemeSettings,
  NotificationSettings,
} from "./settings.types";

// ─── General ─────────────────────────────────────────────────────────────────

export const mockStoreSettings: StoreSettings = {
  storeName: "Purplle Flagship Store",
  storeId: "PLF-BLR-001",
  location: "Bengaluru, Karnataka",
  timezone: "Asia/Kolkata (IST +5:30)",
  openingTime: "10:00",
  closingTime: "21:00",
  weekendSameHours: true,
  holidayOverride: false,
};

// ─── Zones ───────────────────────────────────────────────────────────────────

export const mockZones: ZoneConfig[] = [
  // Brand zones
  {
    id: "z1",
    name: "EB Korean",
    color: "#7c3aed",
    enabled: true,
    capacity: 15,
    alertThreshold: 11,
    group: "brand",
  },
  {
    id: "z2",
    name: "The Face Shop",
    color: "#db2777",
    enabled: true,
    capacity: 12,
    alertThreshold: 9,
    group: "brand",
  },
  {
    id: "z3",
    name: "Good Vibes",
    color: "#059669",
    enabled: true,
    capacity: 10,
    alertThreshold: 8,
    group: "brand",
  },
  {
    id: "z4",
    name: "DermDoc",
    color: "#2563eb",
    enabled: true,
    capacity: 8,
    alertThreshold: 6,
    group: "brand",
  },
  {
    id: "z5",
    name: "Minimalist",
    color: "#d97706",
    enabled: true,
    capacity: 8,
    alertThreshold: 6,
    group: "brand",
  },
  {
    id: "z6",
    name: "Aqualogica",
    color: "#0891b2",
    enabled: true,
    capacity: 10,
    alertThreshold: 8,
    group: "brand",
  },
  {
    id: "z7",
    name: "Lakme Skin",
    color: "#e11d48",
    enabled: true,
    capacity: 18,
    alertThreshold: 14,
    group: "brand",
  },
  {
    id: "z8",
    name: "Accessories",
    color: "#65a30d",
    enabled: true,
    capacity: 20,
    alertThreshold: 15,
    group: "brand",
  },
  {
    id: "z9",
    name: "Maybelline",
    color: "#dc2626",
    enabled: true,
    capacity: 12,
    alertThreshold: 10,
    group: "brand",
  },
  {
    id: "z10",
    name: "Faces Canada",
    color: "#7c3aed",
    enabled: true,
    capacity: 10,
    alertThreshold: 8,
    group: "brand",
  },
  {
    id: "z11",
    name: "Lakme",
    color: "#be185d",
    enabled: true,
    capacity: 15,
    alertThreshold: 12,
    group: "brand",
  },
  {
    id: "z12",
    name: "Colorbar",
    color: "#b45309",
    enabled: true,
    capacity: 12,
    alertThreshold: 9,
    group: "brand",
  },
  // Operational zones
  {
    id: "z13",
    name: "FOH",
    color: "#4f46e5",
    enabled: true,
    capacity: 30,
    alertThreshold: 24,
    group: "operational",
  },
  {
    id: "z14",
    name: "Makeup Unit",
    color: "#e11d48",
    enabled: true,
    capacity: 20,
    alertThreshold: 15,
    group: "operational",
  },
  {
    id: "z15",
    name: "Cash Counter",
    color: "#d97706",
    enabled: true,
    capacity: 8,
    alertThreshold: 6,
    group: "operational",
  },
  {
    id: "z16",
    name: "PMU",
    color: "#059669",
    enabled: true,
    capacity: 6,
    alertThreshold: 5,
    group: "operational",
  },
  {
    id: "z17",
    name: "Swiss Beauty",
    color: "#7c3aed",
    enabled: true,
    capacity: 10,
    alertThreshold: 8,
    group: "operational",
  },
  {
    id: "z18",
    name: "Renee",
    color: "#db2777",
    enabled: true,
    capacity: 10,
    alertThreshold: 8,
    group: "operational",
  },
  {
    id: "z19",
    name: "Alps Goodness",
    color: "#0891b2",
    enabled: true,
    capacity: 10,
    alertThreshold: 8,
    group: "operational",
  },
  {
    id: "z20",
    name: "Streax",
    color: "#65a30d",
    enabled: true,
    capacity: 10,
    alertThreshold: 8,
    group: "operational",
  },
];

// ─── Cameras ─────────────────────────────────────────────────────────────────

export const mockCameras: CameraConfig[] = [
  {
    id: "CAM-01",
    zone: "Entry / FOH",
    status: "online",
    resolution: "1920×1080",
    fps: 30,
    detectionEnabled: true,
    trackingEnabled: true,
    health: 96,
  },
  {
    id: "CAM-02",
    zone: "Makeup Unit",
    status: "online",
    resolution: "1920×1080",
    fps: 25,
    detectionEnabled: true,
    trackingEnabled: true,
    health: 88,
  },
  {
    id: "CAM-03",
    zone: "Cash Counter",
    status: "degraded",
    resolution: "1280×720",
    fps: 15,
    detectionEnabled: true,
    trackingEnabled: false,
    health: 54,
  },
  {
    id: "CAM-04",
    zone: "PMU Zone",
    status: "offline",
    resolution: "1920×1080",
    fps: 0,
    detectionEnabled: false,
    trackingEnabled: false,
    health: 0,
  },
  {
    id: "CAM-05",
    zone: "Brand Aisle A",
    status: "online",
    resolution: "3840×2160",
    fps: 30,
    detectionEnabled: true,
    trackingEnabled: true,
    health: 100,
  },
  {
    id: "CAM-06",
    zone: "Brand Aisle B",
    status: "online",
    resolution: "1920×1080",
    fps: 30,
    detectionEnabled: false,
    trackingEnabled: false,
    health: 91,
  },
];

// ─── Analytics ───────────────────────────────────────────────────────────────

export const mockAnalyticsSettings: AnalyticsSettings = {
  masterEnabled: true,
  heatmapsEnabled: true,
  visitorTrackingEnabled: true,
  sessionTrackingEnabled: true,
  dwellTimeEnabled: true,
  conversionEnabled: false,
  crossZoneJourneyEnabled: false,
  repeatVisitorEnabled: false,
  eventRetentionDays: 90,
  sessionRetentionDays: 180,
  heatmapResolution: "medium",
  samplingRate: "1:1",
};

// ─── Alerts ──────────────────────────────────────────────────────────────────

export const mockAlertThresholds: AlertThresholds = {
  crowdingThreshold: 8,
  queueLength: 6,
  lowEngagement: 2,
  highDwellMinutes: 20,
  lowConversionPercent: 5,
  cameraOfflineMinutes: 5,
};

export const mockNotificationMethods: NotificationMethods = {
  dashboard: true,
  email: true,
  slack: false,
  push: false,
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const mockDashboardSettings: DashboardSettings = {
  compactMode: false,
  showHeatmap: true,
  showLiveTracking: true,
  showAlerts: true,
  showKpiCards: true,
  autoRefresh: true,
  refreshInterval: 10,
};

// ─── API ─────────────────────────────────────────────────────────────────────

export const mockApiSettings: ApiSettings = {
  baseUrl: "http://localhost:8000",
  wsUrl: "ws://localhost:8000/ws/live",
  healthEndpoint: "http://localhost:8000/health",
  apiKey: "sk-storeiq-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
};

export const mockConnectionStatuses: ConnectionStatus[] = [
  { service: "FastAPI Server", description: "GET /health", connected: true },
  {
    service: "PostgreSQL Database",
    description: "Connection pool active",
    connected: true,
  },
  { service: "Redis Cache", description: "Cache layer", connected: false },
  {
    service: "YOLOv8 Model Service",
    description: "Inference server",
    connected: true,
  },
  {
    service: "WebSocket Server",
    description: "Live event stream",
    connected: true,
  },
];

// ─── Users ───────────────────────────────────────────────────────────────────

export const mockUsers: TeamUser[] = [
  {
    id: "u1",
    name: "Pranjal Tamrakar",
    email: "pranjal@purplle.com",
    role: "Admin",
    status: "active",
    initials: "PT",
    avatarColor: "#6366f1",
  },
  {
    id: "u2",
    name: "Neha Sharma",
    email: "neha.s@purplle.com",
    role: "Manager",
    status: "active",
    initials: "NS",
    avatarColor: "#10b981",
  },
  {
    id: "u3",
    name: "Raj Kapoor",
    email: "raj.k@purplle.com",
    role: "Viewer",
    status: "active",
    initials: "RK",
    avatarColor: "#f59e0b",
  },
  {
    id: "u4",
    name: "Ananya Patel",
    email: "ananya@purplle.com",
    role: "Manager",
    status: "inactive",
    initials: "AP",
    avatarColor: "#e11d48",
  },
];

// ─── System ──────────────────────────────────────────────────────────────────

export const mockSystemInfo: SystemInfo = {
  appVersion: "v2.4.1",
  backendVersion: "v1.8.0",
  pythonRuntime: "3.11.4",
  uptime: "14d 6h",
  totalEvents: "2.4M",
  totalSessions: "48,291",
  totalVisitors: "31,847",
  databaseSize: "12.4 GB",
  databaseType: "PostgreSQL 15.2",
  cacheLayer: "Redis 7.0",
  mlFramework: "Ultralytics YOLOv8",
  deployment: "Docker Compose (local)",
  os: "Ubuntu 22.04 LTS",
};

// ─── Theme ───────────────────────────────────────────────────────────────────

export const mockThemeSettings: ThemeSettings = {
  mode: "dark",
  accent: "indigo",
  compactTypography: false,
  monospaceInterface: true,
};

// ─── Notifications ───────────────────────────────────────────────────────────

export const mockNotificationSettings: NotificationSettings = {
  emailAlerts: true,
  pushAlerts: false,
  slackAlerts: false,
  dailySummary: true,
  weeklyReport: true,
  monthlyReport: false,
  anomalyDigest: false,
  reportRecipients: "pranjal@purplle.com, neha.s@purplle.com",
  alertRecipients: "pranjal@purplle.com",
};

// ─── Backups ─────────────────────────────────────────────────────────────────

export const mockBackups = [
  {
    name: "backup_2026-06-01_21:00.sql.gz",
    size: "4.2 GB",
    type: "Auto backup",
  },
  {
    name: "backup_2026-05-31_21:00.sql.gz",
    size: "4.1 GB",
    type: "Auto backup",
  },
  {
    name: "backup_2026-05-30_21:00.sql.gz",
    size: "4.0 GB",
    type: "Auto backup",
  },
];
