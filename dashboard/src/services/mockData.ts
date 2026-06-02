// // ==========================================
// // TYPE DEFINITIONS
// // ==========================================

// export type ZoneName =
//   // Top Row
//   | "EB Korean"
//   | "The Face Shop"
//   | "Good Vibes"
//   | "DermDoc"
//   | "Minimalist"
//   | "Aqualogica"
//   | "Lakme Skin"
//   | "Accessories"
//   // Bottom Row
//   | "Maybelline"
//   | "Faces Canada"
//   | "Lakme"
//   | "Colorbar"
//   | "Swiss Beauty"
//   | "Renee"
//   | "Alps Goodness"
//   | "Streax"
//   // Special Areas
//   | "FOH"
//   | "Makeup Unit"
//   | "Cash Counter"
//   | "PMU";

// export type EventType = "ENTRY" | "EXIT" | "ZONE_ENTER" | "ZONE_EXIT";
// export type AlertSeverity = "HIGH" | "MEDIUM" | "LOW";

// export interface DashboardMetrics {
//   total_visitors: number;
//   active_visitors: number;
//   entries_today: number;
//   exits_today: number;
//   avg_dwell_time_seconds: number;
//   avg_session_duration_seconds: number;
//   conversion_rate_percentage: number;
//   peak_hour: string;
// }

// export interface Visitor {
//   visitor_id: string;
//   status: "ACTIVE" | "EXITED";
//   entry_time: string;
//   current_zone: ZoneName | null;
//   total_dwell_time_seconds: number;
// }

// export interface Session {
//   session_id: string;
//   visitor_id: string;
//   entry_time: string;
//   exit_time: string;
//   duration_seconds: number;
//   zones_visited: ZoneName[];
// }

// export interface StoreEvent {
//   event_id: string;
//   visitor_id: string;
//   event_type: EventType;
//   zone: ZoneName | null;
//   camera_id: string;
//   timestamp: string;
// }

// export interface ZoneAnalytics {
//   zone_name: ZoneName;
//   visitors_count: number;
//   avg_dwell_seconds: number;
//   engagement_score: number;
//   revenue_impact_score: number;
// }

// export interface Alert {
//   alert_id: string;
//   severity: AlertSeverity;
//   message: string;
//   zone: ZoneName;
//   timestamp: string;
// }

// export interface LivePosition {
//   visitor_id: string;
//   x: number;
//   y: number;
//   zone: ZoneName;
// }

// // ==========================================
// // MOCK DATA EXPORTS
// // ==========================================

// const TODAY = new Date().toISOString().split("T")[0];

// export const mockDashboardMetrics: DashboardMetrics = {
//   total_visitors: 1240,
//   active_visitors: 45,
//   entries_today: 890,
//   exits_today: 845,
//   avg_dwell_time_seconds: 500, // 8m 20s
//   avg_session_duration_seconds: 640, // 10m 40s
//   conversion_rate_percentage: 68.4,
//   peak_hour: "17:00 - 18:00",
// };

// export const mockVisitors: Visitor[] = [
//   {
//     visitor_id: "VIS-9482",
//     status: "ACTIVE",
//     entry_time: `${TODAY}T10:15:00Z`,
//     current_zone: "Lakme Skin",
//     total_dwell_time_seconds: 420,
//   },
//   {
//     visitor_id: "VIS-9483",
//     status: "ACTIVE",
//     entry_time: `${TODAY}T10:18:22Z`,
//     current_zone: "FOH",
//     total_dwell_time_seconds: 210,
//   },
//   {
//     visitor_id: "VIS-9484",
//     status: "ACTIVE",
//     entry_time: `${TODAY}T10:20:05Z`,
//     current_zone: "Maybelline",
//     total_dwell_time_seconds: 105,
//   },
//   {
//     visitor_id: "VIS-9485",
//     status: "ACTIVE",
//     entry_time: `${TODAY}T10:21:40Z`,
//     current_zone: "Cash Counter",
//     total_dwell_time_seconds: 60,
//   },
//   {
//     visitor_id: "VIS-9470",
//     status: "EXITED",
//     entry_time: `${TODAY}T09:45:00Z`,
//     current_zone: null,
//     total_dwell_time_seconds: 1200,
//   },
//   {
//     visitor_id: "VIS-9471",
//     status: "EXITED",
//     entry_time: `${TODAY}T09:50:12Z`,
//     current_zone: null,
//     total_dwell_time_seconds: 840,
//   },
// ];

