import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/searchable-select";
import { Button } from "@/components/ui/button";
import { Users, Search } from "lucide-react";
import {
  fetchFilterOptions,
  parseMultiValue,
  serializeMultiValue,
  type CallAgeDashboard,
} from "@/lib/analytics-api";
import { MultiSelectPickerDialog } from "@/components/multi-select-picker";
import { HierarchyPartnerPickerDialog } from "@/components/rsh-partner-picker";
import { useState } from "react";
import { AGE_COLORS, ENTERPRISE_CARD } from "./constants";
import type { FilterBarState } from "@/components/filter-bar";

const SLICE_COLORS = [AGE_COLORS.green, AGE_COLORS.orange, AGE_COLORS.red];

export function AgeDistributionCard({
  ageMix,
  stats,
  total,
  filters,
  onFilterChange,
}: {
  ageMix: CallAgeDashboard["ageMix"];
  stats: CallAgeDashboard["stats"];
  total: number;
  filters?: FilterBarState;
  onFilterChange?: (patch: Partial<FilterBarState>) => void;
}) {
  const { data: options } = useQuery({
    queryKey: ["filter-options"],
    queryFn: fetchFilterOptions,
    staleTime: 5 * 60 * 1000,
    enabled: !!onFilterChange,
  });

  const [rshOpen, setRshOpen] = useState(false);
  const [ashOpen, setAshOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);

  const selectedRsh = parseMultiValue(filters?.rsh);
  const selectedAsh = parseMultiValue(filters?.ash);
  const selectedPartners = parseMultiValue(filters?.servicePartner);

  const ashOptions = (() => {
    if (selectedRsh.length === 0) return options?.ashList ?? [];
    const set = new Set<string>();
    for (const rsh of selectedRsh) {
      for (const a of options?.ashesByRsh?.[rsh] ?? []) set.add(a);
    }
    return set.size > 0 ? [...set] : (options?.ashList ?? []);
  })();

  if (!ageMix.length) {
    return (
      <Card className={ENTERPRISE_CARD}>
        <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No call-age distribution for this view
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={ENTERPRISE_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Call Age Distribution</CardTitle>
        <CardDescription>Breakdown of open calls by urgency bucket</CardDescription>
        {onFilterChange && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 max-w-[180px] gap-1 truncate text-[11px]"
              onClick={() => setRshOpen(true)}
            >
              <Search className="h-3 w-3 shrink-0" />
              {selectedRsh.length === 0
                ? "All RSH"
                : selectedRsh.length === 1
                  ? selectedRsh[0]
                  : `${selectedRsh.length} RSH`}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 max-w-[180px] gap-1 truncate text-[11px]"
              onClick={() => setAshOpen(true)}
            >
              <Search className="h-3 w-3 shrink-0" />
              {selectedAsh.length === 0
                ? "All ASH"
                : selectedAsh.length === 1
                  ? selectedAsh[0]
                  : `${selectedAsh.length} ASH`}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 max-w-[200px] gap-1 truncate text-[11px]"
              onClick={() => setPartnerOpen(true)}
            >
              <Users className="h-3 w-3 shrink-0" />
              {selectedPartners.length === 0
                ? "All Service Partners"
                : selectedPartners.length === 1
                  ? selectedPartners[0]
                  : `${selectedPartners.length} partners`}
            </Button>
            <SearchableSelect
              value={filters?.customerCategory}
              placeholder="All Customer Category"
              options={options?.customerCategories ?? []}
              onChange={(v) => onFilterChange({ customerCategory: v })}
              triggerClassName="h-8 w-[180px] text-[11px]"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ageMix}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={68}
                  outerRadius={98}
                  paddingAngle={3}
                  isAnimationActive
                  // Percentages live in the legend cards — slice labels overlap badly.
                >
                  {ageMix.map((entry, i) => (
                    <Cell key={entry.label} fill={entry.color || SLICE_COLORS[i % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, _name, props) => [
                    `${value.toLocaleString()} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
                    props.payload.label,
                  ]}
                  contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums">{total.toLocaleString()}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Open</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-1">
              {ageMix.map((entry, i) => (
                <div key={entry.label} className="rounded-xl bg-muted/40 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: entry.color || SLICE_COLORS[i % SLICE_COLORS.length] }}
                    />
                    <span className="text-xs text-muted-foreground">{entry.label}</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <p className="text-lg font-semibold tabular-nums">{entry.count.toLocaleString()}</p>
                    <p className="text-sm font-medium tabular-nums text-muted-foreground">
                      {total > 0 ? Math.round((entry.count / total) * 100) : 0}%
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 border-t pt-4">
              <Stat label="Avg Age" value={`${stats.avgAge}d`} />
              <Stat label="Median" value={`${stats.medianAge}d`} />
              <Stat label="Oldest" value={`${stats.oldestTicket}d`} />
            </div>
          </div>
        </div>
      </CardContent>

      {onFilterChange && (
        <>
          <MultiSelectPickerDialog
            open={rshOpen}
            title="Select RSH"
            description="Browse and select one or many RSH values."
            options={options?.rshList ?? []}
            initialSelected={selectedRsh}
            onOpenChange={setRshOpen}
            onApply={(values) =>
              onFilterChange({
                rsh: values && values.length > 0 ? serializeMultiValue(values) : null,
                servicePartner: null,
              })
            }
          />
          <MultiSelectPickerDialog
            open={ashOpen}
            title="Select ASH"
            description="Browse and select one or many ASH / Reporting Manager values."
            options={ashOptions}
            initialSelected={selectedAsh}
            onOpenChange={setAshOpen}
            onApply={(values) =>
              onFilterChange({
                ash: values && values.length > 0 ? serializeMultiValue(values) : null,
                servicePartner: null,
              })
            }
          />
          <HierarchyPartnerPickerDialog
            open={partnerOpen}
            scope={
              selectedAsh.length === 1 ? "ash" : selectedRsh.length === 1 ? "rsh" : "all"
            }
            name={
              selectedAsh.length === 1
                ? selectedAsh[0]!
                : selectedRsh.length === 1
                  ? selectedRsh[0]!
                  : null
            }
            initialSelected={selectedPartners}
            onOpenChange={setPartnerOpen}
            onApply={(partners) =>
              onFilterChange({
                servicePartner: partners ? serializeMultiValue(partners) : null,
              })
            }
          />
        </>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
