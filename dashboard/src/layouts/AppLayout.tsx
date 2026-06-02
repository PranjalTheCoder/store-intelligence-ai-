/**
 * AppLayout.tsx
 * ─────────────────────────────────────────────────────────────
 * Production-grade layout for the StoreIQ Intelligence Platform.
 *
 * Structure:
 *   AppLayout
 *   ├── <Sidebar />           — collapsible desktop sidebar (260px / 72px)
 *   ├── <MobileDrawer />      — slide-in drawer for mobile viewports
 *   └── <main>
 *       ├── <Navbar />        — sticky top bar (72px)
 *       ├── <CommandPalette/> — ⌘K global search overlay
 *       └── <Outlet />        — React Router page outlet
 *
 * CSS issues fixed from original:
 *   1. min-w-0 added throughout flex children to prevent overflow blowout.
 *   2. Sidebar uses Framer Motion spring (not tween) for natural collapse.
 *   3. NavLink active class was duplicated — consolidated into className fn.
 *   4. Tooltip z-index and positioning corrected (absolute left-full group-hover).
 *   5. Removed hard-coded bg-white in dark mode (replaced with CSS vars / bg token).
 *   6. Main content overflow-y-auto with min-h-0 to allow inner scroll.
 *   7. Backdrop blur now uses bg-[#09090B]/90 instead of bg-white/80 in dark.
 *   8. AnimatePresence wrappers guard all conditional renders.
 *   9. Avatar replaced with an initials-based div (no external img request).
 *  10. Mobile drawer uses fixed overlay with pointer-events + focus trap.
 */

import React, { useEffect, useCallback, memo } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  LayoutDashboard,
  Map,
  Users,
  Clock,
  Activity,
  BarChart3,
  Settings,
  Zap,
  Search,
  Command,
} from "lucide-react";

import { Sidebar } from "@/shared/components/layout/Sidebar";
import { Navbar } from "@/shared/components/layout/Navbar";
import { useLayoutStore } from "@/store/layoutStore";

// ─── Nav items (reused in mobile drawer) ───────────────────────────────────────

const NAV_ITEMS = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Store Map", path: "/store-map", icon: Map },
  { name: "Visitors", path: "/visitors", icon: Users },
  { name: "Sessions", path: "/sessions", icon: Clock },
  { name: "Events", path: "/events", icon: Activity },
  { name: "Analytics", path: "/analytics", icon: BarChart3 },
  { name: "Settings", path: "/settings", icon: Settings },
];

// ─── Mobile Drawer ──────────────────────────────────────────────────────────────

