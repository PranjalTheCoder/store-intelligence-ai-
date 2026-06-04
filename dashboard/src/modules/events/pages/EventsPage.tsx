import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Video, LogIn, LogOut, ArrowRightLeft } from "lucide-react";

// Shadcn UI
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";

// API
import { getEvents } from "@/services/api";

export default function EventsPage() {
  // Use React Query polling to simulate a live WebRTC/WebSocket feed
  const { data: events, isLoading } = useQuery({
    queryKey: ["live-events-feed"],
    queryFn: getEvents,
    refetchInterval: 3000, // Poll every 3 seconds for new events
  });

  const rawEvents = Array.isArray(events) ? events : [];

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Live Event Stream
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time object detection and zone transition logs.
          </p>
        </div>

        {/* Live Indicator Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            System Live
          </span>
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-900 dark:bg-slate-950/40 overflow-hidden shadow-sm flex-1">
        <Table>
          <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead>Event ID</TableHead>
              <TableHead>Visitor ID</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Detection Zone (Camera)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(8)
                .fill(0)
                .map((_, idx) => (
                  <TableRow key={idx}>
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <TableCell key={i}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                  </TableRow>
                ))
            ) : (
              <AnimatePresence initial={false}>
                {rawEvents?.map((event) => (
                  <motion.tr
                    key={event.event_id}
                    initial={{
                      opacity: 0,
                      y: -10,
                      backgroundColor: "rgba(79, 70, 229, 0.1)",
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      backgroundColor: "transparent",
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/20"
                  >
                    <TableCell className="text-slate-500 font-mono text-xs">
                      {new Date(event.timestamp).toLocaleString()}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-slate-400">
                      {event.event_id}
                    </TableCell>

                    <TableCell className="font-semibold text-slate-700 dark:text-slate-200">
                      {event.visitor_id}
                    </TableCell>

                    <TableCell>
                      {event.event_type === "ENTRY" && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                        >
                          <LogIn className="w-3 h-3 mr-1" /> ENTRY
                        </Badge>
                      )}
                      {event.event_type === "EXIT" && (
                        <Badge
                          variant="outline"
                          className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                        >
                          <LogOut className="w-3 h-3 mr-1" /> EXIT
                        </Badge>
                      )}
                      {(event.event_type === "ZONE_ENTER" ||
                        event.event_type === "ZONE_EXIT") && (
                        <Badge
                          variant="outline"
                          className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20"
                        >
                          <ArrowRightLeft className="w-3 h-3 mr-1" />{" "}
                          {event.event_type.replace("_", " ")}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
                        <Video className="w-4 h-4 text-slate-400" />
                        {event.zone}
                      </span>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}

            {rawEvents?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-32 text-slate-500 flex flex-col items-center justify-center"
                >
                  <Radio className="w-6 h-6 text-slate-300 mb-2" />
                  Listening for camera events...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
