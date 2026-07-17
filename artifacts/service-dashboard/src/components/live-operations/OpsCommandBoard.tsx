import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  LiveOperationsDashboard,
  LiveOpsDrilldownView,
  LiveOpsProductInsight,
} from "@/lib/analytics-api";
import { ChartFilter, TOP_N_OPTIONS } from "./ChartFilter";
import { IndiaLeafletMap } from "./IndiaLeafletMap";

const ASH_COLORS = ["#F59E0B", "#16A34A", "#2563EB", "#8B5CF6", "#64748B"];

function ageBucketColor(label: string): string {
  const start = Number.parseInt(label, 10);
  if (start <= 3) return "#16A34A";
  if (start <= 5) return "#F59E0B";
  if (start <= 8) return "#F97316";
  return "#DC2626";
}

type Overview = NonNullable<LiveOperationsDashboard["opsOverview"]>;

function Panel({
  title,
  filter,
  children,
  className = "",
}: {
  title: string;
  filter?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`h-full rounded-xl border border-[#E7EAF0] bg-white shadow-sm ${className}`}>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#667085]">{title}</p>
          {filter}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function MiniBar({
  label,
  count,
  max,
  color,
  rank,
  suffix,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
  rank?: number;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.max(8, Math.round((count / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <div className="flex min-w-0 items-center gap-2">
          {rank != null && (
            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#667085]">{rank}.</span>
          )}
          <span className="truncate font-medium text-[#111827]" title={label}>
            {label}
          </span>
        </div>
        <span className="shrink-0 font-semibold tabular-nums text-[#111827]">
          {count}
          {suffix ? <span className="ml-1 font-normal text-[#667085]">{suffix}</span> : null}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#F7F8FA]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function RankRow({
  rank,
  label,
  count,
  color,
  onClick,
  meta,
  unit,
}: {
  rank: number;
  label: string;
  count: number;
  color: string;
  onClick?: () => void;
  meta?: string;
  unit?: string;
}) {
  const inner = (
    <>
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[#111827]">{label}</p>
        {meta && <p className="truncate text-[11px] text-[#667085]">{meta}</p>}
      </div>
      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#111827]">
        {count}
        {unit && <span className="ml-1 text-[10px] font-normal text-[#667085]">{unit}</span>}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={label}
        className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left hover:bg-[#F7F8FA]"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5" title={label}>
      {inner}
    </div>
  );
}

function sliceTop<T>(items: T[], limit: string): T[] {
  if (limit === "all") return items;
  return items.slice(0, Number(limit) || 5);
}

export function OpsCommandBoard({
  overview,
  openCalls,
  products = [],
  onSelectRegion,
  onSelectManager,
  onSelectProduct,
  onOpenDrilldown,
}: {
  overview: Overview;
  openCalls: number;
  products?: LiveOpsProductInsight[];
  onSelectRegion?: (region: string) => void;
  onSelectManager?: (name: string) => void;
  onSelectProduct?: (product: string) => void;
  onOpenDrilldown?: (view: LiveOpsDrilldownView, group?: string) => void;
}) {
  const [ashLimit, setAshLimit] = useState("5");
  const [categoryLimit, setCategoryLimit] = useState("5");
  const [cityLimit, setCityLimit] = useState("5");
  const [productSort, setProductSort] = useState("calls");
  const [productLimit, setProductLimit] = useState("5");
  const [ageingView, setAgeingView] = useState("all");

  const managers = useMemo(() => sliceTop(overview.topManagers, ashLimit), [overview.topManagers, ashLimit]);
  const categories = useMemo(
    () => sliceTop(overview.categoryBreakdown ?? [], categoryLimit),
    [overview.categoryBreakdown, categoryLimit],
  );
  const cities = useMemo(
    () => sliceTop(overview.topCities ?? [], cityLimit),
    [overview.topCities, cityLimit],
  );

  const productRows = useMemo(() => {
    const sorted = [...products].sort((a, b) => {
      if (productSort === "failure") return b.failurePct - a.failurePct || b.openCalls - a.openCalls;
      if (productSort === "age") return b.avgAge - a.avgAge || b.openCalls - a.openCalls;
      return b.openCalls - a.openCalls;
    });
    return sliceTop(sorted, productLimit);
  }, [products, productSort, productLimit]);

  const ageingBuckets = useMemo(() => {
    if (ageingView === "critical") {
      return overview.ageingBuckets.filter((b) => Number.parseInt(b.label, 10) >= 6);
    }
    return overview.ageingBuckets;
  }, [overview.ageingBuckets, ageingView]);

  const maxCity = Math.max(1, ...cities.map((c) => c.count));
  const maxAge = Math.max(1, ...ageingBuckets.map((b) => b.count));
  const maxProduct = Math.max(1, ...productRows.map((p) => p.openCalls));
  const longest = overview.longestAgeingTicket;

  return (
    <section className="space-y-4">
      {/* ═══ ROW 1 — Total Tickets + Big OpenStreetMap ═══ */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 overflow-hidden border-0 shadow-md lg:col-span-3">
          <CardContent className="flex h-full min-h-[340px] flex-col justify-center bg-[#1E3A5F] p-6 text-white">
            <p className="text-[12px] font-medium uppercase tracking-wider text-white/70">
              Active calls in current filters
            </p>
            <p className="mt-3 text-[56px] font-bold leading-none tabular-nums tracking-tight">
              {openCalls.toLocaleString()}
            </p>
            <p className="mt-4 text-[13px] text-white/55">Each number represents one currently open service call.</p>
            <p className="mt-6 text-[13px] text-white/70">
              Avg age · <span className="font-semibold text-white">{overview.avgTicketAge} days</span>
            </p>
          </CardContent>
        </Card>

        <div className="col-span-12 lg:col-span-9">
          <Panel
            title="Region Overview"
            filter={
              <div className="flex items-center gap-2">
                <ChartFilter
                  label="Show"
                  value="all"
                  options={[{ label: "All Regions", value: "all" }, ...overview.topRegions.slice(0, 8).map((r) => ({ label: r.region, value: r.region }))]}
                  onChange={(v) => {
                    if (v !== "all") onSelectRegion?.(v);
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => onOpenDrilldown?.("regions")}>Browse all</Button>
              </div>
            }
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
              <IndiaLeafletMap regions={overview.topRegions} onSelect={onSelectRegion} height={300} />
              <div className="space-y-2">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#667085]">Top Regions</p>
                {overview.topRegions.slice(0, 6).map((r, i) => (
                  <button
                    key={r.region}
                    type="button"
                    onClick={() => onSelectRegion?.(r.region)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-[#F7F8FA]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: ["#F59E0B", "#64748B", "#0D9488", "#16A34A", "#2563EB", "#8B5CF6"][
                            i % 6
                          ],
                        }}
                      />
                      <span className="truncate font-medium text-[#111827]" title={r.region}>
                        {r.region}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {r.openCalls} <span className="text-[10px] font-normal text-[#667085]">calls</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* ═══ ROW 2 — Two charts: Top ASH | Customer Category ═══ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Top ASH"
          filter={<ChartFilter label="Show" value={ashLimit} options={TOP_N_OPTIONS} onChange={setAshLimit} />}
        >
          <div className="space-y-1">
            {managers.map((m, i) => (
              <RankRow
                key={m.name}
                rank={m.rank}
                label={m.name}
                count={m.openCalls}
                meta={`${m.avgAge}d average · ${m.criticalCalls} overdue >5d`}
                unit="calls"
                color={ASH_COLORS[i % ASH_COLORS.length]!}
                onClick={() => onSelectManager?.(m.name)}
              />
            ))}
            {managers.length === 0 && (
              <p className="py-10 text-center text-[13px] text-[#667085]">No managers for selected filters.</p>
            )}
          </div>
        </Panel>

        <Panel
          title="Customer Category (customer type)"
          filter={
            <div className="flex items-center gap-2">
              <ChartFilter label="Show" value={categoryLimit} options={TOP_N_OPTIONS} onChange={setCategoryLimit} />
              <Button variant="outline" size="sm" onClick={() => onOpenDrilldown?.("customerCategories")}>
                Browse all
              </Button>
            </div>
          }
        >
          <div className="space-y-1">
            {categories.map((c, i) => (
              <RankRow
                key={c.category}
                rank={i + 1}
                label={c.category}
                count={c.count}
                meta={`${c.pct}% of all filtered active calls`}
                unit="calls"
                onClick={() => onOpenDrilldown?.("customerCategories", c.category)}
                color={ASH_COLORS[i % ASH_COLORS.length]!}
              />
            ))}
            {categories.length === 0 && (
              <p className="py-10 text-center text-[13px] text-[#667085]">No category data for selected filters.</p>
            )}
          </div>
        </Panel>
      </div>

      {/* ═══ ROW 3 — Two charts: Top Cities | Product Failures & Avg Time ═══ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Top Cities"
          filter={
            <div className="flex items-center gap-2">
              <ChartFilter label="Show" value={cityLimit} options={TOP_N_OPTIONS} onChange={setCityLimit} />
              <Button variant="outline" size="sm" onClick={() => onOpenDrilldown?.("cities")}>Browse all</Button>
            </div>
          }
        >
          <div className="space-y-2.5">
            {cities.map((c, i) => (
              <MiniBar
                key={`${c.city}-${i}`}
                rank={i + 1}
                label={c.city}
                count={c.count}
                max={maxCity}
                color="#2563EB"
                suffix="active calls"
              />
            ))}
            {cities.length === 0 && (
              <p className="py-10 text-center text-[13px] text-[#667085]">No city data for selected filters.</p>
            )}
          </div>
        </Panel>

        <Panel
          title="Product Workload"
          filter={
            <div className="flex flex-wrap items-center gap-2">
              <ChartFilter
                label="Sort"
                value={productSort}
                options={[
                  { label: "Most Active Calls", value: "calls" },
                  { label: "Highest Overdue %", value: "failure" },
                  { label: "Highest Average Age", value: "age" },
                ]}
                onChange={setProductSort}
              />
              <ChartFilter label="Show" value={productLimit} options={TOP_N_OPTIONS} onChange={setProductLimit} />
              <Button variant="outline" size="sm" onClick={() => onOpenDrilldown?.("products")}>Browse all</Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-[12px] text-[#667085]">
              Shows open workload by product. “Overdue” means the call has remained open for more than 5 days.
            </p>
            {productRows.map((p, i) => {
              const suffix = `active calls · ${p.avgAge}d average · ${p.failurePct}% overdue`;
              return (
                <button
                  key={p.product}
                  type="button"
                  className="w-full text-left"
                  onClick={() => onSelectProduct?.(p.product)}
                >
                  <MiniBar
                    rank={i + 1}
                    label={p.product}
                    count={p.openCalls}
                    max={maxProduct}
                    color={productSort === "failure" ? "#DC2626" : productSort === "age" ? "#F59E0B" : "#0D9488"}
                    suffix={suffix}
                  />
                </button>
              );
            })}
            {productRows.length === 0 && (
              <p className="py-10 text-center text-[13px] text-[#667085]">
                No product workload for selected filters.
              </p>
            )}
          </div>
        </Panel>
      </div>

      {/* ═══ ROW 4 — Warranty · Ageing · Longest Ticket ═══ */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-4 lg:col-span-3">
          <Panel
            title={`Warranty Coverage · ${openCalls} active calls`}
            filter={<Button variant="outline" size="sm" onClick={() => onOpenDrilldown?.("warranty")}>Browse all</Button>}
          >
            <div className="space-y-3">
              {overview.warrantyBreakdown.map((w) => (
                <button
                  type="button"
                  key={w.label}
                  onClick={() => onOpenDrilldown?.("warranty")}
                  className="flex w-full items-center justify-between rounded px-1 py-1 text-left text-[13px] hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-sm" style={{ backgroundColor: w.color }} />
                    <span className="text-[#667085]">{w.label}</span>
                  </div>
                  <span className="font-semibold tabular-nums text-[#111827]">
                    {w.count} <span className="font-normal text-[#667085]">calls</span>
                    <span className="ml-1 font-normal text-[#98A2B3]">· {w.pct}%</span>
                  </span>
                </button>
              ))}
              <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-[#F7F8FA]">
                {overview.warrantyBreakdown.map((w) =>
                  w.pct > 0 ? (
                    <div
                      key={w.label}
                      style={{ width: `${w.pct}%`, backgroundColor: w.color }}
                      title={`${w.label}: ${w.pct}%`}
                    />
                  ) : null,
                )}
              </div>
            </div>
          </Panel>
        </div>

        <div className="col-span-12 sm:col-span-8 lg:col-span-6">
          <Panel
            title="Tickets Ageing"
            filter={
              <ChartFilter
                label="View"
                value={ageingView}
                options={[
                  { label: "All Buckets", value: "all" },
                  { label: "Critical Only", value: "critical" },
                ]}
                onChange={setAgeingView}
              />
            }
          >
            <div className="flex h-[160px] items-end justify-between gap-2 px-1">
              {ageingBuckets.map((b) => {
                const h = maxAge > 0 ? Math.max(16, Math.round((b.count / maxAge) * 130)) : 16;
                return (
                  <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[12px] font-bold tabular-nums text-[#111827]">{b.count}</span>
                    <div
                      className="w-full max-w-[48px] rounded-t-md transition-all"
                      style={{ height: h, backgroundColor: ageBucketColor(b.label) }}
                    />
                    <span className="text-center text-[10px] leading-tight text-[#667085]">
                      {b.label.replace(" days", "")}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-center text-[12px] text-[#667085]">
              Network average call time:{" "}
              <span className="font-semibold text-[#111827]">{overview.avgTicketAge} days</span>
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-[#667085]">
              <span><b className="text-emerald-600">Green</b> 0–3 days</span>
              <span><b className="text-amber-600">Amber</b> 4–5 days</span>
              <span><b className="text-orange-600">Orange</b> 6–8 days overdue</span>
              <span><b className="text-red-600">Red</b> 9+ days escalation</span>
            </div>
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-3">
          <Card className="h-full overflow-hidden border-0 shadow-md">
            <CardContent className="flex h-full min-h-[180px] flex-col justify-center bg-[#1E3A5F] p-5 text-white">
              <p className="text-[12px] font-medium uppercase tracking-wider text-white/70">
                Longest Ageing Ticket
              </p>
              {longest ? (
                <>
                  <p className="mt-2 text-[40px] font-bold leading-none tabular-nums">
                    {longest.days}{" "}
                    <span className="text-[20px] font-semibold text-white/80">Days</span>
                  </p>
                  <p className="mt-3 text-[13px] text-white/80">{longest.manager}</p>
                  <p className="mt-0.5 text-[12px] text-white/55">#{longest.ticketId}</p>
                  <p className="mt-1 text-[11px] text-white/45">
                    {longest.partner} · {longest.region}
                  </p>
                </>
              ) : (
                <p className="mt-4 text-[13px] text-white/60">No ageing tickets for selected filters.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
