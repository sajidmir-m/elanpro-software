import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ChevronRight,
  Package,
  RefreshCw,
  UserPlus,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTicketDate } from "@/lib/utils";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

const TYPE_META: Record<string, { icon: typeof Activity; color: string }> = {
  "Ticket Assigned": { icon: UserPlus, color: "text-[#2563EB]" },
  "Ticket Closed": { icon: CheckCircle2, color: "text-[#16A34A]" },
  "MRF Requested": { icon: Package, color: "text-[#F59E0B]" },
  "Technician Updated": { icon: Wrench, color: "text-[#64748B]" },
  "Escalation Raised": { icon: AlertTriangle, color: "text-[#DC2626]" },
  "Partner Changed": { icon: ArrowRightLeft, color: "text-[#64748B]" },
  "Status Updated": { icon: RefreshCw, color: "text-[#64748B]" },
};

export function ActivityStrip({
  events,
}: {
  events: LiveOperationsDashboard["activityFeed"];
}) {
  const display = events.slice(0, 8);

  return (
    <Card className={OPS_CARD}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold text-[#0F172A]">Live Activity</CardTitle>
          <p className="text-sm text-[#64748B]">Latest operational events</p>
        </div>
        <span className="text-xs text-[#64748B]">{display.length} recent</span>
      </CardHeader>
      <CardContent className="pb-4">
        {display.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#64748B]">No recent activity for current filters.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {display.map((event, index) => {
              const meta = TYPE_META[event.type] ?? TYPE_META["Status Updated"];
              const Icon = meta.icon;
              return (
                <div
                  key={`${event.id}-${index}`}
                  className="flex min-w-[220px] max-w-[260px] shrink-0 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 shadow-sm"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${meta.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#0F172A]">{event.type}</p>
                    <p className="truncate text-xs text-[#64748B]">
                      #{event.ticketId} · {event.partner}
                    </p>
                    <p className="text-[10px] text-[#64748B]">
                      {event.timestamp ? formatTicketDate(String(event.timestamp)) : "—"}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
