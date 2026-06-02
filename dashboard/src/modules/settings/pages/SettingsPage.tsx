/**
 * SettingsPage.tsx
 * ─────────────────────────────────────────────────────────────
 * Production-grade Settings page for the StoreIQ Intelligence Platform.
 *
 * Sections:
 *   1. General          — store identity, business hours
 *   2. Store Layout     — zone capacity & alert-threshold sliders (brand / operational)
 *   3. Cameras          — per-camera status, detection/tracking toggles
 *   4. Analytics        — module toggles, retention config
 *   5. Alerts           — threshold sliders, notification methods
 *   6. Dashboard        — display prefs, auto-refresh
 *   7. API Integration  — endpoints, connection status, API key
 *   8. Users            — team management table
 *   9. System Info      — read-only runtime metrics
 *  10. Backup & Export  — CSV/JSON export + backup history
 *  11. Theme            — colour scheme, accent picker
 *  12. Notifications    — alert channels, scheduled reports
 *  13. Advanced         — danger zone actions
 *
 * Tech: React 18 · TypeScript · Tailwind CSS · Framer Motion · Lucide React
 * Data: Mock data from settingsMockData.ts — swap for real API calls easily.
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  memo,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  LayoutGrid,
  Camera,
  BarChart3,
  Bell,
  LayoutDashboard,
  Code2,
  Users,
  Cpu,
  DatabaseBackup,
  Palette,
  Mail,
  AlertTriangle,
  Save,
  RefreshCw,
  Plug,
  Trash2,
  Edit,
  UserPlus,
  Download,
  CheckCircle2,
  XCircle,
  Zap,
  Eye,
  EyeOff,
  ChevronRight,
  Shield,
} from "lucide-react";

import type {
  SettingsSection,
  ZoneConfig,
  CameraConfig,
  TeamUser,
} from "../settings.types";
import {
  mockStoreSettings,
  mockZones,
  mockCameras,
  mockAnalyticsSettings,
  mockAlertThresholds,
  mockNotificationMethods,
  mockDashboardSettings,
  mockApiSettings,
  mockConnectionStatuses,
  mockUsers,
  mockSystemInfo,
  mockThemeSettings,
  mockNotificationSettings,
  mockBackups,
} from "../settingsMockData";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  bg: "bg-[#0f1117]",
  bg2: "bg-[#161b27]",
  bg3: "bg-[#1e2436]",
  bg4: "bg-[#252d40]",
  border: "border-[#2a3347]",
  border2: "border-[#3a4560]",
  text: "text-[#e8ecf4]",
  text2: "text-[#8892a4]",
  text3: "text-[#5a6478]",
  accent: "text-[#818cf8]",
  accentBg: "bg-indigo-500/10",
  accentBorder: "border-indigo-500/20",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

// ── Toggle ──────────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

const Toggle = memo(({ checked, onChange, label }: ToggleProps) => (
  <button
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`
      relative inline-flex items-center w-9 h-5 rounded-full
      transition-colors duration-200 outline-none
      focus-visible:ring-2 focus-visible:ring-indigo-500/50
      ${checked ? "bg-indigo-500/30 border border-indigo-500/40" : "bg-[#252d40] border border-[#3a4560]"}
    `}
  >
    <span
      className={`
        inline-block w-3.5 h-3.5 rounded-full transition-all duration-200
        ${checked ? "translate-x-[18px] bg-indigo-400" : "translate-x-[2px] bg-[#5a6478]"}
      `}
    />
  </button>
));
Toggle.displayName = "Toggle";

// ── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = "green" | "red" | "amber" | "blue" | "accent" | "gray";

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  red: "bg-red-500/10 text-red-400 border-red-500/25",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/25",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/25",
  accent: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
  gray: "bg-slate-500/10 text-slate-400 border-slate-500/25",
};

const Badge = memo(
  ({ variant, children }: { variant: BadgeVariant; children: ReactNode }) => (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border ${BADGE_VARIANTS[variant]}`}
    >
      {children}
    </span>
  ),
);
Badge.displayName = "Badge";

// ── Card ─────────────────────────────────────────────────────────────────────

const Card = memo(
  ({
    children,
    className = "",
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <div
      className={`bg-[#161b27] border border-[#2a3347] rounded-xl p-5 ${className}`}
    >
      {children}
    </div>
  ),
);
Card.displayName = "Card";

// ── SectionHeader ────────────────────────────────────────────────────────────

const SectionHeader = memo(
  ({ title, description }: { title: string; description?: string }) => (
    <div className="mb-4 pb-3 border-b border-[#2a3347]">
      <h3 className="text-sm font-semibold text-[#e8ecf4] tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[#5a6478] mt-1">{description}</p>
      )}
    </div>
  ),
);
SectionHeader.displayName = "SectionHeader";

// ── Field ────────────────────────────────────────────────────────────────────

const Field = memo(
  ({
    label,
    children,
    className = "",
  }: {
    label: string;
    children: ReactNode;
    className?: string;
  }) => (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[11px] font-semibold text-[#8892a4] uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  ),
);
Field.displayName = "Field";

// ── Input ────────────────────────────────────────────────────────────────────

const Input = memo(
  ({ readOnly, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      readOnly={readOnly}
      {...props}
      className={`
      bg-[#1e2436] border border-[#2a3347] rounded-lg
      px-3 py-2 text-xs font-mono text-[#e8ecf4]
      outline-none transition-colors
      focus:border-indigo-500/60
      placeholder:text-[#5a6478]
      ${readOnly ? "cursor-default text-[#8892a4]" : ""}
      ${props.className ?? ""}
    `}
    />
  ),
);
Input.displayName = "Input";

// ── Select ───────────────────────────────────────────────────────────────────

const Select = memo(
  ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select
      {...props}
      className={`
      bg-[#1e2436] border border-[#2a3347] rounded-lg
      px-3 py-2 text-xs font-mono text-[#e8ecf4]
      outline-none transition-colors
      focus:border-indigo-500/60
      ${props.className ?? ""}
    `}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

// ── ToggleRow ────────────────────────────────────────────────────────────────

const ToggleRow = memo(
  ({
    label,
    description,
    checked,
    onChange,
  }: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-[#2a3347] last:border-0 last:pb-0">
      <div>
        <p className="text-xs font-medium text-[#e8ecf4]">{label}</p>
        {description && (
          <p className="text-[11px] text-[#5a6478] mt-0.5">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  ),
);
ToggleRow.displayName = "ToggleRow";

// ── Btn ──────────────────────────────────────────────────────────────────────

type BtnVariant = "primary" | "ghost" | "danger" | "success";

const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: "bg-indigo-600 hover:bg-indigo-500 text-white",
  ghost:
    "bg-[#1e2436] border border-[#2a3347] text-[#8892a4] hover:text-[#e8ecf4] hover:border-[#3a4560]",
  danger:
    "bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20",
  success:
    "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20",
};

const Btn = memo(
  ({
    variant = "ghost",
    size = "md",
    children,
    className = "",
    ...props
  }: {
    variant?: BtnVariant;
    size?: "sm" | "md";
    children: ReactNode;
    className?: string;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
      {...props}
      className={`
      inline-flex items-center gap-1.5 font-medium rounded-lg
      transition-all duration-150
      outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50
      ${size === "sm" ? "px-2.5 py-1.5 text-[11px]" : "px-3.5 py-2 text-xs"}
      ${BTN_VARIANTS[variant]}
      ${className}
    `}
    >
      {children}
    </button>
  ),
);
Btn.displayName = "Btn";

// ── Toast ────────────────────────────────────────────────────────────────────

interface ToastState {
  message: string;
  visible: boolean;
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

interface ModalState {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
  requireTyping?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR NAV CONFIG
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ElementType;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "general", label: "General", icon: Building2, group: "Configuration" },
  {
    id: "layout",
    label: "Store Layout",
    icon: LayoutGrid,
    group: "Configuration",
  },
  { id: "cameras", label: "Cameras", icon: Camera, group: "Configuration" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "Analytics" },
  { id: "alerts", label: "Alerts", icon: Bell, group: "Analytics" },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "Analytics",
  },
  { id: "api", label: "API", icon: Code2, group: "System" },
  { id: "users", label: "Users", icon: Users, group: "System" },
  { id: "system", label: "System Info", icon: Cpu, group: "System" },
  {
    id: "backup",
    label: "Backup & Export",
    icon: DatabaseBackup,
    group: "Preferences",
  },
  { id: "theme", label: "Theme", icon: Palette, group: "Preferences" },
  {
    id: "notifications",
    label: "Notifications",
    icon: Mail,
    group: "Preferences",
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: AlertTriangle,
    group: "Preferences",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. General ────────────────────────────────────────────────────────────────

const GeneralSection = memo(({ toast }: { toast: (m: string) => void }) => {
  const [form, setForm] = useState(mockStoreSettings);
  const set = (k: keyof typeof form, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="General Settings"
        description="Core store identity and operational parameters."
      />

      <Card>
        <SectionHeader
          title="Store Identity"
          description="Primary store configuration details"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Field label="Store Name">
            <Input
              value={form.storeName}
              onChange={(e) => set("storeName", e.target.value)}
            />
          </Field>
          <Field label="Store ID">
            <Input value={form.storeId} readOnly />
          </Field>
          <Field label="Location">
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </Field>
          <Field label="Timezone">
            <Select
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
            >
              <option>Asia/Kolkata (IST +5:30)</option>
              <option>UTC</option>
              <option>America/New_York</option>
              <option>Europe/London</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Business Hours" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
          <Field label="Opening Time">
            <Input
              type="time"
              value={form.openingTime}
              onChange={(e) => set("openingTime", e.target.value)}
            />
          </Field>
          <Field label="Closing Time">
            <Input
              type="time"
              value={form.closingTime}
              onChange={(e) => set("closingTime", e.target.value)}
            />
          </Field>
        </div>
        <ToggleRow
          label="Weekend Operations"
          description="Apply same hours to weekends"
          checked={form.weekendSameHours}
          onChange={(v) => set("weekendSameHours", v)}
        />
        <ToggleRow
          label="Holiday Override"
          description="Custom hours on public holidays"
          checked={form.holidayOverride}
          onChange={(v) => set("holidayOverride", v)}
        />
      </Card>

      <div className="flex justify-end">
        <Btn
          variant="primary"
          onClick={() => toast("Settings saved successfully")}
        >
          <Save className="h-3.5 w-3.5" />
          Save Changes
        </Btn>
      </div>
    </div>
  );
});
GeneralSection.displayName = "GeneralSection";

// ── 2. Store Layout ───────────────────────────────────────────────────────────

const ZoneCard = memo(
  ({
    zone,
    onChange,
  }: {
    zone: ZoneConfig;
    onChange: (z: ZoneConfig) => void;
  }) => (
    <div className="bg-[#1e2436] border border-[#2a3347] rounded-lg p-3.5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: zone.color }}
          />
          <span className="text-xs font-semibold text-[#e8ecf4] truncate">
            {zone.name}
          </span>
        </div>
        <Toggle
          checked={zone.enabled}
          onChange={(v) => onChange({ ...zone, enabled: v })}
          label={`Enable ${zone.name}`}
        />
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-[#5a6478]">Capacity</span>
            <span className="text-[10px] font-semibold text-indigo-400">
              {zone.capacity}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={zone.capacity}
            onChange={(e) => onChange({ ...zone, capacity: +e.target.value })}
            className="w-full accent-indigo-500 cursor-pointer h-1.5"
            aria-label={`${zone.name} capacity`}
          />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-[#5a6478]">Alert at</span>
            <span className="text-[10px] font-semibold text-amber-400">
              {zone.alertThreshold}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={zone.alertThreshold}
            onChange={(e) =>
              onChange({ ...zone, alertThreshold: +e.target.value })
            }
            className="w-full accent-amber-500 cursor-pointer h-1.5"
            aria-label={`${zone.name} alert threshold`}
          />
        </div>
      </div>
    </div>
  ),
);
ZoneCard.displayName = "ZoneCard";

const LayoutSection = memo(({ toast }: { toast: (m: string) => void }) => {
  const [zones, setZones] = useState<ZoneConfig[]>(mockZones);
  const [activeTab, setActiveTab] = useState<"brand" | "operational">("brand");

  const updateZone = useCallback((updated: ZoneConfig) => {
    setZones((prev) => prev.map((z) => (z.id === updated.id ? updated : z)));
  }, []);

  const filtered = zones.filter((z) => z.group === activeTab);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Store Layout"
        description="Configure tracking zones, capacity limits and alert thresholds."
      />

      <div className="flex bg-[#161b27] border border-[#2a3347] rounded-lg overflow-hidden">
        {(["brand", "operational"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 py-2 text-xs font-medium transition-colors
              ${
                activeTab === tab
                  ? "bg-indigo-500/10 text-indigo-400 border-r border-indigo-500/20"
                  : "text-[#8892a4] hover:text-[#e8ecf4] hover:bg-white/[0.03]"
              }
            `}
          >
            {tab === "brand" ? "Brand Zones" : "Operational Zones"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((z) => (
          <ZoneCard key={z.id} zone={z} onChange={updateZone} />
        ))}
      </div>

      <div className="flex justify-end">
        <Btn
          variant="primary"
          onClick={() => toast("Zone configuration saved")}
        >
          <Save className="h-3.5 w-3.5" />
          Save Zones
        </Btn>
      </div>
    </div>
  );
});
LayoutSection.displayName = "LayoutSection";

// ── 3. Cameras ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<CameraConfig["status"], BadgeVariant> = {
  online: "green",
  degraded: "amber",
  offline: "red",
};

const CameraCard = memo(
  ({
    cam,
    onChange,
    onRestart,
  }: {
    cam: CameraConfig;
    onChange: (c: CameraConfig) => void;
    onRestart: (id: string) => void;
  }) => (
    <div className="bg-[#1e2436] border border-[#2a3347] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="h-3.5 w-3.5 text-[#8892a4]" aria-hidden="true" />
            <span className="text-xs font-bold text-[#e8ecf4] font-mono">
              {cam.id}
            </span>
          </div>
          <p className="text-[11px] text-[#5a6478] mt-0.5">{cam.zone}</p>
        </div>
        <Badge variant={STATUS_BADGE[cam.status]}>{cam.status}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: "Resolution", val: cam.resolution },
          { key: "FPS", val: `${cam.fps}fps` },
          { key: "Health", val: `${cam.health}%` },
        ].map((s) => (
          <div key={s.key} className="bg-[#161b27] rounded-lg p-2 text-center">
            <p
              className={`text-xs font-semibold font-mono ${
                s.key === "Health"
                  ? cam.health >= 80
                    ? "text-emerald-400"
                    : cam.health >= 40
                      ? "text-amber-400"
                      : "text-red-400"
                  : "text-[#e8ecf4]"
              }`}
            >
              {s.val}
            </p>
            <p className="text-[9px] text-[#5a6478] uppercase tracking-wider mt-0.5">
              {s.key}
            </p>
          </div>
        ))}
      </div>

      {/* Health bar */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-[#5a6478]">Stream health</span>
          <span className="text-[10px] text-[#8892a4]">{cam.health}%</span>
        </div>
        <div className="h-1.5 bg-[#252d40] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              cam.health >= 80
                ? "bg-emerald-500"
                : cam.health >= 40
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${cam.health}%` }}
            role="progressbar"
            aria-valuenow={cam.health}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#8892a4]">Detection</span>
          <Toggle
            checked={cam.detectionEnabled}
            onChange={(v) => onChange({ ...cam, detectionEnabled: v })}
            label={`Detection on ${cam.id}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#8892a4]">Tracking</span>
          <Toggle
            checked={cam.trackingEnabled}
            onChange={(v) => onChange({ ...cam, trackingEnabled: v })}
            label={`Tracking on ${cam.id}`}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Btn size="sm" variant="ghost" onClick={() => onRestart(cam.id)}>
          <RefreshCw className="h-3 w-3" />
          Restart
        </Btn>
        <Btn size="sm" variant="ghost">
          <Edit className="h-3 w-3" />
          Configure
        </Btn>
      </div>
    </div>
  ),
);
CameraCard.displayName = "CameraCard";

