import { Card, CardContent } from "@/components/ui/card";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

const KPI_META: Record<keyof LiveOperationsDashboard["kpis"], { label: string }> = {
  open: { label: "Open Calls" },
  assigned: { label: "Assigned" },
  wip: { label: "Work In Progress" },
  mrf: { label: "MRF Pending" },
  completedToday: { label: "Completed Today" },
  sla: { label: "SLA Compliance" },
};

const ORDER: Array<keyof LiveOperationsDashboard["kpis"]> = [
  "open",
  "assigned",
  "wip",
  "mrf",
  "completedToday",
  "sla",
];

export function PremiumKpiGrid({ kpis }: { kpis: LiveOperationsDashboard["kpis"] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {ORDER.map((key) => {
        const meta = KPI_META[key];
        const kpi = kpis[key];
        const suffix = key === "sla" ? "%" : "";

        return (
          <Card key={key} className={`${OPS_CARD} border-[#E5E7EB]`}>
            <CardContent className="p-4">
              <p className="text-3xl font-bold tabular-nums leading-none text-[#0F172A]">
                {kpi.value.toLocaleString()}
                {suffix}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#0F172A]">{meta.label}</p>
              <p className="mt-1 text-xs text-[#64748B]">{kpi.trendLabel}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
