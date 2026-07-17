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
import { formatTicketDate } from "@/lib/utils";

function downloadCsv(status: "WIP" | "MRF", rows: StatusCallRow[]) {
  const columns: Array<[keyof StatusCallRow, string]> = [
    ["ticketId", "Ticket ID"],
    ["ticketStatus", "Uploaded Status"],
    ["reason", "Recorded Reason"],
    ["wipSubStage", "WIP Sub Stage / Comments"],
    ["lastAction", "Last Action"],
    ["servicePartner", "Service Partner"],
    ["reportingManager", "Reporting Manager"],
    ["rsh", "RSH"],
    ["product", "Product"],
    ["mrfApproval", "MRF Approval"],
    ["mrfStatus", "MRF Status"],
    ["mrfComponents", "MRF Components"],
    ["mrfApprovedBy", "MRF Approved By"],
    ["mrfApprovedDate", "MRF Approved Date"],
    ["mrfDispatchDate", "MRF Dispatch Date"],
    ["customer", "Customer"],
    ["city", "City"],
    ["state", "State"],
    ["ageDays", "Age Days"],
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
  anchor.download = `${status.toLowerCase()}-calls-${new Date().toISOString().slice(0, 10)}.csv`;
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
  status: "WIP" | "MRF" | null;
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

  const title = status === "MRF" ? "MRF / Parts-Pending Calls" : "Work in Progress Calls";

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
                Every call matching the current Live Operations filters, with the exact recorded reason and status details.
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
              No {status} calls match the current filters.
            </p>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="min-w-[190px]">Why Pending</TableHead>
                  <TableHead className="min-w-[300px]">Recorded WIP Stage / Comments</TableHead>
                  <TableHead className="min-w-[180px]">Last Action</TableHead>
                  <TableHead>Service Partner</TableHead>
                  <TableHead>Reporting Manager</TableHead>
                  <TableHead>RSH</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>MRF Approval</TableHead>
                  <TableHead>Customer / Location</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={`${row.ticketId}-${index}`} className="align-top">
                    <TableCell className="font-semibold">{row.ticketId}</TableCell>
                    <TableCell className={row.ageDays > 5 ? "font-semibold text-red-600" : "tabular-nums"}>
                      {row.ageDays}d
                    </TableCell>
                    <TableCell className="text-xs font-medium">{row.reason}</TableCell>
                    <TableCell className="max-w-[380px] whitespace-normal text-xs leading-relaxed text-slate-600">
                      {row.wipSubStage}
                    </TableCell>
                    <TableCell className="max-w-[240px] whitespace-normal text-xs">{row.lastAction}</TableCell>
                    <TableCell className="max-w-[170px] text-xs">{row.servicePartner}</TableCell>
                    <TableCell className="max-w-[160px] text-xs">{row.reportingManager}</TableCell>
                    <TableCell className="max-w-[130px] text-xs">{row.rsh}</TableCell>
                    <TableCell className="max-w-[160px] text-xs">{row.product}</TableCell>
                    <TableCell className="min-w-[180px] text-xs">
                      <p className="font-medium">{row.mrfApproval}</p>
                      <p className="text-muted-foreground">{row.mrfStatus}</p>
                      {row.mrfComponents !== "—" && (
                        <p className="mt-1 text-muted-foreground">{row.mrfComponents}</p>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[170px] text-xs">
                      <p className="font-medium">{row.customer}</p>
                      <p className="text-muted-foreground">{row.city}, {row.state}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {row.createdOn ? formatTicketDate(String(row.createdOn)) : "—"}
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
