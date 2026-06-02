import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { Loader2 } from "lucide-react";

// Lazy load feature modules to reduce initial bundle size
const DashboardPage = lazy(
  () => import("../modules/dashboard/pages/DashboardPage"),
);
const StoreMapPage = lazy(
  () => import("../modules/store-map/pages/StoreMapPage"),
);
const VisitorsPage = lazy(
  () => import("../modules/visitors/pages/VisitorsPage"),
);
const AnalyticsPage = lazy(
  () => import("../modules/analytics/pages/AnalyticsPage"),
);
const EventsPage = lazy(() => import("../modules/events/pages/EventsPage"));
const SessionsPage = lazy(
  () => import("../modules/sessions/pages/SessionsPage"),
);
const SettingsPage = lazy(
  () => import("../modules/settings/pages/SettingsPage"),
);

// Reusable suspense fallback
const SuspenseFallback = () => (
  <div className="flex h-[50vh] w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: "store-map",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <StoreMapPage />
          </Suspense>
        ),
      },
      {
        path: "visitors",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <VisitorsPage />
          </Suspense>
        ),
      },
      {
        path: "analytics",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <AnalyticsPage />
          </Suspense>
        ),
      },
      {
        path: "events",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <EventsPage />
          </Suspense>
        ),
      },
      {
        path: "sessions",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <SessionsPage />
          </Suspense>
        ),
      },
      {
        path: "settings",
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <SettingsPage />
          </Suspense>
        ),
      },
    ],
  },
]);
