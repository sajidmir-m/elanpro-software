import { cn } from "@/lib/utils";
import type { FilterBarState } from "@/components/filter-bar";

type QuickFilter = {
  id: string;
  label: string;
  patch: Partial<FilterBarState>;
  isActive: (filters: FilterBarState) => boolean;
};

const QUICK_FILTERS: QuickFilter[] = [
  {
    id: "urgent",
    label: "Only Urgent",
    patch: { callAgeRange: "red" },
    isActive: (f) => f.callAgeRange === "red",
  },
  {
    id: "assigned",
    label: "Only Assigned",
    patch: { ticketStatus: "Assigned" },
    isActive: (f) => f.ticketStatus === "Assigned",
  },
  {
    id: "older30",
    label: "Older than 30 Days",
    patch: { callAgeRange: "older30" },
    isActive: (f) => f.callAgeRange === "older30",
  },
  {
    id: "today",
    label: "Today",
    patch: { dateRangeDays: 1 },
    isActive: (f) => f.dateRangeDays === 1,
  },
  {
    id: "week",
    label: "This Week",
    patch: { dateRangeDays: 7 },
    isActive: (f) => f.dateRangeDays === 7,
  },
  {
    id: "month",
    label: "This Month",
    patch: { dateRangeDays: 30 },
    isActive: (f) => f.dateRangeDays === 30,
  },
];

export function CallAgeQuickFilters({
  filters,
  onChange,
}: {
  filters: FilterBarState;
  onChange: (next: FilterBarState) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Quick filters">
      {QUICK_FILTERS.map((qf) => {
        const active = qf.isActive(filters);
        return (
          <button
            key={qf.id}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (active) {
                const next = { ...filters };
                if (qf.patch.callAgeRange) next.callAgeRange = null;
                if (qf.patch.ticketStatus) next.ticketStatus = null;
                if (qf.patch.dateRangeDays) next.dateRangeDays = null;
                onChange(next);
              } else {
                onChange({ ...filters, ...qf.patch });
              }
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {qf.label}
          </button>
        );
      })}
    </div>
  );
}
