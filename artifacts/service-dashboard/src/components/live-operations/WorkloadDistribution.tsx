import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { LiveOpsWorkloadRow } from "@/lib/analytics-api";
import { HEALTH_DOT, HEALTH_STYLES, OPS_CARD } from "./constants";

function RankedList({
  title,
  rows,
  onSelect,
}: {
  title: string;
  rows: LiveOpsWorkloadRow[];
  onSelect?: (name: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-[15px] font-semibold text-[#111827]">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[#667085]">No workload data for selected filters.</p>
      ) : (
        rows.map((row) => (
          <button
            key={row.rank}
            type="button"
            onClick={() => onSelect?.(row.name)}
            className="flex w-full items-center gap-3 rounded-xl border border-[#E7EAF0] p-4 text-left transition-all hover:border-[#2563EB]/30 hover:shadow-sm"
          >
            <span className="w-6 text-[13px] font-semibold tabular-nums text-[#667085]">#{row.rank}</span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7F8FA] text-xs font-semibold text-[#111827]">
              {row.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-[#111827]">{row.name}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-[13px] text-[#667085]">
                <span>{row.openCalls} open</span>
                <span className={row.criticalCalls > 0 ? "text-[#DC2626]" : ""}>
                  {row.criticalCalls} critical
                </span>
                <span>{row.avgAge}d avg</span>
                <span>{row.workloadPct}% load</span>
              </div>
              <Progress value={row.workloadPct} className="mt-2 h-1.5 bg-[#F7F8FA]" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={`h-2 w-2 rounded-full ${HEALTH_DOT[row.health] ?? "bg-slate-300"}`} />
              <Badge variant="outline" className={`text-[10px] ${HEALTH_STYLES[row.health] ?? ""}`}>
                {row.health}
              </Badge>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

export function WorkloadDistribution({
  partners,
  managers,
  onSelectPartner,
  onSelectManager,
}: {
  partners: LiveOpsWorkloadRow[];
  managers: LiveOpsWorkloadRow[];
  onSelectPartner?: (name: string) => void;
  onSelectManager?: (name: string) => void;
}) {
  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-[22px] font-semibold text-[#111827]">Workload Distribution</CardTitle>
        <p className="text-[15px] text-[#667085]">Top partners and reporting managers by open workload</p>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <RankedList title="Top Service Partners" rows={partners} onSelect={onSelectPartner} />
        <RankedList title="Top Reporting Managers" rows={managers} onSelect={onSelectManager} />
      </CardContent>
    </Card>
  );
}
