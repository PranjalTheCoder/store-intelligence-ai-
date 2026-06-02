import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  User,
  Settings,
  Activity,
  LogOut,
  ChevronDown,
  Shield,
} from "lucide-react";
import { useLayoutStore } from "@/store/layoutStore";

interface UserMenuProps {
  onClose: () => void;
}

export function UserMenu({ onClose }: UserMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="
        absolute top-full right-0 mt-2
        w-56 rounded-xl
        bg-[#111827] border border-[#1F2937]
        shadow-2xl shadow-black/40
        overflow-hidden z-50
      "
      role="menu"
    >
      {/* Profile header */}
      <div className="px-4 py-3 border-b border-[#1F2937]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">
            PT
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">
              Pranjal Tamrakar
            </p>
            <p className="text-xs text-slate-500">admin@storeiq.in</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <Shield className="h-3 w-3 text-violet-400" />
          <span className="text-[11px] text-violet-400 font-medium">Admin</span>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        {[
          { label: "Profile Settings", icon: User, to: "/settings" },
          { label: "System Status", icon: Activity, to: "/system" },
          { label: "Configuration", icon: Settings, to: "/settings" },
        ].map((item) => (
          <Link
            key={item.label}
            to={item.to}
            onClick={onClose}
            className="
              flex items-center gap-3 px-4 py-2.5
              text-sm text-slate-400
              hover:text-slate-200 hover:bg-white/[0.04]
              transition-colors
            "
            role="menuitem"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="border-t border-[#1F2937] py-1">
        <button
          onClick={onClose}
          className="
            flex items-center gap-3 w-full px-4 py-2.5
            text-sm text-red-400
            hover:text-red-300 hover:bg-red-500/10
            transition-colors
          "
          role="menuitem"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </button>
      </div>
    </motion.div>
  );
}
