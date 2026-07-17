import { AlertTriangle, Download, RefreshCw, UserPlus, ArrowRightLeft, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";

const ICONS = {
  critical: AlertTriangle,
  warning: ArrowRightLeft,
  default: Download,
};

export function FloatingActionCenter({
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
  const quick = [
    { id: "assign", label: "Assign Technician", icon: UserPlus, tone: "default" as const },
    { id: "reassign", label: "Reassign Partner", icon: ArrowRightLeft, tone: "default" as const },
    { id: "escalate", label: "Escalate", icon: AlertTriangle, tone: "warning" as const },
    ...actions.filter((a) => a.id !== "refresh").slice(0, 2),
    { id: "download", label: "Export Excel", icon: FileSpreadsheet, tone: "default" as const },
  ];

  return (
    <div className="rounded-2xl border border-[#E7EAF0] bg-white p-4 shadow-[0_8px_32px_rgba(15,23,42,0.12)]">
      <h3 className="text-[15px] font-semibold text-[#111827]">Action Center</h3>
      <p className="mt-0.5 text-[13px] text-[#667085]">Quick operational actions</p>
      <div className="mt-3 space-y-2">
        {quick.map((action) => {
          const Icon = "icon" in action ? action.icon : (ICONS[action.tone as keyof typeof ICONS] ?? Download);
          const handler = () => {
            if (action.id === "download") {
              const dl = actions.find((a) => a.id === "download");
              if (dl) onAction(dl);
              return;
            }
            if ("target" in action && action.target) {
              onAction(action as LiveOperationsDashboard["actions"][number]);
              return;
            }
            const match = actions.find((a) => a.id.includes(action.id) || a.label.toLowerCase().includes(action.id));
            if (match) onAction(match);
          };
          return (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              className="h-9 w-full justify-start gap-2 border-[#E7EAF0] text-[13px]"
              onClick={handler}
            >
              <Icon className="h-3.5 w-3.5" />
              {"label" in action ? action.label : action.label}
            </Button>
          );
        })}
        <Button
          size="sm"
          className="h-9 w-full gap-2 bg-[#2563EB] text-[13px] hover:bg-[#2563EB]/90"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
