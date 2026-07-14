import { useState } from "react";
import { useGetSalesComplaintReport, getGetSalesComplaintReportQueryKey } from "@workspace/api-client-react";
import { FilterPanel, FilterState } from "@/components/filter-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SalesComplaint() {
  const [filters, setFilters] = useState<FilterState>({});

  const { data: result, isLoading, error } = useGetSalesComplaintReport(filters, {
    query: {
      queryKey: getGetSalesComplaintReportQueryKey(filters)
    }
  });

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Sales vs Complaint</h1>
        <FilterPanel filters={filters} onChange={setFilters} showFields={["dateRangeDays", "category", "product", "state"]} />
        <Card className="flex flex-col items-center justify-center h-64 border-dashed">
          <AlertTriangle className="size-10 text-destructive mb-4" />
          <h3 className="text-lg font-medium">Failed to load report</h3>
        </Card>
      </div>
    );
  }

  // Aggregate totals
  const totalBD = result?.reduce((sum, item) => sum + item.bdTickets, 0) || 0;
  const totalTickets = result?.reduce((sum, item) => sum + item.totalTickets, 0) || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales vs Complaint</h1>
        <p className="text-sm text-muted-foreground mt-1">Breakdown (BD) tickets against total ticket volume.</p>
      </div>

      <FilterPanel filters={filters} onChange={setFilters} showFields={["dateRangeDays", "category", "product", "state"]} />

      {isLoading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-16 w-full mb-6" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : result ? (
        <Card className="overflow-hidden border-border shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-5 text-primary" />
                <CardTitle>Complaint Ratios by Product</CardTitle>
              </div>
              <div className="flex items-center gap-4 text-sm font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold">{totalTickets}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">BD:</span>
                  <span className="font-bold text-destructive">{totalBD}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-secondary px-2 py-1 rounded-md">
                  <span className="text-muted-foreground">Ratio:</span>
                  <span className="font-bold text-foreground">
                    {totalTickets > 0 ? ((totalBD / totalTickets) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-mono text-xs">Product</TableHead>
                  <TableHead className="font-mono text-xs">Category</TableHead>
                  <TableHead className="font-mono text-xs">State</TableHead>
                  <TableHead className="text-right font-mono text-xs">Total Tickets</TableHead>
                  <TableHead className="text-right font-mono text-xs">BD Tickets</TableHead>
                  <TableHead className="text-right font-mono text-xs">% BD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No complaint data found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  result.map((item, idx) => {
                    const ratio = item.totalTickets > 0 ? (item.bdTickets / item.totalTickets) * 100 : 0;
                    return (
                      <TableRow key={idx} className="group hover:bg-muted/50">
                        <TableCell className="font-medium text-sm">
                          {item.product}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{item.state}</TableCell>
                        <TableCell className="text-right font-mono">{item.totalTickets}</TableCell>
                        <TableCell className="text-right font-mono font-medium text-destructive">{item.bdTickets}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono text-sm font-bold w-12 text-right">
                              {ratio.toFixed(1)}%
                            </span>
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-destructive rounded-full" 
                                style={{ width: `${Math.min(100, ratio)}%` }} 
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
