import React from "react";

const VisitorsPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col">
      <h1 className="text-2xl font-semibold tracking-tight">Visitors</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Visitor directory and session management.
      </p>
    </div>
  );
};

export default VisitorsPage;
