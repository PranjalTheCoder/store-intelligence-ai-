import {
  GeneralSettings,
  ZoneConfig,
  CameraConfig,
  User,
} from "./settings.types";

export const mockGeneralSettings: GeneralSettings = {
  storeName: "Purplle Flagship Store",
  storeLocation: "Bangalore",
  storeId: "STR-BLR-001",
  openingTime: "09:00",
  closingTime: "22:00",
  timezone: "Asia/Kolkata",
};

const ZONE_NAMES = [
  "EB Korean",
  "The Face Shop",
  "Good Vibes",
  "DermDoc",
  "Minimalist",
  "Aqualogica",
  "Lakme Skin",
  "Accessories",
  "Maybelline",
  "Faces Canada",
  "Lakme",
  "Colorbar",
  "Swiss Beauty",
  "Renee",
  "Alps Goodness",
  "Streax",
  "FOH",
  "Makeup Unit",
  "Cash Counter",
  "PMU",
];

export const mockZones: ZoneConfig[] = ZONE_NAMES.map((name, i) => ({
  id: `zone-${i}`,
  name,
  enabled: true,
  color: i % 2 === 0 ? "#6366f1" : "#10b981",
  capacity: Math.floor(Math.random() * 20) + 10,
  alertThreshold: Math.floor(Math.random() * 15) + 8,
}));

export const mockCameras: CameraConfig[] = [
  {
    id: "cam-1",
    name: "CAM1 - Entrance",
    status: "ONLINE",
    resolution: "4K",
    fps: 30,
    detectionEnabled: true,
    trackingEnabled: true,
  },
  {
    id: "cam-2",
    name: "CAM2 - Makeup Unit",
    status: "ONLINE",
    resolution: "1080p",
    fps: 60,
    detectionEnabled: true,
    trackingEnabled: true,
  },
  {
    id: "cam-3",
    name: "CAM3 - Cash Counter",
    status: "DEGRADED",
    resolution: "1080p",
    fps: 15,
    detectionEnabled: true,
    trackingEnabled: false,
  },
  {
    id: "cam-4",
    name: "CAM4 - PMU",
    status: "OFFLINE",
    resolution: "1080p",
    fps: 0,
    detectionEnabled: false,
    trackingEnabled: false,
  },
];

export const mockUsers: User[] = [
  {
    id: "u1",
    name: "Sarah Connor",
    email: "sarah@storeintel.com",
    role: "Admin",
    status: "Active",
  },
  {
    id: "u2",
    name: "John Smith",
    email: "john@storeintel.com",
    role: "Manager",
    status: "Active",
  },
  {
    id: "u3",
    name: "Alice Johnson",
    email: "alice@storeintel.com",
    role: "Viewer",
    status: "Pending",
  },
];
