import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Clock,
  MapPin,
  User,
  Calendar,
  Eye,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Shadcn UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

// API Services & Layout Helpers
import { getVisitors, getMockSessions } from "@/services/mockData";
import { cn } from "@/lib/utils";

// --- Local Types for State Management ---
type SortField = "visitor_id" | "status" | "current_zone" | "total_visits";
type SortOrder = "asc" | "desc";

// --- Helper Functions ---
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function VisitorsPage() {
  // --- Table Logic State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("visitor_id");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- Drawer Detail State ---
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // --- React Query Data Hydration ---
  const { data: rawVisitors, isLoading } = useQuery({
    queryKey: ["visitors-list"],
    queryFn: async () => getVisitors(),
  });

  // Fetch session maps to build the journey timeline inside the drawer
  const sessions = useMemo(() => getMockSessions(), []);

  // --- Core Table Data Formatting Engine ---
  const formattedVisitors = useMemo(() => {
    if (!rawVisitors) return [];

    return rawVisitors.map((v) => {
      // Find latest associated session to pull current spatial tracking parameters
      const visitorSessions = sessions.filter(
        (s) => s.visitor_id === v.visitor_id,
      );
      const activeSession = visitorSessions.find((s) => s.end_time === null);
      const latestSession = visitorSessions[visitorSessions.length - 1];

      // Format current zone and entrance markers
      const currentZone =
        v.status === "ACTIVE" && activeSession
          ? activeSession.journey[activeSession.journey.length - 1]?.zone ||
            "FOH"
          : "DEPARTED";

      const entryTime = activeSession
        ? new Date(activeSession.start_time).toLocaleTimeString()
        : latestSession
          ? new Date(latestSession.start_time).toLocaleDateString()
          : "N/A";

      // Accumulate total baseline layout metrics
      const totalDwellSeconds = visitorSessions.reduce(
        (acc, curr) => acc + curr.total_dwell_seconds,
        0,
      );
      const avgDwellSeconds =
        visitorSessions.length > 0
          ? totalDwellSeconds / visitorSessions.length
          : 0;

      return {
        ...v,
        current_zone: currentZone,
        entry_time: entryTime,
        avg_dwell: avgDwellSeconds,
        total_dwell_str: `${Math.floor(totalDwellSeconds / 60)}m ${totalDwellSeconds % 60}s`,
        sessions: visitorSessions,
      };
    });
  }, [rawVisitors, sessions]);

  // --- Client Side Searching, Filtering, and Sorting Processing ---
  const processedVisitors = useMemo(() => {
    let result = [...formattedVisitors];

    // 1. Search Query Match
    if (searchTerm) {
      result = result.filter(
        (v) =>
          v.visitor_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.current_zone.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // 2. Status Dropdown Match
    if (statusFilter !== "ALL") {
      result = result.filter((v) => v.status === statusFilter);
    }

    // 3. Column Metric Sort Matrix
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === "string") {
        return sortOrder === "asc"
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      } else {
        return sortOrder === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
    });

    return result;
  }, [formattedVisitors, searchTerm, statusFilter, sortField, sortOrder]);

  // --- Pagination Slice Calculations ---
  const totalPages = Math.ceil(processedVisitors.length / itemsPerPage) || 1;
  const paginatedVisitors = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedVisitors.slice(start, start + itemsPerPage);
  }, [processedVisitors, currentPage]);

  // --- Active Visitor Detail Record Selector ---
  const selectedVisitor = useMemo(() => {
    if (!selectedVisitorId) return null;
    return formattedVisitors.find((v) => v.visitor_id === selectedVisitorId);
  }, [selectedVisitorId, formattedVisitors]);

  // Handle row click selection configurations
  const handleOpenDetails = (id: string) => {
    setSelectedVisitorId(id);
    setIsDrawerOpen(true);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shopper Registry</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Directory of computer vision tracking logs and historic customer
          journeys.
        </p>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-900 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search Visitor ID or zone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <SlidersHorizontal className="h-4 w-4 text-slate-400 hidden sm:block" />
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active On Floor</SelectItem>
              <SelectItem value="COMPLETED">Departed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* CORE DATA REGISTRY TABLE */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-900 dark:bg-slate-950/40 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
            <TableRow>
              <TableHead
                className="w-[140px] cursor-pointer"
                onClick={() => toggleSort("visitor_id")}
              >
                <div className="flex items-center gap-1">
                  Visitor ID <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => toggleSort("status")}
              >
                <div className="flex items-center gap-1">
                  Tracking Status <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => toggleSort("current_zone")}
              >
                <div className="flex items-center gap-1">
                  Current/Last Zone <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead>Entrance Mark</TableHead>
              <TableHead>Dwell Duration</TableHead>
              <TableHead
                className="text-right cursor-pointer"
                onClick={() => toggleSort("total_visits")}
              >
                <div className="flex items-center gap-1 justify-end">
                  Total Visits <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5)
                .fill(0)
                .map((_, idx) => (
                  <TableRow key={idx}>
                    {Array(7)
                      .fill(0)
                      .map((_, i) => (
                        <TableCell key={i}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                  </TableRow>
                ))
            ) : paginatedVisitors.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-slate-400"
                >
                  No tracking records found matching the active filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedVisitors.map((visitor) => (
                <TableRow
                  key={visitor.visitor_id}
                  className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/20 transition-colors"
                  onClick={() => handleOpenDetails(visitor.visitor_id)}
                >
                  <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                    {visitor.visitor_id}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium",
                        visitor.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                          : "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400",
                      )}
                    >
                      {visitor.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />{" "}
                      {visitor.current_zone}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">
                    {visitor.entry_time}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {visitor.total_dwell_str}
                  </TableCell>
                  <TableCell className="text-right font-medium pr-6">
                    {visitor.total_visits}x
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* PAGINATION PANEL CONTROLS */}
        <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-950/20">
          <p className="text-xs text-slate-500">
            Showing Page <b>{currentPage}</b> of <b>{totalPages}</b> (
            {processedVisitors.length} overall records)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="h-8 border-slate-200 dark:border-slate-800"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              className="h-8 border-slate-200 dark:border-slate-800"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* VISITOR DETAILS DRAWER (Shadcn Sheet) */}
      {/* ========================================== */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-900 custom-scrollbar p-6">
          {selectedVisitor && (
            <div className="space-y-6">
              {/* Profile Card Summary Header */}
              <SheetHeader className="space-y-1 border-b border-slate-100 dark:border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <SheetTitle className="text-2xl font-bold tracking-tight">
                      {selectedVisitor.visitor_id}
                    </SheetTitle>
                    <SheetDescription className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant="outline"
                        className={
                          selectedVisitor.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : ""
                        }
                      >
                        {selectedVisitor.status}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        • Customer Logs
                      </span>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* OVERALL METRICS ROW */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60">
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Average Dwell
                  </p>
                  <p className="text-xl font-bold mt-1 text-slate-900 dark:text-slate-50">
                    {formatTime(Math.floor(selectedVisitor.avg_dwell))}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60">
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Frequency Rate
                  </p>
                  <p className="text-xl font-bold mt-1 text-slate-900 dark:text-slate-50">
                    {selectedVisitor.total_visits} visits recorded
                  </p>
                </div>
              </div>

              {/* VISITED JOURNEY TIMELINE SEGMENT */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Layers className="h-4 w-4 text-indigo-500" /> Path Journey
                  Mapping (Current Session)
                </h3>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 relative">
                  {selectedVisitor.sessions &&
                  selectedVisitor.sessions.length > 0 ? (
                    <div className="relative border-l-2 border-indigo-100 dark:border-indigo-950 pl-4 ml-2 space-y-4 py-2">
                      {selectedVisitor.sessions[
                        selectedVisitor.sessions.length - 1
                      ]?.journey.map((step, index) => (
                        <div key={index} className="relative">
                          {/* Anchor Node Dot */}
                          <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 bg-indigo-500 rounded-full ring-4 ring-white dark:ring-slate-900 shadow-sm" />
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {step.zone}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Dwell Duration: {step.duration_seconds}s
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No spatial tracking timeline logs compiled.
                    </p>
                  )}
                </div>
              </div>

              {/* COMPREHENSIVE HISTORIC SESSIONS SUB-TABLE */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Clock className="h-4 w-4 text-blue-500" /> Cross-Visit
                  Session Logs
                </h3>
                <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 overflow-hidden">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-50/80 dark:bg-slate-900/40">
                      <TableRow>
                        <TableHead>Session Reference</TableHead>
                        <TableHead>Date / Time</TableHead>
                        <TableHead className="text-right">
                          Dwell Summary
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedVisitor.sessions &&
                      selectedVisitor.sessions.length > 0 ? (
                        selectedVisitor.sessions.map((session) => (
                          <TableRow key={session.session_id}>
                            <TableCell className="font-mono font-medium">
                              {session.session_id}
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {new Date(
                                session.start_time,
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-700 dark:text-slate-300">
                              {Math.floor(session.total_dwell_seconds / 60)}m{" "}
                              {session.total_dwell_seconds % 60}s
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center py-4 text-slate-400"
                          >
                            No legacy session markers stored.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