// export const mockSessions: Session[] = [
//   {
//     session_id: "SES-88392",
//     visitor_id: "VIS-9470",
//     entry_time: `${TODAY}T09:45:00Z`,
//     exit_time: `${TODAY}T10:05:00Z`,
//     duration_seconds: 1200,
//     zones_visited: ["FOH", "The Face Shop", "Lakme Skin", "Cash Counter"],
//   },
//   {
//     session_id: "SES-88393",
//     visitor_id: "VIS-9471",
//     entry_time: `${TODAY}T09:50:12Z`,
//     exit_time: `${TODAY}T10:04:12Z`,
//     duration_seconds: 840,
//     zones_visited: ["FOH", "Maybelline", "Colorbar"],
//   },
// ];

// export const mockEvents: StoreEvent[] = [
//   {
//     event_id: "EVT-1001",
//     visitor_id: "VIS-9485",
//     event_type: "ZONE_ENTER",
//     zone: "Cash Counter",
//     camera_id: "CAM-CASH-01",
//     timestamp: `${TODAY}T10:21:40Z`,
//   },
//   {
//     event_id: "EVT-1002",
//     visitor_id: "VIS-9484",
//     event_type: "ZONE_ENTER",
//     zone: "Maybelline",
//     camera_id: "CAM-BOT-02",
//     timestamp: `${TODAY}T10:20:05Z`,
//   },
//   {
//     event_id: "EVT-1003",
//     visitor_id: "VIS-9483",
//     event_type: "ENTRY",
//     zone: "FOH",
//     camera_id: "CAM-ENT-01",
//     timestamp: `${TODAY}T10:18:22Z`,
//   },
//   {
//     event_id: "EVT-1004",
//     visitor_id: "VIS-9470",
//     event_type: "EXIT",
//     zone: null,
//     camera_id: "CAM-EXT-01",
//     timestamp: `${TODAY}T10:05:00Z`,
//   },
//   {
//     event_id: "EVT-1005",
//     visitor_id: "VIS-9482",
//     event_type: "ZONE_ENTER",
//     zone: "Lakme Skin",
//     camera_id: "CAM-TOP-03",
//     timestamp: `${TODAY}T10:15:00Z`,
//   },
// ];

// export const mockZoneAnalytics: ZoneAnalytics[] = [
//   {
//     zone_name: "Lakme Skin",
//     visitors_count: 342,
//     avg_dwell_seconds: 260,
//     engagement_score: 88,
//     revenue_impact_score: 92,
//   },
//   {
//     zone_name: "Maybelline",
//     visitors_count: 298,
//     avg_dwell_seconds: 210,
//     engagement_score: 82,
//     revenue_impact_score: 85,
//   },
//   {
//     zone_name: "The Face Shop",
//     visitors_count: 245,
//     avg_dwell_seconds: 315,
//     engagement_score: 91,
//     revenue_impact_score: 78,
//   },
//   {
//     zone_name: "Swiss Beauty",
//     visitors_count: 190,
//     avg_dwell_seconds: 180,
//     engagement_score: 75,
//     revenue_impact_score: 70,
//   },
//   {
//     zone_name: "Cash Counter",
//     visitors_count: 410,
//     avg_dwell_seconds: 120,
//     engagement_score: 40,
//     revenue_impact_score: 100,
//   },
// ];

// export const mockAlerts: Alert[] = [
//   {
//     alert_id: "ALT-551",
//     severity: "HIGH",
//     message: "Crowding detected near Cash Counter. 8+ visitors waiting.",
//     zone: "Cash Counter",
//     timestamp: `${TODAY}T10:20:00Z`,
//   },
//   {
//     alert_id: "ALT-552",
//     severity: "MEDIUM",
//     message: "High dwell time anomaly. Visitor stationary for 15+ mins.",
//     zone: "Lakme Skin",
//     timestamp: `${TODAY}T10:12:00Z`,
//   },
//   {
//     alert_id: "ALT-553",
//     severity: "LOW",
//     message: "Low engagement detected at PMU over the last hour.",
//     zone: "PMU",
//     timestamp: `${TODAY}T09:00:00Z`,
//   },
// ];

