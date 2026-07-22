import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, RotateCcw, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchFilterOptions,
  parseMultiValue,
  serializeMultiValue,
} from "@/lib/analytics-api";
import { HierarchyPartnerPickerDialog } from "@/components/rsh-partner-picker";
import { MultiSelectPickerDialog } from "@/components/multi-select-picker";
import { SearchableSelect } from "@/components/searchable-select";

export type FilterBarState = {
  search?: string;
  nationalHead?: string | null;
  rsh?: string | null;
  servicePartner?: string | null;
  ash?: string | null;
  componentCategory?: string | null;
  category?: string | null;
  product?: string | null;
  state?: string | null;
  region?: string | null;
  ticketStatus?: string | null;
  callAgeRange?: string | null;
  warranty?: "all" | "in" | "out" | null;
  dateRangeDays?: number | null;
  customerCategory?: string | null;
  customerName?: string | null;
  closureType?: string | null;
};

export type FilterField =
  | "search"
  | "nationalHead"
  | "rsh"
  | "servicePartner"
  | "ash"
  | "componentCategory"
  | "category"
  | "product"
  | "state"
  | "region"
  | "ticketStatus"
  | "callAgeRange"
  | "warranty"
  | "dateRangeDays"
  | "customerCategory"
  | "customerName"
  | "closureType";

const ALL_FIELDS: FilterField[] = [
  "search",
  "nationalHead",
  "rsh",
  "servicePartner",
  "ash",
  "componentCategory",
  "category",
  "product",
  "state",
  "customerCategory",
  "customerName",
  "closureType",
  "ticketStatus",
  "callAgeRange",
  "warranty",
  "dateRangeDays",
];

const CALL_AGE_RANGE_OPTIONS = [
  { label: "All Call Ages", value: "all" },
  { label: "Green (≤3 days)", value: "green" },
  { label: "Orange (4-5 days)", value: "orange" },
  { label: "Red (>5 days)", value: "red" },
  { label: "Older than 30 days", value: "older30" },
  { label: "Older than 60 days", value: "older60" },
];

const DATE_RANGES = [
  { label: "Today", value: "1" },
  { label: "This Week", value: "7" },
  { label: "This Month", value: "30" },
  { label: "Last 7 Days", value: "7" },
  { label: "Last 15 Days", value: "15" },
  { label: "Last 30 Days", value: "30" },
  { label: "Last 90 Days", value: "90" },
  { label: "Last 6 Months", value: "180" },
  { label: "Last 1 Year", value: "365" },
];

const WARRANTY_OPTIONS = [
  { label: "All Warranty", value: "all" },
  { label: "In Warranty", value: "in" },
  { label: "Out of Warranty", value: "out" },
];

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Assigned", value: "Assigned" },
  { label: "WIP", value: "WIP" },
  { label: "MRF", value: "MRF" },
  { label: "Other", value: "Other" },
];

const DEFAULT_FIELD_LABELS: Record<FilterField, string> = {
  search: "Search",
  nationalHead: "National Head",
  rsh: "RSH",
  servicePartner: "Service Partner",
  ash: "ASH",
  componentCategory: "Component Category",
  category: "Category",
  product: "Product",
  state: "State",
  region: "Region",
  ticketStatus: "Status",
  callAgeRange: "Call Range",
  warranty: "Warranty",
  dateRangeDays: "Date Range",
  customerCategory: "Customer Category",
  customerName: "Customer Name",
  closureType: "Closure Type",
};

