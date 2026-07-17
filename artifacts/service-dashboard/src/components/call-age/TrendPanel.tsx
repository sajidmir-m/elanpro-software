import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CallAgeDashboard } from "@/lib/analytics-api";
import { AGE_COLORS, ENTERPRISE_CARD } from "./constants";

type TrendKey = "daily" | "weekly" | "monthly";

export function TrendPanel({ trends }: { trends: CallAgeDashboard["trends"] }) {
  const [view, setView] = useState<TrendKey>("daily");
  const data = trends[view];

  return (
    <Card className={ENTERPRISE_CARD}>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Call Volume Trends</CardTitle>
          <CardDescription>New open calls by creation period</CardDescription>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as TrendKey)}>
          <TabsList className="h-8">
            <TabsTrigger value="daily" className="text-xs px-2.5">
              Daily
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs px-2.5">
              Weekly
            </TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs px-2.5">
              Monthly
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))" }}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              />
              <Bar dataKey="count" fill={AGE_COLORS.blue} radius={[4, 4, 0, 0]} isAnimationActive />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
