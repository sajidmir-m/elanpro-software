import { useState } from "react";
import { useGetComponentFailureReport, getGetComponentFailureReportQueryKey } from "@workspace/api-client-react";
import { FilterPanel, FilterState } from "@/components/filter-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ComponentFailure() {
  const [filters, setFilters] = useState<FilterState>({});

  const { data: result, isLoading, error } = useGetComponentFailureReport(filters, {
    query: {
      queryKey: getGetComponentFailureReportQueryKey(filters)
    }
  });

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Component Failure</h1>
        <FilterPanel filters={filters} onChange={setFilters} showFields={["dateRangeDays", "category", "product"]} />
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Component Failure</h1>
        <p className="text-sm text-muted-foreground mt-1">Most frequently failing parts and their affected products.</p>
      </div>

      <FilterPanel filters={filters} onChange={setFilters} showFields={["dateRangeDays", "category", "product"]} />

      {isLoading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : result ? (
        <Card className="overflow-hidden border-border shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex items-center gap-2">
              <Wrench className="size-5 text-primary" />
              <CardTitle>Top Failing Components (from MRF Data)</CardTitle>
            </div>
            <CardDescription>Ranked by replacement frequency</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead className="font-mono text-xs w-[150px]">Part Code</TableHead>
                  <TableHead className="font-mono text-xs">Component Name</TableHead>
                  <TableHead className="font-mono text-xs">Affected Products</TableHead>
                  <TableHead className="text-right font-mono text-xs w-[120px]">Replacements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No component failure data found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  result.map((item, idx) => (
                    <TableRow key={idx} className="group hover:bg-muted/50">
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono bg-card">{item.partCode}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {item.component}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.productList.slice(0, 3).map((p, i) => (
                            <span key={i} className="text-xs bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded-sm truncate max-w-[150px]" title={p}>
                              {p}
                            </span>
                          ))}
                          {item.productList.length > 3 && (
                            <span className="text-xs text-muted-foreground px-1.5 py-0.5">
                              +{item.productList.length - 3} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-center bg-destructive/10 text-destructive font-bold px-3 py-1 rounded-md min-w-[3rem]">
                          {item.usageCount}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
