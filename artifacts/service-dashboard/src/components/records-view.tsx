import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { FilterBar, type FilterBarState, type FilterField } from "@/components/filter-bar";
import { DataTable } from "@/components/data-table";
import { fetchRecords, type AnalyticsQuery } from "@/lib/analytics-api";

interface RecordsViewProps {
  dataset:
    | "tickets"
    | "active_tickets"
    | "closed_tickets"
    | "mrf_data"
    | "component_consumption"
    | "active_summary"
    | "active_age_summary"
    | "active_call_tickets"
    | "sales_data";
  title: string;
  description?: string;
  fields?: FilterField[];
  searchPlaceholder?: string;
  pageSize?: number;
  defaultSortBy?: string;
  extraQuery?: Partial<AnalyticsQuery>;
}

export function RecordsView({
  dataset,
  title,
  description,
  fields,
  searchPlaceholder,
  pageSize = 50,
  defaultSortBy,
  extraQuery,
}: RecordsViewProps) {
  const [filters, setFilters] = useState<FilterBarState>({ warranty: "all" });
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | null>(defaultSortBy ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const query: AnalyticsQuery = useMemo(
    () => ({
      dataset,
      search: filters.search || null,
      warranty: filters.warranty ?? "all",
      ticketStatus: filters.ticketStatus,
      region: filters.region,
      rsh: filters.rsh,
      servicePartner: filters.servicePartner,
      ash: filters.ash,
      componentCategory: filters.componentCategory,
      category: filters.category,
      product: filters.product,
      state: filters.state,
      dateRangeDays: filters.dateRangeDays,
      page,
      pageSize,
      sortBy,
      sortDir,
      ...extraQuery,
    }),
    [dataset, filters, page, pageSize, sortBy, sortDir, extraQuery],
  );

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["records", query],
    queryFn: () => fetchRecords(query),
    placeholderData: keepPreviousData,
  });

  const handleFilterChange = (next: FilterBarState) => {
    setFilters(next);
    setPage(1);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>

      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        fields={fields}
        searchPlaceholder={searchPlaceholder}
      />

      {error ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-destructive">
          {String((error as Error).message || error)}
        </div>
      ) : (
        <DataTable
          columns={data?.columns ?? []}
          rows={data?.rows ?? []}
          total={data?.total ?? 0}
          page={data?.page ?? page}
          pageSize={data?.pageSize ?? pageSize}
          isLoading={isLoading || (isFetching && !data)}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
