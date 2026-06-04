import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Map as MapIcon,
  Users,
  Flame,
  Activity,
  AlertCircle,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Eye,
  EyeOff,
  TrendingUp,
  Clock,
  Percent,
  CheckCircle2,
  Radio,
  LayoutGrid,
} from "lucide-react";

// Shared UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { Button } from "@/shared/components/ui/button";

// API & Hooks (will be swapped for real APIs)
import { useLiveTracking } from "@/hooks/queries/useLiveQueries";
import { useZoneAnalytics } from "@/hooks/queries/useAnalyticsQueries";
import {
  useLiveMetrics,
  useLiveAnomalies,
  useLiveHeatmap,
} from "@/hooks/queries/useStoreQueries";

// ==========================================
// CONSTANTS
// ==========================================
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;
const toPct = (val: number, max: number) => `${(val / max) * 100}%`;

// ==========================================
// MOCK DATA
// ==========================================

// All 20 store zones with realistic layout positions
const MOCK_LAYOUT = {
  zones: [
    // Row 1 — Left block
    { id: "z1", name: "EB Korean", x: 20, y: 20, width: 160, height: 110 },
    { id: "z2", name: "The Face Shop", x: 195, y: 20, width: 160, height: 110 },
    { id: "z3", name: "Good Vibes", x: 370, y: 20, width: 160, height: 110 },
    { id: "z4", name: "DermDoc", x: 545, y: 20, width: 160, height: 110 },
    { id: "z5", name: "Minimalist", x: 720, y: 20, width: 150, height: 110 },
    { id: "z6", name: "Aqualogica", x: 885, y: 20, width: 140, height: 110 },
    { id: "z7", name: "Lakme Skin", x: 1040, y: 20, width: 140, height: 110 },

    // Row 2 — Middle block
    { id: "z8", name: "Accessories", x: 20, y: 150, width: 120, height: 120 },
    { id: "z9", name: "Maybelline", x: 155, y: 150, width: 175, height: 120 },
    {
      id: "z10",
      name: "Faces Canada",
      x: 345,
      y: 150,
      width: 175,
      height: 120,
    },
    { id: "z11", name: "Lakme", x: 535, y: 150, width: 150, height: 120 },
    { id: "z12", name: "Colorbar", x: 700, y: 150, width: 150, height: 120 },
    {
      id: "z13",
      name: "Swiss Beauty",
      x: 865,
      y: 150,
      width: 155,
      height: 120,
    },
    { id: "z14", name: "Renee", x: 1035, y: 150, width: 145, height: 120 },

    // Row 3 — Lower block
    {
      id: "z15",
      name: "Alps Goodness",
      x: 20,
      y: 295,
      width: 165,
      height: 115,
    },
    { id: "z16", name: "Streax", x: 200, y: 295, width: 165, height: 115 },

    // Service / FOH zones — larger bottom strip
    { id: "z17", name: "FOH", x: 20, y: 450, width: 300, height: 130 },
    { id: "z18", name: "Makeup Unit", x: 340, y: 450, width: 290, height: 130 },
    {
      id: "z19",
      name: "Cash Counter",
      x: 650,
      y: 450,
      width: 250,
      height: 130,
    },
    { id: "z20", name: "PMU", x: 920, y: 450, width: 260, height: 130 },
  ],
};

