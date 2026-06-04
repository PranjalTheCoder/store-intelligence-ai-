import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import DashboardPage from "@/modules/dashboard/pages/DashboardPage";
import StoreMapPage from "@/modules/store-map/pages/StoreMapPage";
import AnalyticsPage from "@/modules/analytics/pages/AnalyticsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "map", element: <StoreMapPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      // Catch-all redirect
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