// // Coordinate system assumes a 1000x600 grid map for the UI
// export const mockLivePositions: LivePosition[] = [
//   { visitor_id: "VIS-9482", x: 740, y: 150, zone: "Lakme Skin" },
//   { visitor_id: "VIS-9483", x: 450, y: 300, zone: "FOH" },
//   { visitor_id: "VIS-9484", x: 220, y: 520, zone: "Maybelline" },
//   { visitor_id: "VIS-9485", x: 880, y: 400, zone: "Cash Counter" },
//   { visitor_id: "VIS-9486", x: 120, y: 150, zone: "EB Korean" },
//   { visitor_id: "VIS-9487", x: 550, y: 350, zone: "Makeup Unit" },
// ];

// export const mockChartData = {
//   hourlyFootfall: [
//     { time: "10:00", visitors: 120 },
//     { time: "11:00", visitors: 280 },
//     { time: "12:00", visitors: 350 },
//     { time: "13:00", visitors: 310 },
//     { time: "14:00", visitors: 420 },
//     { time: "15:00", visitors: 380 },
//     { time: "16:00", visitors: 490 },
//   ],
//   entryVsExit: [
//     { name: "Entries", value: 890 },
//     { name: "Exits", value: 845 },
//   ],
// };

// // ==========================================
// // MOCK API DELAY UTILITY
// // ==========================================

// /**
//  * Simulates network latency for React Query / Service layer
//  * Usage: await withDelay(mockVisitors, 500);
//  */
// export const withDelay = <T>(data: T, ms: number = 400): Promise<T> => {
//   return new Promise((resolve) => setTimeout(() => resolve(data), ms));
// };


// ==========================================
// 1. TYPE DEFINITIONS
// ==========================================

export type ZoneName =
  // Row 1
  | 'EB Korean' | 'The Face Shop' | 'Good Vibes' | 'DermDoc'
  | 'Minimalist' | 'Aqualogica' | 'Lakme Skin' | 'Accessories'
  // Row 2
  | 'Maybelline' | 'Faces Canada' | 'Lakme' | 'Colorbar'
  | 'Swiss Beauty' | 'Renee' | 'Alps Goodness' | 'Streax'
  // Special Areas
  | 'FOH' | 'Makeup Unit' | 'Cash Counter' | 'PMU'
  // System Areas
  | 'ENTRY_DOOR' | 'EXIT_DOOR' | 'TRANSIT';

export type EventType = 'ENTRY' | 'EXIT' | 'ZONE_ENTER' | 'ZONE_EXIT';
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DashboardMetrics {
  total_visitors: number;
  active_visitors: number;
  entries_today: number;
  exits_today: number;
  avg_dwell_time_seconds: number;
  avg_session_duration_seconds: number;
  conversion_rate_percentage: number;
  peak_hour: string;
}

export interface ZoneAnalytics {
  zone_name: ZoneName;
  visitors_count: number;
  avg_dwell_seconds: number;
  engagement_score: number; 
  revenue_impact_score: number; 
}

export interface LiveVisitor {
  visitor_id: string;
  x: number;
  y: number;
  current_zone: ZoneName;
}

export interface LiveEvent {
  event_id: string;
  visitor_id: string;
  event_type: EventType;
  zone: ZoneName;
  timestamp: string;
}

export interface SystemAlert {
  alert_id: string;
  severity: SeverityLevel;
  message: string;
  zone: ZoneName;
  timestamp: string;
}

