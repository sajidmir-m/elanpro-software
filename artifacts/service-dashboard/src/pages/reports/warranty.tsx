import { useState } from "react";
import { useGetWarrantyAnalysisReport, getGetWarrantyAnalysisReportQueryKey } from "@workspace/api-client-react";
import { FilterPanel, FilterState } from "@/components/filter-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Percent } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from "recharts";

export default function WarrantyAnalysis() {
  const [filters, setFilters] = useState<FilterState>({});

  const { data: result, isLoading, error } = useGetWarrantyAnalysisReport(filters, {
    query: {
      queryKey: getGetWarrantyAnalysisReportQueryKey(filters)
    }
  });

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Warranty Analysis</h1>
        <FilterPanel filters={filters} onChange={setFilters} showFields={["dateRangeDays", "category", "product", "servicePartner", "ash", "rsh"]} />
        <Card className="flex flex-col items-center justify-center h-64 border-dashed">
          <AlertTriangle className="size-10 text-destructive mb-4" />
          <h3 className="text-lg font-medium">Failed to load report</h3>
        </Card>
      </div>
    );
  }

  const COLORS = {
    inWarranty: 'hsl(var(--chart-3))', // Green
    outOfWarranty: 'hsl(var(--destructive))', // Red
    unverified: 'hsl(var(--chart-4))', // Slate
    extended: 'hsl(var(--chart-2))', // Amber
    jeevanam: 'hsl(var(--chart-1))', // Navy
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Warranty Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Breakdown of service requests by warranty status.</p>
      </div>

      <FilterPanel filters={filters} onChange={setFilters} showFields={["dateRangeDays", "category", "product", "servicePartner", "ash", "rsh"]} />

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      ) : result ? (
        <>
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Percent className="size-5 text-primary" />
                <CardTitle>Global Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">In Warranty</p>
                  <p className="text-3xl font-bold text-chart-3">{result.summary.inWarranty}</p>
                </div>
                <div className="space-y-1 border-l pl-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Out of Warranty</p>
                  <p className="text-3xl font-bold text-destructive">{result.summary.outOfWarranty}</p>
                </div>
                <div className="space-y-1 border-l pl-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Extended</p>
                  <p className="text-3xl font-bold text-chart-2">{result.summary.extended}</p>
                </div>
                <div className="space-y-1 border-l pl-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Jeevanam</p>
                  <p className="text-3xl font-bold text-chart-1">{result.summary.jeevanam}</p>
                </div>
                <div className="space-y-1 border-l pl-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Unverified</p>
                  <p className="text-3xl font-bold text-chart-4">{result.summary.unverified}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>By Top Products</CardTitle>
                <CardDescription>Warranty distribution across equipment models</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.byProduct.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="label" width={100} fontSize={10} axisLine={false} tickLine={false} className="font-mono" />
                      <Tooltip 
                        cursor={{ fill: 'var(--elevate-1)' }} 
                        contentStyle={{ borderRadius: '8px' }}
                      />
                      <Legend />
                      <Bar dataKey="inWarranty" name="In Warranty" stackId="a" fill={COLORS.inWarranty} />
                      <Bar dataKey="outOfWarranty" name="Out of Warranty" stackId="a" fill={COLORS.outOfWarranty} />
                      <Bar dataKey="unverified" name="Unverified" stackId="a" fill={COLORS.unverified} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Service Partner</CardTitle>
                <CardDescription>Warranty status distribution per partner</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.byServicePartner.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="label" width={100} fontSize={10} axisLine={false} tickLine={false} className="font-mono" />
                      <Tooltip 
                        cursor={{ fill: 'var(--elevate-1)' }} 
                        contentStyle={{ borderRadius: '8px' }}
                      />
                      <Legend />
                      <Bar dataKey="inWarranty" name="In Warranty" stackId="a" fill={COLORS.inWarranty} />
                      <Bar dataKey="outOfWarranty" name="Out of Warranty" stackId="a" fill={COLORS.outOfWarranty} />
                      <Bar dataKey="unverified" name="Unverified" stackId="a" fill={COLORS.unverified} radius={[0, 4, 4, 0]} />
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
