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

export function TopServicePartnersAtRiskTable({
  rows,
  onPartnerClick,
}: {
  rows: CallAgeDashboard["topServicePartnersAtRisk"];
  onPartnerClick?: (servicePartner: string) => void;
}) {
  return (
    <Card className={ENTERPRISE_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Service Partners at Risk</CardTitle>
        <CardDescription className="space-y-1">
          <span className="block">Sorted by overdue calls — click a partner to filter the dashboard.</span>
          <span className="block text-[11px]">
            Overdue % = calls older than 5 days ÷ total calls × 100. Average age = combined age ÷ calls.
            Oldest open = the single longest-open call.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[420px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Service Partner</TableHead>
                <TableHead>RSH</TableHead>
                <TableHead className="text-right">Within 3d</TableHead>
                <TableHead className="text-right">4–5d</TableHead>
                <TableHead className="text-right">Overdue &gt;5d</TableHead>
                <TableHead className="text-right">Total Calls</TableHead>
                <TableHead className="text-right">Avg Age</TableHead>
                <TableHead className="text-right">Oldest Open</TableHead>
                <TableHead className="text-right">Overdue %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No service partner data for current filters
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.servicePartner}
                    className={onPartnerClick ? "cursor-pointer hover:bg-muted/40" : undefined}
                    onClick={() => onPartnerClick?.(row.servicePartner)}
                  >
                    <TableCell>
                      <RankBadge rank={row.rank} />
                    </TableCell>
                    <TableCell className="font-medium max-w-[160px] truncate" title={row.servicePartner}>
                      {row.servicePartner}
                    </TableCell>
                    <TableCell
                      className="max-w-[180px] truncate text-xs"
                      title={row.rshList.join(", ")}
                    >
                      {row.rshList.slice(0, 2).join(", ") || "—"}
                      {row.rshList.length > 2 ? ` +${row.rshList.length - 2}` : ""}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">{row.green}</TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600">{row.orange}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600 font-medium">{row.red}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.avgAge}d</TableCell>
                    <TableCell className="text-right tabular-nums">{row.oldestTicket}d</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono tabular-nums">
                        {row.overduePct}%
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

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const colors = ["bg-red-500/15 text-red-700 border-red-500/30", "bg-amber-500/15 text-amber-700 border-amber-500/30", "bg-orange-500/15 text-orange-700 border-orange-500/30"];
    return (
      <Badge variant="outline" className={`font-mono ${colors[rank - 1]}`}>
        #{rank}
      </Badge>
    );
  }
  return <span className="text-muted-foreground font-mono text-sm">#{rank}</span>;
}
