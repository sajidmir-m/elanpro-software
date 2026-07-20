import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FilterBar, type FilterBarState, type FilterField } from "@/components/filter-bar";
import {
  ActionCards,
  AgeDistributionCard,
  AnalyticsInsightsPanel,
  AshWorkloadTable,
  CallAgeQuickFilters,
  CriticalTicketsTable,
  ExecutiveSummaryCard,
  ExportButton,
  PremiumKpiGrid,
  RshWorkloadTable,
  TopServicePartnersAtRiskTable,
  TrendPanel,
} from "@/components/call-age";
import { fetchCallAgeDashboard, serializeMultiValue, type AnalyticsQuery } from "@/lib/analytics-api";

const CALL_AGE_FIELDS: FilterField[] = [
  "search",
  "callAgeRange",
  "warranty",
  "ticketStatus",
  "dateRangeDays",
  "rsh",
  "ash",
  "servicePartner",
  "customerCategory",
  "customerName",
  "product",
];

const FIELD_LABELS: Partial<Record<FilterField, string>> = {
  ash: "Reporting Manager",
  rsh: "RSH",
  region: "Region",
  callAgeRange: "Call Range",
  dateRangeDays: "Time",
};

function toAnalyticsQuery(filters: FilterBarState): AnalyticsQuery {
  return {
    search: filters.search || null,
    warranty: filters.warranty ?? "all",
    ticketStatus: filters.ticketStatus,
    callAgeRange: filters.callAgeRange,
    region: filters.region,
    rsh: filters.rsh,
    ash: filters.ash,
    servicePartner: filters.servicePartner,
    product: filters.product,
    customerCategory: filters.customerCategory,
    customerName: filters.customerName,
    dateRangeDays: filters.dateRangeDays,
  };
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-2xl" />
      ))}
    </div>
  );
}

export default function CallAge() {
  const [filters, setFilters] = useState<FilterBarState>({ warranty: "all" });

  const analyticsQuery = useMemo(() => toAnalyticsQuery(filters), [filters]);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["call-age-dashboard", analyticsQuery],
    queryFn: () => fetchCallAgeDashboard(analyticsQuery),
    placeholderData: keepPreviousData,
  });

  const busy = isLoading || (isFetching && !data);

  const applyFilter = (patch: Partial<FilterBarState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  return (
    <div className="-m-4 md:-m-6 min-h-full bg-slate-50/80 dark:bg-background p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Call Age Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            Executive view of open service call aging — identify backlog hotspots, escalate critical tickets,
            and drive same-day operational decisions.
          </p>
          <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
            SLA goal: resolve within 3 days. Critical means older than 5 days, independent of uploaded priority.
            Average age covers all open calls; oldest age is the single longest-open call.
            {data?.dataAsOf ? (
              <>
                {" "}
                Ages are calculated as of the upload snapshot date{" "}
                <span className="font-medium text-foreground">{data.dataAsOf}</span>
                {" "}(latest Created On in the file), not today — so Green / Orange / Red match the extract.
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportButton data={data} />
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="space-y-3">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          fields={CALL_AGE_FIELDS}
          fieldLabels={FIELD_LABELS}
          searchPlaceholder="Search ticket, region, RSH, product…"
          sticky
        />
        <CallAgeQuickFilters filters={filters} onChange={setFilters} />
      </div>

      {error ? (
        <div
          className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Failed to load call age dashboard</p>
            <p className="mt-0.5 text-destructive/80">{String((error as Error).message || error)}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {busy ? <KpiSkeleton /> : data && <PremiumKpiGrid kpis={data.kpis} />}

          {busy ? (
            <Skeleton className="h-28 rounded-2xl" />
          ) : (
            data && <ExecutiveSummaryCard summary={data.executiveSummary} />
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            {busy ? (
              <>
                <Skeleton className="h-80 rounded-2xl" />
                <Skeleton className="h-80 rounded-2xl" />
              </>
            ) : (
              data && (
                <>
                  <AgeDistributionCard
                    ageMix={data.ageMix}
                    stats={data.stats}
                    total={data.totalTickets}
                    filters={filters}
                    onFilterChange={applyFilter}
                  />
                  <TrendPanel trends={data.trends} />
                </>
              )
            )}
          </div>

          {busy ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <Skeleton className="h-96 rounded-2xl" />
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          ) : (
            data && (
              <div className="grid gap-6 xl:grid-cols-2">
                <TopServicePartnersAtRiskTable
                  rows={data.topServicePartnersAtRisk}
                  onPartnerClick={(servicePartner) => applyFilter({ servicePartner })}
                />
                <RshWorkloadTable
                  rows={data.topRshWorkload}
                  onRshClick={(rsh) => applyFilter({ rsh })}
                />
              </div>
            )
          )}

          {busy ? (
            <Skeleton className="h-96 rounded-2xl" />
          ) : (
            data && (
              <AshWorkloadTable
                rows={data.topAshWorkload}
                onAshClick={(ash) => applyFilter({ ash })}
              />
            )
          )}

          {busy ? (
            <Skeleton className="h-[480px] rounded-2xl" />
          ) : (
            data && (
              <CriticalTicketsTable
                rows={data.criticalTickets}
                onRowClick={(row) => {
                  if (row.region) applyFilter({ region: String(row.region) });
                  else if (row.reporting_manager) applyFilter({ ash: String(row.reporting_manager) });
                }}
              />
            )
          )}

          {!busy && data && <ActionCards actions={data.recommendedActions} />}

          {busy ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          ) : (
            data && (
              <AnalyticsInsightsPanel
                stats={data.stats}
                byProduct={data.byProduct}
                byRshAge={data.byRshAge}
                byAshAge={data.byAshAge}
                onFilterRsh={(values) => applyFilter({ rsh: serializeMultiValue(values ?? []) })}
                onFilterAsh={(values) => applyFilter({ ash: serializeMultiValue(values ?? []) })}
                onFilterProduct={(values) => applyFilter({ product: serializeMultiValue(values ?? []) })}
              />
            )
          )}
        </>
      )}
    </div>
  );
}
