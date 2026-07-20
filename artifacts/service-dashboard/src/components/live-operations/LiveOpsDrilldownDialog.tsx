import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchLiveOpsDrilldown,
  type AnalyticsQuery,
  type LiveOpsDrilldownRow,
  type LiveOpsDrilldownView,
} from "@/lib/analytics-api";

function exportRows(title: string, rows: LiveOpsDrilldownRow[]) {
  const columns: Array<[keyof LiveOpsDrilldownRow, string]> = [
    ["ticketId", "Ticket Number"],
    ["customer", "Customer Name"],
    ["address", "Address"],
    ["city", "City"],
    ["product", "Product"],
    ["lastAction", "Last Update"],
    ["components", "Part Name"],
    ["ageDays", "Age"],
    ["reOpenTicket", "Reopen"],
    ["repeatTicket", "Repeat"],
    ["group", "Selected Dimension"],
    ["createdOn", "Created On"],
    ["customerCategory", "Customer Category"],
    ["state", "State"],
    ["servicePartner", "Service Partner"],
    ["reportingManager", "Reporting Manager"],
    ["rsh", "RSH"],
    ["productCategory", "Product Category"],
    ["warranty", "Warranty / Support"],
    ["ticketType", "Ticket Type"],
    ["problemDescription", "Problem Description"],
    ["priority", "Priority"],
    ["ticketStatus", "Ticket Status"],
    ["wipSubStage", "WIP Sub Stage"],
    ["mrfApproval", "MRF Approval"],
    ["mrfStatus", "MRF Status"],
    ["mrfComponents", "MRF Components"],
    ["mrfApprovedBy", "MRF Approved By"],
    ["mrfApprovedDate", "MRF Approved Date"],
    ["mrfDispatchDate", "MRF Dispatch Date"],
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
  anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LiveOpsDrilldownDialog({
  open,
  view,
  filters,
  initialGroup,
  onOpenChange,
}: {
  open: boolean;
  view: LiveOpsDrilldownView | null;
  filters: AnalyticsQuery;
  initialGroup?: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["live-ops-drilldown", view, filters],
    queryFn: () => fetchLiveOpsDrilldown(view!, filters),
    enabled: open && view != null,
  });

  useEffect(() => {
    if (!open) return;
    setSelectedGroup(initialGroup ?? null);
    setSearch("");
  }, [open, view, initialGroup]);

  const visibleGroups = useMemo(() => {
    const groups = data?.groups ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) => group.label.toLowerCase().includes(query));
  }, [data?.groups, search]);

  const visibleRows = useMemo(() => {
    const rows = data?.rows ?? [];
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (selectedGroup && row.group !== selectedGroup) return false;
      if (!query) return true;
      return Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [data?.rows, search, selectedGroup]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setSelectedGroup(null);
          setSearch("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[94vh] w-[97vw] max-w-[1600px] flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <div className="flex flex-col gap-3 pr-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <DialogTitle>{data?.title ?? "Complete Live Operations Data"}</DialogTitle>
              <DialogDescription className="mt-1">
                Complete uploaded active-ticket data—not a top-five sample. Select a value to see its individual calls.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                {data?.uniqueValues ?? 0} unique values
              </span>
              <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                {data?.totalCalls ?? 0} active calls
              </span>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={visibleRows.length === 0}
                onClick={() => data && exportRows(data.title, visibleRows)}
              >
                <Download className="size-4" />
                Export visible
              </Button>
            </div>
          </div>
          <div className="relative mt-3 max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search names, tickets, products, actions, problems…"
              className="pl-9"
            />
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="p-10 text-center text-sm text-destructive">
            Could not load the complete data. Restart the API and try again.
          </p>
        ) : (
          <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="min-h-0 overflow-y-auto border-r bg-slate-50/70 p-3">
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className={`mb-2 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left ${
                  selectedGroup == null ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
                }`}
              >
                <span className="text-sm font-semibold">All calls</span>
                <span className="text-xs font-medium tabular-nums">{data?.totalCalls ?? 0}</span>
              </button>
              <div className="space-y-1.5">
                {visibleGroups.map((group) => (
                  <button
                    type="button"
                    key={group.label}
                    onClick={() => setSelectedGroup(group.label)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left ${
                      selectedGroup === group.label
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-xs font-medium text-slate-800" title={group.label}>
                        {group.label}
                      </span>
                      <span className="shrink-0 text-xs font-bold tabular-nums">{group.count}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {group.avgAge}d avg · {group.overdue} overdue ({group.overduePct}%)
                    </p>
                  </button>
                ))}
              </div>
            </aside>

            <section className="min-h-0 overflow-auto">
              <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-4 py-2 text-xs text-slate-600">
                <span>{selectedGroup ?? "All values"}</span>
                <span>{visibleRows.length} matching calls</span>
              </div>
              {visibleRows.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">No calls match this selection.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-9 z-10 bg-white">
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Ticket Number</TableHead>
                        <TableHead className="min-w-[160px]">Customer Name</TableHead>
                        <TableHead className="min-w-[140px]">Address</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead className="min-w-[120px]">Product</TableHead>
                        <TableHead className="min-w-[200px]">Last Update</TableHead>
                        <TableHead className="min-w-[140px]">Part Name</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead className="whitespace-nowrap">Reopen &amp; Repeat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleRows.map((row, index) => (
                        <TableRow key={`${row.ticketId}-${index}`} className="align-top">
                          <TableCell className="whitespace-nowrap font-semibold">{row.ticketId}</TableCell>
                          <TableCell className="text-xs">
                            <p className="font-medium">{row.customer}</p>
                            <p className="text-muted-foreground">{row.customerCategory}</p>
                          </TableCell>
                          <TableCell className="max-w-[200px] whitespace-normal text-xs">{row.address}</TableCell>
                          <TableCell className="text-xs">{row.city}</TableCell>
                          <TableCell className="text-xs">{row.product}</TableCell>
                          <TableCell className="max-w-[280px] whitespace-normal text-xs">
                            <p>{row.lastAction}</p>
                            {row.wipSubStage && row.wipSubStage !== "—" ? (
                              <p className="mt-1 text-muted-foreground">WIP: {row.wipSubStage}</p>
                            ) : null}
                          </TableCell>
                          <TableCell className="max-w-[180px] whitespace-normal text-xs">{row.components}</TableCell>
                          <TableCell className={row.ageDays > 5 ? "font-semibold text-red-600" : ""}>
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
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
