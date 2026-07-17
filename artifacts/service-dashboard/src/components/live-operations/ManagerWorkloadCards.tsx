import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function ManagerWorkloadCards({
  managers,
  onSelect,
}: {
  managers: LiveOperationsDashboard["reportingManagers"];
  onSelect?: (name: string) => void;
}) {
  if (!managers.length) {
    return (
      <Card className={OPS_CARD}>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No reporting manager workload for selected filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {managers.slice(0, 9).map((m) => (
        <Card
          key={m.name}
          className={`${OPS_CARD} ${onSelect ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
          onClick={() => onSelect?.(m.name)}
        >
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-medium">
                  {initials(m.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.partnersManaged} partners</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-semibold tabular-nums">{m.openCalls}</p>
                <p className="text-[10px] text-muted-foreground">Open</p>
              </div>
              <div>
                <p className="text-lg font-semibold tabular-nums text-red-600">{m.criticalCalls}</p>
                <p className="text-[10px] text-muted-foreground">Critical</p>
              </div>
              <div>
                <p className="text-lg font-semibold tabular-nums">{m.avgAge}d</p>
                <p className="text-[10px] text-muted-foreground">Avg Age</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Utilization</span>
                <span className="font-medium tabular-nums">{m.utilizationPct}%</span>
              </div>
              <Progress value={Math.min(100, m.utilizationPct)} className="h-1.5 bg-slate-100" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
