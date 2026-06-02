import React from "react";
import { Menu, Bell, Search } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export const TopNav: React.FC = () => {
  const { toggleSidebar } = useAppStore();

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-1 items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex max-w-md flex-1 items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
          />
        </div>
      </div>

      <div className="ml-4 flex items-center gap-4">
        <button className="relative p-1 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300">
          <span className="absolute right-1 top-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
          </span>
          <Bell className="h-6 w-6" />
        </button>
        <div className="h-8 w-8 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900">
          <img
            src="https://ui-avatars.com/api/?name=Admin&background=c7d2fe&color=3730a3"
            alt="User"
          />
        </div>
      </div>
    </header>
  );
};
