import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

export function WorkloadOverview({ items }: { items: LiveOperationsDashboard["workloadOverview"] }) {
  if (!items.length) {
    return (
      <Card className={OPS_CARD}>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No workload data for selected filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Workload Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {items.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {item.count.toLocaleString()} · {item.pct}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${item.pct}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
