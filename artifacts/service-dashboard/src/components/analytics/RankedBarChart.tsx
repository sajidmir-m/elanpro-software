import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_PALETTE } from "./types";

export function RankedBarChart({
  data,
  valueKey = "count",
  labelKey = "label",
  onBarClick,
  valueFormatter,
  height = 300,
}: {
  data: Array<Record<string, unknown>>;
  valueKey?: string;
  labelKey?: string;
  onBarClick?: (item: Record<string, unknown>) => void;
  valueFormatter?: (value: number) => string;
  height?: number;
}) {
  if (!data.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
        No data for this view
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 64 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey={labelKey}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={70}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (valueFormatter ? valueFormatter(Number(v)) : String(v))}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
            formatter={(value: number) => [
              valueFormatter ? valueFormatter(value) : value,
              "Value",
            ]}
          />
          <Bar
            dataKey={valueKey}
            radius={[4, 4, 0, 0]}
            cursor={onBarClick ? "pointer" : "default"}
            onClick={(entry) => onBarClick?.(entry.payload as Record<string, unknown>)}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
