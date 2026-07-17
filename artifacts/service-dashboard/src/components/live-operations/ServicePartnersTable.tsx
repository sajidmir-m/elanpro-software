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
import type { LiveOperationsDashboard } from "@/lib/analytics-api";
import { HEALTH_STYLES, OPS_CARD } from "./constants";

export function ServicePartnersTable({
  rows,
  onSelect,
}: {
  rows: LiveOperationsDashboard["topServicePartners"];
  onSelect?: (partner: string) => void;
}) {
  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Top Service Partners</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[480px]">
          <Table>
            <TableHeader className="sticky top-0 bg-white dark:bg-card z-10">
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Service Partner</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">WIP</TableHead>
                <TableHead className="text-right">MRF</TableHead>
                <TableHead className="text-right">Avg Age</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>RSH</TableHead>
                <TableHead>Health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No service partner workload for selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.servicePartner}
                    className={onSelect ? "cursor-pointer hover:bg-slate-50" : undefined}
                    onClick={() => onSelect?.(row.servicePartner)}
                  >
                    <TableCell className="font-mono text-muted-foreground">{row.rank}</TableCell>
                    <TableCell className="font-medium max-w-[140px] truncate" title={row.servicePartner}>
                      {row.servicePartner}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.openCalls}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.assigned}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.wip}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.mrf}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.avgAge}d</TableCell>
                    <TableCell className="max-w-[100px] truncate text-xs">{row.reportingManager}</TableCell>
                    <TableCell className="max-w-[100px] truncate text-xs">{row.rsh}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={HEALTH_STYLES[row.health] ?? ""}>
                        {row.health}
                      </Badge>
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