const MOCK_ANALYTICS = [
  {
    zone_name: "Lakme Skin",
    visitors_count: 320,
    avg_dwell_seconds: 1104,
    engagement_score: 87,
    revenue_impact_score: 9.1,
    conversion_rate: 34,
  },
  {
    zone_name: "Maybelline",
    visitors_count: 298,
    avg_dwell_seconds: 910,
    engagement_score: 82,
    revenue_impact_score: 8.6,
    conversion_rate: 28,
  },
  {
    zone_name: "Minimalist",
    visitors_count: 185,
    avg_dwell_seconds: 1325,
    engagement_score: 79,
    revenue_impact_score: 7.4,
    conversion_rate: 31,
  },
  {
    zone_name: "Swiss Beauty",
    visitors_count: 175,
    avg_dwell_seconds: 990,
    engagement_score: 71,
    revenue_impact_score: 6.8,
    conversion_rate: 22,
  },
  {
    zone_name: "Good Vibes",
    visitors_count: 210,
    avg_dwell_seconds: 890,
    engagement_score: 68,
    revenue_impact_score: 6.2,
    conversion_rate: 19,
  },
  {
    zone_name: "Cash Counter",
    visitors_count: 148,
    avg_dwell_seconds: 252,
    engagement_score: 95,
    revenue_impact_score: 9.8,
    conversion_rate: 88,
  },
  {
    zone_name: "Faces Canada",
    visitors_count: 142,
    avg_dwell_seconds: 820,
    engagement_score: 64,
    revenue_impact_score: 5.9,
    conversion_rate: 18,
  },
  {
    zone_name: "Colorbar",
    visitors_count: 138,
    avg_dwell_seconds: 780,
    engagement_score: 61,
    revenue_impact_score: 5.5,
    conversion_rate: 17,
  },
  {
    zone_name: "DermDoc",
    visitors_count: 125,
    avg_dwell_seconds: 960,
    engagement_score: 73,
    revenue_impact_score: 6.1,
    conversion_rate: 24,
  },
  {
    zone_name: "Aqualogica",
    visitors_count: 118,
    avg_dwell_seconds: 660,
    engagement_score: 57,
    revenue_impact_score: 4.8,
    conversion_rate: 14,
  },
  {
    zone_name: "Lakme",
    visitors_count: 115,
    avg_dwell_seconds: 740,
    engagement_score: 66,
    revenue_impact_score: 5.7,
    conversion_rate: 20,
  },
  {
    zone_name: "Makeup Unit",
    visitors_count: 112,
    avg_dwell_seconds: 1560,
    engagement_score: 84,
    revenue_impact_score: 8.2,
    conversion_rate: 42,
  },
  {
    zone_name: "Renee",
    visitors_count: 105,
    avg_dwell_seconds: 700,
    engagement_score: 59,
    revenue_impact_score: 4.5,
    conversion_rate: 15,
  },
  {
    zone_name: "The Face Shop",
    visitors_count: 98,
    avg_dwell_seconds: 640,
    engagement_score: 55,
    revenue_impact_score: 4.2,
    conversion_rate: 13,
  },
  {
    zone_name: "EB Korean",
    visitors_count: 92,
    avg_dwell_seconds: 580,
    engagement_score: 52,
    revenue_impact_score: 3.9,
    conversion_rate: 11,
  },
  {
    zone_name: "Alps Goodness",
    visitors_count: 78,
    avg_dwell_seconds: 510,
    engagement_score: 48,
    revenue_impact_score: 3.4,
    conversion_rate: 10,
  },
  {
    zone_name: "Streax",
    visitors_count: 65,
    avg_dwell_seconds: 440,
    engagement_score: 43,
    revenue_impact_score: 2.8,
    conversion_rate: 8,
  },
  {
    zone_name: "Accessories",
    visitors_count: 62,
    avg_dwell_seconds: 400,
    engagement_score: 40,
    revenue_impact_score: 2.6,
    conversion_rate: 7,
  },
  {
    zone_name: "FOH",
    visitors_count: 55,
    avg_dwell_seconds: 200,
    engagement_score: 35,
    revenue_impact_score: 2.1,
    conversion_rate: 5,
  },
  {
    zone_name: "PMU",
    visitors_count: 40,
    avg_dwell_seconds: 1800,
    engagement_score: 88,
    revenue_impact_score: 7.8,
    conversion_rate: 38,
  },
];

const MOCK_LIVE_VISITORS = [
  { visitor_id: "Customer-47", x: 1060, y: 65, zone: "Lakme Skin" },
  { visitor_id: "Customer-23", x: 430, y: 65, zone: "Good Vibes" },
  { visitor_id: "Customer-89", x: 940, y: 210, zone: "Swiss Beauty" },
  { visitor_id: "Customer-15", x: 785, y: 210, zone: "Colorbar" },
  { visitor_id: "Customer-62", x: 740, y: 510, zone: "Cash Counter" },
  { visitor_id: "Customer-31", x: 260, y: 210, zone: "Maybelline" },
  { visitor_id: "Customer-78", x: 610, y: 65, zone: "DermDoc" },
  { visitor_id: "Customer-12", x: 490, y: 210, zone: "Lakme" },
  { visitor_id: "Customer-55", x: 430, y: 510, zone: "Makeup Unit" },
  { visitor_id: "Customer-9", x: 80, y: 510, zone: "FOH" },
];