export interface Visitor {
  visitor_id: string;
  first_seen: string;
  last_seen: string;
  total_visits: number;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface Session {
  session_id: string;
  visitor_id: string;
  start_time: string;
  end_time: string | null;
  total_dwell_seconds: number;
  journey: { zone: ZoneName; duration_seconds: number }[];
}

export interface StoreLayoutZone {
  id: string;
  name: ZoneName;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'BRAND' | 'SPECIAL' | 'UTILITY';
}

export interface StoreLayout {
  width: number;
  height: number;
  zones: StoreLayoutZone[];
}

// ==========================================
// 2. STATIC MOCK DATA
// ==========================================

export const getMockDashboardMetrics = (): DashboardMetrics => ({
  total_visitors: 2845,
  active_visitors: 114,
  entries_today: 2845,
  exits_today: 2731,
  avg_dwell_time_seconds: 645, // ~10.7 minutes
  avg_session_duration_seconds: 920, // ~15.3 minutes
  conversion_rate_percentage: 42.8,
  peak_hour: '18:00 - 19:00',
});

// Provides data for Analytics and Top Zones widgets
export const getMockZoneAnalytics = (): ZoneAnalytics[] => [
  { zone_name: 'Makeup Unit', visitors_count: 850, avg_dwell_seconds: 420, engagement_score: 95, revenue_impact_score: 9.8 },
  { zone_name: 'Cash Counter', visitors_count: 790, avg_dwell_seconds: 180, engagement_score: 88, revenue_impact_score: 10.0 },
  { zone_name: 'Maybelline', visitors_count: 620, avg_dwell_seconds: 240, engagement_score: 82, revenue_impact_score: 8.5 },
  { zone_name: 'Minimalist', visitors_count: 580, avg_dwell_seconds: 310, engagement_score: 89, revenue_impact_score: 9.1 },
  { zone_name: 'Lakme', visitors_count: 540, avg_dwell_seconds: 200, engagement_score: 76, revenue_impact_score: 8.0 },
  { zone_name: 'EB Korean', visitors_count: 490, avg_dwell_seconds: 280, engagement_score: 85, revenue_impact_score: 8.2 },
  { zone_name: 'Swiss Beauty', visitors_count: 410, avg_dwell_seconds: 190, engagement_score: 72, revenue_impact_score: 7.5 },
  { zone_name: 'PMU', visitors_count: 320, avg_dwell_seconds: 600, engagement_score: 98, revenue_impact_score: 9.5 },
];

export const getMockVisitors = (): Visitor[] => [
  { visitor_id: 'VIS_8892', first_seen: '2026-06-02T10:15:00Z', last_seen: '2026-06-02T10:45:00Z', total_visits: 3, status: 'COMPLETED' },
  { visitor_id: 'VIS_8893', first_seen: '2026-06-02T14:20:00Z', last_seen: '2026-06-02T14:40:00Z', total_visits: 1, status: 'COMPLETED' },
  { visitor_id: 'VIS_8894', first_seen: '2026-06-02T14:35:00Z', last_seen: new Date().toISOString(), total_visits: 5, status: 'ACTIVE' },
];

export const getMockSessions = (): Session[] => [
  {
    session_id: 'SESS_1001',
    visitor_id: 'VIS_8892',
    start_time: '2026-06-02T10:15:00Z',
    end_time: '2026-06-02T10:45:00Z',
    total_dwell_seconds: 1800,
    journey: [
      { zone: 'FOH', duration_seconds: 120 },
      { zone: 'Maybelline', duration_seconds: 400 },
      { zone: 'Makeup Unit', duration_seconds: 900 },
      { zone: 'Cash Counter', duration_seconds: 380 }
    ]
  },
  {
    session_id: 'SESS_1002',
    visitor_id: 'VIS_8894',
    start_time: '2026-06-02T14:35:00Z',
    end_time: null,
    total_dwell_seconds: 450,
    journey: [
      { zone: 'Minimalist', duration_seconds: 300 },
      { zone: 'DermDoc', duration_seconds: 150 }
    ]
  }
];

export const getMockAlerts = (): SystemAlert[] => [
  { alert_id: 'ALT_001', severity: 'HIGH', message: 'Queue threshold exceeded (8+ persons)', zone: 'Cash Counter', timestamp: new Date(Date.now() - 120000).toISOString() },
  { alert_id: 'ALT_002', severity: 'MEDIUM', message: 'Dwell anomaly: Visitor stationary for 20+ mins', zone: 'Makeup Unit', timestamp: new Date(Date.now() - 450000).toISOString() },
  { alert_id: 'ALT_003', severity: 'LOW', message: 'Low traffic detected in premium zone', zone: 'Alps Goodness', timestamp: new Date(Date.now() - 3600000).toISOString() },
];

// Generates a 2D spatial layout mapping for your UI
export const getMockStoreLayout = (): StoreLayout => {
  return {
    width: 1200,
    height: 800,
    zones: [
      // Top Row (Y: 50)
      { id: 'z1', name: 'EB Korean', x: 50, y: 50, width: 120, height: 100, type: 'BRAND' },
      { id: 'z2', name: 'The Face Shop', x: 180, y: 50, width: 120, height: 100, type: 'BRAND' },
      { id: 'z3', name: 'Good Vibes', x: 310, y: 50, width: 120, height: 100, type: 'BRAND' },
      { id: 'z4', name: 'DermDoc', x: 440, y: 50, width: 120, height: 100, type: 'BRAND' },
      { id: 'z5', name: 'Minimalist', x: 570, y: 50, width: 120, height: 100, type: 'BRAND' },
      { id: 'z6', name: 'Aqualogica', x: 700, y: 50, width: 120, height: 100, type: 'BRAND' },
      { id: 'z7', name: 'Lakme Skin', x: 830, y: 50, width: 120, height: 100, type: 'BRAND' },
      { id: 'z8', name: 'Accessories', x: 960, y: 50, width: 180, height: 100, type: 'BRAND' },

      // Bottom Row (Y: 650)
      { id: 'z9', name: 'Maybelline', x: 50, y: 650, width: 120, height: 100, type: 'BRAND' },
      { id: 'z10', name: 'Faces Canada', x: 180, y: 650, width: 120, height: 100, type: 'BRAND' },
      { id: 'z11', name: 'Lakme', x: 310, y: 650, width: 120, height: 100, type: 'BRAND' },
      { id: 'z12', name: 'Colorbar', x: 440, y: 650, width: 120, height: 100, type: 'BRAND' },
      { id: 'z13', name: 'Swiss Beauty', x: 570, y: 650, width: 120, height: 100, type: 'BRAND' },
      { id: 'z14', name: 'Renee', x: 700, y: 650, width: 120, height: 100, type: 'BRAND' },
      { id: 'z15', name: 'Alps Goodness', x: 830, y: 650, width: 120, height: 100, type: 'BRAND' },
      { id: 'z16', name: 'Streax', x: 960, y: 650, width: 180, height: 100, type: 'BRAND' },

      // Special Center Areas
      { id: 's1', name: 'FOH', x: 500, y: 250, width: 200, height: 150, type: 'SPECIAL' },
      { id: 's2', name: 'Makeup Unit', x: 200, y: 350, width: 250, height: 200, type: 'SPECIAL' },
      { id: 's3', name: 'PMU', x: 750, y: 350, width: 200, height: 150, type: 'SPECIAL' },
      { id: 's4', name: 'Cash Counter', x: 50, y: 250, width: 120, height: 300, type: 'UTILITY' },
    ]
  };
};

// ==========================================
// 3. DYNAMIC DATA GENERATORS (Polling)
// ==========================================

export const getMockEvents = (): LiveEvent[] => {
  const now = new Date();
  return [
    { event_id: `EVT_${Math.floor(Math.random() * 10000)}`, visitor_id: 'VIS_8901', event_type: 'ENTRY', zone: 'ENTRY_DOOR', timestamp: new Date(now.getTime() - 5000).toISOString() },
    { event_id: `EVT_${Math.floor(Math.random() * 10000)}`, visitor_id: 'VIS_8894', event_type: 'ZONE_ENTER', zone: 'Minimalist', timestamp: new Date(now.getTime() - 15000).toISOString() },
    { event_id: `EVT_${Math.floor(Math.random() * 10000)}`, visitor_id: 'VIS_8890', event_type: 'ZONE_EXIT', zone: 'Cash Counter', timestamp: new Date(now.getTime() - 22000).toISOString() },
    { event_id: `EVT_${Math.floor(Math.random() * 10000)}`, visitor_id: 'VIS_8890', event_type: 'EXIT', zone: 'EXIT_DOOR', timestamp: new Date(now.getTime() - 25000).toISOString() },
  ];
};

export const generateLiveVisitors = (): LiveVisitor[] => {
  const layout = getMockStoreLayout();
  const visitors: LiveVisitor[] = [];
  const totalSimulated = 25; // 25 active shoppers on the floor
  
  for (let i = 0; i < totalSimulated; i++) {
    // 70% chance they are in a specific zone, 30% chance they are in transit
    const inZone = Math.random() > 0.3;
    
    if (inZone) {
      const targetZone = layout.zones[Math.floor(Math.random() * layout.zones.length)];
      visitors.push({
        visitor_id: `VIS_89${i.toString().padStart(2, '0')}`,
        // Jitter coordinates to keep them inside the bounding box
        x: targetZone.x + (Math.random() * targetZone.width),
        y: targetZone.y + (Math.random() * targetZone.height),
        current_zone: targetZone.name,
      });
    } else {
      visitors.push({
        visitor_id: `VIS_89${i.toString().padStart(2, '0')}`,
        // Random map coordinates
        x: Math.floor(Math.random() * layout.width),
        y: Math.floor(Math.random() * layout.height),
        current_zone: 'TRANSIT',
      });
    }
  }
  return visitors;
};


// ==========================================
// 4. ALIAS EXPORTS FOR BACKWARD COMPATIBILITY
// ==========================================
export const getVisitors = getMockVisitors;
export const getSessions = getMockSessions;