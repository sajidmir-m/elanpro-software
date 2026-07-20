import {
  CheckCircle2,
  Clock3,
  Gauge,
  PackageCheck,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ClosureBreakdownRow, ClosureDashboard } from "@/lib/analytics-api";
import { AllProductsChart } from "@/components/closure/AllProductsChart";
import { CallTypeAgeMatrixTable } from "@/components/closure/CallTypeAgeMatrixTable";
import { HideableSection } from "@/components/hideable-section";

function formatHours(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = hours / 24;
  return `${days >= 10 ? Math.round(days) : days.toFixed(1)}d`;
}

function KpiCard({
  label,
  value,
  description,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="rounded-xl border border-[#E7EAF0] bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">{label}</p>
            <p className="mt-2 text-[30px] font-bold leading-none tabular-nums text-[#111827]">{value}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-[#667085]">{description}</p>
          </div>
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}14`, color }}
          >
            {icon}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownPanel({
  title,
  subtitle,
  rows,
  color,
  onSelect,
}: {
  title: string;
  subtitle: string;
  rows: ClosureBreakdownRow[];
  color: string;
  onSelect?: (label: string) => void;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <Card className="rounded-xl border border-[#E7EAF0] bg-white shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-[14px] font-semibold text-[#111827]">{title}</h3>
        <p className="mt-0.5 text-[11px] text-[#667085]">{subtitle}</p>
        <div className="mt-4 space-y-3">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#98A2B3]">No closure data for current filters.</p>
          ) : (
            rows.map((row) => {
              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-[#344054]" title={row.label}>
                        {row.label}
                      </p>
                      <p className="text-[10px] text-[#98A2B3]">
                        {row.pct}% of closures
                        {row.avgTatHours != null ? ` · ${formatHours(row.avgTatHours)} avg TAT` : ""}
                        {row.within24Pct != null ? ` · ${row.within24Pct}% within 24h` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-bold tabular-nums">{row.count} calls</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F2F4F7]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(3, Math.round((row.count / max) * 100))}%`, backgroundColor: color }}
                    />
                  </div>
                </>
              );
              return onSelect ? (
                <button
                  type="button"
                  key={row.label}
                  onClick={() => onSelect(row.label)}
                  className="w-full rounded-lg p-1 text-left hover:bg-slate-50"
                >
                  {content}
                </button>
              ) : (
                <div key={row.label}>{content}</div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ClosureOverview({
  data,
  onSelectProduct,
  onSelectCustomerCategory,
  onSelectPartner,
  onSelectManager,
}: {
  data: ClosureDashboard;
  onSelectProduct: (value: string) => void;
  onSelectCustomerCategory: (value: string) => void;
  onSelectPartner: (value: string) => void;
  onSelectManager: (value: string) => void;
}) {
  const maxTatBucket = Math.max(1, ...data.tatBuckets.map((bucket) => bucket.count));

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total Closed"
          value={data.kpis.totalClosed.toLocaleString()}
          description="All completed calls in the current filters"
          icon={<CheckCircle2 className="size-4" />}
          color="#2563EB"
        />
        <KpiCard
          label="Closed Today"
          value={data.kpis.closedToday}
          description="Calls with a closure date of today"
          icon={<TrendingUp className="size-4" />}
          color="#16A34A"
        />
        <KpiCard
          label="Average TAT"
          value={formatHours(data.kpis.avgTatHours)}
          description="Combined closure time divided by closed calls"
          icon={<Clock3 className="size-4" />}
          color="#F59E0B"
        />
        <KpiCard
          label="Median TAT"
          value={formatHours(data.kpis.medianTatHours)}
          description="Middle closure time, less affected by outliers"
          icon={<TimerReset className="size-4" />}
          color="#8B5CF6"
        />
        <KpiCard
          label="Within 24 Hours"
          value={`${data.kpis.within24Pct}%`}
          description="Share of calls closed within one day"
          icon={<Gauge className="size-4" />}
          color="#0D9488"
        />
        <KpiCard
          label="MRF Approved"
          value={data.kpis.mrfApproved}
          description={`${data.kpis.mrfPending} linked MRF records remain pending`}
          icon={<PackageCheck className="size-4" />}
          color="#DC2626"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="rounded-xl border border-[#E7EAF0] bg-white shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-[14px] font-semibold text-[#111827]">Closure Time Distribution</h3>
            <p className="mt-0.5 text-[11px] text-[#667085]">
              How quickly completed calls moved from creation to closure.
            </p>
            <div className="mt-5 grid h-[220px] grid-cols-4 items-end gap-4">
              {data.tatBuckets.map((bucket) => {
                const height = Math.max(16, Math.round((bucket.count / maxTatBucket) * 165));
                return (
                  <div key={bucket.label} className="flex h-full flex-col items-center justify-end gap-2">
                    <span className="text-sm font-bold tabular-nums">{bucket.count}</span>
                    <div
                      className="w-full max-w-16 rounded-t-lg"
                      style={{ height, backgroundColor: bucket.color }}
                    />
                    <span className="text-center text-[10px] leading-tight text-[#667085]">{bucket.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <BreakdownPanel
          title="Closure Type"
          subtitle="How tickets were finally resolved or closed"
          rows={data.closureTypes}
          color="#2563EB"
        />
      </section>

      {data.callTypeAgeMatrix && (
        <HideableSection title="Call Type × Age matrix" subtitle="Matrix table is hidden.">
          <CallTypeAgeMatrixTable matrix={data.callTypeAgeMatrix} />
        </HideableSection>
      )}

      <AllProductsChart rows={data.allProducts ?? data.products} onSelect={onSelectProduct} />

      <section className="grid gap-4 lg:grid-cols-2">
        <HideableSection title="Customer Categories">
          <BreakdownPanel
            title="Customer Categories"
            subtitle="Customer type—not product category"
            rows={data.customerCategories}
            color="#8B5CF6"
            onSelect={onSelectCustomerCategory}
          />
        </HideableSection>
        <HideableSection title="Warranty / Support">
          <BreakdownPanel
            title="Warranty / Support"
            subtitle="Closure workload by recorded warranty status"
            rows={data.warranty}
            color="#16A34A"
          />
        </HideableSection>
        <HideableSection title="Service Partner Performance">
          <BreakdownPanel
            title="Service Partner Performance"
            subtitle="Closed-call volume, average TAT and 24-hour completion"
            rows={data.servicePartners}
            color="#2563EB"
            onSelect={onSelectPartner}
          />
        </HideableSection>
        <HideableSection title="Reporting Manager Performance">
          <BreakdownPanel
            title="Reporting Manager Performance"
            subtitle="Completed work grouped by saved Reporting Manager"
            rows={data.reportingManagers}
            color="#DC2626"
            onSelect={onSelectManager}
          />
        </HideableSection>
        <HideableSection title="Closed By">
          <BreakdownPanel
            title="Closed By"
            subtitle="Person or source recorded as closing the ticket"
            rows={data.closedBy}
            color="#64748B"
          />
        </HideableSection>
        <HideableSection title="MRF Approval">
          <BreakdownPanel
            title="MRF Approval"
            subtitle="Approval state linked by Ticket ID"
            rows={data.mrfApproval}
            color="#F97316"
          />
        </HideableSection>
      </section>
    </div>
  );
}
