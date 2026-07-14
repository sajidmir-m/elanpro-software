import { useState } from "react";
import { useGetActiveTickets, getGetActiveTicketsQueryKey } from "@workspace/api-client-react";
import { FilterPanel, FilterState } from "@/components/filter-panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ActiveTickets() {
  const [filters, setFilters] = useState<FilterState>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: result, isLoading, error } = useGetActiveTickets({
    ...filters,
    page,
    pageSize,
  }, {
    query: {
      queryKey: getGetActiveTicketsQueryKey({ ...filters, page, pageSize })
    }
  });

  const getAgeColor = (ageDays: number) => {
    if (ageDays > 30) return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
    if (ageDays > 15) return "bg-chart-2 text-chart-2-foreground hover:bg-chart-2/90"; // Amber
    if (ageDays > 7) return "bg-chart-4 text-chart-4-foreground hover:bg-chart-4/90";
    return "bg-secondary text-secondary-foreground hover:bg-secondary/90";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Active Tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">Explore and filter currently open service tickets.</p>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {result.byAgeBucket.length > 0 && (
              <Card className="p-4 flex flex-col justify-center">
                <h3 className="text-sm font-medium mb-3">Age Distribution</h3>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.byAgeBucket}>
                      <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} className="font-mono" />
                      <Tooltip cursor={{ fill: 'var(--elevate-1)' }} contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
            
            {result.byProduct.length > 0 && (
              <Card className="p-4 flex flex-col justify-center col-span-2">
                <h3 className="text-sm font-medium mb-3">Top Products</h3>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.byProduct.slice(0, 6)} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="label" fontSize={10} tickLine={false} axisLine={false} width={120} />
                      <Tooltip cursor={{ fill: 'var(--elevate-1)' }} contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>

          <Card className="overflow-hidden border-border shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[120px] font-mono text-xs">Ticket ID</TableHead>
                    <TableHead className="font-mono text-xs">Created</TableHead>
                    <TableHead className="font-mono text-xs">Product</TableHead>
                    <TableHead className="font-mono text-xs">Service Partner</TableHead>
                    <TableHead className="font-mono text-xs">State</TableHead>
                    <TableHead className="font-mono text-xs">Status</TableHead>
                    <TableHead className="text-right font-mono text-xs">Age</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No active tickets found matching filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    result.tickets.map((ticket) => (
                      <TableRow key={ticket.ticketId} className="group hover:bg-muted/50">
                        <TableCell className="font-medium font-mono text-xs">{ticket.ticketId}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(ticket.createdOn), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{ticket.product}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{ticket.category}</div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={ticket.servicePartner}>
                          {ticket.servicePartner}
                        </TableCell>
                        <TableCell className="text-sm">{ticket.state}</TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">{ticket.status}</div>
                          {ticket.wipSubStage && (
                            <div className="text-[10px] text-muted-foreground">{ticket.wipSubStage}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={`font-mono ${getAgeColor(ticket.ageDays)}`} variant="secondary">
                            {ticket.ageDays} d
                          </Badge>
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
