import { apiClient } from "../apiClient";

export const StoreIntelligenceService = {
  getMetrics: async (storeId: string) => {
    try {
      const { data } = await apiClient.get(`/stores/${storeId}/metrics`);
      return data ?? {};
    } catch (error) {
      return {};
    }
  },

  getFunnel: async (storeId: string) => {
    try {
      const { data } = await apiClient.get(`/stores/${storeId}/funnel`);
      return data ?? {};
    } catch (error) {
      return {};
    }
  },

  getHeatmap: async (storeId: string) => {
    try {
      const { data } = await apiClient.get(`/stores/${storeId}/heatmap`);
      // Fallback object prevents the React Query crash
      return (
        data ?? {
          store_id: storeId,
          zones: [],
          session_count: 0,
          data_confidence: "LOW",
        }
      );
    } catch (error) {
      return {
        store_id: storeId,
        zones: [],
        session_count: 0,
        data_confidence: "LOW",
      };
    }
  },

  getAnomalies: async (storeId: string) => {
    try {
      const { data } = await apiClient.get(`/stores/${storeId}/anomalies`);
      return data ?? { anomalies: [] };
    } catch (error) {
      return { anomalies: [] };
    }
  },

  getHealth: async () => {
    try {
      const { data } = await apiClient.get("/health");
      return data ?? { status: "disconnected", stores: [] };
    } catch (error) {
      return { status: "disconnected", stores: [] };
    }
  },
};
