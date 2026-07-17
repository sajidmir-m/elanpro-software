import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFilterOptions, fetchPartnersByAsh, fetchPartnersByRsh } from "@/lib/analytics-api";

function partnersForName(map: Record<string, string[]> | undefined, name: string): string[] {
  if (!map) return [];
  if (map[name]) return map[name]!;
  const key = Object.keys(map).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? map[key]! : [];
}

export function HierarchyPartnerPickerDialog({
  open,
  scope,
  name,
  initialSelected = [],
  onOpenChange,
  onApply,
}: {
  open: boolean;
  scope: "rsh" | "ash" | "all";
  name: string | null;
  initialSelected?: string[];
  onOpenChange: (open: boolean) => void;
  onApply: (partners: string[] | null) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // Prefer cached options so opening the popup is immediate.
  const { data: filterOptions, isLoading: optionsLoading } = useQuery({
    queryKey: ["filter-options"],
    queryFn: fetchFilterOptions,
    staleTime: 5 * 60 * 1000,
    enabled: open && (scope === "all" || !!name),
  });

  const partnerMap = scope === "ash" ? filterOptions?.partnersByAsh : filterOptions?.partnersByRsh;
  const fromOptions =
    scope === "all"
      ? (filterOptions?.servicePartners ?? [])
      : name
        ? partnersForName(partnerMap, name)
        : [];

  // Fallback only if cached options do not contain this hierarchy member.
  const needsFallback =
    scope !== "all" && open && !!name && !optionsLoading && !!filterOptions && fromOptions.length === 0;

  const {
    data: fallbackData,
    isLoading: fallbackLoading,
    error: fallbackError,
  } = useQuery({
    queryKey: [`partners-by-${scope}`, name],
    queryFn: async (): Promise<{ partners: string[] }> => {
      const result =
        scope === "ash" ? await fetchPartnersByAsh(name!) : await fetchPartnersByRsh(name!);
      return { partners: result.partners };
    },
    enabled: needsFallback,
  });

  const partners = fromOptions.length > 0 ? fromOptions : (fallbackData?.partners ?? []);
  const isLoading = optionsLoading || (needsFallback && fallbackLoading);
  const error = fromOptions.length === 0 && needsFallback ? fallbackError : null;

  useEffect(() => {
    if (!open) return;
    setSearch("");
  }, [open, name]);

  useEffect(() => {
    if (!open || isLoading) return;
    const available = new Set(partners);
    const preset = initialSelected.filter((p) => available.has(p));
    if (preset.length > 0) {
      setSelected(new Set(preset));
    } else {
      setSelected(new Set(partners));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, name, partners.join("|"), isLoading]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) => p.toLowerCase().includes(q));
  }, [partners, search]);

  const allSelected = partners.length > 0 && partners.every((p) => selected.has(p));
  const someSelected = selected.size > 0 && !allSelected;

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(partners));
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

  const useAllUnderSelection = () => {
    onApply(null);
    onOpenChange(false);
  };

  const scopeLabel = scope === "ash" ? "Reporting Manager" : scope === "rsh" ? "RSH" : "uploaded data";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Service Partners</DialogTitle>
          <DialogDescription>
            {scope === "all" ? (
              <>All service partners from the complete uploaded active-ticket data.</>
            ) : (
              <>
                Partners under {scopeLabel}{" "}
                <span className="font-semibold text-foreground">{name}</span> from your active tickets.
              </>
            )}{" "}
            Choose all, one, or many — then apply.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search partners…"
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
              {selected.size} of {partners.length} selected
              {someSelected ? " (partial)" : allSelected ? " (all)" : ""}
            </span>
          </div>

          <div className="max-h-[320px] overflow-y-auto rounded-lg border border-[#E7EAF0]">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : error ? (
              <p className="p-6 text-center text-sm text-destructive">
                Could not load partners. Restart the API server, then try again.
              </p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {partners.length === 0
                  ? `No service partners found for this ${scopeLabel} in active tickets.`
                  : "No partners match your search."}
              </p>
            ) : (
              <ul className="divide-y divide-[#E7EAF0]">
                {filtered.map((partner) => {
                  const checked = selected.has(partner);
                  return (
                    <li key={partner}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-[#F7F8FA]">
                        <Checkbox checked={checked} onCheckedChange={() => toggle(partner)} />
                        <span className="min-w-0 flex-1 truncate text-sm text-[#111827]">{partner}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={useAllUnderSelection}>
            {scope === "all" ? "All service partners" : `All partners under ${scopeLabel}`}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={apply} disabled={isLoading}>
              Apply{selected.size > 0 && !allSelected ? ` (${selected.size})` : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
