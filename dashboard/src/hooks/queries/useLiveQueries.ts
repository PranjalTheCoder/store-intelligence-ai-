import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { StoreMapService } from "@/services/api/StoreMapService";
import { EventsService } from "@/services/api/EventsService";

export const useLiveTracking = (isMapVisible: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.live.tracking(),
    queryFn: StoreMapService.getLiveTracking,
    // POLLING CONFIGURATION: Fetch new coordinates every 2 seconds
    refetchInterval: 2000,
    // Only poll when the browser tab is active/visible
    refetchIntervalInBackground: false,
    // Completely disable polling if the user isn't on the Map page to save network/CPU
    enabled: isMapVisible,
    // Live data is instantly stale
    staleTime: 0,
  });
};

export const useLiveEvents = () => {
  return useQuery({
    queryKey: queryKeys.live.events(),
    queryFn: EventsService.getEvents,
    refetchInterval: 5000, // Poll for new camera events every 5 seconds
  });
};
