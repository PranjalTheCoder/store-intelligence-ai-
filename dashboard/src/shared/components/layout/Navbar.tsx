import React, { memo, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Bell, Sun, Moon, Menu, Video, ChevronDown } from "lucide-react";
import { Breadcrumbs } from "./Breadcrumbs";
import { SearchBar } from "./Searchbar";
import { NotificationCenter } from "./Notificationcenter";
import { UserMenu } from "./Usermenu";
import { useLayoutStore } from "@/store/layoutStore";
import { useSystemHealth } from "@/hooks/queries/useStoreQueries";

export const Navbar = memo(function Navbar() {
  const {
    toggleMobileDrawer,
    toggleNotificationCenter,
    isNotificationCenterOpen,
    notificationCount,
    theme,
    setTheme,
  } = useLayoutStore();

  // ... inside your Navbar component, before return:
  const { data: healthData, isError } = useSystemHealth();
  const isLive = healthData && !isError;

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const isDark = theme === "dark" || theme === "system";

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? "light" : "dark");
  }, [isDark, setTheme]);

  return (
    <header
      className="
        sticky top-0 z-40
        flex h-[72px] shrink-0 items-center justify-between
        px-4 sm:px-6
        bg-[#09090B]/90 backdrop-blur-md
        border-b border-[#1F2937]
      "
      role="banner"
    >
      {/* ── Left: Mobile menu + breadcrumb ── */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={toggleMobileDrawer}
          aria-label="Open navigation menu"
          className="
            md:hidden flex items-center justify-center
            w-9 h-9 rounded-lg
            text-slate-500 hover:text-slate-200
            hover:bg-white/[0.06]
            transition-colors focus-visible:ring-2 focus-visible:ring-violet-500/50 outline-none
          "
        >
          <Menu className="h-5 w-5" />
        </button>

        <Breadcrumbs />
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <SearchBar />

        {/* Live System Health Badge */}
        <div
          className={`
            hidden lg:flex items-center gap-2
            px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
            ${isLive 
              ? "bg-emerald-500/8 border-emerald-500/15 text-emerald-400" 
              : "bg-red-500/8 border-red-500/15 text-red-400"}
          `}
          aria-label={isLive ? "System Live" : "System Disconnected"}
        >
          <span className="relative flex h-2 w-2">
            { isLive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </span>
          <Video className="h-3.5 w-3.5" />
          <span>{isLive ? 'SYSTEM LIVE' : 'DISCONNECTED'}</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="
            flex items-center justify-center
            w-9 h-9 rounded-lg
            text-slate-500 hover:text-slate-200
            hover:bg-white/[0.06]
            transition-colors focus-visible:ring-2 focus-visible:ring-violet-500/50 outline-none
          "
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={toggleNotificationCenter}
            aria-label={`Notifications — ${notificationCount} unread`}
            aria-expanded={isNotificationCenterOpen}
            className="
              relative flex items-center justify-center
              w-9 h-9 rounded-lg
              text-slate-500 hover:text-slate-200
              hover:bg-white/[0.06]
              transition-colors focus-visible:ring-2 focus-visible:ring-violet-500/50 outline-none
            "
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span
                className="
                  absolute top-1.5 right-1.5
                  w-[18px] h-[18px] rounded-full
                  bg-violet-500 text-white
                  text-[10px] font-bold
                  flex items-center justify-center
                  ring-2 ring-[#09090B]
                "
                aria-hidden="true"
              >
                {notificationCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isNotificationCenterOpen && (
              <NotificationCenter onClose={toggleNotificationCenter} />
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-[#1F2937] mx-1" />

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen((v) => !v)}
            aria-label="Open user menu"
            aria-expanded={isUserMenuOpen}
            className="
              flex items-center gap-2
              px-2 py-1.5 rounded-lg
              hover:bg-white/[0.06]
              transition-colors focus-visible:ring-2 focus-visible:ring-violet-500/50 outline-none
              group
            "
          >
            <div
              className="
              w-7 h-7 rounded-full
              bg-violet-600 flex items-center justify-center
              text-[11px] font-bold text-white shrink-0
            "
            >
              PT
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-300 leading-tight">
                Pranjal
              </p>
              <p className="text-[10px] text-slate-600 leading-tight">Admin</p>
            </div>
            <ChevronDown
              className="
              hidden sm:block h-3 w-3 text-slate-600
              group-hover:text-slate-400 transition-colors
            "
            />
          </button>

          <AnimatePresence>
            {isUserMenuOpen && (
              <UserMenu onClose={() => setIsUserMenuOpen(false)} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
});
