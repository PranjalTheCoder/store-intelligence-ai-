import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "store-map": "Store Map",
  visitors: "Visitors",
  sessions: "Sessions",
  events: "Events",
  analytics: "Analytics",
  settings: "Settings",
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden sm:flex items-center gap-1 text-sm"
    >
      <Link
        to="/"
        className="flex items-center text-slate-500 hover:text-slate-200 transition-colors duration-150"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {segments.map((segment, idx) => {
        const href = "/" + segments.slice(0, idx + 1).join("/");
        const label =
          ROUTE_LABELS[segment] ??
          segment.charAt(0).toUpperCase() + segment.slice(1);
        const isLast = idx === segments.length - 1;

        return (
          <React.Fragment key={segment}>
            <ChevronRight className="h-3.5 w-3.5 text-slate-700 shrink-0" />
            {isLast ? (
              <span className="font-medium text-slate-200" aria-current="page">
                {label}
              </span>
            ) : (
              <Link
                to={href}
                className={cn(
                  "text-slate-500 hover:text-slate-200 transition-colors duration-150",
                )}
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
