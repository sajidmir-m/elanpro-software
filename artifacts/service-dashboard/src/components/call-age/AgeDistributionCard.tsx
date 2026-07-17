import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CallAgeDashboard } from "@/lib/analytics-api";
import { AGE_COLORS, ENTERPRISE_CARD } from "./constants";

const SLICE_COLORS = [AGE_COLORS.green, AGE_COLORS.orange, AGE_COLORS.red];

export function AgeDistributionCard({
  ageMix,
  stats,
  total,
}: {
  ageMix: CallAgeDashboard["ageMix"];
  stats: CallAgeDashboard["stats"];
  total: number;
}) {
  if (!ageMix.length) {
    return (
      <Card className={ENTERPRISE_CARD}>
        <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No call-age distribution for this view
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={ENTERPRISE_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Call Age Distribution</CardTitle>
        <CardDescription>Breakdown of open calls by urgency bucket</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ageMix}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                  isAnimationActive
                  label={({ percent }) => `${Math.round(percent * 100)}%`}
                  labelLine={false}
                >
                  {ageMix.map((entry, i) => (
                    <Cell key={entry.label} fill={entry.color || SLICE_COLORS[i % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, _name, props) => [
                    `${value.toLocaleString()} (${Math.round((value / total) * 100)}%)`,
                    props.payload.label,
                  ]}
                  contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums">{total.toLocaleString()}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Open</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {ageMix.map((entry, i) => (
                <div key={entry.label} className="rounded-xl bg-muted/40 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: entry.color || SLICE_COLORS[i % SLICE_COLORS.length] }}
                    />
                    <span className="text-xs text-muted-foreground">{entry.label}</span>
                  </div>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{entry.count.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {total > 0 ? Math.round((entry.count / total) * 100) : 0}%
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 border-t pt-4">
              <Stat label="Avg Age" value={`${stats.avgAge}d`} />
              <Stat label="Median" value={`${stats.medianAge}d`} />
              <Stat label="Oldest" value={`${stats.oldestTicket}d`} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
