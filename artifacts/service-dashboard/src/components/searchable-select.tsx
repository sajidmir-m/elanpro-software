"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Searchable single-select that keeps the search box outside the scrollable
 * list — avoids the Radix Select viewport overlap bug.
 */
export function SearchableSelect({
  value,
  placeholder,
  options,
  onChange,
  className,
  triggerClassName,
}: {
  value: string | null | undefined;
  placeholder: string;
  options: string[];
  onChange: (v: string | null) => void;
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const label = value || placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 w-[170px] justify-between truncate px-3 text-xs font-normal",
            !value && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[240px] p-0", className)} align="start">
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-8 w-full rounded-md border border-input bg-transparent pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <ul className="max-h-64 overflow-y-auto p-1">
          <li>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent",
                !value && "bg-accent font-medium",
              )}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <Check className={cn("h-3.5 w-3.5", value ? "opacity-0" : "opacity-100")} />
              <span className="truncate">{placeholder}</span>
            </button>
          </li>
          {filtered.length === 0 ? (
            <li className="px-2 py-3 text-center text-[11px] text-muted-foreground">No matches</li>
          ) : (
            filtered.map((o) => (
              <li key={o}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent",
                    value === o && "bg-accent font-medium",
                  )}
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-3.5 w-3.5", value === o ? "opacity-100" : "opacity-0")} />
                  <span className="truncate" title={o}>
                    {o}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
