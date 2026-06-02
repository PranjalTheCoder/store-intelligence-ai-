import { apiClient } from "../apiClient";
import { isMockMode, withMockDelay } from "../mockHelper";
import { ZoneAnalytics } from "@/types";
import { getMockZoneAnalytics } from "../mockData";

export const AnalyticsService = {
  getZoneAnalytics: async (): Promise<ZoneAnalytics[]> => {
    if (isMockMode) {
      return withMockDelay(getMockZoneAnalytics(), 700);
    }
    return apiClient.get("/analytics");
  },

  getFunnel: async (): Promise<any> => {
    if (isMockMode) {
      return withMockDelay(
        [
          { stage: "Entries", count: 1420 },
          { stage: "Engaged", count: 850 },
          { stage: "Converted", count: 486 },
        ],
        500,
      );
    }
    return apiClient.get("/funnel");
  },
};
