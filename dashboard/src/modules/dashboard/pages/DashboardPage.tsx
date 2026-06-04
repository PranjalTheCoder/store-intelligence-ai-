import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import {
  Users,
  Activity,
  Percent,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  LogIn,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Timer,
  RefreshCw,
  Zap,
  Star,
  ShoppingCart,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

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
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

// Hooks (Using the API layer we built)
import { useDashboardMetrics } from "@/hooks/queries/useDashboardQueries";
import { useZoneAnalytics } from "@/hooks/queries/useAnalyticsQueries";
import { useLiveEvents } from "@/hooks/queries/useLiveQueries";

// ==========================================
// ANIMATION VARIANTS
// ==========================================
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5 } },
};

// ==========================================
// MOCK DATA
// ==========================================
const hourlyData = [
  { time: "09:00", visitors: 85, entries: 60, exits: 25 },
  { time: "10:00", visitors: 120, entries: 80, exits: 40 },
  { time: "11:00", visitors: 280, entries: 190, exits: 90 },
  { time: "12:00", visitors: 450, entries: 250, exits: 180 },
  { time: "13:00", visitors: 510, entries: 210, exits: 290 },
  { time: "14:00", visitors: 420, entries: 180, exits: 220 },
  { time: "15:00", visitors: 380, entries: 150, exits: 170 },
  { time: "16:00", visitors: 490, entries: 220, exits: 160 },
  { time: "17:00", visitors: 610, entries: 280, exits: 180 },
  { time: "18:00", visitors: 780, entries: 350, exits: 200 },
  { time: "19:00", visitors: 520, entries: 120, exits: 420 },
];

const dwellData = [
  { zone: "Lakme Skin", avgDwell: 18, visitors: 320 },
  { zone: "Good Vibes", avgDwell: 14, visitors: 210 },
  { zone: "Minimalist", avgDwell: 22, visitors: 185 },
  { zone: "Aqualogica", avgDwell: 11, visitors: 140 },
  { zone: "Swiss Beauty", avgDwell: 16, visitors: 175 },
  { zone: "Alps Goodness", avgDwell: 9, visitors: 90 },
];

const funnelData = [
  { stage: "Entered", value: 1240, pct: 100 },
  { stage: "Engaged", value: 890, pct: 72 },
  { stage: "Interacted", value: 540, pct: 44 },
  { stage: "Checkout", value: 210, pct: 17 },
  { stage: "Purchased", value: 148, pct: 12 },
];

const topZones = [
  {
    rank: 1,
    zone: "Lakme Skin",
    visitors: 320,
    dwell: "18m 24s",
    engagement: 87,
    conversion: 34,
  },
  {
    rank: 2,
    zone: "Maybelline",
    visitors: 298,
    dwell: "15m 10s",
    engagement: 82,
    conversion: 28,
  },
  {
    rank: 3,
    zone: "Minimalist",
    visitors: 185,
    dwell: "22m 05s",
    engagement: 79,
    conversion: 31,
  },
  {
    rank: 4,
    zone: "Swiss Beauty",
    visitors: 175,
    dwell: "16m 30s",
    engagement: 71,
    conversion: 22,
  },
  {
    rank: 5,
    zone: "Good Vibes",
    visitors: 210,
    dwell: "14m 50s",
    engagement: 68,
    conversion: 19,
  },
  {
    rank: 6,
    zone: "Cash Counter",
    visitors: 148,
    dwell: "4m 12s",
    engagement: 95,
    conversion: 88,
  },
];

const mockAlerts = [
  {
    id: 1,
    severity: "HIGH",
    message: "Queue threshold exceeded (8+ persons)",
    zone: "Cash Counter",
    time: "2m ago",
  },
  {
    id: 2,
    severity: "MEDIUM",
    message: "Dwell anomaly: Visitor stationary 20+ min",
    zone: "Makeup Unit",
    time: "15m ago",
  },
  {
    id: 3,
    severity: "LOW",
    message: "Camera PMU-02 offline",
    zone: "PMU",
    time: "1h ago",
  },
];

