import { cn } from "@/lib/utils";
import type { WarrantyFilter } from "./types";

const OPTIONS: Array<{ value: WarrantyFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "in", label: "In Warranty" },
  { value: "out", label: "Out of Warranty" },
];

export function WarrantyToggle({
  value,
  onChange,
}: {
  value: WarrantyFilter;
  onChange: (value: WarrantyFilter) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-1 gap-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
