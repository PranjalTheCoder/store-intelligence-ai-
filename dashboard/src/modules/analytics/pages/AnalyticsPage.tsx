import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import {
  Download,
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Target,
  Activity,
  AlertCircle,
  ArrowRight,
  Zap,
  Brain,
  BarChart2,
  Filter,
  ChevronDown,
  ChevronRight,
  Eye,
  X,
  Sparkles,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  SlidersHorizontal,
} from "lucide-react";

// Shared UI
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Switch } from "@/shared/components/ui/switch";
import { Skeleton } from "@/shared/components/ui/skeleton";

// ─────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────
const C = {
  indigo: "#6366f1",
  indigoLt: "#818cf8",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  sky: "#38bdf8",
  violet: "#a78bfa",
  zinc7: "#3f3f46",
  zinc8: "#27272a",
  zinc9: "#18181b",
  zinc95: "#0f0f11",
};

// ─────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────
const ZONES = [
  "Lakme Skin",
  "Maybelline",
  "Minimalist",
  "Swiss Beauty",
  "Good Vibes",
  "Cash Counter",
  "Faces Canada",
  "Colorbar",
  "DermDoc",
  "Aqualogica",
  "Lakme",
  "Makeup Unit",
  "Renee",
  "The Face Shop",
  "EB Korean",
  "Alps Goodness",
  "Streax",
  "Accessories",
  "FOH",
  "PMU",
];

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const seed = (base: number, i: number) =>
  Math.max(
    0,
    base + Math.sin(i * 0.8) * base * 0.35 + Math.cos(i * 1.2) * base * 0.15,
  );

// Hourly footfall — today + yesterday + forecast
const hourlyFootfall = Array.from({ length: 13 }, (_, i) => ({
  time: `${i + 9}:00`,
  today: Math.round(seed(280, i) + rand(-30, 30)),
  yesterday: Math.round(seed(240, i) + rand(-30, 30)),
  forecast: i >= 10 ? Math.round(seed(300, i) + rand(-20, 20)) : undefined,
  avg7d: Math.round(seed(260, i)),
}));

// 30-day visitor trend
const visitorTrend = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  visitors: Math.round(seed(1800, i) + rand(-200, 200)),
  movingAvg: Math.round(seed(1750, i)),
  forecast: i >= 27 ? Math.round(seed(1900, i) + rand(-100, 100)) : undefined,
}));

// Zone performance
const zonePerformance = ZONES.map((name, i) => ({
  name,
  visitors: rand(80, 380),
  dwellTime: rand(90, 1800),
  engagement: rand(35, 97),
  conversion: rand(5, 45),
  revenue: rand(12000, 85000),
  score: parseFloat((rand(30, 98) / 10).toFixed(1)),
  trend: rand(0, 1) === 0 ? "up" : "down",
  trendVal: rand(1, 22),
})).sort((a, b) => b.visitors - a.visitors);

// Dwell time per zone (top 12)
const dwellData = zonePerformance.slice(0, 12).map((z) => ({
  name: z.name.length > 12 ? z.name.slice(0, 11) + "…" : z.name,
  fullName: z.name,
  avg: Math.round(z.dwellTime / 60),
  prev: Math.round((z.dwellTime / 60) * (0.8 + Math.random() * 0.4)),
}));

// Funnel
const funnelData = [
  { stage: "Store Entry", count: 4250, pct: 100, color: C.indigo },
  { stage: "FOH", count: 3800, pct: 89, color: C.indigoLt },
  { stage: "Product Zone", count: 2900, pct: 68, color: C.violet },
  { stage: "Makeup Unit", count: 1850, pct: 43, color: C.sky },
  { stage: "Cash Counter", count: 1250, pct: 29, color: C.emerald },
  { stage: "Purchase", count: 780, pct: 18, color: C.amber },
];

// Heatmap grid: 7 days × 13 hours
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = [
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
];
const peakGrid = days.map(() => hours.map(() => rand(5, 100)));

// Segmentation
const segments = [
  { label: "New Visitors", value: 1840, pct: 43, color: C.indigo, icon: Users },
  {
    label: "Returning",
    value: 2410,
    pct: 57,
    color: C.emerald,
    icon: RefreshCw,
  },
  {
    label: "High Engagement",
    value: 1020,
    pct: 24,
    color: C.violet,
    icon: Zap,
  },
  {
    label: "Quick Exit (<2m)",
    value: 640,
    pct: 15,
    color: C.rose,
    icon: ArrowRight,
  },
  {
    label: "Long Stay (>20m)",
    value: 380,
    pct: 9,
    color: C.amber,
    icon: Clock,
  },
];