interface FilterBarProps {
  filters: FilterBarState;
  onChange: (next: FilterBarState) => void;
  fields?: FilterField[];
  fieldLabels?: Partial<Record<FilterField, string>>;
  searchPlaceholder?: string;
  sticky?: boolean;
  className?: string;
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const push = (v: string) => {
    setLocal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 300);
  };

  return (
    <div className="relative flex-1 min-w-[220px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={local}
        onChange={(e) => push(e.target.value)}
        placeholder={placeholder ?? "Search everything…"}
        className="h-9 pl-8 pr-8"
      />
      {local && (
        <button
          type="button"
          onClick={() => push("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function DebouncedTextFilter({
  value,
  onChange,
  placeholder,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  placeholder: string;
}) {
  const [local, setLocal] = useState(value ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const push = (v: string) => {
    setLocal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v.trim() || null), 300);
  };

  return (
    <div className="relative w-[170px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        value={local}
        onChange={(e) => push(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-7 pr-7 text-xs"
      />
      {local && (
        <button
          type="button"
          onClick={() => push("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function allLabel(label: string): string {
  // Avoid "All Product Categorys" / "All Categorys" — labels already read as nouns.
  if (/s$/i.test(label) || /y$/i.test(label) || /\b(category|type|range|status|warranty)$/i.test(label)) {
    return `All ${label}`;
  }
  return `All ${label}s`;
}

function FilterSelect({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string | null | undefined;
  placeholder: string;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  return (
    <SearchableSelect value={value} placeholder={placeholder} options={options} onChange={onChange} />
  );
}

export function FilterBar({
  filters,
  onChange,
  fields = ALL_FIELDS,
  fieldLabels,
  searchPlaceholder,
  sticky,
  className,
}: FilterBarProps) {
  const labelFor = (field: FilterField) => fieldLabels?.[field] ?? DEFAULT_FIELD_LABELS[field];
  const { data: options } = useQuery({
    queryKey: ["filter-options"],
    queryFn: fetchFilterOptions,
    staleTime: 5 * 60 * 1000,
  });

  const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
  const [pickerScope, setPickerScope] = useState<"rsh" | "ash" | "all">("all");
  const [pickerName, setPickerName] = useState<string | null>(null);
  const [rshPickerOpen, setRshPickerOpen] = useState(false);
  const [ashPickerOpen, setAshPickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const set = (patch: Partial<FilterBarState>) => onChange({ ...filters, ...patch });

  const show = (f: FilterField) => fields.includes(f);

  const selectedPartners = parseMultiValue(filters.servicePartner);
  const selectedRsh = parseMultiValue(filters.rsh);
  const selectedAsh = parseMultiValue(filters.ash);
  const selectedProduct = parseMultiValue(filters.product);

  const openPartnerPicker = (scope: "rsh" | "ash" | "all", name: string | null) => {
    setPickerScope(scope);
    setPickerName(name);
    setPartnerPickerOpen(true);
  };

  /** ASH options valid for the currently-selected RSH(es); union across many. */
  const ashOptionsForRsh = (rshValues: string[]): string[] => {
    if (rshValues.length === 0) return options?.ashList ?? [];
    const set = new Set<string>();
    for (const rsh of rshValues) {
      for (const a of options?.ashesByRsh?.[rsh] ?? []) set.add(a);
    }
    return set.size > 0 ? [...set] : (options?.ashList ?? []);
  };

  const applyRshSelection = (values: string[] | null) => {
    if (!values || values.length === 0) {
      set({ rsh: null, servicePartner: null });
      return;
    }
    // Drop any ASH selections that don't belong to the newly selected RSH(es).
    const validAshes = new Set(ashOptionsForRsh(values));
    const remainingAsh = selectedAsh.filter((a) => validAshes.has(a));
    set({
      rsh: serializeMultiValue(values),
      servicePartner: null,
      ash: serializeMultiValue(remainingAsh),
    });
  };

  const applyAshSelection = (values: string[] | null) => {
    if (!values || values.length === 0) {
      set({ ash: null, servicePartner: null });
      return;
    }
    set({ ash: serializeMultiValue(values), servicePartner: null });
  };

  const applyProductSelection = (values: string[] | null) => {
    set({ product: values && values.length > 0 ? serializeMultiValue(values) : null });
  };

  const activeChips = Object.entries(filters).filter(
    ([key, value]) =>
      value != null &&
      value !== "" &&
      value !== "all" &&
      key !== "search",
  );

  const hasActive = activeChips.length > 0 || (filters.search ?? "") !== "";

  const clearAll = () =>
    onChange({ warranty: "all", callAgeRange: null } as FilterBarState);

  const chipLabel = (key: string, value: unknown) => {
    if (key === "servicePartner") {
      const list = parseMultiValue(String(value));
      if (list.length > 1) return `${list.length} partners`;
      return list[0] ?? String(value);
    }
    if (key === "rsh" || key === "ash" || key === "product") {
      const list = parseMultiValue(String(value));
      if (list.length > 1) return `${list.length} selected`;
      return list[0] ?? String(value);
    }
    return String(value);
  };

  return (
    <div
      className={`rounded-xl border border-border/60 bg-card/95 p-4 shadow-sm backdrop-blur space-y-3 ${
        sticky ? "sticky top-0 z-30" : ""
      } ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {show("search") && (
          <SearchBox
            value={filters.search ?? ""}
            onChange={(v) => set({ search: v })}
            placeholder={searchPlaceholder}
          />
        )}

        {show("warranty") && (
          <Select
            value={filters.warranty || "all"}
            onValueChange={(v) => set({ warranty: v as FilterBarState["warranty"] })}
          >
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue placeholder="All Warranty" />
            </SelectTrigger>
            <SelectContent>
              {WARRANTY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {show("ticketStatus") && (
          <Select
            value={filters.ticketStatus || "all"}
            onValueChange={(v) => set({ ticketStatus: v === "all" ? null : v })}
          >
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {show("dateRangeDays") && (
          <Select
            value={filters.dateRangeDays ? String(filters.dateRangeDays) : "all"}
            onValueChange={(v) => set({ dateRangeDays: v === "all" ? null : Number(v) })}
          >
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {DATE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {show("callAgeRange") && (
          <Select
            value={filters.callAgeRange || "all"}
            onValueChange={(v) => set({ callAgeRange: v === "all" ? null : v })}
          >
            <SelectTrigger className="h-9 w-[170px] text-xs">
              <SelectValue placeholder="All Call Ages" />
            </SelectTrigger>
            <SelectContent>
              {CALL_AGE_RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {show("nationalHead") && (
          <FilterSelect
            value={filters.nationalHead}
            placeholder="All National Heads"
            options={options?.nationalHeads ?? []}
            onChange={(v) => set({ nationalHead: v })}
          />
        )}
        {show("rsh") && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 max-w-[200px] gap-1.5 truncate text-xs"
            onClick={() => setRshPickerOpen(true)}
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            {selectedRsh.length === 0
              ? `All ${labelFor("rsh")}`
              : selectedRsh.length === 1
                ? selectedRsh[0]
                : `${selectedRsh.length} ${labelFor("rsh")} selected`}
          </Button>
        )}
        {show("servicePartner") && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 max-w-[230px] gap-1.5 truncate text-xs"
            onClick={() =>
              filters.ash
                ? openPartnerPicker("ash", filters.ash)
                : filters.rsh
                  ? openPartnerPicker("rsh", filters.rsh)
                  : openPartnerPicker("all", null)
            }
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            {selectedPartners.length === 0
              ? "All Service Partners"
              : selectedPartners.length === 1
                ? selectedPartners[0]
                : `${selectedPartners.length} partners selected`}
          </Button>
        )}
        {show("ash") && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 max-w-[200px] gap-1.5 truncate text-xs"
            onClick={() => setAshPickerOpen(true)}
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            {selectedAsh.length === 0
              ? `All ${labelFor("ash")}s`
              : selectedAsh.length === 1
                ? selectedAsh[0]
                : `${selectedAsh.length} ${labelFor("ash")}s selected`}
          </Button>
        )}
        {show("componentCategory") && (
          <FilterSelect
            value={filters.componentCategory}
            placeholder={allLabel(labelFor("componentCategory"))}
            options={options?.componentCategories ?? []}
            onChange={(v) => set({ componentCategory: v })}
          />
        )}
        {show("category") && (
          <FilterSelect
            value={filters.category}
            placeholder={allLabel(labelFor("category"))}
            options={options?.categories ?? []}
            onChange={(v) => set({ category: v })}
          />
        )}
        {show("product") && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 max-w-[200px] gap-1.5 truncate text-xs"
            onClick={() => setProductPickerOpen(true)}
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            {selectedProduct.length === 0
              ? allLabel(labelFor("product"))
              : selectedProduct.length === 1
                ? selectedProduct[0]
                : `${selectedProduct.length} ${labelFor("product")}s selected`}
          </Button>
        )}
        {show("region") && (
          <FilterSelect
            value={filters.region}
            placeholder={allLabel(labelFor("region"))}
            options={options?.regions ?? []}
            onChange={(v) => set({ region: v })}
          />
        )}
        {show("state") && (
          <FilterSelect
            value={filters.state}
            placeholder={allLabel(labelFor("state"))}
            options={options?.states ?? []}
            onChange={(v) => set({ state: v })}
          />
        )}
        {show("customerCategory") && (
          <FilterSelect
            value={filters.customerCategory}
            placeholder={allLabel(labelFor("customerCategory"))}
            options={options?.customerCategories ?? []}
            onChange={(v) => set({ customerCategory: v })}
          />
        )}
        {show("customerName") && (
          <DebouncedTextFilter
            value={filters.customerName}
            placeholder={labelFor("customerName")}
            onChange={(v) => set({ customerName: v })}
          />
        )}
        {show("closureType") && (
          <FilterSelect
            value={filters.closureType}
            placeholder={allLabel(labelFor("closureType"))}
            options={options?.closureTypes ?? []}
            onChange={(v) => set({ closureType: v })}
          />
        )}

        {hasActive && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearAll}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map(([key, value]) => (
            <Badge key={key} variant="secondary" className="gap-1 rounded-sm px-2 py-0.5 text-[11px] font-normal">
              <span className="text-muted-foreground">{labelFor(key as FilterField)}:</span>
              <span className="font-medium">{chipLabel(key, value)}</span>
              <button
                type="button"
                className="ml-0.5 hover:text-destructive"
                onClick={() =>
                  set({
                    [key]:
                      key === "warranty" || key === "callAgeRange"
                        ? "all"
                        : key === "ticketStatus"
                          ? null
                          : null,
                  } as Partial<FilterBarState>)
                }
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <HierarchyPartnerPickerDialog
        open={partnerPickerOpen}
        scope={pickerScope}
        name={pickerName}
        initialSelected={selectedPartners}
        onOpenChange={setPartnerPickerOpen}
        onApply={(partners) => {
          set({
            servicePartner: partners ? serializeMultiValue(partners) : null,
          });
        }}
      />

      <MultiSelectPickerDialog
        open={rshPickerOpen}
        title={`Select ${labelFor("rsh")}`}
        description={`Browse all ${labelFor("rsh")}s from your uploaded data. Choose one or many, then apply.`}
        searchPlaceholder={`Search ${labelFor("rsh")}s…`}
        emptyMessage="No RSH found in uploaded data."
        options={options?.rshList ?? []}
        initialSelected={selectedRsh}
        onOpenChange={setRshPickerOpen}
        onApply={applyRshSelection}
      />

      <MultiSelectPickerDialog
        open={ashPickerOpen}
        title={`Select ${labelFor("ash")}`}
        description={
          selectedRsh.length > 0
            ? `Browse ${labelFor("ash")}s under the selected ${labelFor("rsh")}(s). Choose one or many, then apply.`
            : `Browse all ${labelFor("ash")}s from your uploaded data. Choose one or many, then apply.`
        }
        searchPlaceholder={`Search ${labelFor("ash")}s…`}
        emptyMessage="No ASH found in uploaded data."
        options={ashOptionsForRsh(selectedRsh)}
        initialSelected={selectedAsh}
        onOpenChange={setAshPickerOpen}
        onApply={applyAshSelection}
      />

      <MultiSelectPickerDialog
        open={productPickerOpen}
        title={`Select ${labelFor("product")}`}
        description={`Browse all ${labelFor("product")}s from your uploaded data. Choose one or many, then apply.`}
        searchPlaceholder={`Search ${labelFor("product")}s…`}
        emptyMessage="No products found in uploaded data."
        options={options?.products ?? []}
        initialSelected={selectedProduct}
        onOpenChange={setProductPickerOpen}
        onApply={applyProductSelection}
      />
    </div>
  );
}
