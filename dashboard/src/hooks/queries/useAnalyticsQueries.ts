import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { AnalyticsService } from "@/services/api/AnalyticsService";

export const useZoneAnalytics = () => {
  return useQuery({
    queryKey: queryKeys.analytics.zones(),
    queryFn: AnalyticsService.getZoneAnalytics,
    // Analytics are historical and expensive to compute. Keep them cached longer.
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useFunnelAnalytics = () => {
  return useQuery({
    queryKey: queryKeys.analytics.funnel(),
    queryFn: AnalyticsService.getFunnel,
    staleTime: 15 * 60 * 1000,
  });
};
