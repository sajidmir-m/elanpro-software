import { ChevronRight } from "lucide-react";
import type { DrillCrumb } from "./types";

export function DrillBreadcrumb({
  crumbs,
  onNavigate,
}: {
  crumbs: DrillCrumb[];
  onNavigate: (index: number) => void;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      {crumbs.map((crumb, index) => (
        <div key={`${crumb.label}-${index}`} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="size-3.5 text-muted-foreground" />}
          <button
            type="button"
            onClick={() => onNavigate(index)}
            className={
              index === crumbs.length - 1
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            {crumb.label}
          </button>
        </div>
      ))}
    </nav>
  );
}
