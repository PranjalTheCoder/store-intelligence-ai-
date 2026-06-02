import React from "react";

const DashboardPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Store intelligence overview and KPIs.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
