import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { OPS_CARD } from "./constants";

export function OperationsTable({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Operations Summary</CardTitle>
        <p className="text-xs text-muted-foreground">Grouped by manager, product, partner and region</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[520px]">
          <Table>
            <TableHeader className="sticky top-0 bg-white dark:bg-card z-10">
              <TableRow>
                <TableHead>Reporting Manager</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Status Mix</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No operations summary for selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.slice(0, 100).map((row, i) => {
                  const total = Number(row.total ?? 0);
                  const assigned = Number(row.assigned ?? 0);
                  const wip = Number(row.wip ?? 0);
                  const mrf = Number(row.mrf ?? 0);
                  const activePct = total > 0 ? Math.round(((assigned + wip) / total) * 100) : 0;
                  return (
                    <TableRow key={i}>
                      <TableCell className="max-w-[120px] truncate font-medium">
                        {String(row.reporting_manager ?? "—")}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate">{String(row.product ?? "—")}</TableCell>
                      <TableCell className="max-w-[100px] truncate text-xs">{String(row.service_partner ?? "—")}</TableCell>
                      <TableCell className="max-w-[80px] truncate text-xs">{String(row.region ?? "—")}</TableCell>
                      <TableCell className="min-w-[180px]">
                        <div className="flex items-center gap-1.5">
                          <Progress value={activePct} className="h-1.5 flex-1 bg-slate-100" />
                          <div className="flex gap-1">
                            {assigned > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-200 text-blue-700">
                                A{assigned}
                              </Badge>
                            )}
                            {wip > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-200 text-amber-700">
                                W{wip}
                              </Badge>
                            )}
                            {mrf > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-violet-200 text-violet-700">
                                M{mrf}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{total}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