const mockEvents = [
  {
    id: "e1",
    visitor_id: "Customer-47",
    event_type: "ENTRY",
    zone: "Lakme Skin",
    camera: "CAM-01",
    timestamp: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: "e2",
    visitor_id: "Customer-23",
    event_type: "EXIT",
    zone: "Minimalist",
    camera: "CAM-03",
    timestamp: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: "e3",
    visitor_id: "Customer-89",
    event_type: "ENTRY",
    zone: "Swiss Beauty",
    camera: "CAM-05",
    timestamp: new Date(Date.now() - 180000).toISOString(),
  },
  {
    id: "e4",
    visitor_id: "Customer-15",
    event_type: "DWELL",
    zone: "Maybelline",
    camera: "CAM-07",
    timestamp: new Date(Date.now() - 240000).toISOString(),
  },
  {
    id: "e5",
    visitor_id: "Customer-62",
    event_type: "EXIT",
    zone: "Cash Counter",
    camera: "CAM-02",
    timestamp: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: "e6",
    visitor_id: "Customer-31",
    event_type: "ENTRY",
    zone: "Good Vibes",
    camera: "CAM-04",
    timestamp: new Date(Date.now() - 360000).toISOString(),
  },
  {
    id: "e7",
    visitor_id: "Customer-78",
    event_type: "ENTRY",
    zone: "DermDoc",
    camera: "CAM-06",
    timestamp: new Date(Date.now() - 420000).toISOString(),
  },
];

const mockMetrics = {
  total_visitors: 1842,
  active_visitors: 124,
  entries_today: 1024,
  exits_today: 900,
  avg_dwell_time_seconds: 924,
  avg_session_duration_seconds: 1380,
  conversion_rate_percentage: 11.9,
  peak_hour: "6–7 PM",
};

const mockZones = [
  { zone_name: "Lakme Skin", visitors_count: 320 },
  { zone_name: "Maybelline", visitors_count: 298 },
  { zone_name: "Good Vibes", visitors_count: 210 },
  { zone_name: "Minimalist", visitors_count: 185 },
  { zone_name: "Swiss Beauty", visitors_count: 175 },
];

// ==========================================
// HELPERS
// ==========================================
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
};

const ZONE_COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff"];

// ==========================================
// ANIMATED COUNT-UP
// ==========================================
function CountUp({
  target,
  prefix = "",
  suffix = "",
}: {
  target: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: 1800, bounce: 0 });
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) motionValue.set(target);
  }, [inView, target, motionValue]);

  useEffect(() => {
    return spring.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent =
          prefix + Math.round(v).toLocaleString() + suffix;
      }
    });
  }, [spring, prefix, suffix]);

  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  );
}

