import React, { useCallback } from "react";
import { Search, Command } from "lucide-react";
import { useLayoutStore } from "@/store/layoutStore";

export function SearchBar() {
  const { setCommandPaletteOpen } = useLayoutStore();

  const handleClick = useCallback(() => {
    setCommandPaletteOpen(true);
  }, [setCommandPaletteOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") setCommandPaletteOpen(true);
    },
    [setCommandPaletteOpen],
  );

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label="Open search (⌘K)"
      className="
        hidden sm:flex items-center gap-2.5
        h-9 w-64 px-3
        rounded-lg
        bg-[#111827] border border-[#1F2937]
        text-slate-500 text-sm
        hover:border-slate-600 hover:text-slate-400
        transition-all duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50
        group
      "
    >
      <Search className="h-3.5 w-3.5 shrink-0 group-hover:text-slate-300 transition-colors" />
      <span className="flex-1 text-left truncate">
        Search visitors, events…
      </span>
      <kbd
        className="
          hidden lg:flex items-center gap-0.5
          px-1.5 py-0.5 rounded
          text-[10px] font-mono
          bg-[#1F2937] border border-[#374151] text-slate-600
        "
      >
        <Command className="h-2.5 w-2.5" />K
      </kbd>
    </button>
  );
}
