import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

export function ProductInsights({ products }: { products: LiveOperationsDashboard["productInsights"] }) {
  const max = Math.max(1, ...products.map((p) => p.openCalls));

  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Product Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {products.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No product workload for selected filters.</p>
        ) : (
          products.map((p) => (
            <div key={p.product} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium" title={p.product}>
                  {p.product}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {p.openCalls} open · A{p.assigned} W{p.wip}
                </span>
              </div>
              <Progress value={(p.openCalls / max) * 100} className="h-2 bg-slate-100" />
              <p className="text-[11px] text-muted-foreground">
                Avg age {p.avgAge}d · Critical load {p.failurePct}%
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
