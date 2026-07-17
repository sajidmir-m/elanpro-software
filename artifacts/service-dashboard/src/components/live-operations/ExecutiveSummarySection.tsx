import { Card, CardContent } from "@/components/ui/card";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";
import { OpsCounter } from "./OpsCounter";
import { OPS_CARD } from "./constants";

const KPI_ORDER: Array<{
  key: keyof LiveOperationsDashboard["kpis"];
  title: string;
  suffix?: string;
}> = [
  { key: "open", title: "Open Calls" },
  { key: "assigned", title: "Assigned" },
  { key: "wip", title: "Work In Progress" },
  { key: "mrf", title: "MRF Pending" },
  { key: "completedToday", title: "Completed Today" },
  { key: "sla", title: "SLA Compliance", suffix: "%" },
];

export function ExecutiveSummarySection({
  summary,
  kpis,
}: {
  summary: string;
  kpis: LiveOperationsDashboard["kpis"];
}) {
  return (
    <section className="space-y-5">
      <Card className={`${OPS_CARD} border-l-4 border-l-slate-900 dark:border-l-slate-200`}>
        <CardContent className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Executive Summary
          </p>
          <div className="space-y-1.5">
            {summary
              .split(/(?<=\.)\s+/)
              .filter(Boolean)
              .slice(0, 4)
              .map((line, i) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/90">
                  {line.endsWith(".") ? line : `${line}.`}
                </p>
              ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {KPI_ORDER.map(({ key, title, suffix }) => {
          const kpi = kpis?.[key];
          if (!kpi) return null;
          return (
            <Card key={key} className={OPS_CARD}>
              <CardContent className="p-5">
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  <OpsCounter value={kpi.value} />
                  {suffix ?? ""}
                </p>
                <p className="mt-1 text-sm font-medium">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.trendLabel}</p>
                <p className="mt-2 text-[11px] text-muted-foreground leading-snug">{kpi.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
