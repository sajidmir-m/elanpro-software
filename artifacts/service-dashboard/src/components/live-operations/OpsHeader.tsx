import { Download, Mail, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function OpsHeader({
  refreshedAt,
  autoRefresh,
  isFetching,
  onToggleAutoRefresh,
  onRefresh,
  onExport,
  onEmailReport,
}: {
  refreshedAt?: string;
  autoRefresh: boolean;
  isFetching?: boolean;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onEmailReport?: () => void;
}) {
  const lastRefresh = refreshedAt ? format(new Date(refreshedAt), "HH:mm:ss") : "—";

  return (
    <header className="sticky top-0 z-30 -mx-1 rounded-2xl border border-[#E5E7EB] bg-white/95 px-6 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[32px] font-bold leading-tight tracking-tight text-[#111827]">Live Operations</h1>
          <p className="mt-1 text-[15px] text-[#667085]">
            Real-time execution and workload visibility across the entire service network.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-[#64748B]">Last refresh {lastRefresh}</span>
          <Badge
            variant="outline"
            className={autoRefresh ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200"}
          >
            {autoRefresh ? "Auto-refresh on" : "Paused"}
          </Badge>
          <Button variant="outline" size="sm" className="h-9" onClick={onToggleAutoRefresh}>
            {autoRefresh ? "Pause" : "Resume"}
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onExport}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          {onEmailReport && (
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onEmailReport}>
              <Mail className="h-3.5 w-3.5" />
              Email Report
            </Button>
          )}
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-[#2563EB] hover:bg-[#2563EB]/90"
            onClick={onRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>
    </header>
  );
}
