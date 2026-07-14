import { useState } from "react";
import { useGetTatAnalysisReport, getGetTatAnalysisReportQueryKey } from "@workspace/api-client-react";
import { FilterPanel, FilterState } from "@/components/filter-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

export default function TatAnalysis() {
  const [filters, setFilters] = useState<FilterState>({});

  const { data: result, isLoading, error } = useGetTatAnalysisReport(filters, {
    query: {
      queryKey: getGetTatAnalysisReportQueryKey(filters)
    }
  });

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">TAT Analysis</h1>
        <FilterPanel filters={filters} onChange={setFilters} showFields={["dateRangeDays", "category", "product", "servicePartner", "ash", "rsh", "state"]} />
        <Card className="flex flex-col items-center justify-center h-64 border-dashed">
          <AlertTriangle className="size-10 text-destructive mb-4" />
          <h3 className="text-lg font-medium">Failed to load TAT report</h3>
        </Card>
      </div>
    );
  }

  const pieData = result ? [
    { name: '< 24h', value: result.overall.within24h, color: 'hsl(var(--chart-3))' }, // Green
    { name: '24-48h', value: result.overall.within48h, color: 'hsl(var(--chart-1))' }, // Navy
    { name: '48-72h', value: result.overall.within72h, color: 'hsl(var(--chart-2))' }, // Amber
    { name: '> 72h', value: result.overall.above72h, color: 'hsl(var(--chart-5))' }, // Red
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">TAT Deep-dive</h1>
        <p className="text-sm text-muted-foreground mt-1">Turnaround time distribution and stage breakdowns.</p>
      </div>

      <FilterPanel filters={filters} onChange={setFilters} showFields={["dateRangeDays", "category", "product", "servicePartner", "ash", "rsh", "state"]} />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-80 w-full col-span-2" />
        </div>
      ) : result ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Overall Stats */}
          <Card className="bg-primary text-primary-foreground border-none">
            <CardContent className="pt-6 h-full flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm font-mono opacity-80 uppercase tracking-widest mb-2">Avg TAT</p>
                  <div className="text-4xl font-bold">
                    {result.overall.avgTatMinutes ? (result.overall.avgTatMinutes / 60).toFixed(1) : '-'}
                    <span className="text-xl opacity-60 ml-1">h</span>
                  </div>
                </div>
                <div className="border-l border-primary-foreground/20">
                  <p className="text-sm font-mono opacity-80 uppercase tracking-widest mb-2">Median TAT</p>
                  <div className="text-4xl font-bold">
                    {result.overall.medianTatMinutes ? (result.overall.medianTatMinutes / 60).toFixed(1) : '-'}
                    <span className="text-xl opacity-60 ml-1">h</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-primary-foreground/20">
                <h4 className="text-xs font-mono uppercase tracking-widest opacity-80 mb-4 text-center">Average Time in Stages</h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-xs opacity-70 mb-1">WIP</div>
                    <div className="font-mono text-sm">{result.stages.wipAvgMinutes ? (result.stages.wipAvgMinutes / 60).toFixed(1) + 'h' : '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70 mb-1">MRF Req</div>
                    <div className="font-mono text-sm">{result.stages.mrfRequestAvgMinutes ? (result.stages.mrfRequestAvgMinutes / 60).toFixed(1) + 'h' : '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70 mb-1">MRF Appr</div>
                    <div className="font-mono text-sm">{result.stages.mrfApprovedAvgMinutes ? (result.stages.mrfApprovedAvgMinutes / 60).toFixed(1) + 'h' : '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70 mb-1">Dispatch</div>
                    <div className="font-mono text-sm">{result.stages.dispatchedAvgMinutes ? (result.stages.dispatchedAvgMinutes / 60).toFixed(1) + 'h' : '-'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Time Bucket Distribution</CardTitle>
              <CardDescription>How long tickets take to close</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-1/2 pl-4 space-y-3">
                  {pieData.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm font-medium">{entry.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground font-mono">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* State Breakdown */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Average TAT by State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.byState.slice(0, 15)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} className="font-mono" />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 60).toFixed(0)}h`} />
                    <Tooltip 
                      cursor={{ fill: 'var(--elevate-1)' }} 
                      contentStyle={{ borderRadius: '8px' }}
                      formatter={(value: number) => [`${(value / 60).toFixed(1)} hours`, 'Avg TAT']}
                    />
                    <Bar dataKey="avgTatMinutes" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
