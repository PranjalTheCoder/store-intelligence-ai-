import { apiClient } from "../apiClient";
import { isMockMode, withMockDelay } from "../mockHelper";
import { LiveVisitor } from "@/types";
// Assume mock data has a list of static visitors
import { mockVisitorsList } from "../mockData";

export const VisitorService = {
  getVisitors: async (): Promise<LiveVisitor[]> => {
    if (isMockMode) {
      return withMockDelay(mockVisitorsList, 600);
    }
    return apiClient.get("/visitors");
  },

  getVisitorById: async (visitorId: string): Promise<LiveVisitor> => {
    if (isMockMode) {
      const visitor = mockVisitorsList.find((v) => v.visitor_id === visitorId);
      if (!visitor) throw new Error("Visitor not found");
      return withMockDelay(visitor, 300);
    }
    return apiClient.get(`/visitors/${visitorId}`);
  },
};
