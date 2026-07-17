import { useMemo, useState } from "react";
import { Download, Expand, Lightbulb } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LiveOpsCharts } from "@/lib/analytics-api";
import { ChartFilter, STATUS_FILTER_OPTIONS, TOP_N_OPTIONS } from "./ChartFilter";
import { OPS_CARD } from "./constants";

function ChartShell({
  title,
  subtitle,
  insight,
  onExport,
  filter,
  children,
}: {
  title: string;
  subtitle: string;
  insight: string;
  onExport: () => void;
  filter?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <Card className={OPS_CARD}>
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-[#0F172A]">{title}</CardTitle>
            <p className="text-sm text-[#64748B]">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filter}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExport} title="Export">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFullscreen(true)} title="Fullscreen">
              <Expand className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="min-h-[120px]">{children}</div>
          <div className="flex items-start gap-2 rounded-xl border border-[#E5E7EB] bg-slate-50/50 px-3 py-2.5">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
            <p className="text-sm leading-snug text-[#64748B]">{insight}</p>
          </div>
        </CardContent>
      </Card>
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="min-h-[360px]">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function exportCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => (c.includes(",") ? `"${c}"` : c)).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sliceTop<T>(items: T[], limit: string): T[] {
  if (limit === "all") return items;
  return items.slice(0, Number(limit));
}

function StatusStackedBar({ segments }: { segments: LiveOpsCharts["statusBreakdown"]["segments"] }) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (!total) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-[#64748B]">No status data for current filters.</div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex h-12 w-full overflow-hidden rounded-xl bg-slate-100">
        {segments.map((seg) => {
          const width = (seg.count / total) * 100;
          if (width <= 0) return null;
          return (
            <div
              key={seg.label}
              className="flex items-center justify-center text-xs font-semibold text-white"
              style={{ width: `${width}%`, backgroundColor: seg.color, minWidth: width > 0 ? 28 : 0 }}
              title={`${seg.label}: ${seg.count}`}
            >
              {width >= 10 ? seg.count : ""}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <span className="size-3 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="text-[#64748B]">
              {seg.label} <strong className="text-[#0F172A]">{seg.count}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBarList({
  items,
  color = "#2563EB",
}: {
  items: Array<{ label: string; count: number }>;
  color?: string;
}) {
  if (!items.length) {
    return <div className="flex h-24 items-center justify-center text-sm text-[#64748B]">No data available.</div>;
  }
  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <div className="space-y-3 py-1">
      {items.map((item, i) => {
        const pct = Math.round((item.count / max) * 100);
        return (
          <div key={`${item.label}-${i}`} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-[#0F172A]">{item.label}</span>
              <span className="shrink-0 tabular-nums font-semibold">{item.count}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color, opacity: 1 - i * 0.04 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PartnersBarChart({ items }: { items: LiveOpsCharts["topPartners"]["items"] }) {
  if (!items.length) {
    return <div className="flex h-24 items-center justify-center text-sm text-[#64748B]">No partner data.</div>;
  }
  const data = items.map((i) => ({ ...i, shortLabel: i.label.length > 20 ? `${i.label.slice(0, 19)}…` : i.label }));
  const height = Math.max(220, data.length * 28 + 24);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="shortLabel" width={128} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip labelFormatter={(_, p) => (p?.[0]?.payload as { label?: string })?.label ?? ""} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill="#2563EB" fillOpacity={1 - i * 0.05} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OpsCharts({
  charts,
  onStatusFilter,
}: {
  charts: LiveOpsCharts;
  onStatusFilter?: (status: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [partnerLimit, setPartnerLimit] = useState("10");
  const [productLimit, setProductLimit] = useState("8");
  const [regionLimit, setRegionLimit] = useState("8");

  const statusSegments = useMemo(() => {
    if (statusFilter === "all") return charts.statusBreakdown.segments;
    return charts.statusBreakdown.segments.filter((s) => s.label === statusFilter);
  }, [charts.statusBreakdown.segments, statusFilter]);

  const partnerItems = useMemo(() => sliceTop(charts.topPartners.items, partnerLimit), [charts.topPartners.items, partnerLimit]);
  const productItems = useMemo(
    () => sliceTop(charts.productDistribution.items, productLimit).map((i) => ({ label: i.label, count: i.count })),
    [charts.productDistribution.items, productLimit],
  );
  const regionItems = useMemo(
    () =>
      sliceTop(charts.regionalWorkload.items, regionLimit).map((r) => ({
        label: r.region,
        count: r.openCalls,
      })),
    [charts.regionalWorkload.items, regionLimit],
  );

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <ChartShell
        title={charts.statusBreakdown.title}
        subtitle={charts.statusBreakdown.subtitle}
        insight={charts.statusBreakdown.insight}
        filter={
          <ChartFilter
            label="Filter"
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={(v) => {
              setStatusFilter(v);
              if (v !== "all") onStatusFilter?.(v);
            }}
          />
        }
        onExport={() =>
          exportCsv("status-breakdown.csv", [
            ["Status", "Count"],
            ...statusSegments.map((s) => [s.label, String(s.count)]),
          ])
        }
      >
        <StatusStackedBar segments={statusSegments} />
      </ChartShell>

      <ChartShell
        title={charts.topPartners.title}
        subtitle={charts.topPartners.subtitle}
        insight={charts.topPartners.insight}
        filter={<ChartFilter label="Show" value={partnerLimit} options={TOP_N_OPTIONS} onChange={setPartnerLimit} />}
        onExport={() =>
          exportCsv("top-partners.csv", [
            ["Partner", "Open Calls", "Share %"],
            ...partnerItems.map((i) => [i.label, String(i.count), String(i.pct)]),
          ])
        }
      >
        <PartnersBarChart items={partnerItems} />
      </ChartShell>

      <ChartShell
        title={charts.productDistribution.title}
        subtitle={charts.productDistribution.subtitle}
        insight={charts.productDistribution.insight}
        filter={<ChartFilter label="Show" value={productLimit} options={TOP_N_OPTIONS} onChange={setProductLimit} />}
        onExport={() =>
          exportCsv("product-distribution.csv", [
            ["Product", "Open Calls"],
            ...productItems.map((i) => [i.label, String(i.count)]),
          ])
        }
      >
        <HorizontalBarList items={productItems} color="#2563EB" />
      </ChartShell>

      <ChartShell
        title={charts.regionalWorkload.title}
        subtitle={charts.regionalWorkload.subtitle}
        insight={charts.regionalWorkload.insight}
        filter={<ChartFilter label="Show" value={regionLimit} options={TOP_N_OPTIONS} onChange={setRegionLimit} />}
        onExport={() =>
          exportCsv("regional-workload.csv", [
            ["Region", "Open Calls"],
            ...regionItems.map((i) => [i.label, String(i.count)]),
          ])
        }
      >
        <HorizontalBarList items={regionItems} color="#1E3A5F" />
      </ChartShell>
    </section>
  );
}
