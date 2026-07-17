import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTicketDate } from "@/lib/utils";
import { ENTERPRISE_CARD } from "./constants";

const PRIORITY_STYLES: Record<string, string> = {
  ">60 Days": "bg-red-600/15 text-red-800 border-red-600/30",
  "30-60 Days": "bg-orange-500/15 text-orange-800 border-orange-500/30",
  "5-30 Days": "bg-amber-500/15 text-amber-800 border-amber-500/30",
};

export function CriticalTicketsTable({
  rows,
  onRowClick,
}: {
  rows: Array<Record<string, unknown>>;
  onRowClick?: (row: Record<string, unknown>) => void;
}) {
  return (
    <Card className={ENTERPRISE_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Critical Tickets</CardTitle>
        <CardDescription>Oldest unresolved calls requiring escalation</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[480px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Ticket ID</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Reporting Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Age</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No critical tickets in current view
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, i) => (
                  <TableRow
                    key={String(row.ticket_id ?? i)}
                    className={onRowClick ? "cursor-pointer hover:bg-muted/40" : undefined}
                    onClick={() => onRowClick?.(row)}
                  >
                    <TableCell className="font-mono text-xs">{String(row.ticket_id ?? "—")}</TableCell>
                    <TableCell className="max-w-[100px] truncate" title={String(row.region ?? "")}>
                      {String(row.region ?? "—")}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate" title={String(row.reporting_manager ?? "")}>
                      {String(row.reporting_manager ?? "—")}
                    </TableCell>
                    <TableCell>{String(row.ticket_status ?? "—")}</TableCell>
                    <TableCell className="max-w-[100px] truncate" title={String(row.product ?? "")}>
                      {String(row.product ?? "—")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {Number(row.age_days ?? 0)}d
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={PRIORITY_STYLES[String(row.priority)] ?? ""}
                      >
                        {String(row.priority ?? "—")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {row.created_on ? formatTicketDate(String(row.created_on)) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
