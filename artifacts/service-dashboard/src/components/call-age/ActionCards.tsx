import { AlertTriangle, Info, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CallAgeDashboard } from "@/lib/analytics-api";
import { ENTERPRISE_CARD } from "./constants";

const TONE_STYLES = {
  critical: "border-red-500/30 bg-red-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  info: "border-blue-500/30 bg-blue-500/5",
} as const;

const TONE_ICONS = {
  critical: AlertTriangle,
  warning: Zap,
  info: Info,
} as const;

export function ActionCards({ actions }: { actions: CallAgeDashboard["recommendedActions"] }) {
  if (!actions.length) return null;

  return (
    <Card className={ENTERPRISE_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recommended Actions</CardTitle>
        <CardDescription>Data-driven next steps for management today</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = TONE_ICONS[action.tone];
            return (
              <div
                key={action.id}
                className={`flex items-start gap-3 rounded-xl border p-4 ${TONE_STYLES[action.tone]}`}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0 opacity-80" />
                <p className="text-sm leading-snug">{action.message}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
