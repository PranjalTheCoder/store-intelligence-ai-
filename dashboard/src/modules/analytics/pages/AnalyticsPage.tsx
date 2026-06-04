import React from "react";
import { useLiveFunnel } from "@/hooks/queries/useStoreQueries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export default function AnalyticsPage() {
  const { data: funnel } = useLiveFunnel();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Conversion Funnel</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FunnelStep title="1. Entries" value={funnel?.entry ?? 0} />
        <FunnelStep title="2. Zone Visits" value={funnel?.zone_visit ?? 0} />
        <FunnelStep title="3. In Queue" value={funnel?.billing_queue ?? 0} />
        <FunnelStep title="4. Purchases" value={funnel?.purchase ?? 0} />
      </div>

      <Card className="bg-slate-900 border-white/10 mt-8">
        <CardHeader>
          <CardTitle className="text-white">Drop-off Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-slate-300">
            <span>Entry to Zone:</span>
            <span className="font-bold text-red-400">
              -{funnel?.drop_off?.entry_to_zone ?? 0}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Zone to Queue:</span>
            <span className="font-bold text-red-400">
              -{funnel?.drop_off?.zone_to_queue ?? 0}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Queue to Purchase:</span>
            <span className="font-bold text-red-400">
              -{funnel?.drop_off?.queue_to_purchase ?? 0}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelStep({ title, value }: any) {
  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl p-6 text-center">
      <p className="text-sm text-slate-400 mb-2">{title}</p>
      <p className="text-4xl font-bold text-indigo-400">{value}</p>
    </div>
  );
}
