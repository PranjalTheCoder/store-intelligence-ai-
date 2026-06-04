import React from "react";
import {
  useLiveMetrics,
  useLiveAnomalies,
} from "@/hooks/queries/useStoreQueries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Users, Activity, ShoppingCart, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const { data: metrics } = useLiveMetrics();
  const { data: anomaliesData } = useLiveAnomalies();
  const anomalies = anomaliesData?.anomalies || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white">
        Store Overview (STORE_1)
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Unique Visitors"
          value={metrics?.unique_visitors ?? 0}
          icon={Users}
          color="text-blue-400"
        />
        <StatCard
          title="Queue Depth"
          value={metrics?.current_queue_depth ?? 0}
          icon={Activity}
          color="text-orange-400"
        />
        <StatCard
          title="Conversion Rate"
          value={`${metrics?.conversion_rate ?? 0}%`}
          icon={ShoppingCart}
          color="text-emerald-400"
        />
        <StatCard
          title="Abandonment Rate"
          value={`${metrics?.abandonment_rate ?? 0}%`}
          icon={AlertCircle}
          color="text-red-400"
        />
      </div>

      <Card className="bg-slate-900 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Active Anomalies</CardTitle>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <p className="text-slate-400">No anomalies detected.</p>
          ) : (
            <ul className="space-y-3">
              {anomalies.map((a: any, i: number) => (
                <li
                  key={i}
                  className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10"
                >
                  <div>
                    <span className="text-red-400 font-bold text-sm mr-2">
                      [{a.severity}]
                    </span>
                    <span className="text-white font-medium">{a.message}</span>
                    <p className="text-xs text-slate-400 mt-1">
                      Zone: {a.zone_id} | Action: {a.suggested_action}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <h3 className="text-3xl font-bold text-white mt-2">{value}</h3>
        </div>
        <Icon className={`h-8 w-8 ${color} opacity-80`} />
      </CardContent>
    </Card>
  );
}
