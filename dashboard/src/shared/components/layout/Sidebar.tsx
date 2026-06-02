import React, { memo, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Map,
  Users,
  Clock,
  Activity,
  BarChart3,
  Settings,
  Store,
  Zap,
  ChevronLeft,
} from "lucide-react";
import { useLayoutStore } from "@/store/layoutStore";

// ─── Nav config ────────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Analytics",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "Store Map", path: "/store-map", icon: Map },
      { name: "Analytics", path: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { name: "Visitors", path: "/visitors", icon: Users },
      { name: "Sessions", path: "/sessions", icon: Clock },
      { name: "Events", path: "/events", icon: Activity },
    ],
  },
  {
    label: "System",
    items: [{ name: "Settings", path: "/settings", icon: Settings }],
  },
];

// ─── Tooltip ────────────────────────────────────────────────────────────────────

function NavTooltip({ label }: { label: string }) {
  return (
    <div
      className="
        absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
        pointer-events-none opacity-0 group-hover:opacity-100
        transition-opacity duration-150
      "
      role="tooltip"
    >
      <div
        className="
        px-2.5 py-1 rounded-md
        bg-[#111827] border border-[#1F2937]
        text-xs font-medium text-slate-200
        whitespace-nowrap shadow-xl
      "
      >
        {label}
      </div>
    </div>
  );
}

// ─── Single nav item ────────────────────────────────────────────────────────────

interface NavItemProps {
  name: string;
  path: string;
  icon: React.ElementType;
  collapsed: boolean;
}

function NavItem({ name, path, icon: Icon, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) => `
        relative group flex items-center
        ${collapsed ? "justify-center px-0 py-2.5 mx-2" : "gap-3 px-3 py-2.5 mx-0"}
        rounded-lg text-sm font-medium
        transition-all duration-150 outline-none
        focus-visible:ring-2 focus-visible:ring-violet-500/50
        ${
          isActive
            ? "bg-violet-500/10 text-violet-300 border border-violet-500/20"
            : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] border border-transparent"
        }
      `}
      aria-label={name}
    >
      {({ isActive }) => (
        <>
          <Icon
            className={`h-[18px] w-[18px] shrink-0 transition-colors ${
              isActive
                ? "text-violet-400"
                : "text-slate-500 group-hover:text-slate-300"
            }`}
            aria-hidden="true"
          />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden whitespace-nowrap"
              >
                {name}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Active indicator dot */}
          {isActive && (
            <motion.span
              layoutId="sidebar-active-indicator"
              className={`
                absolute
                ${
                  collapsed
                    ? "right-1.5 top-1.5 w-1.5 h-1.5 rounded-full bg-violet-500"
                    : "right-3 w-1.5 h-1.5 rounded-full bg-violet-400"
                }
              `}
            />
          )}

          {/* Tooltip (collapsed only) */}
          {collapsed && <NavTooltip label={name} />}
        </>
      )}
    </NavLink>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────────

export const Sidebar = memo(function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useLayoutStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarCollapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="
        hidden md:flex flex-col shrink-0
        h-screen
        bg-[#09090B] border-r border-[#1F2937]
        overflow-hidden relative
      "
      aria-label="Sidebar navigation"
    >
      {/* ── Logo ── */}
      <div
        className={`
        flex h-[72px] shrink-0 items-center
        border-b border-[#1F2937]
        ${isSidebarCollapsed ? "justify-center px-0" : "px-4 gap-3"}
      `}
      >
        <div
          className="
          w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center
          shrink-0 shadow-lg shadow-violet-900/30
        "
        >
          <Zap
            className="h-4 w-4 text-white"
            fill="currentColor"
            aria-hidden="true"
          />
        </div>

        <AnimatePresence initial={false}>
          {!isSidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <p className="text-sm font-bold text-slate-100 whitespace-nowrap tracking-tight">
                StoreIQ
              </p>
              <p className="text-[10px] text-slate-600 whitespace-nowrap tracking-widest uppercase">
                Intelligence Platform
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Navigation ── */}
      <nav
        className="flex-1 overflow-y-auto py-4 space-y-5 px-2"
        style={{ scrollbarWidth: "none" }}
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <AnimatePresence initial={false}>
              {!isSidebarCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="
                    px-3 mb-1.5
                    text-[10px] font-semibold tracking-widest uppercase
                    text-slate-600
                  "
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.path}
                  {...item}
                  collapsed={isSidebarCollapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Collapse toggle ── */}
      <div className="shrink-0 border-t border-[#1F2937] p-3">
        <button
          onClick={toggleSidebar}
          aria-label={
            isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          className="
            w-full flex items-center justify-center gap-2
            py-2 px-3 rounded-lg
            text-slate-600 hover:text-slate-300
            hover:bg-white/[0.05]
            transition-all duration-150
            focus-visible:ring-2 focus-visible:ring-violet-500/50 outline-none
          "
        >
          <motion.div
            animate={{ rotate: isSidebarCollapsed ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
          <AnimatePresence initial={false}>
            {!isSidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="text-xs font-medium overflow-hidden whitespace-nowrap"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
});
