import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { FilterBar, type FilterBarState, type FilterField } from "@/components/filter-bar";
import { DataTable } from "@/components/data-table";
import { ClosureOverview } from "@/components/closure-overview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchClosureDashboard,
  fetchRecords,
  type AnalyticsQuery,
} from "@/lib/analytics-api";

const CLOSURE_FIELDS: FilterField[] = [
  "search",
  "warranty",
  "dateRangeDays",
  "region",
  "product",
  "category",
  "rsh",
  "ash",
  "servicePartner",
  "state",
];

const FIELD_LABELS: Partial<Record<FilterField, string>> = {
  ash: "Reporting Manager",
  rsh: "RSH",
  category: "Product Category",
  region: "Region",
};

export default function ClosedTickets() {
  const [filters, setFilters] = useState<FilterBarState>({ warranty: "all" });
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | null>("closed_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const pageSize = 50;

  const analyticsQuery: AnalyticsQuery = useMemo(
    () => ({
      search: filters.search || null,
      warranty: filters.warranty ?? "all",
      region: filters.region,
      rsh: filters.rsh,
      servicePartner: filters.servicePartner,
      ash: filters.ash,
      category: filters.category,
      product: filters.product,
      state: filters.state,
      dateRangeDays: filters.dateRangeDays,
    }),
    [filters],
  );

  const recordsQuery: AnalyticsQuery = useMemo(
    () => ({
      ...analyticsQuery,
      dataset: "closed_tickets",
      page,
      pageSize,
      sortBy,
      sortDir,
    }),
    [analyticsQuery, page, sortBy, sortDir],
  );

  const dashboard = useQuery({
    queryKey: ["closure-operations", analyticsQuery],
    queryFn: () => fetchClosureDashboard(analyticsQuery),
    placeholderData: keepPreviousData,
  });
  const records = useQuery({
    queryKey: ["closure-records", recordsQuery],
    queryFn: () => fetchRecords(recordsQuery),
    placeholderData: keepPreviousData,
  });

  const updateFilters = (next: FilterBarState) => {
    setFilters(next);
    setPage(1);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const busy = dashboard.isLoading && !dashboard.data;

  return (
    <div className="min-h-full bg-[#F7F8FA]">
      <div className="mx-auto max-w-[1680px] space-y-4 p-4 md:p-5">
        <header className="rounded-2xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[32px] font-bold leading-tight tracking-tight text-[#111827]">
                Closure Analytics
              </h1>
              <p className="mt-1 text-[15px] text-[#667085]">
                Completed-work performance, closure TAT, partner execution and linked MRF approval.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {dashboard.data?.refreshedAt && (
                <span className="text-xs text-[#667085]">
                  Updated {new Date(dashboard.data.refreshedAt).toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                className="gap-2"
                disabled={dashboard.isFetching || records.isFetching}
                onClick={() => {
                  dashboard.refetch();
                  records.refetch();
                }}
              >
                <RefreshCw
                  className={`size-4 ${dashboard.isFetching || records.isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <FilterBar
          filters={filters}
          onChange={updateFilters}
          fields={CLOSURE_FIELDS}
          fieldLabels={FIELD_LABELS}
          searchPlaceholder="Search closed ticket, customer, product, partner…"
          sticky
          className="rounded-xl border border-[#E7EAF0] bg-white shadow-sm"
        />

        {dashboard.error ? (
          <div className="flex items-center gap-3 rounded-xl bg-white p-6 text-destructive shadow-sm">
            <AlertCircle className="size-5" />
            <div className="flex-1">
              <p className="font-medium">Failed to load closure analytics</p>
              <p className="text-sm opacity-80">{String((dashboard.error as Error).message)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => dashboard.refetch()}>
              Retry
            </Button>
          </div>
        ) : busy ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-36 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-80 rounded-xl" />
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-80 rounded-xl" />
              <Skeleton className="h-80 rounded-xl" />
            </div>
          </div>
        ) : (
          dashboard.data && (
            <ClosureOverview
              data={dashboard.data}
              onSelectProduct={(product) => updateFilters({ ...filters, product })}
              onSelectRegion={(region) => updateFilters({ ...filters, region })}
              onSelectPartner={(servicePartner) => updateFilters({ ...filters, servicePartner })}
              onSelectManager={(ash) => updateFilters({ ...filters, ash })}
            />
          )
        )}

        <section className="space-y-2">
          <div>
            <h2 className="text-[15px] font-semibold text-[#111827]">Complete Closed Ticket Records</h2>
            <p className="text-[12px] text-[#667085]">
              Same operational fields as Active, plus closure, TAT, consumed components and MRF approval.
            </p>
          </div>
          {records.error ? (
            <div className="rounded-xl border bg-white p-8 text-center text-sm text-destructive">
              {String((records.error as Error).message)}
            </div>
          ) : (
            <div className="rounded-xl border border-[#E7EAF0] bg-white shadow-sm">
              <DataTable
                columns={records.data?.columns ?? []}
                rows={records.data?.rows ?? []}
                total={records.data?.total ?? 0}
                page={records.data?.page ?? page}
                pageSize={records.data?.pageSize ?? pageSize}
                isLoading={records.isLoading || (records.isFetching && !records.data)}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
                onPageChange={setPage}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
