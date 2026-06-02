import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { VisitorService } from "@/services/api/VisitorService";

export const useVisitorsList = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.visitors.list(filters),
    queryFn: () => VisitorService.getVisitors(), // Pass filters to service in future
  });
};

export const useVisitorDetail = (visitorId: string | null) => {
  return useQuery({
    queryKey: queryKeys.visitors.detail(visitorId!),
    queryFn: () => VisitorService.getVisitorById(visitorId!),
    // Don't execute the query until we actually have an ID (e.g., user clicks a row)
    enabled: !!visitorId,
  });
};
