import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "system";

interface LayoutState {
  isSidebarCollapsed: boolean;
  isMobileDrawerOpen: boolean;
  isCommandPaletteOpen: boolean;
  isNotificationCenterOpen: boolean;
  theme: Theme;
  notificationCount: number;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileDrawer: () => void;
  setMobileDrawerOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleNotificationCenter: () => void;
  setTheme: (theme: Theme) => void;
  clearNotifications: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      isMobileDrawerOpen: false,
      isCommandPaletteOpen: false,
      isNotificationCenterOpen: false,
      theme: "dark",
      notificationCount: 3,

      toggleSidebar: () =>
        set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ isSidebarCollapsed: collapsed }),
      toggleMobileDrawer: () =>
        set((s) => ({ isMobileDrawerOpen: !s.isMobileDrawerOpen })),
      setMobileDrawerOpen: (open) => set({ isMobileDrawerOpen: open }),
      toggleCommandPalette: () =>
        set((s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),
      setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
      toggleNotificationCenter: () =>
        set((s) => ({
          isNotificationCenterOpen: !s.isNotificationCenterOpen,
        })),
      setTheme: (theme) => set({ theme }),
      clearNotifications: () => set({ notificationCount: 0 }),
    }),
    {
      name: "storeiq-layout",
      partialize: (s) => ({
        isSidebarCollapsed: s.isSidebarCollapsed,
        theme: s.theme,
      }),
    },
  ),
);