// ==========================================
// MINI SPARKLINE
// ==========================================
function Sparkline({ color = "#6366f1" }: { color?: string }) {
  const data = [4, 7, 5, 9, 6, 11, 8, 13, 10, 14];
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart
        data={data.map((v, i) => ({ v, i }))}
        margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
      >
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ==========================================
// KPI CARD
// ==========================================
interface KpiCardProps {
  title: string;
  value: number;
  format?: "number" | "time" | "percent";
  prefix?: string;
  suffix?: string;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: string;
  accentColor: string;
  sparkColor: string;
}

const KpiCard = ({
  title,
  value,
  format = "number",
  prefix = "",
  suffix = "",
  icon: Icon,
  trend,
  trendValue,
  accentColor,
  sparkColor,
}: KpiCardProps) => {
  const displayValue =
    format === "time"
      ? formatTime(value)
      : format === "percent"
        ? `${value}%`
        : undefined;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <Card className="relative overflow-hidden border border-white/5 bg-slate-900/60 backdrop-blur-sm">
        {/* Accent glow */}
        <div
          className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-20 blur-2xl"
          style={{ backgroundColor: accentColor }}
        />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-medium uppercase tracking-widest text-slate-400">
            {title}
          </CardTitle>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: accentColor }} />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="text-2xl font-bold tracking-tight text-white">
            {displayValue ?? (
              <CountUp target={value} prefix={prefix} suffix={suffix} />
            )}
          </div>
          {trend && (
            <p
              className={`mt-0.5 flex items-center gap-0.5 text-xs font-medium ${
                trend === "up" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {trend === "up" ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {trendValue}
            </p>
          )}
          <div className="mt-2 -mx-1">
            <Sparkline color={sparkColor} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ==========================================
// PERFORMANCE CARD
// ==========================================
const PerformanceCard = ({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
}) => (
  <motion.div
    variants={itemVariants}
    whileHover={{ y: -3, transition: { duration: 0.2 } }}
  >
    <Card className="border border-white/5 bg-slate-900/60 backdrop-blur-sm">
      <CardContent className="flex items-center gap-4 py-5 px-5">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">
            {label}
          </p>
          <p className="text-lg font-bold text-white leading-tight">{value}</p>
          <p className="text-xs text-slate-400">{sub}</p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// ==========================================
// CUSTOM TOOLTIP
// ==========================================
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-800/90 backdrop-blur-sm px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-slate-300">{label}</p>
      {payload.map((p: any) => (
        <p
          key={p.dataKey}
          style={{ color: p.color }}
          className="flex items-center gap-1.5"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          {p.name}: <span className="font-medium text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ==========================================
// ALERT SEVERITY BADGE
// ==========================================
const SeverityBadge = ({ severity }: { severity: string }) => {
  const map: Record<string, string> = {
    HIGH: "bg-red-500/15 text-red-400 border-red-500/20",
    MEDIUM: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    LOW: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-1.5 py-0 font-semibold ${map[severity] ?? map.LOW}`}
    >
      {severity}
    </Badge>
  );
};