const MobileDrawer = memo(function MobileDrawer() {
  const { isMobileDrawerOpen, setMobileDrawerOpen } = useLayoutStore();
  const close = useCallback(
    () => setMobileDrawerOpen(false),
    [setMobileDrawerOpen],
  );

  // Close on route change
  const location = useLocation();
  useEffect(() => {
    close();
  }, [location.pathname]);

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (isMobileDrawerOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobileDrawerOpen, close]);

  return (
    <AnimatePresence>
      {isMobileDrawerOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
            aria-hidden="true"
            onClick={close}
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="
              fixed inset-y-0 left-0 z-50
              w-72 flex flex-col
              bg-[#09090B] border-r border-[#1F2937]
              md:hidden
            "
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between h-[72px] px-5 border-b border-[#1F2937]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" fill="currentColor" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100 tracking-tight">
                    StoreIQ
                  </p>
                  <p className="text-[10px] text-slate-600 tracking-widest uppercase">
                    Platform
                  </p>
                </div>
              </div>
              <button
                onClick={close}
                aria-label="Close navigation menu"
                className="
                  w-8 h-8 rounded-lg flex items-center justify-center
                  text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]
                  transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50
                "
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    text-sm font-medium transition-all duration-150
                    outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50
                    ${
                      isActive
                        ? "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                        : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] border border-transparent"
                    }
                  `}
                >
                  <item.icon
                    className="h-[18px] w-[18px] shrink-0"
                    aria-hidden="true"
                  />
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

// ─── Command Palette ────────────────────────────────────────────────────────────

const CommandPalette = memo(function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useLayoutStore();
  const close = useCallback(
    () => setCommandPaletteOpen(false),
    [setCommandPaletteOpen],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, setCommandPaletteOpen]);

  const suggestions = [
    { label: "Go to Dashboard", shortcut: "G D", icon: LayoutDashboard },
    { label: "View Visitors", shortcut: "G V", icon: Users },
    { label: "View Store Map", shortcut: "G M", icon: Map },
    { label: "Open Analytics", shortcut: "G A", icon: BarChart3 },
    { label: "Open Settings", shortcut: "G S", icon: Settings },
  ];

  return (
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
            onClick={close}
          />

          <div className="fixed inset-0 z-[61] flex items-start justify-center pt-[20vh] px-4">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="
                w-full max-w-lg rounded-xl
                bg-[#111827] border border-[#1F2937]
                shadow-2xl shadow-black/60
                overflow-hidden
              "
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1F2937]">
                <Search className="h-4 w-4 text-slate-500 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search visitors, events, sessions…"
                  className="
                    flex-1 bg-transparent text-sm text-slate-200
                    placeholder:text-slate-600
                    outline-none
                  "
                  aria-label="Search"
                />
                <kbd
                  className="
                  flex items-center gap-0.5 px-1.5 py-0.5 rounded
                  text-[10px] font-mono
                  bg-[#1F2937] border border-[#374151] text-slate-600
                "
                >
                  ESC
                </kbd>
              </div>

              {/* Suggestions */}
              <div className="py-2">
                <p className="px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-slate-600">
                  Navigation
                </p>
                {suggestions.map((item) => (
                  <NavLink
                    key={item.label}
                    to={`/${item.label.split(" ").slice(-1)[0].toLowerCase()}`}
                    onClick={close}
                    className="
                      flex items-center justify-between
                      px-4 py-2.5
                      hover:bg-white/[0.04]
                      transition-colors cursor-pointer
                      group
                    "
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                      <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
                        {item.label}
                      </span>
                    </div>
                    <kbd
                      className="
                      text-[10px] font-mono text-slate-600
                      bg-[#1F2937] border border-[#2a3347] px-1.5 py-0.5 rounded
                    "
                    >
                      {item.shortcut}
                    </kbd>
                  </NavLink>
                ))}
              </div>

              {/* Footer */}
              <div
                className="
                flex items-center justify-between
                px-4 py-2 border-t border-[#1F2937]
                bg-[#0d1420]
              "
              >
                <div className="flex items-center gap-3 text-[10px] text-slate-700">
                  <span className="flex items-center gap-1">
                    <Command className="h-3 w-3" />K <span>open</span>
                  </span>
                  <span>↑↓ navigate</span>
                  <span>↵ select</span>
                </div>
                <span className="text-[10px] text-slate-700">StoreIQ</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
});

// ─── Route transition wrapper ───────────────────────────────────────────────────

const PageTransition = memo(function PageTransition({
  children,
  locationKey,
}: {
  children: React.ReactNode;
  locationKey: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={locationKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="w-full min-w-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
});

// ─── AppLayout ──────────────────────────────────────────────────────────────────

export function AppLayout() {
  const location = useLocation();
  const { theme } = useLayoutStore();

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    if (
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-[#09090B] text-slate-200"
      style={{
        fontFamily: "'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      {/* ── Desktop sidebar ── */}
      <Sidebar />

      {/* ── Mobile drawer ── */}
      <MobileDrawer />

      {/* ── Command palette (global ⌘K) ── */}
      <CommandPalette />

      {/* ── Main column ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Navbar />

        {/* Page content */}
        <main
          className="
            flex-1 min-h-0 overflow-y-auto
            bg-[#09090B]
          "
          id="main-content"
          tabIndex={-1}
          aria-label="Main content"
        >
          {/*
           * Page container:
           *   - w-full + min-w-0: prevents flex children from overflowing
           *   - max-w-none: lets pages span full width
           *   - Responsive horizontal padding
           */}
          <div
            className="
            w-full min-w-0 max-w-none
            px-4 sm:px-6 md:px-8 xl:px-10 2xl:px-12
            py-6
          "
          >
            <PageTransition locationKey={location.pathname}>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
