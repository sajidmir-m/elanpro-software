import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

type StatusSummary = {
  label: string;
  count: number;
  pct?: number;
  color: string;
};

function scaleSpark(base: number[], share: number): number[] {
  if (!base.length) return [0, 0, 0, 0, 0, 0, share];
  return base.map((v) => Math.max(0, Math.round(v * share)));
}

export function StatusMixCards({
  statuses,
  sparkline = [],
  onSelectStatus,
}: {
  statuses: StatusSummary[];
  sparkline?: number[];
  onSelectStatus?: (status: string) => void;
}) {
  const total = statuses.reduce((sum, item) => sum + item.count, 0) || 1;
  const cards = statuses.map((item) => ({
    key: item.label,
    label: item.label,
    count: item.count,
    pct: item.pct ?? Math.round((item.count / total) * 100),
    color: item.color,
    fill: `${item.color}14`,
    spark: scaleSpark(sparkline, item.count / total),
  }));

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h2 className="text-[15px] font-semibold text-[#111827]">Ticket Status</h2>
          <p className="text-[13px] text-[#667085]">
            Exact uploaded status mix · {total.toLocaleString()} open calls
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {cards.map((card) => {
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
                      <p className="mt-1.5 text-[12px] tabular-nums text-[#667085]">{card.pct}% of open calls</p>
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
