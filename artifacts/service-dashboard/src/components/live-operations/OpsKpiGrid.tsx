import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";
import { OpsCounter } from "./OpsCounter";
import { OPS_CARD } from "./constants";

const KPI_DEFS: Array<{
  key: keyof LiveOperationsDashboard["kpis"];
  label: string;
  suffix?: string;
}> = [
  { key: "open", label: "Open Calls" },
  { key: "assigned", label: "Assigned" },
  { key: "wip", label: "Work In Progress" },
  { key: "mrf", label: "MRF Pending" },
  { key: "completedToday", label: "Completed Today" },
  { key: "sla", label: "SLA %", suffix: "%" },
];

export function OpsKpiGrid({ kpis }: { kpis: LiveOperationsDashboard["kpis"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {KPI_DEFS.map(({ key, label, suffix }) => {
        const kpi = kpis?.[key];
        if (!kpi) return null;
        const trend = kpi.trendPct;
        return (
          <Card key={key} className={OPS_CARD}>
            <CardContent className="p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
                <OpsCounter value={kpi.value} />
                {suffix ?? ""}
              </p>
              {trend != null && (
                <p
                  className={`mt-1 flex items-center gap-1 text-xs ${
                    trend > 0 ? "text-amber-600" : trend < 0 ? "text-emerald-600" : "text-muted-foreground"
                  }`}
                >
                  {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                  {trend > 0 ? "+" : ""}
                  {trend}% vs yesterday
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
