import { apiClient } from "../apiClient";
import { isMockMode, withMockDelay } from "../mockHelper";
import { LiveVisitor } from "@/types";
import { generateLiveVisitors } from "../mockData";

export const StoreMapService = {
  getLiveTracking: async (): Promise<LiveVisitor[]> => {
    if (isMockMode) {
      // Very low latency mock delay to simulate real-time socket/polling feel
      return withMockDelay(generateLiveVisitors(), 100);
    }
    return apiClient.get("/live");
  },

  getStoreLayout: async (): Promise<any> => {
    if (isMockMode) {
      // Returns static SVG coordinates or zone boundaries
      return withMockDelay({ width: 1000, height: 600, zones: [] }, 300);
    }
    return apiClient.get("/store-layout");
  },
};
