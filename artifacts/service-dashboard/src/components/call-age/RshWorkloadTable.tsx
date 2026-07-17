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
import type { CallAgeDashboard } from "@/lib/analytics-api";
import { ENTERPRISE_CARD } from "./constants";

const BADGE_STYLES: Record<string, string> = {
  Critical: "bg-red-500/15 text-red-700 border-red-500/30",
  "High Risk": "bg-orange-500/15 text-orange-700 border-orange-500/30",
  Watch: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  "On Track": "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

export function RshWorkloadTable({
  rows,
  onRshClick,
}: {
  rows: CallAgeDashboard["topRshWorkload"];
  onRshClick?: (rsh: string) => void;
}) {
  return (
    <Card className={ENTERPRISE_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">RSH Workload & Performance</CardTitle>
        <CardDescription className="space-y-1">
          <span className="block">Backlog owners ranked by calls overdue for more than 5 days.</span>
          <span className="block text-[11px]">
            Within 5d % = calls aged 5 days or less ÷ total calls × 100. Average age uses all calls;
            oldest open is the single longest-open call.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[420px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>RSH</TableHead>
                <TableHead className="text-right">Total Calls</TableHead>
                <TableHead className="text-right">Overdue &gt;5d</TableHead>
                <TableHead className="text-right">Avg Age</TableHead>
                <TableHead className="text-right">Oldest Open</TableHead>
                <TableHead className="text-right">Within 5d</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No RSH data for current filters
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.rsh}
                    className={onRshClick ? "cursor-pointer hover:bg-muted/40" : undefined}
                    onClick={() => onRshClick?.(row.rsh)}
                  >
                    <TableCell className="font-medium max-w-[160px] truncate" title={row.rsh}>
                      {row.rsh}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.totalCalls}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600 font-medium">
                      {row.urgentCalls}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.avgAge}d</TableCell>
                    <TableCell className="text-right tabular-nums">{row.oldestTicket}d</TableCell>
                    <TableCell className="text-right tabular-nums">{row.withinFiveDaysPct}%</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={BADGE_STYLES[row.badge] ?? ""}>
                        {row.badge}
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
