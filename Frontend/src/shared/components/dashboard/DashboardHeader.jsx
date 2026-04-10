import React, { useMemo, useState } from "react";
import { Menu, Search } from "lucide-react";

export default function DashboardHeader({
  onOpenSidebar,
  userName,
  title = "Intelligence Hub",
  subtitle = "Operational command center",
  searchPlaceholder = "Search insights, records, trends...",
  onSearch,
  notificationSlot = null,
}) {
  const [searchText, setSearchText] = useState("");

  const hubMeta = useMemo(() => {
    if (title && subtitle) return `${title} · ${subtitle}`;
    return title || subtitle || "";
  }, [title, subtitle]);

  const welcomeText = useMemo(() => {
    const name = userName || "User";
    return `Welcome ${name}!`;
  }, [userName]);

  const handleSearchChange = (event) => {
    const nextValue = event.target.value;
    setSearchText(nextValue);
    if (onSearch) {
      onSearch(nextValue);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-900">{welcomeText}</p>
            {hubMeta && <p className="truncate text-xs text-slate-500">{hubMeta}</p>}
          </div>
        </div>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3 lg:gap-4">
          <div className="relative hidden w-full max-w-xl lg:block">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchText}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center">{notificationSlot}</div>
        </div>
      </div>
    </header>
  );
}