// ==========================================
// EVENT TYPE BADGE
// ==========================================
const EventBadge = ({ type }: { type: string }) => {
  const map: Record<string, string> = {
    ENTRY: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    EXIT: "bg-red-500/15 text-red-400 border-red-500/20",
    DWELL: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-1.5 py-0 font-semibold ${map[type] ?? map.DWELL}`}
    >
      {type}
    </Badge>
  );
};

// ==========================================
// CONVERSION FUNNEL
// ==========================================
const ConversionFunnel = () => (
  <div className="space-y-2 py-1">
    {funnelData.map((item, i) => (
      <div key={item.stage}>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-300">{item.stage}</span>
          <span className="text-slate-400">
            {item.value.toLocaleString()} ({item.pct}%)
          </span>
        </div>
        <div className="h-7 w-full overflow-hidden rounded-md bg-slate-800/80">
          <motion.div
            className="h-full rounded-md"
            style={{
              width: `${item.pct}%`,
              background: `linear-gradient(90deg, #6366f1 0%, #818cf8 100%)`,
              opacity: 1 - i * 0.12,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${item.pct}%` }}
            transition={{ duration: 0.9, delay: i * 0.12, ease: "easeOut" }}
          />
        </div>
      </div>
    ))}
  </div>
);

// ==========================================
// DASHBOARD SKELETON
// ==========================================
const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <Skeleton className="h-9 w-64 bg-slate-800" />
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array(4)
        .fill(0)
        .map((_, i) => (
          <Skeleton key={i} className="h-32 w-full bg-slate-800 rounded-xl" />
        ))}
    </div>
    <div className="grid gap-4 grid-cols-1 md:grid-cols-12">
      <Skeleton className="md:col-span-8 h-72 bg-slate-800 rounded-xl" />
      <Skeleton className="md:col-span-4 h-72 bg-slate-800 rounded-xl" />
    </div>
  </div>
);

// ==========================================
// MAIN DASHBOARD PAGE
// ==========================================
export default function DashboardPage() {
  // Use hooks — fall back to mock data if not loaded
  const {
    data: metricsRaw,
    isLoading: loadingMetrics,
    isError: errorMetrics,
    refetch,
  } = useDashboardMetrics();
  const { data: zonesRaw, isLoading: loadingZones } = useZoneAnalytics();
  const { data: eventsRaw, isLoading: loadingEvents } = useLiveEvents();

  const metrics = metricsRaw ?? mockMetrics;
  const zones = zonesRaw ?? mockZones;
  const events = eventsRaw ?? mockEvents;

  if (loadingMetrics) return <DashboardSkeleton />;

  if (errorMetrics && !metricsRaw) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <div>
          <p className="text-lg font-semibold text-white">
            Failed to load dashboard
          </p>
          <p className="mt-1 text-sm text-slate-400">
            An error occurred while fetching data.
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          className="mt-2 gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 pb-12 px-1"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* ── HEADER ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Store Performance
          </h1>
          <p className="text-sm text-slate-400">
            Live analytics and visitor intelligence · Updated just now
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-medium text-emerald-400">Live</span>
          </div>
        </div>
      </motion.div>

      {/* ── SECTION 1: KPI CARDS ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Visitors"
          value={metrics.total_visitors}
          icon={Users}
          trend="up"
          trendValue="+14.2% vs yesterday"
          accentColor="#6366f1"
          sparkColor="#818cf8"
        />
        <KpiCard
          title="Active Visitors"
          value={metrics.active_visitors}
          icon={Activity}
          accentColor="#3b82f6"
          sparkColor="#60a5fa"
        />
        <KpiCard
          title="Avg Dwell Time"
          value={metrics.avg_dwell_time_seconds}
          format="time"
          icon={Clock}
          trend="down"
          trendValue="-12s vs yesterday"
          accentColor="#f59e0b"
          sparkColor="#fbbf24"
        />
        <KpiCard
          title="Conversion Rate"
          value={metrics.conversion_rate_percentage}
          format="percent"
          icon={Percent}
          trend="up"
          trendValue="+2.4%"
          accentColor="#10b981"
          sparkColor="#34d399"
        />
      </div>

      {/* ── SECTION 2 & LIVE EVENTS: Two-column ── */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-12">
        {/* Hourly Footfall — 8 cols */}
        <motion.div variants={itemVariants} className="md:col-span-8">
          <Card className="border border-white/5 bg-slate-900/60 backdrop-blur-sm h-full">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-white">
                Visitor Traffic
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Hourly footfall · Last 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-4" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={hourlyData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="gradVisitors"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="gradEntries"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#1e293b"
                  />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    name="Visitors"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#gradVisitors)"
                  />
                  <Area
                    type="monotone"
                    dataKey="entries"
                    name="Entries"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    fill="url(#gradEntries)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Live Event Stream — 4 cols */}
        <motion.div variants={itemVariants} className="md:col-span-4">
          <Card className="border border-white/5 bg-slate-900/60 backdrop-blur-sm h-full flex flex-col">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-white">
                Live Event Stream
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Real-time detections
              </CardDescription>
            </CardHeader>
            <CardContent
              className="flex-1 overflow-auto px-5 pb-4"
              style={{ maxHeight: 280 }}
            >
              {loadingEvents ? (
                <div className="space-y-3">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full bg-slate-800" />
                    ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* {(events as typeof mockEvents || []).slice(0, 8).map((event) => ( */}
                  // ✅ FIXED
                  {(Array.isArray(events) ? events : [])
                    .slice(0, 8)
                    .map((event) => (
                      <div
                        key={event.id ?? (event as any).event_id}
                        className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-200">
                            {event.visitor_id}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {new Date(event.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            · {event.zone}
                          </p>
                        </div>
                        <EventBadge type={event.event_type} />
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── SECTION 3: DWELL + ENTRY vs EXIT + FUNNEL ── */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* Dwell Time by Zone */}
        <motion.div variants={itemVariants} className="md:col-span-1">
          <Card className="border border-white/5 bg-slate-900/60 backdrop-blur-sm h-full">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-white">
                Avg Dwell by Zone
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Minutes spent per zone
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-4" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dwellData}
                  layout="vertical"
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#1e293b"
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                  />
                  <YAxis
                    dataKey="zone"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    width={80}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(99,102,241,0.06)" }}
                  />
                  <Bar
                    dataKey="avgDwell"
                    name="Avg Dwell (min)"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  >
                    {dwellData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={idx === 0 ? "#6366f1" : "#818cf8"}
                        fillOpacity={1 - idx * 0.1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Entry vs Exit */}
        <motion.div variants={itemVariants} className="md:col-span-1">
          <Card className="border border-white/5 bg-slate-900/60 backdrop-blur-sm h-full">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-white">
                Entry vs Exit Volume
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Last 6 hours
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-4" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={hourlyData.slice(-6)}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#1e293b"
                  />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "transparent" }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
                  />
                  <Bar
                    dataKey="entries"
                    name="Entries"
                    fill="#10b981"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={18}
                  />
                  <Bar
                    dataKey="exits"
                    name="Exits"
                    fill="#f97316"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={18}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Conversion Funnel */}
        <motion.div variants={itemVariants} className="md:col-span-1">
          <Card className="border border-white/5 bg-slate-900/60 backdrop-blur-sm h-full">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-white">
                Conversion Funnel
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Visitor journey stages
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <ConversionFunnel />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── SECTION 4: STORE PERFORMANCE ── */}
      <motion.div variants={fadeIn}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Store Performance
        </p>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <PerformanceCard
            label="Top Zone"
            value="Lakme Skin"
            sub="87 Engagement Score"
            icon={Star}
            color="#6366f1"
          />
          <PerformanceCard
            label="Highest Engagement"
            value="Cash Counter"
            sub="95% engagement rate"
            icon={Zap}
            color="#f59e0b"
          />
          <PerformanceCard
            label="Best Conversion"
            value="Minimalist"
            sub="31% conversion rate"
            icon={ShoppingCart}
            color="#10b981"
          />
        </div>
      </motion.div>

      {/* ── SECTION 5 & 6: TOP ZONES TABLE + ALERTS ── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
        {/* Top Zones Table — 8 cols */}
        <motion.div variants={itemVariants} className="lg:col-span-8">
          <Card className="border border-white/5 bg-slate-900/60 backdrop-blur-sm">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-white">
                Top Performing Zones
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Ranked by visitor traffic today
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-12">
                      #
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Zone
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Visitors
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">
                      Avg Dwell
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">
                      Engagement
                    </TableHead>
                    <TableHead className="text-right pr-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Conv.
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topZones.map((row) => (
                    <TableRow
                      key={row.rank}
                      className="border-white/5 transition-colors hover:bg-white/[0.03]"
                    >
                      <TableCell className="pl-5 py-3">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            row.rank === 1
                              ? "bg-indigo-500/20 text-indigo-400"
                              : row.rank === 2
                                ? "bg-slate-600/40 text-slate-300"
                                : "text-slate-500"
                          }`}
                        >
                          {row.rank}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 font-medium text-sm text-slate-200">
                        {row.zone}
                      </TableCell>
                      <TableCell className="py-3 text-right text-sm tabular-nums text-slate-300">
                        {row.visitors.toLocaleString()}
                      </TableCell>
                      <TableCell className="py-3 text-right text-xs tabular-nums text-slate-400 hidden sm:table-cell">
                        {row.dwell}
                      </TableCell>
                      <TableCell className="py-3 text-right hidden md:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${row.engagement}%` }}
                            />
                          </div>
                          <span className="w-7 text-right text-xs text-slate-400">
                            {row.engagement}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 pr-5 text-right text-sm text-slate-300">
                        {row.conversion}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alert Panel — 4 cols */}
        <motion.div variants={itemVariants} className="lg:col-span-4">
          <Card className="border border-white/5 bg-slate-900/60 backdrop-blur-sm h-full">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-white">
                System Alerts
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Active notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-4">
                {mockAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex gap-3 items-start border-b border-white/5 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="mt-0.5 shrink-0">
                      {alert.severity === "HIGH" ? (
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                      ) : alert.severity === "MEDIUM" ? (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-[11px] text-slate-500">
                          {alert.time}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-200 leading-relaxed">
                        {alert.message}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {alert.zone}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
