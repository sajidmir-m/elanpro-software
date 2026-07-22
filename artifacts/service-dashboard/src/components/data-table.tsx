import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTicketDate } from "@/lib/utils";
import type { ColumnDef } from "@/lib/analytics-api";

interface DataTableProps {
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  sortBy?: string | null;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: Record<string, unknown>) => void;
}

function formatCell(value: unknown, type?: ColumnDef["type"]): ReactNode {
  if (value == null || value === "") return "";
  if (type === "green" || type === "orange" || type === "red") {
    const text = String(value ?? "");
    if (!text || text === "0") return "";
    const styles = {
      green: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
      orange: "bg-amber-500/15 text-amber-700 border-amber-500/30",
      red: "bg-red-500/15 text-red-700 border-red-500/30",
    };
    const count = Number(value);
    const label = Number.isFinite(count) && String(value) === String(count) ? count.toLocaleString() : text;
    return (
      <Badge variant="outline" className={`font-mono tabular-nums ${styles[type]}`}>
        {label}
      </Badge>
    );
  }
  if (type === "date") return formatTicketDate(String(value));
  if (type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString() : String(value);
  }
  return String(value);
}

export function DataTable({
  columns,
  rows,
  total,
  page,
  pageSize,
  isLoading,
  sortBy,
  sortDir,
  onSort,
  onPageChange,
  onRowClick,
}: DataTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (columns.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 shadow-sm space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map((col) => {
                const active = sortBy === col.key;
                return (
                  <TableHead key={col.key} className="whitespace-nowrap">
                    {onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {col.label}
                        {active ? (
                          sortDir === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUp className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No records match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow
                  key={i}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => {
                    const tone =
                      (col.toneKey ? row[col.toneKey] : col.type) as ColumnDef["type"];
                    return (
                    <TableCell key={col.key} className="whitespace-nowrap">
                      {formatCell(row[col.key], tone)}
                    </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          {total > 0 ? `Showing ${from}–${to} of ${total.toLocaleString()}` : "0 records"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
