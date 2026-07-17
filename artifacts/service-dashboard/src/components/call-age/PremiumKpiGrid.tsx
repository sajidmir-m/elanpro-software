import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CallAgeDashboard } from "@/lib/analytics-api";
import { AnimatedCounter } from "./AnimatedCounter";
import { Sparkline } from "./Sparkline";
import { AGE_COLORS, ENTERPRISE_CARD } from "./constants";

type KpiKey = "total" | "green" | "orange" | "red";

const KPI_META: Record<
  KpiKey,
  { label: string; description: string; color: string; accent: string }
> = {
  total: {
    label: "Open Calls",
    description: "All open service calls in the current view",
    color: AGE_COLORS.blue,
    accent: "border-l-[#2563EB]",
  },
  green: {
    label: "Green (≤3 Days)",
    description: "Calls within SLA — on track",
    color: AGE_COLORS.green,
    accent: "border-l-[#22C55E]",
  },
  orange: {
    label: "Orange (4–5 Days)",
    description: "Approaching SLA breach — monitor closely",
    color: AGE_COLORS.orange,
    accent: "border-l-[#F59E0B]",
  },
  red: {
    label: "Red (>5 Days)",
    description: "Overdue urgent calls requiring immediate action",
    color: AGE_COLORS.red,
    accent: "border-l-[#EF4444]",
  },
};

export function PremiumKpiGrid({ kpis }: { kpis: CallAgeDashboard["kpis"] }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(KPI_META) as KpiKey[]).map((key) => {
          const meta = KPI_META[key];
          const kpi = kpis[key];
          const trend = kpi.trendPct;
          const trendUp = trend != null && trend > 0;
          const trendDown = trend != null && trend < 0;

          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Card className={`${ENTERPRISE_CARD} border-l-4 ${meta.accent}`}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {meta.label}
                        </p>
                        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
                          <AnimatedCounter value={kpi.value} />
                        </p>
                      </div>
                      <span
                        className="size-2.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: meta.color }}
                        aria-hidden
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{kpi.pct}% of total</span>
                      {trend != null && key === "total" && (
                        <span
                          className={`inline-flex items-center gap-0.5 font-medium ${
                            trendUp ? "text-red-600" : trendDown ? "text-emerald-600" : "text-muted-foreground"
                          }`}
                        >
                          {trendUp ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : trendDown ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : null}
                          {Math.abs(trend)}% vs yesterday
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{meta.description}</p>
                    <Sparkline data={kpi.sparkline} color={meta.color} />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {meta.description}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
