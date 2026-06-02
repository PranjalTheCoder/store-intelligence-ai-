import axios from "axios";
import * as mock from "./mockData";

// ==========================================
// CONFIGURATION & SETUP
// ==========================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
// Default to true for development until the backend is fully wired
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Helper to simulate network latency for realistic loading states
const withDelay = async <T>(data: T, ms: number = 600): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
};

// ==========================================
// API SERVICE FUNCTIONS
// ==========================================

export const getDashboard = async () => {
  if (USE_MOCK) return withDelay(mock.getMockDashboardMetrics(), 400);
  const { data } = await apiClient.get("/dashboard");
  return data;
};

export const getMetrics = async () => {
  // Often points to the same underlying data as the dashboard summary
  if (USE_MOCK) return withDelay(mock.getMockDashboardMetrics(), 350);
  const { data } = await apiClient.get("/metrics");
  return data;
};

export const getEvents = async () => {
  if (USE_MOCK) return withDelay(mock.getMockEvents(), 300);
  const { data } = await apiClient.get("/events");
  return data;
};

export const getSessions = async () => {
  if (USE_MOCK) return withDelay(mock.getMockSessions(), 800);
  const { data } = await apiClient.get("/sessions");
  return data;
};

export const getVisitors = async () => {
  if (USE_MOCK) return withDelay(mock.getMockVisitors(), 700);
  const { data } = await apiClient.get("/visitors");
  return data;
};

export const getVisitor = async (visitorId: string) => {
  if (USE_MOCK) {
    const visitor = mock
      .getMockVisitors()
      .find((v) => v.visitor_id === visitorId);
    if (!visitor) throw new Error("Visitor not found");
    return withDelay(visitor, 300);
  }
  const { data } = await apiClient.get(`/visitors/${visitorId}`);
  return data;
};

export const getAnalytics = async () => {
  if (USE_MOCK) return withDelay(mock.getMockZoneAnalytics(), 900);
  const { data } = await apiClient.get("/analytics");
  return data;
};

export const getFunnel = async () => {
  if (USE_MOCK) {
    // Generate a mock conversion funnel based on the KPI data
    const funnelData = [
      { stage: "Total Entries", count: 2845 },
      { stage: "Engaged (Dwell > 2m)", count: 1850 },
      { stage: "Interacted with Staff", count: 1420 },
      { stage: "Purchased (Converted)", count: 1217 },
    ];
    return withDelay(funnelData, 500);
  }
  const { data } = await apiClient.get("/analytics/funnel");
  return data;
};

export const getZones = async () => {
  if (USE_MOCK) {
    const layout = mock.getMockStoreLayout();
    return withDelay(layout.zones, 400);
  }
  const { data } = await apiClient.get("/zones");
  return data;
};

export const getStoreLayout = async () => {
  if (USE_MOCK) return withDelay(mock.getMockStoreLayout(), 500);
  const { data } = await apiClient.get("/store-layout");
  return data;
};

export const getLiveVisitors = async () => {
  if (USE_MOCK) {
    // Low latency to simulate real-time polling or WebSocket feel
    return withDelay(mock.generateLiveVisitors(), 150);
  }
  const { data } = await apiClient.get("/live");
  return data;
};

export const getAlerts = async () => {
  if (USE_MOCK) return withDelay(mock.getMockAlerts(), 400);
  const { data } = await apiClient.get("/alerts");
  return data;
};

export const getTopZones = async () => {
  if (USE_MOCK) {
    // Sort the analytics data to extract the highest performing zones
    const sorted = [...mock.getMockZoneAnalytics()].sort(
      (a, b) => b.visitors_count - a.visitors_count,
    );
    return withDelay(sorted.slice(0, 5), 600);
  }
  const { data } = await apiClient.get("/zones/top");
  return data;
};