const MOCK_ALERTS = [
  {
    alert_id: "a1",
    severity: "HIGH",
    message: "Queue threshold exceeded (8+ persons)",
    zone: "Cash Counter",
    timestamp: new Date(Date.now() - 120000).toISOString(),
  },
  {
    alert_id: "a2",
    severity: "MEDIUM",
    message: "Dwell anomaly — visitor stationary 20+ min",
    zone: "Makeup Unit",
    timestamp: new Date(Date.now() - 900000).toISOString(),
  },
  {
    alert_id: "a3",
    severity: "LOW",
    message: "Camera PMU-02 offline",
    zone: "PMU",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
];

const MOCK_ACTIVITY = [
  {
    id: "ev1",
    text: "Customer-47 entered store",
    time: "just now",
    type: "entry",
  },
  {
    id: "ev2",
    text: "Customer-15 moved to Colorbar",
    time: "1m ago",
    type: "move",
  },
  {
    id: "ev3",
    text: "Customer-23 reached Makeup Unit",
    time: "2m ago",
    type: "move",
  },
  { id: "ev4", text: "Customer-9 exited store", time: "3m ago", type: "exit" },
  {
    id: "ev5",
    text: "Customer-62 reached Cash Counter",
    time: "4m ago",
    type: "move",
  },
  {
    id: "ev6",
    text: "Customer-31 entered store",
    time: "5m ago",
    type: "entry",
  },
  {
    id: "ev7",
    text: "Customer-55 moved to Makeup Unit",
    time: "7m ago",
    type: "move",
  },
];

// ==========================================
// TRAFFIC COLOR LOGIC
// ==========================================
const getTrafficLevel = (
  count: number,
  max: number,
): "low" | "medium" | "high" | "crowded" => {
  const ratio = count / max;
  if (ratio < 0.25) return "low";
  if (ratio < 0.5) return "medium";
  if (ratio < 0.75) return "high";
  return "crowded";
};

const TRAFFIC_COLORS: Record<
  string,
  { fill: string; border: string; badge: string }
> = {
  low: {
    fill: "rgba(16,185,129,0.12)",
    border: "#10b981",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  },
  medium: {
    fill: "rgba(234,179,8,0.12)",
    border: "#eab308",
    badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  },
  high: {
    fill: "rgba(249,115,22,0.12)",
    border: "#f97316",
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  },
  crowded: {
    fill: "rgba(239,68,68,0.14)",
    border: "#ef4444",
    badge: "bg-red-500/15 text-red-400 border-red-500/25",
  },
};

const HEATMAP_COLORS = [
  "#1e40af", // blue   (lowest)
  "#16a34a", // green
  "#ca8a04", // yellow
  "#ea580c", // orange
  "#dc2626", // red    (highest)
];

const getHeatmapFill = (count: number, max: number): string => {
  const ratio = count / max;
  const idx = Math.min(
    Math.floor(ratio * HEATMAP_COLORS.length),
    HEATMAP_COLORS.length - 1,
  );
  const opacity = 0.15 + ratio * 0.55;
  const hex = HEATMAP_COLORS[idx];
  // Convert hex to rgba manually — avoids CSS variable dependency
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
};

const fmtDwell = (sec: number) => `${Math.floor(sec / 60)}m ${sec % 60}s`;
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ==========================================
// SUB-COMPONENTS
// ==========================================

// Sidebar stat card
const StatTile = ({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) => (
  <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2.5">
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `${color}20` }}
    >
      <Icon className="h-4 w-4" style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="truncate text-sm font-bold text-white">{value}</p>
    </div>
  </div>
);

