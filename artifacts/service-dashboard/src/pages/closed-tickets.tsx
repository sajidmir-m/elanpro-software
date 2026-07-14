import { useState } from "react";
import { useGetClosedTickets, getGetClosedTicketsQueryKey } from "@workspace/api-client-react";
import { FilterPanel, FilterState } from "@/components/filter-panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertTriangle, Clock } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ClosedTickets() {
  const [filters, setFilters] = useState<FilterState>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: result, isLoading, error } = useGetClosedTickets({
    ...filters,
    page,
    pageSize,
  }, {
    query: {
      queryKey: getGetClosedTicketsQueryKey({ ...filters, page, pageSize })
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Closed Tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">Review resolution history and turnaround times.</p>
      </div>

      <FilterPanel filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} />

      {error ? (
        <Card className="flex flex-col items-center justify-center h-64 border-dashed">
          <AlertTriangle className="size-10 text-destructive mb-4" />
          <h3 className="text-lg font-medium">Failed to load tickets</h3>
          <p className="text-muted-foreground text-sm">Please try again.</p>
        </Card>
      ) : isLoading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : result ? (
        <>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card className="bg-primary text-primary-foreground border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between text-primary-foreground/80">
                  Global Average TAT
                  <Clock className="h-4 w-4 opacity-70" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {result.avgTat ? (result.avgTat / 60).toFixed(1) : '-'} <span className="text-lg opacity-70">hrs</span>
                </div>
              </CardContent>
            </Card>

            {result.byTicketType.length > 0 && (
              <Card className="col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg TAT by Ticket Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-16 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.byTicketType} layout="vertical" margin={{ left: 0, top: 0, bottom: 0, right: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="label" width={100} fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'var(--elevate-1)' }} contentStyle={{ borderRadius: '8px' }} />
                        <Bar dataKey="avgTatMinutes" name="Minutes" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="overflow-hidden border-border shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[120px] font-mono text-xs">Ticket ID</TableHead>
                    <TableHead className="font-mono text-xs">Created / Closed</TableHead>
                    <TableHead className="font-mono text-xs">Product</TableHead>
                    <TableHead className="font-mono text-xs">Service Partner</TableHead>
                    <TableHead className="font-mono text-xs">State</TableHead>
                    <TableHead className="font-mono text-xs text-right">Turnaround (TAT)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No closed tickets found matching filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    result.tickets.map((ticket) => (
                      <TableRow key={ticket.ticketId} className="group hover:bg-muted/50">
                        <TableCell className="font-medium font-mono text-xs">
                          {ticket.ticketId}
                          <div className="text-[10px] text-muted-foreground uppercase font-sans tracking-wide mt-1">{ticket.closureType || ticket.ticketType}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{format(new Date(ticket.createdOn), "dd MMM yy")}</div>
                          <div className="text-muted-foreground">{format(new Date(ticket.closedDate), "dd MMM yy")}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{ticket.product}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{ticket.category}</div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={ticket.servicePartner}>
                          {ticket.servicePartner}
                        </TableCell>
                        <TableCell className="text-sm">{ticket.state}</TableCell>
                        <TableCell className="text-right">
                          <div className="font-mono text-sm font-medium">
                            {ticket.tatMinutes !== null 
                              ? (ticket.tatMinutes / 60).toFixed(1) + "h"
                              : "N/A"}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, result.total)} of{" "}
                <span className="font-medium text-foreground">{result.total}</span> entries
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xs font-mono text-muted-foreground">Page {page}</div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= result.total}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
