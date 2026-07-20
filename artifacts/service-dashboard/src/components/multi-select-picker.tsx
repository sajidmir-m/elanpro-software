import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Square, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Generic "browse and pick many" popup. Used for RSH / ASH filters so users
 * can search the full list and select as many values as they want, then
 * apply them all at once (same pattern as the Service Partner picker).
 */
export function MultiSelectPickerDialog({
  open,
  title,
  description,
  options,
  initialSelected = [],
  searchPlaceholder = "Search…",
  emptyMessage = "No options available.",
  onOpenChange,
  onApply,
}: {
  open: boolean;
  title: string;
  description?: string;
  options: string[];
  initialSelected?: string[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  onOpenChange: (open: boolean) => void;
  onApply: (values: string[] | null) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setSearch("");
    const available = new Set(options);
    const preset = initialSelected.filter((v) => available.has(v));
    setSelected(new Set(preset));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, options.join("|")]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  const allSelected = options.length > 0 && options.every((o) => selected.has(o));
  const someSelected = selected.size > 0 && !allSelected;

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(options));
  const clearAll = () => setSelected(new Set());

  const apply = () => {
    if (selected.size === 0 || allSelected) {
      onApply(null);
      onOpenChange(false);
      return;
    }
    onApply([...selected]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-8"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={selectAll}>
              <CheckSquare className="h-3.5 w-3.5" />
              Select all
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={clearAll}>
              <Square className="h-3.5 w-3.5" />
              Clear
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {selected.size} of {options.length} selected
              {someSelected ? " (partial)" : allSelected ? " (all)" : ""}
            </span>
          </div>

          <div className="max-h-[320px] overflow-y-auto rounded-lg border border-[#E7EAF0]">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {options.length === 0 ? emptyMessage : "No matches for your search."}
              </p>
            ) : (
              <ul className="divide-y divide-[#E7EAF0]">
                {filtered.map((value) => {
                  const checked = selected.has(value);
                  return (
                    <li key={value}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-[#F7F8FA]">
                        <Checkbox checked={checked} onCheckedChange={() => toggle(value)} />
                        <span className="min-w-0 flex-1 truncate text-sm text-[#111827]">{value}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => { onApply(null); onOpenChange(false); }}>
            Select all
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={apply}>
              Apply{selected.size > 0 && !allSelected ? ` (${selected.size})` : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
