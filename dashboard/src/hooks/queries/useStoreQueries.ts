import { useQuery } from "@tanstack/react-query";
import { StoreIntelligenceService } from "@/services/api/StoreIntelligenceService";

const STORE_ID = "ST1076";

export const useLiveMetrics = () =>
  useQuery({
    queryKey: ["metrics", STORE_ID],
    queryFn: () => StoreIntelligenceService.getMetrics(STORE_ID),
    refetchInterval: 5000,
  });

export const useLiveFunnel = () =>
  useQuery({
    queryKey: ["funnel", STORE_ID],
    queryFn: () => StoreIntelligenceService.getFunnel(STORE_ID),
    refetchInterval: 5000,
  });

export const useLiveHeatmap = () =>
  useQuery({
    queryKey: ["heatmap", STORE_ID],
    queryFn: () => StoreIntelligenceService.getHeatmap(STORE_ID),
    refetchInterval: 5000,
  });

export const useLiveAnomalies = () =>
  useQuery({
    queryKey: ["anomalies", STORE_ID],
    queryFn: () => StoreIntelligenceService.getAnomalies(STORE_ID),
    refetchInterval: 5000,
  });

export const useSystemHealth = () =>
  useQuery({
    queryKey: ["health"],
    queryFn: () => StoreIntelligenceService.getHealth(),
    refetchInterval: 5000,
  });