const CamerasSection = memo(({ toast }: { toast: (m: string) => void }) => {
  const [cameras, setCameras] = useState<CameraConfig[]>(mockCameras);

  const updateCam = useCallback((updated: CameraConfig) => {
    setCameras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  const restartCam = useCallback(
    (id: string) => {
      toast(`Restarting ${id}…`);
    },
    [toast],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Camera Configuration"
        description="Manage connected cameras, detection and tracking settings."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cameras.map((cam) => (
          <CameraCard
            key={cam.id}
            cam={cam}
            onChange={updateCam}
            onRestart={restartCam}
          />
        ))}
      </div>
    </div>
  );
});
CamerasSection.displayName = "CamerasSection";

// ── 4. Analytics ──────────────────────────────────────────────────────────────

const AnalyticsSection = memo(({ toast }: { toast: (m: string) => void }) => {
  const [s, setS] = useState(mockAnalyticsSettings);
  const set = (k: keyof typeof s, v: unknown) =>
    setS((p) => ({ ...p, [k]: v }));

  const toggleRows = [
    {
      key: "masterEnabled",
      label: "Master Analytics Engine",
      desc: "Enable all analytics processing pipelines",
    },
    {
      key: "heatmapsEnabled",
      label: "Visitor Heatmaps",
      desc: "Generate positional heatmaps from tracking data",
    },
    {
      key: "visitorTrackingEnabled",
      label: "Visitor Tracking",
      desc: "Track individual visitor journeys using ReID",
    },
    {
      key: "sessionTrackingEnabled",
      label: "Session Tracking",
      desc: "Group events into cohesive visitor sessions",
    },
    {
      key: "dwellTimeEnabled",
      label: "Dwell Time Analytics",
      desc: "Measure time-in-zone for engagement insights",
    },
    {
      key: "conversionEnabled",
      label: "Conversion Analytics",
      desc: "Track conversion events at checkout",
    },
    {
      key: "crossZoneJourneyEnabled",
      label: "Cross-Zone Journey",
      desc: "Map full visitor path through store",
    },
    {
      key: "repeatVisitorEnabled",
      label: "Repeat Visitor Detection",
      desc: "Identify returning customers across visits",
    },
  ] as const;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics Settings"
        description="Control which analytics modules are active and collecting data."
      />

      <Card>
        <SectionHeader title="Core Modules" />
        {toggleRows.map((r) => (
          <ToggleRow
            key={r.key}
            label={r.label}
            description={r.desc}
            checked={s[r.key] as boolean}
            onChange={(v) => set(r.key, v)}
          />
        ))}
      </Card>

      <Card>
        <SectionHeader title="Data Retention" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Event Retention (days)">
            <Input
              type="number"
              value={s.eventRetentionDays}
              min={7}
              max={365}
              onChange={(e) => set("eventRetentionDays", +e.target.value)}
            />
          </Field>
          <Field label="Session Retention (days)">
            <Input
              type="number"
              value={s.sessionRetentionDays}
              min={7}
              max={730}
              onChange={(e) => set("sessionRetentionDays", +e.target.value)}
            />
          </Field>
          <Field label="Heatmap Resolution">
            <Select
              value={s.heatmapResolution}
              onChange={(e) => set("heatmapResolution", e.target.value)}
            >
              <option value="high">High (64×64)</option>
              <option value="medium">Medium (32×32)</option>
              <option value="low">Low (16×16)</option>
            </Select>
          </Field>
          <Field label="Sampling Rate">
            <Select
              value={s.samplingRate}
              onChange={(e) => set("samplingRate", e.target.value)}
            >
              <option value="1:1">Every frame (1:1)</option>
              <option value="1:2">Every 2nd frame (1:2)</option>
              <option value="1:5">Every 5th frame (1:5)</option>
            </Select>
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Btn
          variant="primary"
          onClick={() => toast("Analytics settings saved")}
        >
          <Save className="h-3.5 w-3.5" />
          Save Changes
        </Btn>
      </div>
    </div>
  );
});
AnalyticsSection.displayName = "AnalyticsSection";

