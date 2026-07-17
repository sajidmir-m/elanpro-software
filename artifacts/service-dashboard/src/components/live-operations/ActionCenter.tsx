import { Download, RefreshCw, UserPlus, AlertTriangle, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

const ICONS = {
  critical: AlertTriangle,
  warning: ClipboardList,
  default: Download,
};

export function ActionCenter({
  actions,
  onAction,
  onRefresh,
  isRefreshing,
}: {
  actions: LiveOperationsDashboard["actions"];
  onAction: (action: LiveOperationsDashboard["actions"][number]) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-semibold text-[#0F172A]">Action Center</CardTitle>
        <p className="text-sm text-[#64748B]">Recommended next steps for operations leadership</p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {actions.filter((a) => a.id !== "refresh").map((action) => {
          const Icon = ICONS[action.tone] ?? UserPlus;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onAction(action)}
              className={`flex items-start gap-3 rounded-2xl border p-5 text-left transition-all duration-250 hover:-translate-y-0.5 hover:bg-slate-50 ${
                action.tone === "critical"
                  ? "border-red-200"
                  : action.tone === "warning"
                    ? "border-amber-200"
                    : "border-[#E5E7EB]"
              }`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#64748B]" />
              <span className="text-sm font-medium leading-snug text-[#0F172A]">{action.label}</span>
            </button>
          );
        })}
        <Button
          variant="outline"
          className="h-auto justify-start gap-3 rounded-2xl border-[#E5E7EB] p-5 text-left transition-all duration-250 hover:-translate-y-0.5"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh data
        </Button>
      </CardContent>
    </Card>
  );
}
