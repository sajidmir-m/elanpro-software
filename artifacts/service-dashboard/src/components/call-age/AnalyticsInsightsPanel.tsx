import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RankedBarChart } from "@/components/analytics";
import type { CallAgeDashboard } from "@/lib/analytics-api";
import { ENTERPRISE_CARD } from "./constants";

export function AnalyticsInsightsPanel({
  stats,
  byProduct,
  byRegionAge,
  byRshAge,
}: {
  stats: CallAgeDashboard["stats"];
  byProduct: CallAgeDashboard["byProduct"];
  byRegionAge: CallAgeDashboard["byRegionAge"];
  byRshAge: CallAgeDashboard["byRshAge"];
}) {
  const regionCounts = byRegionAge.map((r) => ({ label: r.label, count: r.total }));
  const rshCounts = byRshAge.map((r) => ({ label: r.label, count: r.total }));

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
        <InsightChart title="Calls per Region" description="Top regions by open volume" data={regionCounts} />
        <InsightChart title="Calls per RSH" description="Top RSH by open volume" data={rshCounts} />
        <InsightChart title="Calls per Product" description="Product distribution" data={byProduct} />
      </div>
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
}: {
  title: string;
  description: string;
  data: Array<{ label: string; count: number }>;
}) {
  return (
    <Card className={ENTERPRISE_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <RankedBarChart data={data.slice(0, 8)} height={180} />
      </CardContent>
    </Card>
  );
}
