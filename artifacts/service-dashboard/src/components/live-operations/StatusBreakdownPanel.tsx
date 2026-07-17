import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LiveOpsCharts } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

export function StatusBreakdownPanel({
  segments,
  title = "Call Status Breakdown",
}: {
  segments: LiveOpsCharts["statusBreakdown"]["segments"];
  title?: string;
}) {
  const total = segments.reduce((s, x) => s + x.count, 0);

  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-[22px] font-semibold text-[#111827]">{title}</CardTitle>
        <p className="text-[15px] text-[#667085]">Distribution across operational stages</p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-32 items-center justify-center text-[13px] text-[#667085]">
            No status data for the selected filters.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex h-10 w-full overflow-hidden rounded-xl bg-[#F7F8FA]">
              {segments.map((seg) => {
                const width = (seg.count / total) * 100;
                if (width <= 0) return null;
                return (
                  <div
                    key={seg.label}
                    className="flex items-center justify-center text-[11px] font-semibold text-white transition-all"
                    style={{ width: `${width}%`, backgroundColor: seg.color, minWidth: width > 0 ? 24 : 0 }}
                    title={`${seg.label}: ${seg.count}`}
                  />
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {segments.map((seg) => (
                <div key={seg.label} className="flex items-center justify-between rounded-xl border border-[#E7EAF0] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="text-[15px] text-[#111827]">{seg.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-semibold tabular-nums text-[#111827]">{seg.count}</p>
                    <p className="text-[13px] text-[#667085]">{Math.round((seg.count / total) * 100)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
