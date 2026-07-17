import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LiveOpsCharts } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

function intensityStyle(intensity: number) {
  if (intensity >= 80) return "bg-[#DC2626] text-white";
  if (intensity >= 60) return "bg-[#F59E0B] text-white";
  if (intensity >= 40) return "bg-amber-300 text-[#0F172A]";
  if (intensity >= 20) return "bg-sky-200 text-[#0F172A]";
  return "bg-slate-100 text-[#64748B]";
}

type RegionItem = LiveOpsCharts["regionalWorkload"]["items"][number];

export function RegionHeatmap({
  regions,
  embedded,
}: {
  regions?: RegionItem[];
  embedded?: boolean;
}) {
  const items = regions ?? [];

  const body =
    items.length === 0 ? (
      <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] text-center">
        <p className="text-sm font-medium text-[#0F172A]">No regional workload</p>
        <p className="mt-1 text-sm text-[#64748B]">Try widening your date range or clearing region filters.</p>
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((r) => (
          <div
            key={r.region}
            className={`rounded-2xl p-4 transition-all duration-250 hover:-translate-y-0.5 ${intensityStyle(r.intensity)}`}
            title={`${r.openCalls} open · A${r.assigned} W${r.wip} M${r.mrf}`}
          >
            <p className="truncate text-sm font-semibold">{r.region}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{r.openCalls}</p>
            <p className="mt-1 text-xs opacity-90">{r.intensity}% load</p>
          </div>
        ))}
      </div>
    );

  if (embedded) return body;

  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-[#0F172A]">Regional Workload</CardTitle>
        <p className="text-sm text-[#64748B]">Intensity based on open workload</p>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
