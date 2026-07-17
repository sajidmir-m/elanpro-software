import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTicketDate } from "@/lib/utils";
import type { LiveOpsPartnerRow } from "@/lib/analytics-api";
import { HEALTH_DOT, HEALTH_STYLES, OPS_CARD } from "./constants";

type SortKey = keyof Pick<
  LiveOpsPartnerRow,
  "rank" | "servicePartner" | "openCalls" | "assigned" | "wip" | "critical" | "avgAge" | "reportingManager" | "rsh" | "region" | "health"
>;

export function PartnersTable({
  rows,
  selected,
  onSelect,
  onClose,
}: {
  rows: LiveOpsPartnerRow[];
  selected: LiveOpsPartnerRow | null;
  onSelect: (row: LiveOpsPartnerRow) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("openCalls");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isExpanded, setIsExpanded] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = rows.filter(
        (r) =>
          r.servicePartner.toLowerCase().includes(q) ||
          r.reportingManager.toLowerCase().includes(q) ||
          r.rsh.toLowerCase().includes(q) ||
          (r.region ?? "").toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [rows, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <>
      <Card className={OPS_CARD}>
        <CardHeader className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold text-[#0F172A]">Service Partner Performance</CardTitle>
            <p className="text-sm text-[#64748B]">Click a row for complete partner details</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {isExpanded && (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter partners…"
                  className="h-10 pl-9"
                />
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2"
              onClick={() => setIsExpanded((value) => !value)}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {isExpanded ? "Hide table" : "Show table"}
            </Button>
          </div>
        </CardHeader>
        {isExpanded && <CardContent className="p-0">
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow>
                  {(
                    [
                      ["rank", "Rank"],
                      ["servicePartner", "Service Partner"],
                      ["openCalls", "Open"],
                      ["assigned", "Assigned"],
                      ["wip", "WIP"],
                      ["critical", "Overdue (>5d)"],
                      ["avgAge", "Avg Age (days)"],
                      ["reportingManager", "Reporting Manager"],
                      ["rsh", "RSH"],
                      ["region", "Region"],
                      ["health", "Health"],
                    ] as Array<[SortKey, string]>
                  ).map(([key, label]) => (
                    <TableHead key={key}>
                      <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(key)}>
                        {label}
                        <SortIcon col={key} />
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-32 text-center">
                      <p className="font-medium text-[#0F172A]">No partners match your filters</p>
                      <p className="mt-1 text-sm text-[#64748B]">Clear the search or adjust global filters above.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow
                      key={row.servicePartner}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                      data-state={selected?.servicePartner === row.servicePartner ? "selected" : undefined}
                      onClick={() => onSelect(row)}
                    >
                      <TableCell className="tabular-nums text-[#64748B]">{row.rank}</TableCell>
                      <TableCell className="max-w-[180px] truncate font-medium">{row.servicePartner}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.openCalls}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.assigned}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.wip}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.critical}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.avgAge}d</TableCell>
                      <TableCell className="max-w-[140px] truncate text-xs">{row.reportingManager}</TableCell>
                      <TableCell className="max-w-[120px] truncate text-xs">{row.rsh}</TableCell>
                      <TableCell className="max-w-[100px] truncate text-xs">{row.region ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={HEALTH_STYLES[row.health] ?? ""}>
                          <span className={`mr-1 inline-block size-1.5 rounded-full ${HEALTH_DOT[row.health] ?? ""}`} />
                          {row.health}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>}
      </Card>

      <Sheet open={!!selected} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && <PartnerDrawer partner={selected} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function PartnerDrawer({ partner }: { partner: LiveOpsPartnerRow }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-xl">{partner.servicePartner}</SheetTitle>
        <SheetDescription>Service partner operational profile</SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Open Calls" value={partner.openCalls} />
          <Stat label="Overdue >5 Days" value={partner.critical} />
          <Stat label="Assigned" value={partner.assigned} />
          <Stat label="WIP" value={partner.wip} />
          <Stat label="Avg Age" value={`${partner.avgAge}d`} />
          <Stat label="Oldest Ticket" value={partner.oldestTicket ? `${partner.oldestTicket}d` : "—"} />
        </div>

        <InfoBlock label="Reporting Manager" value={(partner.reportingManagers ?? [partner.reportingManager]).join(", ")} />
        <InfoBlock label="RSH" value={(partner.rshList ?? [partner.rsh]).join(", ")} />
        <InfoBlock label="Region" value={(partner.regions ?? [partner.region ?? "—"]).join(", ")} />
        <InfoBlock label="Products" value={(partner.products ?? []).join(", ") || "—"} />

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Health</p>
          <Badge variant="outline" className={HEALTH_STYLES[partner.health] ?? ""}>
            {partner.health}
          </Badge>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Recent Tickets</p>
          {(partner.recentTickets ?? []).length === 0 ? (
            <p className="text-sm text-[#64748B]">No recent ticket activity.</p>
          ) : (
            <div className="space-y-2">
              {partner.recentTickets!.map((t) => (
                <div key={t.ticketId} className="rounded-xl border border-[#E5E7EB] p-3">
                  <p className="text-sm font-medium">#{t.ticketId}</p>
                  <p className="text-xs text-[#64748B]">
                    {t.status} · {t.product} · {t.age}d old
                  </p>
                  <p className="mt-1 text-[11px] text-[#64748B]">
                    {t.timestamp ? formatTicketDate(String(t.timestamp)) : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline">Assign</Button>
          <Button size="sm" variant="outline">Escalate</Button>
          <Button size="sm" variant="outline" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#64748B]">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-[#0F172A]">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#64748B]">{label}</p>
      <p className="text-sm text-[#0F172A]">{value}</p>
    </div>
  );
}
