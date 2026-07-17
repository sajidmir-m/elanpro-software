import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  green: "hsl(142 71% 45%)",
  orange: "hsl(38 92% 50%)",
  red: "hsl(0 72% 55%)",
};

function truncateLabel(label: string, max = 22) {
  const text = String(label ?? "").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function AgeStackedChart({
  data,
  maxItems = 10,
  title,
}: {
  data: Array<{ label: string; green: number; orange: number; red: number; total?: number }>;
  maxItems?: number;
  title?: string;
}) {
  const chartData = [...data]
    .sort((a, b) => b.red - a.red || (b.total ?? 0) - (a.total ?? 0))
    .slice(0, maxItems)
    .map((item) => ({
      ...item,
      shortLabel: truncateLabel(item.label),
    }));

  if (!chartData.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
        No call-age data for this view
      </div>
    );
  }

  const barHeight = 32;
  const height = Math.max(220, chartData.length * barHeight + 56);

  return (
    <div className="w-full">
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="shortLabel"
              width={110}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { label?: string } | undefined;
                return row?.label ?? "";
              }}
            />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
            <Bar dataKey="green" name="≤3 days" stackId="age" fill={COLORS.green} />
            <Bar dataKey="orange" name="4-5 days" stackId="age" fill={COLORS.orange} />
            <Bar dataKey="red" name=">5 days" stackId="age" fill={COLORS.red} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {data.length > maxItems && (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing top {maxItems} of {data.length} — use Region/RSH filters to narrow down.
        </p>
      )}
      {title && <p className="mt-1 text-xs text-muted-foreground text-center">{title}</p>}
    </div>
  );
}
