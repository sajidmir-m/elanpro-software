import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchStatusCalls,
  type AnalyticsQuery,
  type StatusCallRow,
} from "@/lib/analytics-api";
import { cn } from "@/lib/utils";

function downloadCsv(status: string, rows: StatusCallRow[]) {
  const columns: Array<[keyof StatusCallRow, string]> = [
    ["ticketId", "Ticket Number"],
    ["customer", "Customer Name"],
    ["address", "Address"],
    ["city", "City"],
    ["product", "Product"],
    ["ticketStatus", "Ticket Status"],
    ["lastStatusFamily", "Last Status Family"],
    ["lastStatus2", "Last Status 2"],
    ["lastAction", "Last Update"],
    ["components", "Part Name"],
    ["ageDays", "Age"],
    ["reOpenTicket", "Reopen"],
    ["repeatTicket", "Repeat"],
    ["reason", "Reason / Last Action"],
    ["wipSubStage", "WIP Sub Stage / Comments"],
    ["servicePartner", "Service Partner"],
    ["reportingManager", "Reporting Manager"],
    ["rsh", "RSH"],
    ["mrfApproval", "MRF Approval"],
    ["createdOn", "Created On"],
  ];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [
    columns.map(([, label]) => escape(label)).join(","),
    ...rows.map((row) => columns.map(([key]) => escape(row[key])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const safeStatus = status.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  anchor.download = `${safeStatus || "status"}-calls-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

const FAMILY_ORDER = ["ASSIGNED", "MRF", "WIP", "FGR", "QUOTE", "LPO", "OPEN"];

function sortFamilies(a: string, b: string) {
  const ai = FAMILY_ORDER.indexOf(a);
  const bi = FAMILY_ORDER.indexOf(b);
  if (ai === -1 && bi === -1) return a.localeCompare(b);
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}

export function StatusCallsDialog({
  open,
  status,
  filters,
  onOpenChange,
}: {
  open: boolean;
  status: string | null;
  filters: AnalyticsQuery;
  onOpenChange: (open: boolean) => void;
}) {
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [detailFilter, setDetailFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["status-calls", status, filters],
    queryFn: () => fetchStatusCalls(status!, filters),
    enabled: open && status != null,
  });

  const allRows = data?.rows ?? [];

  const familyOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of allRows) {
      const family = row.lastStatusFamily || "Unknown";
      counts.set(family, (counts.get(family) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => sortFamilies(a, b))
      .map(([label, count]) => ({ label, count }));
  }, [allRows]);

  const detailOptions = useMemo(() => {
    const scoped =
      familyFilter === "all"
        ? allRows
        : allRows.filter((row) => (row.lastStatusFamily || "Unknown") === familyFilter);
    const counts = new Map<string, number>();
    for (const row of scoped) {
      const detail = row.lastStatus2 || "Unknown";
      counts.set(detail, (counts.get(detail) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count }));
  }, [allRows, familyFilter]);

  const rows = useMemo(() => {
    return allRows.filter((row) => {
      if (familyFilter !== "all" && (row.lastStatusFamily || "Unknown") !== familyFilter) {
        return false;
      }
      if (detailFilter !== "all" && (row.lastStatus2 || "Unknown") !== detailFilter) {
        return false;
      }
      return true;
    });
  }, [allRows, familyFilter, detailFilter]);

  const title = status ? `${status} Calls` : "Status Calls";

  const resetFilters = () => {
    setFamilyFilter("all");
    setDetailFilter("all");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetFilters();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-[1500px] flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">
                Filter by Last status 2 to see which {status ?? "status"} calls are in MRF, FGR, WIP,
                Quote, etc.
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold tabular-nums text-slate-700">
                {rows.length}
                {rows.length !== allRows.length ? ` / ${allRows.length}` : ""} calls
              </span>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={!rows.length}
                onClick={() => status && downloadCsv(status, rows)}
              >
                <Download className="size-4" />
                Export
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setFamilyFilter("all");
                  setDetailFilter("all");
                }}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  familyFilter === "all"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                All ({allRows.length})
              </button>
              {familyOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    setFamilyFilter(option.label);
                    setDetailFilter("all");
                  }}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    familyFilter === option.label
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                  )}
                >
                  {option.label} ({option.count})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Exact Last status 2</span>
              <Select
                value={detailFilter}
                onValueChange={setDetailFilter}
              >
                <SelectTrigger className="h-9 w-full max-w-md text-xs">
                  <SelectValue placeholder="All last statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All last statuses ({detailOptions.reduce((sum, item) => sum + item.count, 0)})
                  </SelectItem>
                  {detailOptions.map((option) => (
                    <SelectItem key={option.label} value={option.label} className="text-xs">
                      {option.label} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(familyFilter !== "all" || detailFilter !== "all") && (
                <Button type="button" variant="ghost" size="sm" className="h-9 text-xs" onClick={resetFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="p-10 text-center text-sm text-destructive">
              Could not load call details. Restart the API and try again.
            </p>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No calls match these Last status filters.
            </p>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow>
                  <TableHead className="whitespace-nowrap">Ticket Number</TableHead>
                  <TableHead className="min-w-[160px]">Customer Name</TableHead>
                  <TableHead className="min-w-[140px]">Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="min-w-[120px]">Product</TableHead>
                  <TableHead className="min-w-[100px]">Family</TableHead>
                  <TableHead className="min-w-[220px]">Last Status 2</TableHead>
                  <TableHead className="min-w-[180px]">Last Update</TableHead>
                  <TableHead className="min-w-[140px]">Part Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="whitespace-nowrap">Reopen &amp; Repeat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={`${row.ticketId}-${index}`} className="align-top">
                    <TableCell className="whitespace-nowrap font-semibold">{row.ticketId}</TableCell>
                    <TableCell className="min-w-[160px] text-xs font-medium">{row.customer}</TableCell>
                    <TableCell className="max-w-[200px] whitespace-normal text-xs">{row.address}</TableCell>
                    <TableCell className="text-xs">{row.city}</TableCell>
                    <TableCell className="max-w-[160px] text-xs">{row.product}</TableCell>
                    <TableCell className="text-xs font-medium">{row.lastStatusFamily}</TableCell>
                    <TableCell className="max-w-[240px] whitespace-normal text-xs">{row.lastStatus2}</TableCell>
                    <TableCell className="max-w-[200px] whitespace-normal text-xs">{row.lastAction}</TableCell>
                    <TableCell className="max-w-[160px] text-xs">{row.components}</TableCell>
                    <TableCell className={row.ageDays > 5 ? "font-semibold text-red-600" : "tabular-nums"}>
                      {row.ageDays}d
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      <p>Reopen: {row.reOpenTicket}</p>
                      <p className="text-muted-foreground">Repeat: {row.repeatTicket}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
