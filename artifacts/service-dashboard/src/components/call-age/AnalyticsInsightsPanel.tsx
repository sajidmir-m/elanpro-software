import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RankedBarChart } from "@/components/analytics";
import { MultiSelectPickerDialog } from "@/components/multi-select-picker";
import type { CallAgeDashboard } from "@/lib/analytics-api";
import { ENTERPRISE_CARD } from "./constants";

type PickerField = "rsh" | "ash" | "product" | null;

export function AnalyticsInsightsPanel({
  stats,
  byProduct,
  byRshAge,
  byAshAge,
  onFilterRsh,
  onFilterAsh,
  onFilterProduct,
}: {
  stats: CallAgeDashboard["stats"];
  byProduct: CallAgeDashboard["byProduct"];
  byRshAge: CallAgeDashboard["byRshAge"];
  byAshAge: CallAgeDashboard["byAshAge"];
  onFilterRsh?: (values: string[] | null) => void;
  onFilterAsh?: (values: string[] | null) => void;
  onFilterProduct?: (values: string[] | null) => void;
}) {
  const [picker, setPicker] = useState<PickerField>(null);

  const rshCounts = byRshAge.map((r) => ({ label: r.label, count: r.total }));
  const ashCounts = byAshAge.map((r) => ({ label: r.label, count: r.total }));
  const productCounts = byProduct.map((r) => ({ label: r.label, count: r.count }));

  const pickerConfig: Record<
    Exclude<PickerField, null>,
    { title: string; options: string[]; onApply?: (values: string[] | null) => void }
  > = {
    rsh: { title: "Select RSH", options: rshCounts.map((r) => r.label), onApply: onFilterRsh },
    ash: { title: "Select ASH", options: ashCounts.map((r) => r.label), onApply: onFilterAsh },
    product: { title: "Select Product", options: productCounts.map((r) => r.label), onApply: onFilterProduct },
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Avg Call Age" value={`${stats.avgAge} days`} />
        <MetricCard label="Median Age" value={`${stats.medianAge} days`} />
        <MetricCard label="Oldest Ticket" value={`${stats.oldestTicket} days`} />
        <MetricCard label="SLA Compliance" value={`${stats.slaCompliance}%`} hint="Green ≤3 days" />
        <MetricCard label="Urgency Rate" value={`${stats.urgencyPct}%`} hint="Red >5 days" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <InsightChart
          title="Calls per RSH"
          description="Top RSH by open volume"
          data={rshCounts}
          onBrowse={onFilterRsh ? () => setPicker("rsh") : undefined}
          onBarClick={onFilterRsh ? (label) => onFilterRsh([label]) : undefined}
        />
        <InsightChart
          title="Calls per ASH"
          description="Top ASH by open volume"
          data={ashCounts}
          onBrowse={onFilterAsh ? () => setPicker("ash") : undefined}
          onBarClick={onFilterAsh ? (label) => onFilterAsh([label]) : undefined}
        />
        <InsightChart
          title="Calls per Product"
          description="Product distribution"
          data={productCounts}
          onBrowse={onFilterProduct ? () => setPicker("product") : undefined}
          onBarClick={onFilterProduct ? (label) => onFilterProduct([label]) : undefined}
        />
      </div>

      {picker && (
        <MultiSelectPickerDialog
          open={!!picker}
          title={pickerConfig[picker].title}
          description="Search the full list and select one or many, then apply."
          searchPlaceholder="Search…"
          options={pickerConfig[picker].options}
          onOpenChange={(open) => !open && setPicker(null)}
          onApply={(values) => {
            pickerConfig[picker!].onApply?.(values);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className={`${ENTERPRISE_CARD} p-4`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function InsightChart({
  title,
  description,
  data,
  onBrowse,
  onBarClick,
}: {
  title: string;
  description: string;
  data: Array<{ label: string; count: number }>;
  onBrowse?: () => void;
  onBarClick?: (label: string) => void;
}) {
  const visible = data.slice(0, 8);
  return (
    <Card className={ENTERPRISE_CARD}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription className="text-xs">
            {description}
            {data.length > 8 ? ` · showing top 8 of ${data.length}` : ""}
          </CardDescription>
        </div>
        {onBrowse && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 gap-1 text-[11px]"
            onClick={onBrowse}
          >
            <Search className="h-3 w-3" />
            Browse all
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <RankedBarChart
          data={visible}
          height={180}
          onBarClick={onBarClick ? (item) => onBarClick(String(item.label)) : undefined}
        />
      </CardContent>
    </Card>
  );
}