// AI insights
const aiInsights = [
  {
    id: 1,
    type: "positive",
    text: "Lakme Skin engagement up 18% vs last week. Recommend extending floor space.",
    revenue: "+₹42K",
  },
  {
    id: 2,
    type: "warning",
    text: "Cash Counter queue exceeding threshold. Avg wait >4 min — staff reallocation advised.",
    revenue: "-₹8K",
  },
  {
    id: 3,
    type: "negative",
    text: "PMU zone engagement dropped 12% in afternoons. Lighting or placement review needed.",
    revenue: "-₹15K",
  },
  {
    id: 4,
    type: "info",
    text: "Peak traffic at 17:00 is 28% above 7-day average. Pre-staff for tomorrow.",
    revenue: "+₹22K",
  },
  {
    id: 5,
    type: "positive",
    text: "Minimalist conversion rate +3.1% — product placement change showing results.",
    revenue: "+₹31K",
  },
];

// Anomalies
const anomalies = [
  {
    id: 1,
    severity: "HIGH",
    msg: "Sudden crowd spike at Cash Counter",
    zone: "Cash Counter",
    delta: "+340%",
  },
  {
    id: 2,
    severity: "MEDIUM",
    msg: "Dwell collapse at EB Korean (2-hr window)",
    zone: "EB Korean",
    delta: "-68%",
  },
  {
    id: 3,
    severity: "LOW",
    msg: "Conversion below threshold at FOH",
    zone: "FOH",
    delta: "-22%",
  },
];

// Revenue impact estimates per zone
const revenueData = zonePerformance.slice(0, 8).map((z) => ({
  name: z.name.length > 10 ? z.name.slice(0, 9) + "…" : z.name,
  fullName: z.name,
  actual: z.revenue,
  potential: Math.round(z.revenue * (1 + rand(10, 35) / 100)),
}));

// Journey paths
const journeyPaths = [
  {
    path: ["Entry", "FOH", "Lakme Skin", "Makeup Unit", "Cash Counter"],
    pct: 24,
  },
  { path: ["Entry", "FOH", "Maybelline", "Cash Counter"], pct: 18 },
  { path: ["Entry", "Minimalist", "DermDoc", "Cash Counter"], pct: 14 },
  { path: ["Entry", "FOH", "PMU", "Exit"], pct: 11 },
];

// ─────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};

