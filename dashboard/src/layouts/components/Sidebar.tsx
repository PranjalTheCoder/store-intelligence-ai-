import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Map,
  Users,
  BarChart3,
  Activity,
  Store,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

const NAVIGATION = [
  { name: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { name: "Store Map", to: "/store-map", icon: Map },
  { name: "Visitors", to: "/visitors", icon: Users },
  { name: "Analytics", to: "/analytics", icon: BarChart3 },
  { name: "Events", to: "/events", icon: Activity },
];

export const Sidebar: React.FC = () => {
  const { isSidebarCollapsed } = useAppStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarCollapsed ? 80 : 256 }}
      className="hidden h-screen flex-col border-r border-slate-200 bg-white md:flex dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-slate-200 px-4 dark:border-slate-800">
        <Store className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        {!isSidebarCollapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-3 text-lg font-bold text-slate-900 dark:text-white"
          >
            StoreIntel
          </motion.span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {NAVIGATION.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              } ${isSidebarCollapsed ? "justify-center" : ""}`
            }
          >
            <item.icon
              className={`h-5 w-5 shrink-0 ${isSidebarCollapsed ? "" : "mr-3"}`}
            />
            {!isSidebarCollapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>
    </motion.aside>
  );
};
