import { useQuery } from '@tanstack/react-query';
import { StoreIntelligenceService } from '@/services/api/StoreIntelligenceService';

// Change this to match the store ID you are passing in your detection script
const DEFAULT_STORE_ID = "STORE_1"; 

export const useLiveMetrics = (storeId: string = DEFAULT_STORE_ID) => {
  return useQuery({
    queryKey: ['liveMetrics', storeId],
    queryFn: () => StoreIntelligenceService.getMetrics(storeId),
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useLiveFunnel = (storeId: string = DEFAULT_STORE_ID) => {
  return useQuery({
    queryKey: ['liveFunnel', storeId],
    queryFn: () => StoreIntelligenceService.getFunnel(storeId),
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useLiveHeatmap = (storeId: string = DEFAULT_STORE_ID) => {
  return useQuery({
    queryKey: ['liveHeatmap', storeId],
    queryFn: () => StoreIntelligenceService.getHeatmap(storeId),
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useLiveAnomalies = (storeId: string = DEFAULT_STORE_ID) => {
  return useQuery({
    queryKey: ['liveAnomalies', storeId],
    queryFn: () => StoreIntelligenceService.getAnomalies(storeId),
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => StoreIntelligenceService.getHealth(),
    refetchInterval: 5000, // Poll every 5 seconds
  });
};