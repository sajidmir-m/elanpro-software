import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CallAgeDashboard } from "@/lib/analytics-api";

function escapeCsv(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const lines = [headers.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ data }: { data: CallAgeDashboard | undefined }) {
  if (!data) return null;

  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);

    downloadCsv(
      `call-age-regions-${date}.csv`,
      ["Rank", "Region", "Green", "Orange", "Red", "Total", "Avg Age", "Oldest", "Urgency Score"],
      data.topRiskRegions.map((r) => [
        r.rank,
        r.region,
        r.green,
        r.orange,
        r.red,
        r.total,
        r.avgAge,
        r.oldestTicket,
        r.urgencyScore,
      ]),
    );

    downloadCsv(
      `call-age-critical-${date}.csv`,
      ["Ticket ID", "Region", "Reporting Manager", "Status", "Product", "Age", "Priority", "Created"],
      data.criticalTickets.map((t) => [
        t.ticket_id,
        t.region,
        t.reporting_manager,
        t.ticket_status,
        t.product,
        t.age_days,
        t.priority,
        t.created_on,
      ]),
    );
  };

  return (
    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExport}>
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </Button>
  );
}
