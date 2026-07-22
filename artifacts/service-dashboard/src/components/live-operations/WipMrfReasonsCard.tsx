import { AlertTriangle, ClipboardList, PackageSearch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";

type Reasons = NonNullable<
  NonNullable<LiveOperationsDashboard["opsOverview"]>["operationalReasons"]
>;

function ReasonPanel({
  title,
  subtitle,
  tone,
  icon,
  data,
}: {
  title: string;
  subtitle: string;
  tone: "green" | "amber";
  icon: React.ReactNode;
  data: Reasons["wip"];
}) {
  const color = tone === "green" ? "#16A34A" : "#F59E0B";
  const soft = tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";

  return (
    <Card className="rounded-xl border border-[#E7EAF0] bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${soft}`}>{icon}</span>
            <div>
              <h3 className="text-[14px] font-semibold text-[#111827]">{title}</h3>
              <p className="mt-0.5 text-[12px] text-[#667085]">{subtitle}</p>
            </div>
          </div>
          <span className="text-[28px] font-bold leading-none tabular-nums text-[#111827]">{data.total}</span>
        </div>

        {data.items.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-[#D7DCE5] px-4 py-8 text-center">
            <p className="text-[13px] font-medium text-[#475467]">No calls in this stage</p>
            <p className="mt-1 text-[11px] text-[#98A2B3]">The card updates automatically with current filters.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {data.items.map((item) => (
              <div key={item.reason} className="space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-[#344054]" title={item.reason}>
                      {item.reason}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#98A2B3]">
                      {item.avgAge}d average
                      {item.critical > 0 ? ` · ${item.critical} critical` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[13px] font-bold tabular-nums text-[#111827]">{item.count}</span>
                    <span className="ml-1 text-[10px] text-[#98A2B3]">{item.pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#F2F4F7]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(item.pct, 3)}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {data.missingReasonCount > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700">
            <AlertTriangle className="size-3.5" />
            {data.missingReasonCount} calls have no recorded reason.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function WipMrfReasonsCard({ reasons }: { reasons: Reasons }) {
  return (
    <section className="space-y-2">
      <div className="px-0.5">
        <h2 className="text-[15px] font-semibold text-[#111827]">Why calls are pending</h2>
        <p className="text-[12px] text-[#667085]">
          This section is a derived operational view for uploaded `WIP` and `MRF` rows.
          Reasons come from WIP Sub Stage, comments, last action, and component information.
          Critical means an open call is older than 5 days; it is not the uploaded priority.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ReasonPanel
          title="Work in Progress reasons"
          subtitle="Operational state recorded against WIP calls"
          tone="green"
          icon={<ClipboardList className="size-4" />}
          data={reasons.wip}
        />
        <ReasonPanel
          title="MRF / parts-pending reasons"
          subtitle="Material, spare, and component blockers"
          tone="amber"
          icon={<PackageSearch className="size-4" />}
          data={reasons.mrf}
        />
      </div>
    </section>
  );
}
