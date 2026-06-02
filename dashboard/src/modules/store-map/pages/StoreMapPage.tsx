import React from "react";

const StoreMapPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col">
      <h1 className="text-2xl font-semibold tracking-tight">Store Map</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Live visitor tracking and heatmap analysis.
      </p>
      <div className="mt-8 flex-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950" />
    </div>
  );
};

export default StoreMapPage;
