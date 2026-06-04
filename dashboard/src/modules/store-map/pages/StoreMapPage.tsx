import React, { useState } from "react";
import {
  useLiveHeatmap,
  useLiveMetrics,
  useLiveAnomalies,
} from "@/hooks/queries/useStoreQueries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

// We MUST keep this so the UI knows where to draw the rectangles
const STORE_LAYOUT = [
  { name: "EB Korean", x: 20, y: 20, width: 160, height: 110 },
  { name: "Makeup Unit", x: 340, y: 450, width: 290, height: 130 },
  { name: "Cash Counter", x: 650, y: 450, width: 250, height: 130 },
  { name: "Lakme", x: 535, y: 150, width: 150, height: 120 },
];

export default function StoreMapPage() {
  const { data: heatmapData } = useLiveHeatmap();
  const { data: metrics } = useLiveMetrics();
  const { data: anomaliesData } = useLiveAnomalies();

  const zones = heatmapData?.zones || [];
  const alerts = anomaliesData?.anomalies || [];

  return (
    <div className="flex h-[calc(100vh-80px)] p-4 gap-4">
      {/* MAP CANVAS */}
      <div className="flex-[3] relative bg-[#080d18] border border-white/10 rounded-xl overflow-hidden">
        {STORE_LAYOUT.map((zone) => {
          // Match the static layout rectangle to the real API heatmap data
          const apiData = zones.find((z: any) => z.zone_name === zone.name);
          const hasTraffic = apiData && apiData.visits > 0;

          return (
            <div
              key={zone.name}
              className={`absolute flex flex-col items-center justify-center rounded-lg border-2 ${
                hasTraffic
                  ? "bg-orange-500/20 border-orange-500/50"
                  : "bg-blue-500/10 border-blue-500/20"
              }`}
              style={{
                left: zone.x,
                top: zone.y,
                width: zone.width,
                height: zone.height,
              }}
            >
              <span className="text-xs font-semibold text-white/70">
                {zone.name}
              </span>
              {hasTraffic && (
                <span className="text-lg font-bold text-orange-400 mt-1">
                  {apiData.visits}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* SIDEBAR */}
      <div className="w-80 flex flex-col gap-4">
        <Card className="bg-slate-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-sm">
              Real-Time Totals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-slate-400">Total Unique Visitors</p>
              <p className="text-xl font-bold text-white">
                {metrics?.unique_visitors ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Queue Depth</p>
              <p className="text-xl font-bold text-white">
                {metrics?.current_queue_depth ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-white/10 flex-1 overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-red-400 text-sm">
              System Anomalies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-500">All clear</p>
            ) : (
              alerts.map((a: any, i: number) => (
                <div key={i} className="mb-3 border-b border-white/5 pb-2">
                  <p className="text-xs font-bold text-white">{a.zone_id}</p>
                  <p className="text-xs text-slate-400">{a.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
