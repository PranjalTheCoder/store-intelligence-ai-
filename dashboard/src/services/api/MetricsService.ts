import { apiClient } from "../apiClient";
import { isMockMode, withMockDelay } from "../mockHelper";
import { DashboardMetrics } from "@/types";
import { getMockDashboardMetrics } from "../mockData";

export const MetricsService = {
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    if (isMockMode) {
      return withMockDelay(getMockDashboardMetrics(), 400);
    }
    return apiClient.get("/dashboard");
  },
};
