import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, PieChart as PieChartIcon, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CHART_PALETTE } from "@/components/analytics/types";
import type { ClosureBreakdownRow } from "@/lib/analytics-api";
import { HideableSection } from "@/components/hideable-section";

const ROW_HEIGHT = 28;
const MAX_CHART_HEIGHT = 460;

/**
 * Every closed product — large pie by default (share of total) or a scrollable
 * ranked bar chart. No top-N cap.
 */
export function AllProductsChart({
  rows,
  onSelect,
}: {
  rows: ClosureBreakdownRow[];
  onSelect?: (label: string) => void;
}) {
  const [mode, setMode] = useState<"pie" | "bar">("pie");
  const [search, setSearch] = useState("");

  const sorted = useMemo(() => [...(rows ?? [])].sort((a, b) => b.count - a.count), [rows]);
  const data = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((r) => r.label.toLowerCase().includes(q));
  }, [sorted, search]);

  /** Pie stays readable: top products + Other bucket when many SKUs. */
  const pieData = useMemo(() => {
    if (data.length <= 18) return data;
    const top = data.slice(0, 17);
    const rest = data.slice(17);
    const otherCount = rest.reduce((s, r) => s + r.count, 0);
    const otherPct = rest.reduce((s, r) => s + r.pct, 0);
    return [
      ...top,
      { label: `Other (${rest.length} products)`, count: otherCount, pct: Math.round(otherPct * 10) / 10 },
    ];
  }, [data]);

  const barHeight = Math.min(MAX_CHART_HEIGHT, Math.max(220, data.length * ROW_HEIGHT));
  const needsScroll = data.length * ROW_HEIGHT > MAX_CHART_HEIGHT;

  return (
    <HideableSection title="All Products Closed" subtitle="Product volume chart is hidden.">
      <Card className="rounded-xl border border-[#E7EAF0] bg-white shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-[#111827]">All Products Closed</h3>
              <p className="mt-0.5 text-[12px] text-[#667085]">
                Every product with closed-call volume ({sorted.length} products)
                {mode === "pie" && data.length > 18 ? " — pie shows top 17 + Other" : ""}.
              </p>
            </div>
            <div className="flex shrink-0 gap-1 rounded-lg border border-[#E7EAF0] bg-[#F7F8FA] p-1">
              <button
                type="button"
                onClick={() => setMode("pie")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${
                  mode === "pie" ? "bg-white text-[#111827] shadow-sm" : "text-[#667085]"
                }`}
              >
                <PieChartIcon className="size-3.5" /> Pie
              </button>
              <button
                type="button"
                onClick={() => setMode("bar")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${
                  mode === "bar" ? "bg-white text-[#111827] shadow-sm" : "text-[#667085]"
                }`}
              >
                <BarChart3 className="size-3.5" /> Bar
              </button>
            </div>
          </div>

          {sorted.length > 8 && (
            <div className="relative mt-4 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#98A2B3]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a product…"
                className="h-9 w-full rounded-md border border-[#E7EAF0] bg-transparent pl-8 pr-7 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#344054]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {data.length === 0 ? (
            <p className="py-16 text-center text-xs text-[#98A2B3]">
              {sorted.length === 0 ? "No closure data for current filters." : "No products match your search."}
            </p>
          ) : mode === "pie" ? (
            <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-center">
              <div className="mx-auto h-[420px] w-full max-w-[520px] shrink-0 xl:h-[480px] xl:max-w-[560px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={90}
                      outerRadius={170}
                      paddingAngle={1.5}
                      onClick={(_, index) => {
                        const item = pieData[index];
                        if (item && !item.label.startsWith("Other")) onSelect?.(item.label);
                      }}
                      className={onSelect ? "cursor-pointer" : undefined}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={entry.label} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #E7EAF0", fontSize: 12 }}
                      formatter={(value: number, _name, item) => [
                        `${value} calls (${item.payload.pct}%)`,
                        item.payload.label,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="max-h-[420px] flex-1 space-y-1 overflow-y-auto pr-1 xl:max-h-[480px]">
                {pieData.map((entry, i) => (
                  <button
                    key={entry.label}
                    type="button"
                    onClick={() => {
                      if (!entry.label.startsWith("Other")) onSelect?.(entry.label);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }}
                      />
                      <span className="truncate text-[13px] text-[#344054]" title={entry.label}>
                        {entry.label}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[12px] text-[#667085]">
                      {entry.count} · {entry.pct}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{ height: barHeight }}
              className={`mt-4 w-full ${needsScroll ? "overflow-y-auto" : ""}`}
            >
              <div style={{ height: Math.max(barHeight, data.length * ROW_HEIGHT) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF1F5" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#667085" }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={160}
                      tick={{ fontSize: 11, fill: "#344054" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#F2F4F7" }}
                      contentStyle={{ borderRadius: 8, border: "1px solid #E7EAF0", fontSize: 12 }}
                      formatter={(value: number, _name, item) => [
                        `${value} calls (${item.payload.pct}%)`,
                        item.payload.label,
                      ]}
                    />
                    <Bar
                      dataKey="count"
                      radius={[0, 4, 4, 0]}
                      cursor={onSelect ? "pointer" : "default"}
                      onClick={(entry) => onSelect?.((entry.payload as ClosureBreakdownRow).label)}
                    >
                      {data.map((_, i) => (
                        <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="right"
                        style={{ fontSize: 11, fill: "#667085", fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </HideableSection>
  );
}
