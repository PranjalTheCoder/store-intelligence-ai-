import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { MetricsService } from "@/services/api/MetricsService";

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics(),
    queryFn: MetricsService.getDashboardMetrics,
    // Dashboard metrics update somewhat frequently, override global staleTime
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};
