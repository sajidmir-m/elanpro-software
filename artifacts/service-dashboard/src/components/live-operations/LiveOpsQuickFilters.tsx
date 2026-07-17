import { cn } from "@/lib/utils";
import type { FilterBarState } from "@/components/filter-bar";

const QUICK = [
  { id: "wip", label: "Only WIP", patch: { ticketStatus: "WIP" }, active: (f: FilterBarState) => f.ticketStatus === "WIP" },
  { id: "mrf", label: "Only MRF", patch: { ticketStatus: "MRF" }, active: (f: FilterBarState) => f.ticketStatus === "MRF" },
  { id: "assigned", label: "Only Assigned", patch: { ticketStatus: "Assigned" }, active: (f: FilterBarState) => f.ticketStatus === "Assigned" },
  { id: "today", label: "Today", patch: { dateRangeDays: 1 }, active: (f: FilterBarState) => f.dateRangeDays === 1 },
  { id: "week", label: "This Week", patch: { dateRangeDays: 7 }, active: (f: FilterBarState) => f.dateRangeDays === 7 },
  { id: "month", label: "This Month", patch: { dateRangeDays: 30 }, active: (f: FilterBarState) => f.dateRangeDays === 30 },
] as const;

export function LiveOpsQuickFilters({
  filters,
  onChange,
}: {
  filters: FilterBarState;
  onChange: (f: FilterBarState) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK.map((q) => {
        const on = q.active(filters);
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => {
              if (on) {
                const next = { ...filters };
                if ("ticketStatus" in q.patch) next.ticketStatus = null;
                if ("dateRangeDays" in q.patch) next.dateRangeDays = null;
                onChange(next);
              } else {
                onChange({ ...filters, ...q.patch });
              }
            }}
            className={cn(
              "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
              on
                ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            {q.label}
          </button>
        );
      })}
    </div>
  );
}
