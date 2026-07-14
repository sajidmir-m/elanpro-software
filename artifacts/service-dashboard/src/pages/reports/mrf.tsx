import { useState } from "react";
import { useGetMrfAnalysisReport, getGetMrfAnalysisReportQueryKey } from "@workspace/api-client-react";
import { FilterPanel, FilterState } from "@/components/filter-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, BoxSelect } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";

export default function MrfAnalysis() {
  const [filters, setFilters] = useState<FilterState>({});

  const { data: result, isLoading, error } = useGetMrfAnalysisReport(filters, {
    query: {
      queryKey: getGetMrfAnalysisReportQueryKey(filters)
    }
  });

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">MRF Analysis</h1>
        <FilterPanel filters={filters} onChange={setFilters} showFields={["dateRangeDays", "servicePartner", "ash", "rsh"]} />
        <Card className="flex flex-col items-center justify-center h-64 border-dashed">
          <AlertTriangle className="size-10 text-destructive mb-4" />
          <h3 className="text-lg font-medium">Failed to load report</h3>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">MRF Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Material Requisition Form volumes, statuses, and part usage.</p>
      </div>

      <FilterPanel filters={filters} onChange={setFilters} showFields={["dateRangeDays", "servicePartner", "ash", "rsh"]} />

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      ) : result ? (
        <>
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-0">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 border-border">
                <div className="p-6">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Total MRF</p>
                  <p className="text-3xl font-bold text-foreground">{result.totalMrf}</p>
                </div>
                <div className="p-6">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Pending</p>
                  <p className="text-3xl font-bold text-chart-2">{result.pending}</p>
                </div>
                <div className="p-6">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Approved</p>
                  <p className="text-3xl font-bold text-chart-1">{result.approved}</p>
                </div>
                <div className="p-6">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Dispatched</p>
                  <p className="text-3xl font-bold text-chart-3">{result.dispatched}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden border-border shadow-sm flex flex-col">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex items-center gap-2">
                  <BoxSelect className="size-5 text-primary" />
                  <CardTitle>Top Components Requested</CardTitle>
                </div>
              </CardHeader>
              <div className="flex-1 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-mono text-xs w-[120px]">Part Code</TableHead>
                      <TableHead className="font-mono text-xs">Component Name</TableHead>
                      <TableHead className="text-right font-mono text-xs w-[80px]">Qty</TableHead>
                      <TableHead className="text-right font-mono text-xs w-[80px]">MRFs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.byComponent.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          No components found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      result.byComponent.slice(0, 10).map((item, idx) => (
                        <TableRow key={idx} className="group hover:bg-muted/50">
                          <TableCell>
                            <Badge variant="outline" className="font-mono bg-card text-[10px]">{item.partCode}</Badge>
                          </TableCell>
                          <TableCell className="font-medium text-sm truncate max-w-[150px]" title={item.component}>
                            {item.component}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-foreground">{item.quantity}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{item.mrfCount}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MRF Volume by Partner</CardTitle>
                <CardDescription>Top service partners requesting materials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.byServicePartner.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="label" width={120} fontSize={10} axisLine={false} tickLine={false} className="font-mono" />
                      <Tooltip 
                        cursor={{ fill: 'var(--elevate-1)' }} 
                        contentStyle={{ borderRadius: '8px' }}
                      />
                      <Bar dataKey="count" name="MRF Count" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
