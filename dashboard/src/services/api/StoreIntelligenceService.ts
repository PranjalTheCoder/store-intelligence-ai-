import { apiClient } from "../apiClient";

export const StoreIntelligenceService = {
  getMetrics: async (storeId: string) => {
    try {
      const { data } = await apiClient.get(`/stores/${storeId}/metrics`);
      return data ?? {};
    } catch {
      return {};
    }
  },
  getFunnel: async (storeId: string) => {
    try {
      const { data } = await apiClient.get(`/stores/${storeId}/funnel`);
      return data ?? {};
    } catch {
      return {};
    }
  },
  getHeatmap: async (storeId: string) => {
    try {
      const { data } = await apiClient.get(`/stores/${storeId}/heatmap`);
      return data ?? { zones: [] };
    } catch {
      return { zones: [] };
    }
  },
  getAnomalies: async (storeId: string) => {
    try {
      const { data } = await apiClient.get(`/stores/${storeId}/anomalies`);
      return data ?? { anomalies: [] };
    } catch {
      return { anomalies: [] };
    }
  },
  getHealth: async () => {
    try {
      const { data } = await apiClient.get("/health");
      return data ?? { status: "disconnected", stores: [] };
    } catch {
      return { status: "disconnected", stores: [] };
    }
  },
};
