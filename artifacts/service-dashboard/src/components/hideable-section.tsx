import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Collapsible wrapper so dense tables/charts can be hidden without leaving the page. */
export function HideableSection({
  title,
  subtitle,
  children,
  defaultOpen = true,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-[11px] text-muted-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <>
              <EyeOff className="h-3.5 w-3.5" />
              Hide table
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show table
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
      {open ? (
        children
      ) : (
        <div className="rounded-xl border border-dashed border-[#E7EAF0] bg-[#F7F8FA] px-4 py-6 text-center text-xs text-[#667085]">
          {title ? <p className="font-medium text-[#344054]">{title} hidden</p> : null}
          {subtitle ? <p className="mt-1">{subtitle}</p> : <p>Click “Show table” to expand this section.</p>}
        </div>
      )}
    </div>
  );
}
