import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FilterBar, type FilterBarState, type FilterField } from "@/components/filter-bar";
import {
  EmailReportDialog,
  LiveOpsQuickFilters,
  LiveOpsDataExplorer,
  LiveOpsDrilldownDialog,
  OpsCommandBoard,
  OpsHeader,
  PartnersTable,
  StatusCallsDialog,
  StatusMixCards,
  WipMrfReasonsCard,
} from "@/components/live-operations";
import {
  fetchLiveOperationsDashboard,
  type AnalyticsQuery,
  type LiveOperationsDashboard,
  type LiveOpsDrilldownView,
  type LiveOpsPartnerRow,
} from "@/lib/analytics-api";

const LIVE_OPS_FIELDS: FilterField[] = [
  "search",
  "warranty",
  "ticketStatus",
  "callAgeRange",
  "dateRangeDays",
  "region",
  "product",
  "category",
  "rsh",
  "ash",
  "servicePartner",
  "nationalHead",
];

const FIELD_LABELS: Partial<Record<FilterField, string>> = {
  ash: "Reporting Manager",
  rsh: "RSH",
  nationalHead: "National Head",
  region: "Region",
  ticketStatus: "Status",
  callAgeRange: "Call Age",
};

const AUTO_REFRESH_MS = 180_000;

function toAnalyticsQuery(filters: FilterBarState): AnalyticsQuery {
  return {
    search: filters.search || null,
    warranty: filters.warranty ?? "all",
    ticketStatus: filters.ticketStatus,
    callAgeRange: filters.callAgeRange,
    rsh: filters.rsh,
    ash: filters.ash,
    nationalHead: filters.nationalHead,
    servicePartner: filters.servicePartner,
    product: filters.product,
    category: filters.category,
    region: filters.region,
    dateRangeDays: filters.dateRangeDays,
  };
}

function downloadPartnersCsv(data: LiveOperationsDashboard) {
  const headers = [
    "Rank",
    "Partner",
    "Open",
    "Assigned",
    "WIP",
    "Critical",
    "Avg Age",
    "Manager",
    "RSH",
    "Region",
    "Health",
  ];
  const rows = data.topServicePartners.map((p) => [
    p.rank,
    p.servicePartner,
    p.openCalls,
    p.assigned,
    p.wip,
    p.critical,
    p.avgAge,
    p.reportingManager,
    p.rsh,
    p.region ?? "",
    p.health,
  ]);
  const escape = (v: unknown) => {
    const t = String(v ?? "");
    return t.includes(",") ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const csv = [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `live-operations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ActiveTickets() {
  const [filters, setFilters] = useState<FilterBarState>({ warranty: "all" });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<LiveOpsPartnerRow | null>(null);
  const [detailStatus, setDetailStatus] = useState<"WIP" | "MRF" | null>(null);
  const [drilldown, setDrilldown] = useState<{
    view: LiveOpsDrilldownView;
    group?: string;
  } | null>(null);
  const [emailReportOpen, setEmailReportOpen] = useState(false);

  const analyticsQuery = useMemo(() => toAnalyticsQuery(filters), [filters]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["live-operations", analyticsQuery],
    queryFn: () => fetchLiveOperationsDashboard(analyticsQuery),
    placeholderData: keepPreviousData,
    staleTime: 90_000,
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : false,
  });

  const busy = isLoading || (isFetching && !data);

  const statusSummary = data?.opsOverview?.statusSummary ?? {
    assigned: data?.kpis.assigned.value ?? 0,
    wip: data?.kpis.wip.value ?? 0,
    mrf: data?.kpis.mrf.value ?? 0,
    other: 0,
  };

  return (
    <div className="min-h-full bg-[#F7F8FA]">
      <div className="mx-auto max-w-[1680px] space-y-4 p-4 md:p-5">
        <OpsHeader
          refreshedAt={data?.refreshedAt}
          autoRefresh={autoRefresh}
          isFetching={isFetching}
          onToggleAutoRefresh={() => setAutoRefresh((v) => !v)}
          onRefresh={() => refetch()}
          onExport={() => data && downloadPartnersCsv(data)}
          onEmailReport={() => setEmailReportOpen(true)}
        />

        <div className="space-y-2">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            fields={LIVE_OPS_FIELDS}
            fieldLabels={FIELD_LABELS}
            searchPlaceholder="Search partner, region, ticket, product…"
            sticky
            className="rounded-xl border border-[#E7EAF0] bg-white shadow-sm"
          />
          <LiveOpsQuickFilters filters={filters} onChange={setFilters} />
        </div>

        {error ? (
          <div className="flex items-center gap-3 rounded-xl bg-white p-6 text-destructive shadow-sm" role="alert">
            <AlertCircle className="h-5 w-5" />
            <div className="flex-1">
              <p className="font-medium">Failed to load operations dashboard</p>
              <p className="text-sm opacity-80">{String((error as Error).message || error)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status mix — 4 KPI cards with sparklines, right after filters */}
            {busy ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : (
              data && (
                <StatusMixCards
                  status={statusSummary}
                  sparkline={data.kpis.open.sparkline}
                  onSelectStatus={(ticketStatus) => {
                    if (ticketStatus === "WIP" || ticketStatus === "MRF") {
                      setDetailStatus(ticketStatus);
                      return;
                    }
                    setFilters((current) => ({
                      ...current,
                      ticketStatus: current.ticketStatus === ticketStatus ? null : ticketStatus,
                    }));
                  }}
                />
              )
            )}

            {data?.opsOverview?.operationalReasons && (
              <WipMrfReasonsCard reasons={data.opsOverview.operationalReasons} />
            )}

            {data?.dataCoverage && (
              <LiveOpsDataExplorer
                coverage={data.dataCoverage}
                onOpen={(view) => setDrilldown({ view })}
              />
            )}

            {busy ? (
              <div className="space-y-3">
                <Skeleton className="h-[220px] rounded-xl" />
                <Skeleton className="h-[200px] rounded-xl" />
                <Skeleton className="h-[160px] rounded-xl" />
              </div>
            ) : (
              data?.opsOverview && (
                <OpsCommandBoard
                  overview={data.opsOverview}
                  openCalls={data.kpis.open.value}
                  products={data.productInsights ?? []}
                  onSelectRegion={(region) => setFilters((f) => ({ ...f, region }))}
                  onSelectManager={(name) => setFilters((f) => ({ ...f, ash: name }))}
                  onSelectProduct={(product) => setFilters((f) => ({ ...f, product }))}
                  onOpenDrilldown={(view, group) => setDrilldown({ view, group })}
                />
              )
            )}

            {busy ? (
              <Skeleton className="h-[420px] rounded-xl" />
            ) : (
              data && (
                <PartnersTable
                  rows={data.topServicePartners}
                  selected={selectedPartner}
                  onSelect={setSelectedPartner}
                  onClose={() => setSelectedPartner(null)}
                />
              )
            )}
          </div>
        )}
      </div>
      <StatusCallsDialog
        open={detailStatus != null}
        status={detailStatus}
        filters={analyticsQuery}
        onOpenChange={(open) => {
          if (!open) setDetailStatus(null);
        }}
      />
      <LiveOpsDrilldownDialog
        open={drilldown != null}
        view={drilldown?.view ?? null}
        initialGroup={drilldown?.group}
        filters={analyticsQuery}
        onOpenChange={(open) => {
          if (!open) setDrilldown(null);
        }}
      />
      <EmailReportDialog open={emailReportOpen} onOpenChange={setEmailReportOpen} filters={analyticsQuery} />
    </div>
  );
}
