import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

export function Sparkline({
  data,
  color = "#2563EB",
  height = 36,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const chartData = useMemo(() => data.map((value, i) => ({ i, value })), [data]);

  if (!data.length) return null;

  return (
    <div style={{ height }} className="w-full opacity-80" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${color})`}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
