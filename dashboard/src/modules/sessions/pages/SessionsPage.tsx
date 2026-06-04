import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search,
  ArrowUpDown,
  Clock,
  Map,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";

// Shadcn UI
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";

// API
import { getSessions } from "@/services/api";

// --- Types ---
type SortField = "session_id" | "visitor_id" | "start_time" | "total_dwell";
type SortOrder = "asc" | "desc";

// --- Sub-component: Journey Visualizer ---
const JourneyBar = ({
  journey,
  totalSeconds,
}: {
  journey: any[];
  totalSeconds: number;
}) => {
  if (!journey || journey.length === 0)
    return <span className="text-slate-400 text-xs">No movement data</span>;

  // Assign consistent colors based on string hash for visual variety
  const getColor = (str: string) => {
    const colors = [
      "bg-indigo-500",
      "bg-emerald-500",
      "bg-rose-500",
      "bg-amber-500",
      "bg-blue-500",
      "bg-purple-500",
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++)
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="flex flex-col gap-1.5 w-full max-w-[250px]">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {journey.map((step, idx) => {
          const widthPct = Math.max(
            (step.duration_seconds / totalSeconds) * 100,
            2,
          ); // min 2% width
          return (
            <div
              key={idx}
              style={{ width: `${widthPct}%` }}
              className={`h-full ${getColor(step.zone)} transition-all duration-500`}
              title={`${step.zone}: ${step.duration_seconds}s`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{journey.length} zones visited</span>
        <span>
          {Math.floor(totalSeconds / 60)}m {totalSeconds % 60}s
        </span>
      </div>
    </div>
  );
};

export default function SessionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("start_time");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: rawSessions, isLoading } = useQuery({
    queryKey: ["sessions-list"],
    queryFn: getSessions,
  });

  const safeSessions = Array.isArray(rawSessions) ? rawSessions : [];

  const processedSessions = useMemo(() => {
    if (!rawSessions) return [];
    let result = [...safeSessions];

    // Filter
    if (searchTerm) {
      result = result.filter(
        (s) =>
          s.session_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.visitor_id.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal =
        a[sortField === "total_dwell" ? "total_dwell_seconds" : sortField];
      let bVal =
        b[sortField === "total_dwell" ? "total_dwell_seconds" : sortField];

      if (typeof aVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }
      return sortOrder === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [rawSessions, searchTerm, sortField, sortOrder]);

  const totalPages = Math.ceil(processedSessions.length / itemsPerPage) || 1;
  const paginatedSessions = processedSessions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Complete spatial journey records for every visitor.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search Session or Visitor ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 bg-white dark:bg-slate-950"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-900 dark:bg-slate-950/40 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
            <TableRow>
              <TableHead
                className="w-[140px] cursor-pointer"
                onClick={() => toggleSort("session_id")}
              >
                <div className="flex items-center gap-1">
                  Session ID <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => toggleSort("visitor_id")}
              >
                <div className="flex items-center gap-1">
                  Visitor ID <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => toggleSort("start_time")}
              >
                <div className="flex items-center gap-1">
                  Start Time <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => toggleSort("total_dwell")}
              >
                <div className="flex items-center gap-1">
                  Journey Visualization <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5)
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
            ) : paginatedSessions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-24 text-slate-500"
                >
                  No sessions found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedSessions.map((session) => (
                <TableRow
                  key={session.session_id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-900/20"
                >
                  <TableCell className="font-mono text-sm font-medium">
                    {session.session_id}
                  </TableCell>
                  <TableCell className="font-medium text-slate-600 dark:text-slate-300">
                    {session.visitor_id}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {new Date(session.start_time).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {session.end_time ? (
                      <Badge
                        variant="outline"
                        className="text-slate-500 bg-slate-100 dark:bg-slate-800 dark:border-slate-700"
                      >
                        Completed
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 animate-pulse"
                      >
                        <Activity className="h-3 w-3 mr-1" /> Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <JourneyBar
                      journey={session.journey}
                      totalSeconds={session.total_dwell_seconds}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-950/20">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
