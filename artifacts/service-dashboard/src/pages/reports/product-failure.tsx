import { useState } from "react";
import { useGetProductFailureReport, getGetProductFailureReportQueryKey } from "@workspace/api-client-react";
import { FilterPanel, FilterState } from "@/components/filter-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";

export default function ProductFailure() {
  const [filters, setFilters] = useState<FilterState>({});

  const { data: result, isLoading, error } = useGetProductFailureReport(filters, {
    query: {
      queryKey: getGetProductFailureReportQueryKey(filters)
    }
  });

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Product Failure Analysis</h1>
        <FilterPanel filters={filters} onChange={setFilters} showFields={["dateRangeDays", "category", "servicePartner", "ash", "rsh"]} />
        <Card className="flex flex-col items-center justify-center h-64 border-dashed">
          <AlertTriangle className="size-10 text-destructive mb-4" />
          <h3 className="text-lg font-medium">Failed to load report</h3>
        </Card>
      </div>
    );
  }

  // Calculate some aggregate stats if we have data
  const totalBreakdown = result?.reduce((sum, item) => sum + item.breakdownTickets, 0) || 0;
  const totalPM = result?.reduce((sum, item) => sum + item.pmTickets, 0) || 0;
  const breakdownRatio = totalBreakdown + totalPM > 0 
    ? ((totalBreakdown / (totalBreakdown + totalPM)) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Product Failure</h1>
        <p className="text-sm text-muted-foreground mt-1">Breakdown vs Preventive Maintenance (PM) analysis by product.</p>
      </div>

      <FilterPanel filters={filters} onChange={setFilters} showFields={["dateRangeDays", "category", "servicePartner", "ash", "rsh"]} />

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : result ? (
        <>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card className="bg-primary text-primary-foreground border-none">
              <CardContent className="pt-6">
                <p className="text-sm font-mono opacity-80 uppercase tracking-widest mb-2">Total Tickets</p>
                <div className="text-4xl font-bold">{totalBreakdown + totalPM}</div>
              </CardContent>
            </Card>
            <Card className="bg-destructive text-destructive-foreground border-none">
              <CardContent className="pt-6">
                <p className="text-sm font-mono opacity-80 uppercase tracking-widest mb-2">Breakdown vs PM</p>
                <div className="text-4xl font-bold">{breakdownRatio}% <span className="text-xl font-normal opacity-80">Breakdown</span></div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border-border shadow-sm mb-6">
            <CardHeader>
              <CardTitle>Top Failure Products (Breakdown vs PM)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.slice(0, 15)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="product" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      className="font-mono" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} className="font-mono" />
                    <Tooltip 
                      cursor={{ fill: 'var(--elevate-1)' }} 
                      contentStyle={{ borderRadius: '8px', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', borderColor: 'hsl(var(--border))' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="breakdownTickets" name="Breakdown" stackId="a" fill="hsl(var(--destructive))" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="pmTickets" name="PM" stackId="a" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-mono text-xs">Product</TableHead>
                    <TableHead className="font-mono text-xs">Category</TableHead>
                    <TableHead className="text-right font-mono text-xs">Total Tickets</TableHead>
                    <TableHead className="text-right font-mono text-xs">Breakdown</TableHead>
                    <TableHead className="text-right font-mono text-xs">PM</TableHead>
                    <TableHead className="text-right font-mono text-xs">IW / OOW</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No product failure data found matching filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    result.map((item, idx) => (
                      <TableRow key={idx} className="group hover:bg-muted/50">
                        <TableCell className="font-medium text-sm max-w-[300px] truncate" title={item.product}>
                          {item.product}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.totalTickets}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">{item.breakdownTickets}</TableCell>
                        <TableCell className="text-right text-chart-3 font-medium">{item.pmTickets}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 text-xs">
                            <span className="text-chart-2" title="In Warranty">{item.warrantyCount}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="opacity-70" title="Out of Warranty">{item.outOfWarrantyCount}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