// ─────────────────────────────────────────
// COUNT-UP HOOK
// ─────────────────────────────────────────
function useCountUp(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const t = setInterval(() => {
      start += step;
      if (start >= target) {
        setVal(target);
        clearInterval(t);
      } else setVal(Math.round(start));
    }, 16);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

// ─────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/95 px-3 py-2.5 text-xs shadow-2xl backdrop-blur-md">
      <p className="mb-2 font-semibold text-zinc-300">{label}</p>
      {payload.map((e: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-zinc-200">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: e.color }}
          />
          <span className="text-zinc-400">{e.name}:</span>
          <span className="font-semibold">
            {typeof e.value === "number" ? e.value.toLocaleString() : e.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────
interface KpiProps {
  title: string;
  rawValue: number;
  display: string;
  icon: React.ElementType;
  trend: "up" | "down";
  trendVal: string;
  accent: string;
  selected?: boolean;
  onClick?: () => void;
}
const KpiCard = ({
  title,
  rawValue,
  display,
  icon: Icon,
  trend,
  trendVal,
  accent,
  selected,
  onClick,
}: KpiProps) => {
  const count = useCountUp(rawValue);
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      onClick={onClick}
    >
      <Card
        className={`relative overflow-hidden cursor-pointer transition-all duration-200 border ${
          selected
            ? "border-indigo-500/60 bg-indigo-500/10"
            : "border-white/[0.06] bg-zinc-950 hover:border-white/10"
        }`}
      >
        {/* Glow orb */}
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-20"
          style={{ backgroundColor: accent }}
        />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
          <CardTitle className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            {title}
          </CardTitle>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accent}20` }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold tabular-nums tracking-tight text-zinc-50">
            {display.replace(/[\d,]+/, count.toLocaleString())}
          </div>
          <div
            className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${trend === "up" ? "text-emerald-400" : "text-rose-400"}`}
          >
            {trend === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trendVal}
          </div>
          {selected && (
            <div className="mt-2 text-[10px] text-indigo-400 font-medium">
              ● Filter active
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────
const SectionHeader = ({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) => (
  <div className="mb-4 flex items-center justify-between">
    <div>
      <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      {sub && <p className="text-[11px] text-zinc-500 mt-0.5">{sub}</p>}
    </div>
    {action}
  </div>
);

// ─────────────────────────────────────────
// HEATMAP CELL COLOR
// ─────────────────────────────────────────
const heatColor = (v: number): string => {
  if (v < 20) return `rgba(30,64,175,${0.15 + (v / 100) * 0.4})`;
  if (v < 40) return `rgba(5,150,105,${0.2 + (v / 100) * 0.4})`;
  if (v < 60) return `rgba(202,138,4,${0.25 + (v / 100) * 0.35})`;
  if (v < 80) return `rgba(234,88,12,${0.3 + (v / 100) * 0.4})`;
  return `rgba(220,38,38,${0.35 + (v / 100) * 0.4})`;
};

// ─────────────────────────────────────────
// INSIGHT TYPE CONFIG
// ─────────────────────────────────────────
const insightCfg: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  positive: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  negative: {
    icon: AlertTriangle,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
  warning: {
    icon: AlertCircle,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  info: {
    icon: Info,
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
};

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("today");
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showForecast, setShowForecast] = useState(true);
  const [chartView, setChartView] = useState<"hourly" | "daily">("hourly");
  const [drillZone, setDrillZone] = useState<
    (typeof zonePerformance)[0] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cross-filter: when a zone is selected, filter chart data
  const filteredHourly = useMemo(() => {
    if (!selectedZone) return hourlyFootfall;
    const factor =
      zonePerformance.find((z) => z.name === selectedZone)?.visitors ?? 300;
    return hourlyFootfall.map((h) => ({
      ...h,
      today: Math.round(h.today * (factor / 300)),
      yesterday: Math.round(h.yesterday * (factor / 300)),
      forecast: h.forecast
        ? Math.round(h.forecast * (factor / 300))
        : undefined,
    }));
  }, [selectedZone]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1200);
  };

  const toggleKpi = (key: string) =>
    setActiveKpi((prev) => (prev === key ? null : key));

  // ── KPI data ──
  const kpis = [
    {
      key: "visitors",
      title: "Total Visitors",
      rawValue: 4250,
      display: "4,250",
      icon: Users,
      trend: "up" as const,
      trendVal: "+12.5% vs yest",
      accent: C.indigo,
    },
    {
      key: "active",
      title: "Active On Floor",
      rawValue: 142,
      display: "142",
      icon: Activity,
      trend: "up" as const,
      trendVal: "+5.2%",
      accent: C.emerald,
    },
    {
      key: "dwell",
      title: "Avg Dwell",
      rawValue: 18,
      display: "18m 42s",
      icon: Clock,
      trend: "up" as const,
      trendVal: "+1m 12s",
      accent: C.amber,
    },
    {
      key: "conversion",
      title: "Conversion Rate",
      rawValue: 32,
      display: "32.4%",
      icon: Target,
      trend: "up" as const,
      trendVal: "+3.1%",
      accent: C.violet,
    },
    {
      key: "entries",
      title: "Entries",
      rawValue: 4250,
      display: "4,250",
      icon: ArrowUpRight,
      trend: "up" as const,
      trendVal: "+14%",
      accent: C.sky,
    },
    {
      key: "exits",
      title: "Exits",
      rawValue: 3980,
      display: "3,980",
      icon: ArrowDownRight,
      trend: "down" as const,
      trendVal: "-2%",
      accent: C.rose,
    },
    {
      key: "revenue",
      title: "Est. Revenue Impact",
      rawValue: 124000,
      display: "₹1.24L",
      icon: DollarSign,
      trend: "up" as const,
      trendVal: "+8.4%",
      accent: C.emerald,
    },
    {
      key: "peak",
      title: "Peak Occupancy",
      rawValue: 318,
      display: "318",
      icon: TrendingUp,
      trend: "up" as const,
      trendVal: "@ 17:00",
      accent: C.amber,
    },
  ];

  return (
    <motion.div
      className="min-h-screen bg-zinc-950 text-zinc-50 pb-16"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <div className="mx-auto max-w-[1680px] space-y-7 px-4 pt-6 sm:px-6 lg:px-8">
        {/* ═══════════════════════════════════════
            HEADER
        ═══════════════════════════════════════ */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col gap-4 border-b border-zinc-800/60 pb-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15">
                <BarChart2 className="h-4 w-4 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
                Analytics Center
              </h1>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Retail intelligence ·{" "}
              {selectedZone ? (
                <span className="text-indigo-400 font-medium">
                  Filtered: {selectedZone}
                </span>
              ) : (
                "All Zones"
              )}
              {selectedZone && (
                <button
                  onClick={() => setSelectedZone(null)}
                  className="ml-2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="inline h-3 w-3" />
                </button>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 w-36 border-zinc-800 bg-zinc-900 text-xs text-zinc-100 focus:ring-0">
                <Calendar className="mr-1.5 h-3.5 w-3.5 text-zinc-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Forecast toggle */}
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5">
              <Switch
                id="forecast"
                checked={showForecast}
                onCheckedChange={setShowForecast}
                className="scale-75 data-[state=checked]:bg-indigo-600"
              />
              <label
                htmlFor="forecast"
                className="cursor-pointer text-xs text-zinc-400"
              >
                Forecast
              </label>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 border-zinc-800 bg-zinc-900 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export
            </Button>

            <Button
              size="sm"
              onClick={handleRefresh}
              className="h-8 bg-indigo-600 text-xs text-white hover:bg-indigo-500"
            >
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════
            KPI CARDS — cross-filterable
        ═══════════════════════════════════════ */}
        <motion.div
          variants={stagger}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8"
        >
          {kpis.map((k) => (
            <KpiCard
              key={k.key}
              {...k}
              selected={activeKpi === k.key}
              onClick={() => toggleKpi(k.key)}
            />
          ))}
        </motion.div>

        {/* Active filter banner */}
        <AnimatePresence>
          {(activeKpi || selectedZone) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-lg border border-indigo-500/25 bg-indigo-500/8 px-4 py-2.5"
            >
              <div className="flex items-center gap-3 text-xs">
                <Filter className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-indigo-300 font-medium">
                  Cross-filter active
                </span>
                {activeKpi && (
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                    {activeKpi}
                  </Badge>
                )}
                {selectedZone && (
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[10px]">
                    {selectedZone}
                  </Badge>
                )}
                <button
                  className="ml-auto text-zinc-500 hover:text-zinc-300"
                  onClick={() => {
                    setActiveKpi(null);
                    setSelectedZone(null);
                  }}
                >
                  Clear all filters <X className="inline h-3 w-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════
            ROW 1 — FOOTFALL + 30-DAY TREND
        ═══════════════════════════════════════ */}
        <motion.div
          variants={stagger}
          className="grid gap-5 grid-cols-1 lg:grid-cols-12"
        >
          {/* Hourly Footfall (8 cols) */}
          <motion.div variants={fadeUp} className="lg:col-span-8">
            <Card className="border border-zinc-800/60 bg-zinc-950 h-full">
              <CardHeader className="pb-2 pt-5 px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-semibold text-zinc-100">
                      Footfall Analysis
                    </CardTitle>
                    <CardDescription className="text-[11px] text-zinc-500">
                      Today vs yesterday · {selectedZone || "All zones"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    {(["hourly", "daily"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setChartView(v)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          chartView === v
                            ? "bg-indigo-600 text-white"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-4" style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={
                      chartView === "hourly" ? filteredHourly : visitorTrend
                    }
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="aToday" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={C.indigo}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor={C.indigo}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={C.zinc8}
                    />
                    <XAxis
                      dataKey={chartView === "hourly" ? "time" : "day"}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      dy={8}
                      interval={chartView === "daily" ? 4 : 0}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#71717a", fontSize: 11 }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{
                        fontSize: "11px",
                        color: "#a1a1aa",
                        paddingTop: 8,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="today"
                      name="Today"
                      stroke={C.indigo}
                      strokeWidth={2.5}
                      fill="url(#aToday)"
                    />
                    <Line
                      type="monotone"
                      dataKey="yesterday"
                      name="Yesterday"
                      stroke={C.zinc7}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    {showForecast && (
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        name="Forecast"
                        stroke={C.amber}
                        strokeWidth={1.5}
                        strokeDasharray="6 3"
                        dot={false}
                      />
                    )}
                    <ReferenceLine
                      x={chartView === "hourly" ? "17:00" : undefined}
                      stroke={C.rose}
                      strokeDasharray="3 3"
                      label={{ value: "Peak", fill: C.rose, fontSize: 10 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* 30-Day Trend (4 cols) */}
          <motion.div variants={fadeUp} className="lg:col-span-4">
            <Card className="border border-zinc-800/60 bg-zinc-950 h-full">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-semibold text-zinc-100">
                  30-Day Growth
                </CardTitle>
                <CardDescription className="text-[11px] text-zinc-500">
                  Visitors + 7-day moving avg + forecast
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-4" style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={visitorTrend}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="g30d" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={C.emerald}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={C.emerald}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={C.zinc8}
                    />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={false}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#71717a", fontSize: 11 }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="visitors"
                      name="Visitors"
                      stroke={C.emerald}
                      strokeWidth={2}
                      fill="url(#g30d)"
                    />
                    <Line
                      type="monotone"
                      dataKey="movingAvg"
                      name="7-day Avg"
                      stroke={C.indigo}
                      strokeWidth={1.5}
                      dot={false}
                    />
                    {showForecast && (
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        name="Forecast"
                        stroke={C.amber}
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                        dot={false}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ═══════════════════════════════════════
            ROW 2 — ZONE RANKING + FUNNEL + DWELL
        ═══════════════════════════════════════ */}
        <motion.div
          variants={stagger}
          className="grid gap-5 grid-cols-1 lg:grid-cols-12"
        >
          {/* Zone Performance — 5 cols, cross-filterable */}
          <motion.div variants={fadeUp} className="lg:col-span-5">
            <Card className="border border-zinc-800/60 bg-zinc-950 h-full">
              <CardHeader className="pb-2 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-zinc-100">
                      Zone Ranking
                    </CardTitle>
                    <CardDescription className="text-[11px] text-zinc-500">
                      Click zone to cross-filter · top 15
                    </CardDescription>
                  </div>
                  <Badge className="border-indigo-500/30 bg-indigo-500/10 text-[10px] text-indigo-400">
                    {selectedZone ? "Filtered" : "All Zones"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-4" style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={zonePerformance.slice(0, 15)}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                    onClick={(data) =>
                      data?.activePayload &&
                      setSelectedZone(
                        data.activePayload[0]?.payload?.name === selectedZone
                          ? null
                          : data.activePayload[0]?.payload?.name,
                      )
                    }
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke={C.zinc8}
                    />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#71717a", fontSize: 10 }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#e4e4e7", fontSize: 10 }}
                      width={88}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "rgba(99,102,241,0.06)" }}
                    />
                    <Bar
                      dataKey="visitors"
                      name="Visitors"
                      radius={[0, 4, 4, 0]}
                      barSize={13}
                      cursor="pointer"
                    >
                      {zonePerformance.slice(0, 15).map((z, i) => (
                        <Cell
                          key={i}
                          fill={
                            z.name === selectedZone
                              ? C.amber
                              : i < 3
                                ? C.indigo
                                : C.zinc7
                          }
                          opacity={
                            selectedZone && z.name !== selectedZone ? 0.45 : 1
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Dwell Time — 4 cols */}
          <motion.div variants={fadeUp} className="lg:col-span-4">
            <Card className="border border-zinc-800/60 bg-zinc-950 h-full">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-semibold text-zinc-100">
                  Avg Dwell by Zone
                </CardTitle>
                <CardDescription className="text-[11px] text-zinc-500">
                  Minutes · current vs previous period
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-4" style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dwellData}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 5, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke={C.zinc8}
                    />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#71717a", fontSize: 10 }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#e4e4e7", fontSize: 10 }}
                      width={80}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "rgba(99,102,241,0.06)" }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: "11px", color: "#a1a1aa" }}
                    />
                    <Bar
                      dataKey="avg"
                      name="Current"
                      fill={C.emerald}
                      radius={[0, 3, 3, 0]}
                      barSize={8}
                    />
                    <Bar
                      dataKey="prev"
                      name="Previous"
                      fill={C.zinc7}
                      radius={[0, 3, 3, 0]}
                      barSize={8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Conversion Funnel — 3 cols */}
          <motion.div variants={fadeUp} className="lg:col-span-3">
            <Card className="border border-zinc-800/60 bg-zinc-950 h-full">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-semibold text-zinc-100">
                  Conversion Funnel
                </CardTitle>
                <CardDescription className="text-[11px] text-zinc-500">
                  Visitor journey stages
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="space-y-2.5 mt-1">
                  {funnelData.map((stage, i) => (
                    <div key={stage.stage}>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-zinc-300">
                          {stage.stage}
                        </span>
                        <span className="text-zinc-500 tabular-nums">
                          {stage.count.toLocaleString()}
                        </span>
                      </div>
                      <div className="relative h-6 w-full overflow-hidden rounded-md bg-zinc-900">
                        <motion.div
                          className="h-full rounded-md"
                          style={{
                            backgroundColor: stage.color,
                            opacity: 0.85,
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${stage.pct}%` }}
                          transition={{
                            duration: 0.8,
                            delay: i * 0.1,
                            ease: "easeOut",
                          }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white">
                          {stage.pct}%
                        </span>
                      </div>
                      {i < funnelData.length - 1 && (
                        <div className="mt-0.5 text-right text-[9px] text-zinc-600">
                          ↓ {100 - funnelData[i + 1].pct}% drop-off
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ═══════════════════════════════════════
            ROW 3 — HEATMAP + REVENUE + SEGMENTATION
        ═══════════════════════════════════════ */}
        <motion.div
          variants={stagger}
          className="grid gap-5 grid-cols-1 lg:grid-cols-12"
        >
          {/* Peak Hours Heatmap — 5 cols */}
          <motion.div variants={fadeUp} className="lg:col-span-5">
            <Card className="border border-zinc-800/60 bg-zinc-950 h-full">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-semibold text-zinc-100">
                  Peak Traffic Heatmap
                </CardTitle>
                <CardDescription className="text-[11px] text-zinc-500">
                  Visitor intensity by day × hour
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {/* Hour labels */}
                <div className="mb-1.5 ml-10 flex">
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="flex-1 text-center text-[9px] text-zinc-600"
                    >
                      {h}
                    </div>
                  ))}
                </div>
                {/* Grid */}
                <div className="space-y-1">
                  {days.map((day, di) => (
                    <div key={day} className="flex items-center gap-1.5">
                      <div className="w-8 text-right text-[10px] font-medium text-zinc-500">
                        {day}
                      </div>
                      <div className="flex flex-1 gap-0.5">
                        {peakGrid[di].map((val, hi) => (
                          <div
                            key={hi}
                            className="aspect-square flex-1 cursor-pointer rounded-sm transition-all hover:ring-1 hover:ring-white/20"
                            style={{ backgroundColor: heatColor(val) }}
                            title={`${day} ${hours[hi]}:00 — intensity ${val}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Legend */}
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-600">Low</span>
                  {["#1e40af", "#059669", "#ca8a04", "#ea580c", "#dc2626"].map(
                    (c, i) => (
                      <div
                        key={i}
                        className="h-2.5 flex-1 rounded-sm"
                        style={{ backgroundColor: c, opacity: 0.7 }}
                      />
                    ),
                  )}
                  <span className="text-[10px] text-zinc-600">High</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Revenue Impact — 4 cols */}
          <motion.div variants={fadeUp} className="lg:col-span-4">
            <Card className="border border-zinc-800/60 bg-zinc-950 h-full">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-semibold text-zinc-100">
                  Revenue Impact Estimate
                </CardTitle>
                <CardDescription className="text-[11px] text-zinc-500">
                  Actual vs potential by zone
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-4" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={revenueData}
                    margin={{ top: 0, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={C.zinc8}
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#71717a", fontSize: 10 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "rgba(99,102,241,0.06)" }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: "11px", color: "#a1a1aa" }}
                    />
                    <Bar
                      dataKey="actual"
                      name="Actual (₹)"
                      fill={C.emerald}
                      radius={[3, 3, 0, 0]}
                      barSize={14}
                    />
                    <Bar
                      dataKey="potential"
                      name="Potential (₹)"
                      fill={C.indigo}
                      radius={[3, 3, 0, 0]}
                      barSize={14}
                      opacity={0.6}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Visitor Segmentation — 3 cols */}
          <motion.div variants={fadeUp} className="lg:col-span-3">
            <Card className="border border-zinc-800/60 bg-zinc-950 h-full">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-semibold text-zinc-100">
                  Visitor Segments
                </CardTitle>
                <CardDescription className="text-[11px] text-zinc-500">
                  Behavioral breakdown
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-5 pb-5">
                {segments.map((seg) => (
                  <div key={seg.label}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                        <seg.icon
                          className="h-3 w-3"
                          style={{ color: seg.color }}
                        />
                        {seg.label}
                      </span>
                      <span className="tabular-nums text-zinc-400">
                        {seg.value.toLocaleString()}{" "}
                        <span className="text-zinc-600">({seg.pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: seg.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${seg.pct}%` }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                      />
                    </div>
                  </div>
                ))}

                {/* Traffic balance donut */}
                <div
                  className="mt-2 flex items-center justify-center"
                  style={{ height: 120 }}
                >
                  <div className="relative">
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie
                          data={[
                            { v: 4250, c: C.emerald },
                            { v: 3980, c: C.rose },
                          ]}
                          dataKey="v"
                          innerRadius={38}
                          outerRadius={52}
                          paddingAngle={4}
                          stroke="none"
                        >
                          {[C.emerald, C.rose].map((c, i) => (
                            <Cell key={i} fill={c} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-zinc-50">
                        8.2k
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500">
                        Total
                      </span>
                    </div>
                  </div>
                  <div className="ml-2 space-y-1.5">
                    {[
                      { l: "Entries", v: "4,250", c: C.emerald },
                      { l: "Exits", v: "3,980", c: C.rose },
                    ].map((r) => (
                      <div
                        key={r.l}
                        className="flex items-center gap-1.5 text-[10px]"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: r.c }}
                        />
                        <span className="text-zinc-400">{r.l}</span>
                        <span className="font-semibold text-zinc-200">
                          {r.v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ═══════════════════════════════════════
            ROW 4 — LEADERBOARD + AI INSIGHTS + ANOMALY
        ═══════════════════════════════════════ */}
        <motion.div
          variants={stagger}
          className="grid gap-5 grid-cols-1 lg:grid-cols-12"
        >
          {/* Zone Leaderboard — drill-down — 6 cols */}
          <motion.div variants={fadeUp} className="lg:col-span-6">
            <Card className="border border-zinc-800/60 bg-zinc-950">
              <CardHeader className="pb-2 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-zinc-100">
                      Zone Leaderboard
                    </CardTitle>
                    <CardDescription className="text-[11px] text-zinc-500">
                      Click row to drill down
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800/60 hover:bg-transparent">
                      {[
                        "#",
                        "Zone",
                        "Visitors",
                        "Dwell",
                        "Engage",
                        "Conv.",
                        "Revenue",
                      ].map((h) => (
                        <TableHead
                          key={h}
                          className={`text-[10px] font-semibold uppercase tracking-wider text-zinc-500 ${h === "#" ? "pl-5 w-8" : h === "Zone" ? "" : "text-right"} ${h === "Revenue" ? "pr-5" : ""}`}
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zonePerformance.slice(0, 8).map((z, i) => (
                      <React.Fragment key={z.name}>
                        <TableRow
                          className="cursor-pointer border-zinc-800/40 transition-colors hover:bg-zinc-900/60"
                          onClick={() =>
                            setDrillZone(drillZone?.name === z.name ? null : z)
                          }
                        >
                          <TableCell className="pl-5 py-2.5">
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                i === 0
                                  ? "bg-amber-500/20 text-amber-400"
                                  : i === 1
                                    ? "bg-zinc-600/40 text-zinc-300"
                                    : i === 2
                                      ? "bg-orange-500/15 text-orange-400"
                                      : "text-zinc-600"
                              }`}
                            >
                              {i + 1}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 text-xs font-medium text-zinc-200">
                            {z.name}
                          </TableCell>
                          <TableCell className="py-2.5 text-right text-xs tabular-nums text-zinc-300">
                            {z.visitors}
                          </TableCell>
                          <TableCell className="py-2.5 text-right text-[11px] tabular-nums text-zinc-400">
                            {Math.floor(z.dwellTime / 60)}m{z.dwellTime % 60}s
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="h-1 w-12 overflow-hidden rounded-full bg-zinc-800">
                                <div
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{ width: `${z.engagement}%` }}
                                />
                              </div>
                              <span className="w-7 text-right text-[10px] text-zinc-400">
                                {z.engagement}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 text-right text-xs text-zinc-300">
                            {z.conversion}%
                          </TableCell>
                          <TableCell className="py-2.5 pr-5 text-right text-[11px] text-emerald-400 tabular-nums">
                            ₹{(z.revenue / 1000).toFixed(0)}K
                          </TableCell>
                        </TableRow>
                        {/* Drill-down inline row */}
                        <AnimatePresence>
                          {drillZone?.name === z.name && (
                            <motion.tr
                              key="drill"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <td
                                colSpan={7}
                                className="bg-indigo-500/5 px-5 py-3 border-b border-zinc-800/40"
                              >
                                <div className="grid grid-cols-4 gap-3">
                                  {[
                                    {
                                      l: "Engagement",
                                      v: `${z.engagement}%`,
                                      c: C.indigo,
                                    },
                                    {
                                      l: "Conversion",
                                      v: `${z.conversion}%`,
                                      c: C.emerald,
                                    },
                                    {
                                      l: "Revenue",
                                      v: `₹${(z.revenue / 1000).toFixed(1)}K`,
                                      c: C.amber,
                                    },
                                    {
                                      l: "Impact Score",
                                      v: `${z.score}/10`,
                                      c: C.violet,
                                    },
                                  ].map((d) => (
                                    <div
                                      key={d.l}
                                      className="rounded-lg bg-zinc-900/60 border border-white/[0.05] px-3 py-2"
                                    >
                                      <p className="text-[10px] text-zinc-500">
                                        {d.l}
                                      </p>
                                      <p
                                        className="text-sm font-bold"
                                        style={{ color: d.c }}
                                      >
                                        {d.v}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                                <p className="mt-2 text-[10px] text-zinc-600">
                                  Trend: {z.trend === "up" ? "↑" : "↓"}{" "}
                                  {z.trendVal}% vs last period
                                </p>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Insights — 3 cols */}
          <motion.div variants={fadeUp} className="lg:col-span-3">
            <Card className="border border-zinc-800/60 bg-zinc-950 h-full">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  AI Insights
                </CardTitle>
                <CardDescription className="text-[11px] text-zinc-500">
                  Generated from today's patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 px-5 pb-5">
                {aiInsights.map((ins) => {
                  const cfg = insightCfg[ins.type];
                  return (
                    <div
                      key={ins.id}
                      className={`flex gap-3 rounded-lg border p-3 ${cfg.bg}`}
                    >
                      <cfg.icon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.color}`}
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] leading-snug text-zinc-300">
                          {ins.text}
                        </p>
                        <p
                          className={`mt-1 text-[10px] font-semibold ${
                            ins.revenue.startsWith("+")
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {ins.revenue} impact estimate
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* Anomaly Detection — 3 cols */}
          <motion.div variants={fadeUp} className="lg:col-span-3">
            <Card className="border border-red-900/30 bg-red-950/10 h-full">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="flex items-center justify-between text-sm font-semibold text-red-400">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Anomaly Detection
                  </span>
                  <Badge className="animate-pulse bg-red-600/70 text-[10px] text-white px-1.5 py-0">
                    {anomalies.filter((a) => a.severity === "HIGH").length} HIGH
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-5 pb-5">
                {anomalies.map((a) => (
                  <div
                    key={a.id}
                    className="flex gap-3 items-start rounded-lg border border-white/[0.05] bg-white/[0.03] p-3"
                  >
                    <div
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        a.severity === "HIGH"
                          ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                          : a.severity === "MEDIUM"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <Badge
                        variant="outline"
                        className={`mb-1 text-[9px] px-1.5 py-0 ${
                          a.severity === "HIGH"
                            ? "border-red-500/30 bg-red-500/10 text-red-400"
                            : a.severity === "MEDIUM"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                              : "border-blue-500/30 bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {a.severity}
                      </Badge>
                      <p className="text-[11px] font-medium text-zinc-200 leading-snug">
                        {a.msg}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px]">
                        <span className="text-zinc-500">{a.zone}</span>
                        <span
                          className={
                            a.delta.startsWith("+")
                              ? "text-rose-400"
                              : "text-emerald-400"
                          }
                        >
                          {a.delta}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ═══════════════════════════════════════
            ROW 5 — CUSTOMER JOURNEY + EXPORT
        ═══════════════════════════════════════ */}
        <motion.div
          variants={stagger}
          className="grid gap-5 grid-cols-1 lg:grid-cols-2"
        >
          {/* Customer Journey */}
          <motion.div variants={fadeUp}>
            <Card className="border border-zinc-800/60 bg-zinc-950 h-full">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-semibold text-zinc-100">
                  Dominant Customer Journeys
                </CardTitle>
                <CardDescription className="text-[11px] text-zinc-500">
                  Most common spatial paths by converting visitors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-5 pb-5">
                {journeyPaths.map((jp, pi) => (
                  <div key={pi}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">
                        Path #{pi + 1}
                      </span>
                      <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/25 text-[10px]">
                        {jp.pct}% of visitors
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {jp.path.map((step, si) => (
                        <React.Fragment key={si}>
                          <div
                            className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-transform hover:-translate-y-0.5 ${
                              si === 0 || si === jp.path.length - 1
                                ? "border-zinc-700 bg-zinc-900 text-zinc-200"
                                : "border-indigo-500/30 bg-indigo-500/8 text-indigo-300"
                            }`}
                          >
                            {step}
                          </div>
                          {si < jp.path.length - 1 && (
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-700" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Export Center */}
          <motion.div variants={fadeUp}>
            <Card className="border border-zinc-800/60 bg-zinc-950 h-full">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <Download className="h-4 w-4 text-zinc-400" />
                  Export Center
                </CardTitle>
                <CardDescription className="text-[11px] text-zinc-500">
                  Download reports and raw data
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Analytics Report PDF",
                      sub: "Full dashboard snapshot",
                      icon: BarChart2,
                      color: C.indigo,
                    },
                    {
                      label: "Export CSV",
                      sub: "Raw zone & visitor data",
                      icon: Download,
                      color: C.emerald,
                    },
                    {
                      label: "Download Charts",
                      sub: "PNG/SVG chart exports",
                      icon: Eye,
                      color: C.violet,
                    },
                    {
                      label: "Generate Report",
                      sub: "AI-summarized insights doc",
                      icon: Brain,
                      color: C.amber,
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      className="flex flex-col items-start gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-4 text-left transition-all hover:border-zinc-700 hover:bg-zinc-900"
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <item.icon
                          className="h-4 w-4"
                          style={{ color: item.color }}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">
                          {item.label}
                        </p>
                        <p className="text-[10px] text-zinc-500">{item.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Summary stats */}
                <div className="mt-4 rounded-xl border border-zinc-800/50 bg-zinc-900/40 px-4 py-3">
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                    Today's Summary
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { l: "Total Visitors", v: "4,250" },
                      { l: "Avg Dwell", v: "18m 42s" },
                      { l: "Conversion", v: "32.4%" },
                      { l: "Top Zone", v: "Lakme Skin" },
                      { l: "Peak Hour", v: "17:00" },
                      { l: "Est. Revenue", v: "₹1.24L" },
                    ].map((s) => (
                      <div key={s.l}>
                        <p className="text-[9px] uppercase tracking-wider text-zinc-600">
                          {s.l}
                        </p>
                        <p className="text-xs font-semibold text-zinc-200">
                          {s.v}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
