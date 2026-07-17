import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_PALETTE } from "./types";

export function DonutChart({
  data,
  onSliceClick,
}: {
  data: Array<{ label: string; count: number; color?: string }>;
  onSliceClick?: (item: { label: string; count: number }) => void;
}) {
  if (!data.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
        No status mix yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-[200px] w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              onClick={(_, index) => onSliceClick?.(data[index])}
              className={onSliceClick ? "cursor-pointer" : undefined}
            >
              {data.map((entry, i) => (
                <Cell key={entry.label} fill={entry.color || CHART_PALETTE[i % CHART_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-1/2 space-y-2">
        {data.map((entry, i) => (
          <button
            key={entry.label}
            type="button"
            className="w-full flex items-center justify-between text-sm hover:bg-muted/50 rounded px-2 py-1"
            onClick={() => onSliceClick?.(entry)}
          >
            <span className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ background: entry.color || CHART_PALETTE[i % CHART_PALETTE.length] }}
              />
              {entry.label}
            </span>
            <span className="font-mono text-muted-foreground">{entry.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