// Severity dot + badge
const SeverityDot = ({ severity }: { severity: string }) => {
  const map: Record<string, string> = {
    HIGH: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]",
    MEDIUM: "bg-amber-500",
    LOW: "bg-blue-500",
  };
  return (
    <span
      className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${map[severity] ?? map.LOW}`}
    />
  );
};

// Map toolbar button
const ToolBtn = ({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    title={title}
    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-400 transition-colors hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-400"
  >
    {children}
  </button>
);

// ==========================================
// STORE LEGEND
// ==========================================
const StoreLegend = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
    {(["low", "medium", "high", "crowded"] as const).map((lvl) => (
      <div
        key={lvl}
        className="flex items-center gap-1.5 text-[11px] capitalize text-slate-400"
      >
        <span
          className="inline-block h-2.5 w-2.5 rounded-sm border"
          style={{
            backgroundColor: TRAFFIC_COLORS[lvl].fill,
            borderColor: TRAFFIC_COLORS[lvl].border,
          }}
        />
        {lvl}
      </div>
    ))}
    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
      Live visitor
    </div>
  </div>
);

// ==========================================
// ZONE TOOLTIP OVERLAY
// ==========================================
const ZoneTooltip = ({
  zone,
  analytics,
}: {
  zone: { name: string };
  analytics: typeof MOCK_ANALYTICS;
}) => {
  const data = analytics.find((a) => a.zone_name === zone.name);
  if (!data) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      // Position above the zone label — absolute within zone div
      className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 -translate-x-1/2 w-44 rounded-xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md"
      style={{ minWidth: 160 }}
    >
      <p className="mb-2 text-xs font-semibold text-white">{data.zone_name}</p>
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-500">Visitors</span>
          <span className="font-medium">{data.visitors_count}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-500">Avg Dwell</span>
          <span className="font-medium">
            {fmtDwell(data.avg_dwell_seconds)}
          </span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-500">Engagement</span>
          <span className="font-medium text-indigo-400">
            {data.engagement_score}%
          </span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-500">Conversion</span>
          <span className="font-medium text-emerald-400">
            {data.conversion_rate}%
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ==========================================
// MAIN PAGE
// ==========================================
export default function StoreMapPage() {
  // ── State ──
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  const [isTrackingLive, setIsTrackingLive] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Real-time API Polling
  const { data: metricsData } = useLiveMetrics("STORE_1");
  const { data: anomaliesData } = useLiveAnomalies("STORE_1");
  const { data: heatmapData } = useLiveHeatmap("STORE_1");

  // Map backend anomalies to your frontend UI array
  const alerts = anomaliesData?.anomalies || [];

  // Map backend metrics to your stats tiles
  const totalActive = metricsData?.unique_visitors || 0;
  const currentQueue = metricsData?.current_queue_depth || 0;
  const overallConversion = metricsData?.conversion_rate || 0.0;
  const abandonment = metricsData?.abandonment_rate || 0.0;

  // ── Data Fetching (falls back to mock) ──
  // ✅ FIXED ORDER
  const { data: layoutRaw, isLoading: loadingLayout } = useQuery({
    queryKey: ["store-layout"],
    queryFn: async () => MOCK_LAYOUT, // swap: import { getStoreLayout } from "@/services/api"
  });
  const { data: analyticsRaw } = useZoneAnalytics();
  const { data: liveRaw } = useLiveTracking(isTrackingLive);

  // 1. DECLARE FALLBACKS FIRST
  const layout = layoutRaw ?? MOCK_LAYOUT;
  // Use safe array fallback for analytics to prevent .map crashes if API fails
  const analytics = Array.isArray(analyticsRaw) ? analyticsRaw : MOCK_ANALYTICS;
  // ✅ FIXED
  const visitors = Array.isArray(liveRaw)
    ? liveRaw
    : isTrackingLive
      ? MOCK_LIVE_VISITORS
      : [];

  // 2. ── Derived Data (Now these can safely read 'analytics') ──
  const maxVisitors = useMemo(
    () => Math.max(...analytics.map((a) => a.visitors_count), 1),
    [analytics],
  );

  const selectedZoneData = useMemo(
    () =>
      selectedZone
        ? (analytics.find((a) => a.zone_name === selectedZone) ?? null)
        : null,
    [selectedZone, analytics],
  );

  const topZones = useMemo(
    () =>
      [...analytics]
        .sort((a, b) => b.visitors_count - a.visitors_count)
        .slice(0, 5),
    [analytics],
  );

  // 3. Declare this LAST because it depends on topZones
  const topZone = topZones[0];

  // ── Pan handlers ──
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-zone]")) return;
      setIsPanning(true);
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    },
    [pan],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.mx),
        y: panStart.current.py + (e.clientY - panStart.current.my),
      });
    },
    [isPanning],
  );

  const onMouseUp = useCallback(() => setIsPanning(false), []);

  // ── Wheel zoom ──
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(3, Math.max(0.4, z - e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (loadingLayout) {
    return (
      <div className="flex h-[calc(100vh-80px)] gap-4 p-1">
        <Skeleton className="flex-[3] rounded-xl bg-slate-800/60" />
        <Skeleton className="w-72 rounded-xl bg-slate-800/60" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col gap-4 pb-4 lg:flex-row">
      {/* ═══════════════════════════════════════════
          LEFT — MAP CANVAS
      ═══════════════════════════════════════════ */}
      <div className="flex flex-[3] flex-col gap-3 overflow-hidden min-w-0">
        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-slate-900/70 px-4 py-2.5 backdrop-blur-sm">
          {/* Left: title */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15">
              <MapIcon className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">
                Live Floor Plan
              </p>
              <p className="text-[11px] text-slate-400">
                Real-time spatial tracking
              </p>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live tracking toggle */}
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-slate-800/60 px-3 py-1.5">
              <Switch
                id="live-mode"
                checked={isTrackingLive}
                onCheckedChange={setIsTrackingLive}
                className="data-[state=checked]:bg-emerald-600"
              />
              <label
                htmlFor="live-mode"
                className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-300"
              >
                <Radio
                  className={`h-3.5 w-3.5 ${isTrackingLive ? "text-emerald-400" : "text-slate-500"}`}
                />
                Live
              </label>
            </div>

            {/* Heatmap toggle */}
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-slate-800/60 px-3 py-1.5">
              <Switch
                id="heatmap-mode"
                checked={isHeatmapMode}
                onCheckedChange={setIsHeatmapMode}
                className="data-[state=checked]:bg-orange-600"
              />
              <label
                htmlFor="heatmap-mode"
                className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-300"
              >
                <Flame
                  className={`h-3.5 w-3.5 ${isHeatmapMode ? "text-orange-400" : "text-slate-500"}`}
                />
                Heatmap
              </label>
            </div>

            {/* Analytics panel toggle */}
            <button
              onClick={() => setShowAnalytics((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-indigo-500/30 hover:text-indigo-400"
            >
              {showAnalytics ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              Panel
            </button>

            {/* Zoom controls */}
            <div className="flex items-center gap-1">
              <ToolBtn
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                title="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </ToolBtn>
              <ToolBtn
                onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
                title="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </ToolBtn>
              <ToolBtn onClick={resetView} title="Reset view">
                <RotateCcw className="h-3.5 w-3.5" />
              </ToolBtn>
            </div>

            {/* Zoom level badge */}
            <span className="rounded-md bg-slate-800/60 border border-white/[0.07] px-2 py-1 text-[11px] font-mono text-slate-400">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden rounded-xl border border-white/[0.07] bg-[#080d18]"
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Blueprint grid background */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Transformed map */}
          <div
            className="absolute"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              // Gives the div a fixed intrinsic size matching map coords
              width: MAP_WIDTH,
              height: MAP_HEIGHT,
              top: "50%",
              left: "50%",
              marginTop: -MAP_HEIGHT / 2,
              marginLeft: -MAP_WIDTH / 2,
            }}
          >
            {/* ── Zone Rectangles ── */}
            {layout.zones.map((zone) => {
              const isSelected = selectedZone === zone.name;
              const isHovered = hoveredZone === zone.name;
              const zData = analytics.find((a) => a.zone_name === zone.name);
              const level = zData
                ? getTrafficLevel(zData.visitors_count, maxVisitors)
                : "low";
              const colors = TRAFFIC_COLORS[level];

              const bgColor = isHeatmapMode
                ? zData
                  ? getHeatmapFill(zData.visitors_count, maxVisitors)
                  : "rgba(30,64,175,0.1)"
                : isSelected || isHovered
                  ? "rgba(99,102,241,0.18)"
                  : colors.fill;

              const borderColor = isSelected
                ? "#6366f1"
                : isHovered
                  ? "#818cf8"
                  : isHeatmapMode
                    ? "rgba(255,255,255,0.08)"
                    : colors.border;

              return (
                <div
                  key={zone.id}
                  data-zone={zone.name}
                  onClick={() => setSelectedZone(isSelected ? null : zone.name)}
                  onMouseEnter={() => setHoveredZone(zone.name)}
                  onMouseLeave={() => setHoveredZone(null)}
                  className="absolute flex cursor-pointer flex-col items-center justify-center overflow-visible rounded-lg transition-all duration-200"
                  style={{
                    left: zone.x,
                    top: zone.y,
                    width: zone.width,
                    height: zone.height,
                    backgroundColor: bgColor,
                    border: `1.5px solid ${borderColor}`,
                    boxShadow: isSelected
                      ? "0 0 0 3px rgba(99,102,241,0.25), inset 0 0 20px rgba(99,102,241,0.08)"
                      : isHovered
                        ? "0 0 0 2px rgba(99,102,241,0.15)"
                        : "none",
                    zIndex: isSelected ? 20 : isHovered ? 10 : 1,
                  }}
                >
                  {/* Zone label */}
                  <span
                    className="select-none px-1 text-center text-[10px] font-semibold leading-tight"
                    style={{
                      color: isSelected || isHovered ? "#a5b4fc" : "#94a3b8",
                    }}
                  >
                    {zone.name}
                  </span>

                  {/* Visitor count badge */}
                  {zData && (
                    <span
                      className="mt-1 select-none rounded px-1.5 py-0.5 text-[9px] font-bold"
                      style={{
                        backgroundColor: `${borderColor}25`,
                        color: borderColor,
                      }}
                    >
                      {zData.visitors_count}
                    </span>
                  )}

                  {/* Tooltip — shown on hover when not in heatmap mode */}
                  <AnimatePresence>
                    {(isHovered || isSelected) && !isHeatmapMode && (
                      <ZoneTooltip
                        zone={zone}
                        analytics={analytics as typeof MOCK_ANALYTICS}
                      />
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* ── Live Visitor Dots ── */}
            <AnimatePresence>
              {isTrackingLive &&
                (Array.isArray(visitors) ? visitors : [] as typeof MOCK_LIVE_VISITORS).map((v) => (
                  <motion.div
                    key={v.visitor_id}
                    layout
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                    className="group absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-crosshair"
                    style={{ left: v.x, top: v.y }}
                  >
                    {/* Glow ring */}
                    <span className="absolute inset-0 -m-1.5 animate-ping rounded-full bg-emerald-400 opacity-30" />
                    {/* Dot */}
                    <span className="relative block h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-900/95 px-2 py-1 text-[10px] text-white opacity-0 shadow-xl backdrop-blur-sm transition-opacity group-hover:opacity-100">
                      <p className="font-semibold">{v.visitor_id}</p>
                      <p className="text-slate-400">{v.zone}</p>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-slate-900/60 px-4 py-2 backdrop-blur-sm">
          <StoreLegend />
          {isHeatmapMode && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Density:</span>
              <div className="flex h-3 w-24 overflow-hidden rounded-full">
                {HEATMAP_COLORS.map((c, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-slate-500">Low → High</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          RIGHT — ANALYTICS SIDEBAR
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.22 }}
            className="flex w-full flex-col gap-3 overflow-y-auto lg:w-72 xl:w-80"
            style={{ scrollbarWidth: "none" }}
          >
            {/* ── Selected Zone Details ── */}
            <AnimatePresence mode="wait">
              {selectedZoneData ? (
                <motion.div
                  key="zone-detail"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <Card className="border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-sm">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm font-bold text-indigo-300">
                            {selectedZoneData.zone_name}
                          </CardTitle>
                          <CardDescription className="text-[11px] text-slate-500">
                            Selected zone analytics
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedZone(null)}
                          className="h-6 px-2 text-[10px] text-slate-400 hover:text-white"
                        >
                          Clear
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2 px-4 pb-4">
                      {[
                        {
                          label: "Visitors",
                          value: String(selectedZoneData.visitors_count),
                        },
                        {
                          label: "Avg Dwell",
                          value: fmtDwell(selectedZoneData.avg_dwell_seconds),
                        },
                        {
                          label: "Engagement",
                          value: `${selectedZoneData.engagement_score}%`,
                        },
                        {
                          label: "Impact",
                          value: `${selectedZoneData.revenue_impact_score}/10`,
                        },
                        {
                          label: "Conversion",
                          value: `${selectedZoneData.conversion_rate}%`,
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
                        >
                          <p className="text-[10px] uppercase tracking-wider text-slate-500">
                            {label}
                          </p>
                          <p className="mt-0.5 text-base font-bold text-white">
                            {value}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="rounded-xl border border-white/[0.07] bg-slate-900/60 px-4 py-3 text-center">
                    <LayoutGrid className="mx-auto mb-1.5 h-5 w-5 text-indigo-400 opacity-60" />
                    <p className="text-[11px] text-slate-500">
                      Click a zone for detailed analytics
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Live Stats ── */}
            <Card className="border border-white/[0.07] bg-slate-900/60 backdrop-blur-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  Live Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 px-4 pb-4">
                <StatTile
                  label="Active Visitors"
                  value={String(totalActive)}
                  icon={Users}
                  color="#10b981"
                />
                <StatTile
                  label="Top Zone"
                  value={topZone?.zone_name ?? "—"}
                  icon={Flame}
                  color="#f97316"
                />
                <StatTile
                  label="Peak Engagement"
                  value={`${topZone?.engagement_score ?? 0}%`}
                  icon={TrendingUp}
                  color="#6366f1"
                />
                <StatTile
                  label="Avg Dwell (store)"
                  value={fmtDwell(
                    Math.round(
                      analytics.reduce((s, a) => s + a.avg_dwell_seconds, 0) /
                        analytics.length,
                    ),
                  )}
                  icon={Clock}
                  color="#f59e0b"
                />
                <StatTile
                  label="Overall Conversion"
                  value={`${(analytics.reduce((s, a) => s + a.conversion_rate, 0) / analytics.length).toFixed(1)}%`}
                  icon={Percent}
                  color="#ec4899"
                />
              </CardContent>
            </Card>

            {/* ── Zone Leaderboard ── */}
            <Card className="border border-white/[0.07] bg-slate-900/60 backdrop-blur-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <Flame className="h-3.5 w-3.5 text-orange-400" />
                  Top Zones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 px-4 pb-4">
                {topZones.map((zone, idx) => (
                  <div
                    key={zone.zone_name}
                    onClick={() => setSelectedZone(zone.zone_name)}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          idx === 0
                            ? "bg-orange-500/20 text-orange-400"
                            : idx === 1
                              ? "bg-slate-600/50 text-slate-300"
                              : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-200">
                        {zone.zone_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      {zone.visitors_count}
                      <Users className="h-3 w-3 text-slate-600" />
                      <ChevronRight className="h-3 w-3 text-slate-700" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* ── Live Activity Feed ── */}
            <Card className="border border-white/[0.07] bg-slate-900/60 backdrop-blur-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <Radio className="h-3.5 w-3.5 text-indigo-400" />
                  Activity Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 px-4 pb-4">
                {MOCK_ACTIVITY.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start gap-2.5 border-b border-white/[0.04] py-2.5 last:border-0"
                  >
                    <span
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                        ev.type === "entry"
                          ? "bg-emerald-400"
                          : ev.type === "exit"
                            ? "bg-red-400"
                            : "bg-indigo-400"
                      }`}
                    />
                    <div>
                      <p className="text-[11px] font-medium text-slate-300">
                        {ev.text}
                      </p>
                      <p className="text-[10px] text-slate-600">{ev.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* ── Alerts Panel ── */}
            <Card className="border border-red-900/30 bg-red-950/10 backdrop-blur-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-red-400">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5" />
                    System Alerts
                  </span>
                  {alerts.length > 0 && (
                    <Badge className="animate-pulse bg-red-600/80 px-1.5 py-0 text-[10px] text-white">
                      {alerts.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 px-4 pb-4">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center py-4 text-center">
                    <CheckCircle2 className="mb-1.5 h-6 w-6 text-emerald-500 opacity-50" />
                    <p className="text-xs text-slate-500">All systems normal</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.alert_id}
                      className="flex cursor-pointer items-start gap-3 border-b border-white/[0.04] py-2.5 transition-colors hover:bg-white/[0.02] last:border-0"
                      onClick={() => setSelectedZone(alert.zone)}
                    >
                      <SeverityDot severity={alert.severity} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-200">
                          {alert.message}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-white/10 bg-white/[0.04] px-1.5 py-0 text-[10px] text-slate-400"
                          >
                            {alert.zone}
                          </Badge>
                          <span className="text-[10px] text-slate-600">
                            {fmtTime(alert.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
