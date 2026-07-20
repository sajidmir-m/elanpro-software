import { useState } from "react";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { Clock, CheckCircle2, Ticket, BoxSelect, AlertCircle, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CHART_PALETTE } from "@/components/analytics/types";

export default function Dashboard() {
  const { data: summary, isLoading, error } = useGetDashboardSummary({}, { 
    query: { queryKey: getGetDashboardSummaryQueryKey({}) } 
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-96 w-full" />
          <Skeleton className="col-span-3 h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-xl bg-card border-dashed">
        <AlertCircle className="size-10 text-destructive mb-4" />
        <h3 className="text-lg font-medium">Failed to load dashboard</h3>
        <p className="text-muted-foreground text-sm">Please try again later or check your connection.</p>
      </div>
    );
  }

  const ageData = [
    { name: '0-7 Days', value: summary.pendingByAge.within7Days, color: 'hsl(var(--chart-3))' },
    { name: '8-15 Days', value: summary.pendingByAge.within15Days, color: 'hsl(var(--chart-4))' },
    { name: '16-30 Days', value: summary.pendingByAge.within30Days, color: 'hsl(var(--chart-2))' },
    { name: '30+ Days', value: summary.pendingByAge.above30Days, color: 'hsl(var(--chart-5))' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time service operations command center.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalActive.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently open in system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Tickets</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalClosed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total resolved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average TAT</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.avgTatMinutes ? (summary.avgTatMinutes / 60).toFixed(1) : '-'} <span className="text-lg text-muted-foreground">hrs</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all closed tickets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total MRF</CardTitle>
            <BoxSelect className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalMrf.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Material requisition forms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRF Pending NPC Approval</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.mrfPendingNpcApproval.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting NPC sign-off</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle>Pending Tickets by Customer Category</CardTitle>
            <CardDescription>Active/pending tickets grouped by customer category.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.byCustomerCategory}>
                  <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} className="font-mono" />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} width={40} className="font-mono" />
                  <Tooltip 
                    cursor={{ fill: 'var(--elevate-1)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {summary.byCustomerCategory.map((_, index) => (
                      <Cell key={`cust-cat-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Pending Age Distribution</CardTitle>
            <CardDescription>Active tickets grouped by days since creation.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center pb-4">
            {ageData.length > 0 ? (
              <>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {ageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-4 w-full">
                  {ageData.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs font-medium">{entry.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">({entry.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">No pending tickets.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle>Active by Category</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.byCategory.slice(0, 8)} layout="vertical" margin={{ left: 50 }}>
                  <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} className="font-mono" />
                  <YAxis type="category" dataKey="label" fontSize={12} tickLine={false} axisLine={false} width={100} className="font-mono text-[10px]" />
                  <Tooltip 
                    cursor={{ fill: 'var(--elevate-1)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {summary.byCategory.slice(0, 8).map((_, index) => (
                      <Cell key={`cat-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent System Uploads</CardTitle>
            <CardDescription>Latest data synchronizations</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.recentUploads.length > 0 ? (
              <div className="space-y-4">
                {summary.recentUploads.slice(0, 4).map((upload) => (
                  <div key={upload.id} className="flex items-center justify-between border-b border-border/50 last:border-0 pb-3 last:pb-0">
                    <div>
                      <p className="text-sm font-medium truncate max-w-[180px] sm:max-w-[220px]">{upload.filename}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{upload.fileType.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono">{upload.recordCount.toLocaleString()} recs</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(upload.uploadedAt), "MMM d, HH:mm")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent uploads found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