// ── 5. Alerts ─────────────────────────────────────────────────────────────────

interface ThresholdRowProps {
  label: string;
  description: string;
  value: number;
  max: number;
  accentClass: string;
  onChange: (v: number) => void;
}

const ThresholdRow = memo(
  ({
    label,
    description,
    value,
    max,
    accentClass,
    onChange,
  }: ThresholdRowProps) => (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-xs font-semibold text-[#e8ecf4]">{label}</p>
        <p className="text-[11px] text-[#5a6478]">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          className={`flex-1 h-1.5 cursor-pointer ${accentClass}`}
          aria-label={label}
        />
        <span className="text-xs font-bold font-mono text-indigo-400 min-w-[28px] text-right">
          {value}
        </span>
      </div>
    </div>
  ),
);
ThresholdRow.displayName = "ThresholdRow";

const AlertsSection = memo(({ toast }: { toast: (m: string) => void }) => {
  const [thresholds, setThresholds] = useState(mockAlertThresholds);
  const [methods, setMethods] = useState(mockNotificationMethods);
  const setT = (k: keyof typeof thresholds, v: number) =>
    setThresholds((p) => ({ ...p, [k]: v }));
  const setM = (k: keyof typeof methods, v: boolean) =>
    setMethods((p) => ({ ...p, [k]: v }));

  const thresholdRows = [
    {
      key: "crowdingThreshold",
      label: "Crowding Threshold",
      desc: "Persons per zone before HIGH alert",
      max: 30,
      accent: "accent-red-500",
    },
    {
      key: "queueLength",
      label: "Queue Length",
      desc: "Persons in queue before alert",
      max: 20,
      accent: "accent-amber-500",
    },
    {
      key: "lowEngagement",
      label: "Low Engagement",
      desc: "Min visitors per zone per hour",
      max: 20,
      accent: "accent-blue-500",
    },
    {
      key: "highDwellMinutes",
      label: "High Dwell Time (mins)",
      desc: "Minutes before dwell anomaly fires",
      max: 60,
      accent: "accent-amber-500",
    },
    {
      key: "lowConversionPercent",
      label: "Low Conversion (%)",
      desc: "Conversion % below which alert fires",
      max: 50,
      accent: "accent-red-500",
    },
    {
      key: "cameraOfflineMinutes",
      label: "Camera Offline (mins)",
      desc: "Minutes before offline alert",
      max: 30,
      accent: "accent-slate-500",
    },
  ] as const;

  const methodRows = [
    {
      key: "dashboard",
      label: "Dashboard Alerts",
      desc: "Show alerts in the live dashboard panel",
    },
    {
      key: "email",
      label: "Email Notifications",
      desc: "Send alert digests to configured emails",
    },
    {
      key: "slack",
      label: "Slack Integration",
      desc: "Post alerts to your Slack channel",
    },
    {
      key: "push",
      label: "Push Notifications",
      desc: "Browser push for critical alerts",
    },
  ] as const;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Alert Settings"
        description="Define thresholds and notification delivery methods."
      />

      <Card>
        <SectionHeader title="Thresholds" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {thresholdRows.map((r) => (
            <ThresholdRow
              key={r.key}
              label={r.label}
              description={r.desc}
              value={thresholds[r.key]}
              max={r.max}
              accentClass={r.accent}
              onChange={(v) => setT(r.key, v)}
            />
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Notification Methods" />
        {methodRows.map((r) => (
          <ToggleRow
            key={r.key}
            label={r.label}
            description={r.desc}
            checked={methods[r.key]}
            onChange={(v) => setM(r.key, v)}
          />
        ))}
      </Card>

      <div className="flex justify-end">
        <Btn variant="primary" onClick={() => toast("Alert settings saved")}>
          <Save className="h-3.5 w-3.5" />
          Save Changes
        </Btn>
      </div>
    </div>
  );
});
AlertsSection.displayName = "AlertsSection";

// ── 6. Dashboard ──────────────────────────────────────────────────────────────

const DashboardSection = memo(({ toast }: { toast: (m: string) => void }) => {
  const [s, setS] = useState(mockDashboardSettings);
  const set = (k: keyof typeof s, v: unknown) =>
    setS((p) => ({ ...p, [k]: v }));

  const displayRows = [
    {
      key: "compactMode",
      label: "Compact Mode",
      desc: "Reduce card padding for higher information density",
    },
    {
      key: "showHeatmap",
      label: "Show Heatmap Overlay",
      desc: "Display live heatmap on store floor plan",
    },
    {
      key: "showLiveTracking",
      label: "Show Live Tracking",
      desc: "Show visitor trails on real-time map",
    },
    {
      key: "showAlerts",
      label: "Show Alert Panel",
      desc: "Persistent alert centre in dashboard sidebar",
    },
    {
      key: "showKpiCards",
      label: "Show KPI Cards",
      desc: "Display top-row KPI summary cards",
    },
  ] as const;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard Preferences"
        description="Customise the live dashboard experience."
      />

      <Card>
        <SectionHeader title="Display Options" />
        {displayRows.map((r) => (
          <ToggleRow
            key={r.key}
            label={r.label}
            description={r.desc}
            checked={s[r.key] as boolean}
            onChange={(v) => set(r.key, v)}
          />
        ))}
      </Card>

      <Card>
        <SectionHeader title="Auto Refresh" />
        <ToggleRow
          label="Enable Auto Refresh"
          description="Automatically reload dashboard data"
          checked={s.autoRefresh}
          onChange={(v) => set("autoRefresh", v)}
        />
        <div
          className={`flex items-center justify-between pt-3 transition-opacity ${s.autoRefresh ? "opacity-100" : "opacity-40 pointer-events-none"}`}
        >
          <div>
            <p className="text-xs font-medium text-[#e8ecf4]">
              Refresh Interval
            </p>
            <p className="text-[11px] text-[#5a6478] mt-0.5">
              How often data is polled from the API
            </p>
          </div>
          <Select
            value={s.refreshInterval}
            onChange={(e) => set("refreshInterval", +e.target.value)}
            disabled={!s.autoRefresh}
          >
            {([5, 10, 30, 60] as const).map((v) => (
              <option key={v} value={v}>
                {v} seconds
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <div className="flex justify-end">
        <Btn
          variant="primary"
          onClick={() => toast("Dashboard preferences saved")}
        >
          <Save className="h-3.5 w-3.5" />
          Save Changes
        </Btn>
      </div>
    </div>
  );
});
DashboardSection.displayName = "DashboardSection";

// ── 7. API ────────────────────────────────────────────────────────────────────

const ApiSection = memo(({ toast }: { toast: (m: string) => void }) => {
  const [s, setS] = useState(mockApiSettings);
  const [showKey, setShowKey] = useState(false);
  const set = (k: keyof typeof s, v: string) => setS((p) => ({ ...p, [k]: v }));

  const endpointFields = [
    { key: "baseUrl", label: "FastAPI Base URL" },
    { key: "wsUrl", label: "WebSocket URL" },
    { key: "healthEndpoint", label: "Health Endpoint" },
  ] as const;

  return (
    <div className="space-y-4">
      <PageHeader
        title="API Integration"
        description="Configure backend endpoints for the FastAPI service."
      />

      <Card>
        <SectionHeader
          title="Endpoints"
          description="Base URLs and health check configuration"
        />
        <div className="space-y-4">
          {endpointFields.map((f) => (
            <Field key={f.key} label={f.label}>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  value={s[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                />
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => toast("Connection test passed ✓")}
                >
                  <Plug className="h-3 w-3" />
                  Test
                </Btn>
              </div>
            </Field>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Connection Status" />
        {mockConnectionStatuses.map((c) => (
          <div
            key={c.service}
            className="flex items-center justify-between py-2.5 border-b border-[#2a3347] last:border-0"
          >
            <div>
              <p className="text-xs font-medium text-[#e8ecf4]">{c.service}</p>
              <p className="text-[11px] text-[#5a6478] mt-0.5">
                {c.description}
              </p>
            </div>
            <Badge variant={c.connected ? "green" : "red"}>
              {c.connected ? "connected" : "offline"}
            </Badge>
          </div>
        ))}
      </Card>

      <Card>
        <SectionHeader title="API Keys" />
        <Field label="Service API Key">
          <div className="flex gap-2">
            <Input
              className="flex-1"
              type={showKey ? "text" : "password"}
              value={s.apiKey}
              onChange={(e) => set("apiKey", e.target.value)}
            />
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </Btn>
            <Btn
              size="sm"
              variant="ghost"
              onClick={() =>
                toast("Key regenerated — please update integrations")
              }
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </Btn>
          </div>
        </Field>
      </Card>
    </div>
  );
});
ApiSection.displayName = "ApiSection";

// ── 8. Users ──────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<TeamUser["role"], BadgeVariant> = {
  Admin: "accent",
  Manager: "blue",
  Viewer: "gray",
};

const UsersSection = memo(
  ({
    toast,
    confirm,
  }: {
    toast: (m: string) => void;
    confirm: (m: ModalState) => void;
  }) => {
    const [users, setUsers] = useState<TeamUser[]>(mockUsers);

    const removeUser = useCallback(
      (id: string) => {
        confirm({
          open: true,
          title: "Remove User",
          description:
            "Are you sure you want to remove this user? They will lose all access immediately. This action cannot be undone.",
          confirmLabel: "Remove User",
          onConfirm: () => {
            setUsers((prev) => prev.filter((u) => u.id !== id));
            toast("User removed");
          },
        });
      },
      [confirm, toast],
    );

    return (
      <div className="space-y-4">
        <PageHeader
          title="User Management"
          description="Manage team members and their access levels."
        />

        <Card>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2a3347]">
            <div>
              <h3 className="text-sm font-semibold text-[#e8ecf4]">
                Team Members
              </h3>
              <p className="text-xs text-[#5a6478] mt-0.5">
                {users.length} users across this store
              </p>
            </div>
            <Btn
              variant="primary"
              size="sm"
              onClick={() => toast("Invite email sent")}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite User
            </Btn>
          </div>

          <div className="space-y-0">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 py-3 border-b border-[#2a3347] last:border-0"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{
                    background: `${u.avatarColor}22`,
                    color: u.avatarColor,
                  }}
                  aria-hidden="true"
                >
                  {u.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#e8ecf4] truncate">
                    {u.name}
                  </p>
                  <p className="text-[11px] text-[#5a6478] truncate">
                    {u.email}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={ROLE_BADGE[u.role]}>{u.role}</Badge>
                  <Badge variant={u.status === "active" ? "green" : "red"}>
                    {u.status}
                  </Badge>
                  <Btn size="sm" variant="ghost" aria-label={`Edit ${u.name}`}>
                    <Edit className="h-3 w-3" />
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${u.name}`}
                    onClick={() => removeUser(u.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  },
);
UsersSection.displayName = "UsersSection";

// ── 9. System Info ────────────────────────────────────────────────────────────

const SystemSection = memo(() => {
  const info = mockSystemInfo;

  const metricCards = [
    { label: "App Version", value: info.appVersion },
    { label: "Backend Version", value: info.backendVersion },
    { label: "Python Runtime", value: info.pythonRuntime },
    { label: "System Uptime", value: info.uptime },
    { label: "Total Events", value: info.totalEvents },
    { label: "Total Sessions", value: info.totalSessions },
    { label: "Total Visitors", value: info.totalVisitors },
    { label: "Database Size", value: info.databaseSize },
  ];

  const infraRows = [
    { label: "Database Type", value: info.databaseType },
    { label: "Cache Layer", value: info.cacheLayer },
    { label: "ML Framework", value: info.mlFramework },
    { label: "Deployment", value: info.deployment },
    { label: "OS / Host", value: info.os },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="System Information"
        description="Read-only runtime and deployment diagnostics."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="bg-[#1e2436] border border-[#2a3347] rounded-lg p-3 text-center"
          >
            <p className="text-sm font-bold font-mono text-[#e8ecf4]">
              {m.value}
            </p>
            <p className="text-[10px] text-[#5a6478] uppercase tracking-wider mt-1">
              {m.label}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <SectionHeader title="Infrastructure" />
        {infraRows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between py-2.5 border-b border-[#2a3347] last:border-0"
          >
            <span className="text-xs text-[#e8ecf4]">{r.label}</span>
            <span className="text-xs font-mono text-indigo-400">{r.value}</span>
          </div>
        ))}
      </Card>
    </div>
  );
});
SystemSection.displayName = "SystemSection";

// ── 10. Backup & Export ───────────────────────────────────────────────────────

const BackupSection = memo(({ toast }: { toast: (m: string) => void }) => {
  const exportCards = [
    {
      title: "Export Analytics",
      desc: "Full analytics summary as CSV or JSON",
    },
    { title: "Export Events", desc: "Raw event stream data (last 90 days)" },
    { title: "Export Sessions", desc: "Visitor session records with metadata" },
    { title: "Export Visitors", desc: "De-identified visitor profiles" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Backup & Export"
        description="Export analytics data and manage database backups."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {exportCards.map((e) => (
          <div
            key={e.title}
            className="bg-[#1e2436] border border-[#2a3347] rounded-xl p-4 flex flex-col gap-3"
          >
            <div>
              <p className="text-xs font-semibold text-[#e8ecf4]">{e.title}</p>
              <p className="text-[11px] text-[#5a6478] mt-0.5">{e.desc}</p>
            </div>
            <div className="flex gap-2">
              <Btn
                size="sm"
                variant="ghost"
                onClick={() => toast("Preparing CSV export…")}
              >
                <Download className="h-3 w-3" />
                CSV
              </Btn>
              <Btn
                size="sm"
                variant="ghost"
                onClick={() => toast("Preparing JSON export…")}
              >
                <Download className="h-3 w-3" />
                JSON
              </Btn>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <SectionHeader title="Database Backup" />
        <div className="flex gap-2 mb-4">
          <Btn
            variant="ghost"
            onClick={() => toast("Database backup initiated…")}
          >
            <DatabaseBackup className="h-3.5 w-3.5" />
            Backup Now
          </Btn>
          <Btn
            variant="ghost"
            onClick={() => toast("Select backup file to restore")}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Restore Backup
          </Btn>
        </div>
        <div>
          {mockBackups.map((b, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2.5 border-b border-[#2a3347] last:border-0"
            >
              <div>
                <p className="text-xs font-mono text-[#e8ecf4]">{b.name}</p>
                <p className="text-[11px] text-[#5a6478] mt-0.5">
                  {b.size} · {b.type}
                </p>
              </div>
              <Btn
                size="sm"
                variant="ghost"
                onClick={() => toast("Downloading backup…")}
              >
                <Download className="h-3 w-3" />
              </Btn>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
});
BackupSection.displayName = "BackupSection";

// ── 11. Theme ─────────────────────────────────────────────────────────────────

const ThemeSection = memo(({ toast }: { toast: (m: string) => void }) => {
  const [s, setS] = useState(mockThemeSettings);

  const accents = [
    { key: "indigo", color: "#6366f1", label: "Indigo" },
    { key: "blue", color: "#3b82f6", label: "Blue" },
    { key: "emerald", color: "#10b981", label: "Emerald" },
    { key: "amber", color: "#f59e0b", label: "Amber" },
    { key: "rose", color: "#e11d48", label: "Rose" },
    { key: "violet", color: "#8b5cf6", label: "Violet" },
  ] as const;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Theme Settings"
        description="Customise dashboard appearance and accent colours."
      />

      <Card>
        <SectionHeader title="Colour Scheme" />
        <div className="flex gap-2">
          {(["dark", "light", "system"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setS((p) => ({ ...p, mode }));
                toast("Theme preference saved");
              }}
              className={`
                px-4 py-2 rounded-lg text-xs font-medium capitalize
                border transition-all duration-150 outline-none
                focus-visible:ring-2 focus-visible:ring-indigo-500/50
                ${
                  s.mode === mode
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                    : "border-[#2a3347] text-[#8892a4] hover:text-[#e8ecf4] hover:border-[#3a4560]"
                }
              `}
            >
              {mode}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Accent Colour" />
        <div className="flex gap-3 flex-wrap">
          {accents.map((a) => (
            <div key={a.key} className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => {
                  setS((p) => ({ ...p, accent: a.key }));
                  toast("Accent colour updated");
                }}
                aria-label={`Set accent to ${a.label}`}
                className={`
                  w-7 h-7 rounded-full transition-all outline-none
                  focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500/50
                  ${s.accent === a.key ? "ring-2 ring-offset-2 ring-offset-[#161b27] ring-white/40" : ""}
                `}
                style={{ background: a.color }}
              />
              <span className="text-[10px] text-[#5a6478]">{a.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Typography" />
        <ToggleRow
          label="Compact Typography"
          description="Tighter line-height and smaller base font"
          checked={s.compactTypography}
          onChange={(v) => setS((p) => ({ ...p, compactTypography: v }))}
        />
        <ToggleRow
          label="Monospace Interface"
          description="Use monospace font throughout the UI"
          checked={s.monospaceInterface}
          onChange={(v) => setS((p) => ({ ...p, monospaceInterface: v }))}
        />
      </Card>
    </div>
  );
});
ThemeSection.displayName = "ThemeSection";

// ── 12. Notifications ─────────────────────────────────────────────────────────

const NotificationsSection = memo(
  ({ toast }: { toast: (m: string) => void }) => {
    const [s, setS] = useState(mockNotificationSettings);
    const set = (k: keyof typeof s, v: unknown) =>
      setS((p) => ({ ...p, [k]: v }));

    const channelRows = [
      {
        key: "emailAlerts",
        label: "Email Alerts",
        desc: "Critical and high-severity alerts",
      },
      {
        key: "pushAlerts",
        label: "Push Notifications",
        desc: "Browser push for real-time alerts",
      },
      {
        key: "slackAlerts",
        label: "Slack Alerts",
        desc: "Post to #store-alerts channel",
      },
    ] as const;

    const reportRows = [
      {
        key: "dailySummary",
        label: "Daily Summary",
        desc: "Sent at 09:00 IST every day",
      },
      {
        key: "weeklyReport",
        label: "Weekly Report",
        desc: "Sent every Monday at 09:00 IST",
      },
      {
        key: "monthlyReport",
        label: "Monthly Report",
        desc: "First of each month — full analytics",
      },
      {
        key: "anomalyDigest",
        label: "Anomaly Digest",
        desc: "Grouped anomaly report every 6 hours",
      },
    ] as const;

    return (
      <div className="space-y-4">
        <PageHeader
          title="Notification Centre"
          description="Configure alert delivery and reporting schedules."
        />

        <Card>
          <SectionHeader title="Alert Channels" />
          {channelRows.map((r) => (
            <ToggleRow
              key={r.key}
              label={r.label}
              description={r.desc}
              checked={s[r.key]}
              onChange={(v) => set(r.key, v)}
            />
          ))}
        </Card>

        <Card>
          <SectionHeader title="Scheduled Reports" />
          {reportRows.map((r) => (
            <ToggleRow
              key={r.key}
              label={r.label}
              description={r.desc}
              checked={s[r.key]}
              onChange={(v) => set(r.key, v)}
            />
          ))}
        </Card>

        <Card>
          <SectionHeader title="Email Recipients" />
          <div className="space-y-4">
            <Field label="Report Recipients">
              <Input
                value={s.reportRecipients}
                onChange={(e) => set("reportRecipients", e.target.value)}
              />
            </Field>
            <Field label="Alert Recipients">
              <Input
                value={s.alertRecipients}
                onChange={(e) => set("alertRecipients", e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end">
          <Btn
            variant="primary"
            onClick={() => toast("Notification settings saved")}
          >
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </Btn>
        </div>
      </div>
    );
  },
);
NotificationsSection.displayName = "NotificationsSection";

// ── 13. Advanced ──────────────────────────────────────────────────────────────

const AdvancedSection = memo(
  ({
    toast,
    confirm,
  }: {
    toast: (m: string) => void;
    confirm: (m: ModalState) => void;
  }) => {
    const dangerActions = [
      {
        label: "Reset Analytics",
        desc: "Permanently delete ALL analytics data including heatmaps, sessions, and visitor records.",
        confirmLabel: "Reset Everything",
        onConfirm: () => toast("Analytics reset initiated"),
      },
      {
        label: "Reset Dashboard",
        desc: "All dashboard customisations will be reverted to factory defaults.",
        confirmLabel: "Reset Dashboard",
        onConfirm: () => toast("Dashboard reset to defaults"),
      },
      {
        label: "Delete Test Data",
        desc: "All records flagged as test data will be permanently removed from the database.",
        confirmLabel: "Delete",
        onConfirm: () => toast("Test data deleted"),
      },
    ];

    return (
      <div className="space-y-4">
        <PageHeader
          title="Advanced Settings"
          description="Developer tools and system reset operations."
        />

        <Card>
          <SectionHeader title="Developer Tools" />
          <div className="flex flex-wrap gap-2">
            <Btn
              variant="ghost"
              onClick={() => toast("Application cache cleared")}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Cache
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => toast("Log level set to DEBUG")}
            >
              <Code2 className="h-3.5 w-3.5" />
              Debug Logging
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => toast("Mock data seeded successfully")}
            >
              <Zap className="h-3.5 w-3.5" />
              Seed Test Data
            </Btn>
          </div>
        </Card>

        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle
              className="h-4 w-4 text-red-400"
              aria-hidden="true"
            />
            <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
          </div>
          <p className="text-xs text-[#8892a4] mb-4">
            These actions are irreversible. All operations require confirmation.
          </p>
          <div className="flex flex-wrap gap-2">
            {dangerActions.map((a) => (
              <Btn
                key={a.label}
                variant="danger"
                onClick={() =>
                  confirm({
                    open: true,
                    title: a.label,
                    description: a.desc,
                    confirmLabel: a.confirmLabel,
                    onConfirm: a.onConfirm,
                  })
                }
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {a.label}
              </Btn>
            ))}
          </div>
        </div>
      </div>
    );
  },
);
AdvancedSection.displayName = "AdvancedSection";

// ─────────────────────────────────────────────────────────────────────────────
// PAGE HEADER
// ─────────────────────────────────────────────────────────────────────────────

const PageHeader = memo(
  ({ title, description }: { title: string; description?: string }) => (
    <div className="mb-2">
      <h2 className="text-lg font-bold text-[#e8ecf4] tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="text-xs text-[#8892a4] mt-1">{description}</p>
      )}
    </div>
  ),
);
PageHeader.displayName = "PageHeader";

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────

const Toast = memo(({ message, visible }: ToastState) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className="
          fixed bottom-6 right-6 z-[100]
          flex items-center gap-3
          px-4 py-3 rounded-xl
          bg-[#161b27] border border-[#2a3347]
          shadow-2xl shadow-black/50
          text-sm text-[#e8ecf4]
          pointer-events-none
        "
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        {message}
      </motion.div>
    )}
  </AnimatePresence>
));
Toast.displayName = "Toast";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM MODAL
// ─────────────────────────────────────────────────────────────────────────────

const ConfirmModal = memo(
  ({ state, onClose }: { state: ModalState; onClose: () => void }) => (
    <AnimatePresence>
      {state.open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-sm bg-[#161b27] border border-[#2a3347] rounded-xl p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle
                  className="h-4 w-4 text-red-400"
                  aria-hidden="true"
                />
                <h3
                  id="modal-title"
                  className="text-sm font-semibold text-[#e8ecf4]"
                >
                  {state.title}
                </h3>
              </div>
              <p className="text-xs text-[#8892a4] leading-relaxed mb-5">
                {state.description}
              </p>
              <div className="flex justify-end gap-2">
                <Btn variant="ghost" onClick={onClose}>
                  Cancel
                </Btn>
                <Btn
                  variant="danger"
                  onClick={() => {
                    state.onConfirm();
                    onClose();
                  }}
                >
                  {state.confirmLabel ?? "Confirm"}
                </Btn>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  ),
);
ConfirmModal.displayName = "ConfirmModal";

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────

const NAV_GROUPS = Array.from(new Set(NAV_ITEMS.map((n) => n.group)));

export default function SettingsPage() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("general");

  // Toast
  const [toastState, setToastState] = useState<ToastState>({
    message: "",
    visible: false,
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastState({ message, visible: true });
    toastTimer.current = setTimeout(
      () => setToastState((p) => ({ ...p, visible: false })),
      2800,
    );
  }, []);

  // Confirm modal
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });
  const closeModal = useCallback(
    () => setModalState((p) => ({ ...p, open: false })),
    [],
  );

  // Cleanup
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  // Section renderer
  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return <GeneralSection toast={showToast} />;
      case "layout":
        return <LayoutSection toast={showToast} />;
      case "cameras":
        return <CamerasSection toast={showToast} />;
      case "analytics":
        return <AnalyticsSection toast={showToast} />;
      case "alerts":
        return <AlertsSection toast={showToast} />;
      case "dashboard":
        return <DashboardSection toast={showToast} />;
      case "api":
        return <ApiSection toast={showToast} />;
      case "users":
        return <UsersSection toast={showToast} confirm={setModalState} />;
      case "system":
        return <SystemSection />;
      case "backup":
        return <BackupSection toast={showToast} />;
      case "theme":
        return <ThemeSection toast={showToast} />;
      case "notifications":
        return <NotificationsSection toast={showToast} />;
      case "advanced":
        return <AdvancedSection toast={showToast} confirm={setModalState} />;
    }
  };

  return (
    <div className="flex h-full min-h-0 bg-[#0f1117] font-mono text-[#e8ecf4]">
      {/* ── Sidebar nav ── */}
      <nav
        className="
          hidden md:flex flex-col shrink-0
          w-52 h-full
          bg-[#161b27] border-r border-[#2a3347]
          overflow-y-auto
        "
        aria-label="Settings navigation"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Logo strip */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[#2a3347]">
          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center shrink-0">
            <Shield className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#e8ecf4]">Settings</p>
            <p className="text-[10px] text-[#5a6478]">Admin Console</p>
          </div>
        </div>

        <div className="flex-1 py-3 px-2 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group}>
              <p className="px-2 mb-1 text-[10px] font-semibold text-[#5a6478] uppercase tracking-widest">
                {group}
              </p>
              <div className="space-y-0.5">
                {NAV_ITEMS.filter((n) => n.group === group).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`
                      w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium
                      transition-all duration-150 outline-none
                      focus-visible:ring-2 focus-visible:ring-indigo-500/50
                      ${
                        activeSection === item.id
                          ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                          : "text-[#8892a4] hover:text-[#e8ecf4] hover:bg-white/[0.04] border border-transparent"
                      }
                      ${item.id === "advanced" ? "text-red-400/70 hover:text-red-400" : ""}
                    `}
                    aria-current={
                      activeSection === item.id ? "page" : undefined
                    }
                  >
                    <item.icon
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                    {activeSection === item.id && (
                      <ChevronRight className="h-3 w-3 ml-auto text-indigo-400/60 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Status footer */}
        <div className="p-3 border-t border-[#2a3347]">
          <div className="flex items-center gap-2 px-2 py-2 bg-[#1e2436] rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <span className="text-[11px] text-[#8892a4]">
              All systems operational
            </span>
          </div>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 overflow-y-auto" id="settings-content">
        <div className="max-w-3xl w-full px-6 py-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Global overlays ── */}
      <Toast message={toastState.message} visible={toastState.visible} />
      <ConfirmModal state={modalState} onClose={closeModal} />
    </div>
  );
}
