import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MapState {
  // State
  selectedZone: string | null;
  heatmapEnabled: boolean;
  zoneOverlayEnabled: boolean;

  // Actions
  setSelectedZone: (zone: string | null) => void;
  toggleHeatmap: () => void;
  setHeatmapEnabled: (enabled: boolean) => void;
  toggleZoneOverlay: () => void;
  setZoneOverlayEnabled: (enabled: boolean) => void;
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      selectedZone: null,
      heatmapEnabled: false,
      zoneOverlayEnabled: true,

      setSelectedZone: (zone) => set({ selectedZone: zone }),

      toggleHeatmap: () =>
        set((state) => ({ heatmapEnabled: !state.heatmapEnabled })),
      setHeatmapEnabled: (enabled) => set({ heatmapEnabled: enabled }),

      toggleZoneOverlay: () =>
        set((state) => ({ zoneOverlayEnabled: !state.zoneOverlayEnabled })),
      setZoneOverlayEnabled: (enabled) => set({ zoneOverlayEnabled: enabled }),
    }),
    {
      name: "store-intel-map-settings", // The key used in localStorage
      // Only persist the toggle settings, NOT the transient selected zone
      partialize: (state) => ({
        heatmapEnabled: state.heatmapEnabled,
        zoneOverlayEnabled: state.zoneOverlayEnabled,
      }),
    },
  ),
);
