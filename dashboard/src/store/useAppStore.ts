import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TimeFilter = "1h" | "24h" | "7d" | "30d";

interface AppState {
  // State
  darkMode: boolean;
  isSidebarCollapsed: boolean;
  globalTimeFilter: TimeFilter;

  // Actions
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setGlobalTimeFilter: (filter: TimeFilter) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Default to dark mode based on your Datadog/Vercel theme requirements
      darkMode: true,
      isSidebarCollapsed: false,
      globalTimeFilter: "24h",

      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setDarkMode: (enabled) => set({ darkMode: enabled }),

      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ isSidebarCollapsed: collapsed }),

      setGlobalTimeFilter: (filter) => set({ globalTimeFilter: filter }),
    }),
    {
      name: "store-intel-app-settings", // The key used in localStorage
    },
  ),
);
