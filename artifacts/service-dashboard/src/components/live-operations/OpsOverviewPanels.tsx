import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

type Overview = NonNullable<LiveOperationsDashboard["opsOverview"]>;

const MANAGER_COLORS = ["#F59E0B", "#16A34A", "#2563EB", "#8B5CF6", "#64748B"];

function HorizontalBar({
  label,
  count,
  max,
  color = "#2563EB",
}: {
  label: string;
  count: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-[#0F172A]">{label}</span>
        <span className="shrink-0 tabular-nums font-semibold text-[#0F172A]">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function OpsOverviewPanels({
  overview,
  totalTickets,
}: {
  overview: Overview;
  totalTickets: number;
}) {
  const maxAge = Math.max(1, ...overview.ageingBuckets.map((b) => b.count));
  const maxRegion = Math.max(1, ...overview.topRegions.map((r) => r.openCalls));

  return (
    <section className="grid gap-4 lg:grid-cols-12">
      <Card className={`${OPS_CARD} lg:col-span-2`}>
        <CardContent className="flex h-full flex-col justify-center p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Total Tickets</p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-[#0F172A]">{totalTickets.toLocaleString()}</p>
          <p className="mt-1 text-sm text-[#64748B]">Avg age {overview.avgTicketAge}d</p>
        </CardContent>
      </Card>

      <Card className={`${OPS_CARD} lg:col-span-3`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#0F172A]">Regional Workload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {overview.topRegions.slice(0, 5).map((r) => (
            <HorizontalBar key={r.region} label={r.region} count={r.openCalls} max={maxRegion} color="#2563EB" />
          ))}
        </CardContent>
      </Card>

      <Card className={`${OPS_CARD} lg:col-span-2`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#0F172A]">Top Reporting Managers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {overview.topManagers.map((m, i) => (
            <div key={m.name} className="flex items-center gap-2 text-sm">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: MANAGER_COLORS[i % MANAGER_COLORS.length] }}
              >
                {m.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-[#0F172A]">{m.name}</span>
              <span className="tabular-nums font-semibold text-[#0F172A]">{m.openCalls}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={`${OPS_CARD} lg:col-span-2`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#0F172A]">Warranty Split</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {overview.warrantyBreakdown.map((w) => (
            <div key={w.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: w.color }} />
                <span className="text-[#64748B]">{w.label}</span>
              </div>
              <span className="font-semibold tabular-nums text-[#0F172A]">
                {w.pct}% <span className="text-xs font-normal text-[#64748B]">({w.count})</span>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={`${OPS_CARD} lg:col-span-3`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#0F172A]">Ticket Ageing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[140px] items-end justify-between gap-2">
            {overview.ageingBuckets.map((b) => {
              const h = maxAge > 0 ? Math.max(8, Math.round((b.count / maxAge) * 100)) : 8;
              return (
                <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold tabular-nums text-[#0F172A]">{b.count}</span>
                  <div
                    className="w-full rounded-t-md bg-[#2563EB]/80 transition-all"
                    style={{ height: `${h}%`, minHeight: 8 }}
                    title={`${b.label}: ${b.count}`}
                  />
                  <span className="text-[9px] text-center leading-tight text-[#64748B]">{b.label.replace(" days", "")}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {overview.longestAgeingTicket && (
        <Card className={`${OPS_CARD} border-l-4 border-l-[#DC2626] lg:col-span-12`}>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Longest Ageing Ticket</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-[#DC2626]">
                {overview.longestAgeingTicket.days} days
              </p>
            </div>
            <div className="text-sm text-[#64748B]">
              <p>
                <span className="font-medium text-[#0F172A]">Ticket:</span> #{overview.longestAgeingTicket.ticketId}
              </p>
              <p>
                <span className="font-medium text-[#0F172A]">Manager:</span> {overview.longestAgeingTicket.manager}
              </p>
              <p>
                <span className="font-medium text-[#0F172A]">Partner:</span> {overview.longestAgeingTicket.partner}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
