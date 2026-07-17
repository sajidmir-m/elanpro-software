import { AlertTriangle, Info, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LiveOpsSmartInsight } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

const TONE_STYLES = {
  info: "border-slate-200 bg-slate-50",
  warning: "border-amber-200 bg-amber-50/60",
  critical: "border-red-200 bg-red-50/60",
};

const TONE_ICONS = {
  info: Info,
  warning: Lightbulb,
  critical: AlertTriangle,
};

export function SmartInsightsPanel({ insights }: { insights: LiveOpsSmartInsight[] }) {
  if (!insights.length) return null;

  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-semibold text-[#0F172A]">Smart Insights</CardTitle>
        <p className="text-sm text-[#64748B]">AI-generated operational signals</p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((item) => {
          const Icon = TONE_ICONS[item.tone];
          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 transition-all duration-250 hover:-translate-y-0.5 ${TONE_STYLES[item.tone]}`}
            >
              <Icon className="mb-2 h-4 w-4 text-[#64748B]" />
              <p className="text-sm leading-relaxed text-[#0F172A]/90">{item.message}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
