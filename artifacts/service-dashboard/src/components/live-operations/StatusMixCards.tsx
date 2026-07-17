import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

type StatusSummary = {
  assigned: number;
  wip: number;
  mrf: number;
  other: number;
};

function scaleSpark(base: number[], share: number): number[] {
  if (!base.length) return [0, 0, 0, 0, 0, 0, share];
  return base.map((v) => Math.max(0, Math.round(v * share)));
}

export function StatusMixCards({
  status,
  sparkline = [],
  onSelectStatus,
}: {
  status: StatusSummary;
  sparkline?: number[];
  onSelectStatus?: (status: string) => void;
}) {
  const total = status.assigned + status.wip + status.mrf + status.other || 1;

  const cards = [
    {
      key: "Assigned",
      label: "Assigned",
      count: status.assigned,
      color: "#2563EB",
      fill: "#EFF6FF",
      spark: scaleSpark(sparkline, status.assigned / total),
    },
    {
      key: "WIP",
      label: "Work In Progress",
      count: status.wip,
      color: "#16A34A",
      fill: "#ECFDF5",
      spark: scaleSpark(sparkline, status.wip / total),
    },
    {
      key: "MRF",
      label: "MRF Pending",
      count: status.mrf,
      color: "#F59E0B",
      fill: "#FFFBEB",
      spark: scaleSpark(sparkline, status.mrf / total),
    },
    {
      key: "Other",
      label: "Other",
      count: status.other,
      color: "#64748B",
      fill: "#F8FAFC",
      spark: scaleSpark(sparkline, status.other / total),
    },
  ];

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h2 className="text-[15px] font-semibold text-[#111827]">Ticket Status</h2>
          <p className="text-[13px] text-[#667085]">
            Status mix · {total.toLocaleString()} open calls — click WIP or MRF to see every call and its reason
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const pct = Math.round((card.count / total) * 100);
          const sparkData = card.spark.map((v, i) => ({ i, v }));
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onSelectStatus?.(card.key)}
              className="text-left"
            >
              <Card className="rounded-xl border border-[#E7EAF0] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-sm" style={{ backgroundColor: card.color }} />
                        <p className="text-[13px] font-medium text-[#667085]">{card.label}</p>
                      </div>
                      <p className="mt-2 text-[32px] font-bold leading-none tabular-nums text-[#111827]">
                        {card.count.toLocaleString()}
                      </p>
                      <p className="mt-1.5 text-[12px] tabular-nums text-[#667085]">{pct}% of open calls</p>
                    </div>
                  </div>
                  <div className="mt-3 h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparkData}>
                        <Area
                          type="monotone"
                          dataKey="v"
                          stroke={card.color}
                          fill={card.fill}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </section>
  );
}
