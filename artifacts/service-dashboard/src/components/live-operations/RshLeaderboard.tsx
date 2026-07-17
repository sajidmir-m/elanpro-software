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
import { OPS_CARD } from "./constants";

export function RshLeaderboard({
  rows,
  onSelect,
}: {
  rows: LiveOperationsDashboard["rshLeaderboard"];
  onSelect?: (rsh: string) => void;
}) {
  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">RSH Performance</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>RSH</TableHead>
              <TableHead className="text-right">Regions</TableHead>
              <TableHead className="text-right">Partners</TableHead>
              <TableHead className="text-right">Open</TableHead>
              <TableHead className="text-right">Critical</TableHead>
              <TableHead className="text-right">SLA</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                  No RSH data for selected filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.slice(0, 12).map((row) => (
                <TableRow
                  key={row.rsh}
                  className={onSelect ? "cursor-pointer hover:bg-slate-50" : undefined}
                  onClick={() => onSelect?.(row.rsh)}
                >
                  <TableCell>
                    {row.rank <= 3 ? (
                      <Badge variant="outline" className="font-mono">
                        #{row.rank}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground font-mono text-sm">#{row.rank}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium max-w-[140px] truncate">{row.rsh}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.regions}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.partners}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{row.openCalls}</TableCell>
                  <TableCell className="text-right tabular-nums text-red-600">{row.critical}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.sla}%</TableCell>
                  <TableCell className="text-right tabular-nums">{row.workloadScore}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
