import { Download, RefreshCw, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const escape = (v: unknown) => {
    const t = v == null ? "" : String(v);
    return t.includes(",") ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lines = [headers.join(","), ...rows.map((r) => r.map(escape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function QuickActions({
  data,
  onRefresh,
  isRefreshing,
}: {
  data?: LiveOperationsDashboard;
  onRefresh: () => void;
  isRefreshing?: boolean;
}) {
  const exportData = () => {
    if (!data) return;
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `live-operations-partners-${date}.csv`,
      ["Rank", "Partner", "Open", "Assigned", "WIP", "MRF", "Health"],
      data.topServicePartners.map((p) => [p.rank, p.servicePartner, p.openCalls, p.assigned, p.wip, p.mrf, p.health]),
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 rounded-2xl border bg-white/95 p-2 shadow-lg backdrop-blur dark:bg-card/95">
      <Button size="sm" variant="outline" className="justify-start gap-2" onClick={onRefresh} disabled={isRefreshing}>
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
        Refresh
      </Button>
      <Button size="sm" variant="outline" className="justify-start gap-2" onClick={exportData} disabled={!data}>
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>
      <Button size="sm" variant="outline" className="justify-start gap-2" onClick={exportData} disabled={!data}>
        <FileDown className="h-3.5 w-3.5" />
        Report
      </Button>
    </div>
  );
}
