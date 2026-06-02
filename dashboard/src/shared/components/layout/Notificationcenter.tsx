import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  AlertTriangle,
  Users,
  Camera,
  CheckCircle2,
} from "lucide-react";
import { useLayoutStore } from "@/store/layoutStore";

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: "alert",
    title: "Queue threshold exceeded",
    body: "Cash Counter zone — 8+ persons",
    time: "2m ago",
    unread: true,
    icon: AlertTriangle,
    iconColor: "text-red-400",
    iconBg: "bg-red-500/10",
  },
  {
    id: 2,
    type: "visitor",
    title: "High dwell anomaly detected",
    body: "Visitor stationary 20+ min in Makeup Unit",
    time: "15m ago",
    unread: true,
    icon: Users,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10",
  },
  {
    id: 3,
    type: "camera",
    title: "Camera PMU-02 offline",
    body: "Stream interrupted — auto-reconnecting",
    time: "1h ago",
    unread: true,
    icon: Camera,
    iconColor: "text-slate-400",
    iconBg: "bg-slate-500/10",
  },
  {
    id: 4,
    type: "info",
    title: "Daily analytics ready",
    body: "Yesterday's store report is available",
    time: "3h ago",
    unread: false,
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
];

interface NotificationCenterProps {
  onClose: () => void;
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const { clearNotifications } = useLayoutStore();
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
        w-80 rounded-xl
        bg-[#111827] border border-[#1F2937]
        shadow-2xl shadow-black/40
        overflow-hidden z-50
      "
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F2937]">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-200">
            Notifications
          </span>
          <span className="text-xs font-mono bg-violet-500/15 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded">
            {MOCK_NOTIFICATIONS.filter((n) => n.unread).length}
          </span>
        </div>
        <button
          onClick={() => {
            clearNotifications();
            onClose();
          }}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Mark all read
        </button>
      </div>

      {/* Items */}
      <div className="max-h-80 overflow-y-auto">
        {MOCK_NOTIFICATIONS.map((n) => (
          <div
            key={n.id}
            className={`
              flex gap-3 px-4 py-3 border-b border-[#1F2937] last:border-0
              hover:bg-white/[0.03] transition-colors cursor-pointer
              ${n.unread ? "" : "opacity-60"}
            `}
          >
            <div
              className={`
                w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5
                ${n.iconBg}
              `}
            >
              <n.icon className={`h-4 w-4 ${n.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {n.title}
                </p>
                {n.unread && (
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0 mt-1.5" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{n.body}</p>
              <p className="text-[11px] text-slate-600 mt-1">{n.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[#1F2937] bg-[#0d1420]">
        <button className="text-xs text-violet-400 hover:text-violet-300 transition-colors w-full text-center">
          View all notifications →
        </button>
      </div>
    </motion.div>
  );
}
