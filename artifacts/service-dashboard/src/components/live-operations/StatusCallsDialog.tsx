import { useMemo, useState } from "react";
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
  fetchStatusCalls,
  type AnalyticsQuery,
  type StatusCallRow,
} from "@/lib/analytics-api";

function downloadCsv(status: string, rows: StatusCallRow[]) {
  const columns: Array<[keyof StatusCallRow, string]> = [
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
    ["reason", "Reason / Last Action"],
    ["ticketStatus", "Uploaded Status"],
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
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["status-calls", status, filters],
    queryFn: () => fetchStatusCalls(status!, filters),
    enabled: open && status != null,
  });

  const rows = useMemo(() => {
    const allRows = data?.rows ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return allRows;
    return allRows.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [data?.rows, search]);

  const title = status ? `${status} Calls` : "Status Calls";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSearch("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-[1500px] flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">
                Every call matching the current filters for this exact uploaded status value.
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold tabular-nums text-slate-700">
                {data?.total ?? 0} calls
              </span>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={!data?.rows.length}
                onClick={() => status && data && downloadCsv(status, data.rows)}
              >
                <Download className="size-4" />
                Export
              </Button>
            </div>
          </div>
          <div className="relative mt-3 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ticket, reason, partner, manager, product…"
              className="pl-9"
            />
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
              No calls match this uploaded status in the current filters.
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
                  <TableHead className="min-w-[200px]">Last Update</TableHead>
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
                    <TableCell className="max-w-[240px] whitespace-normal text-xs">{row.lastAction}</TableCell>
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
