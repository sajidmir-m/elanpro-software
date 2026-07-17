import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Package,
  RefreshCw,
  UserPlus,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTicketDate } from "@/lib/utils";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

const TYPE_META: Record<string, { icon: typeof Activity; color: string }> = {
  "Ticket Assigned": { icon: UserPlus, color: "bg-slate-100 text-slate-600" },
  "Ticket Closed": { icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
  "MRF Requested": { icon: Package, color: "bg-amber-50 text-amber-700" },
  "Technician Updated": { icon: Wrench, color: "bg-slate-100 text-slate-600" },
  "Escalation Raised": { icon: AlertTriangle, color: "bg-red-50 text-red-700" },
  "Partner Changed": { icon: ArrowRightLeft, color: "bg-slate-100 text-slate-600" },
  "Status Updated": { icon: RefreshCw, color: "bg-slate-100 text-slate-600" },
};

export function ActivityTimeline({
  events,
  allEvents,
}: {
  events: LiveOperationsDashboard["activityFeed"];
  allEvents?: LiveOperationsDashboard["activityFeed"];
}) {
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? (allEvents ?? events) : events.slice(0, 8);

  return (
    <Card className={`${OPS_CARD} xl:sticky xl:top-28`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-[#0F172A]">Live Activity</CardTitle>
        <p className="text-sm text-[#64748B]">Latest operational events</p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[640px] px-4">
          {display.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Activity className="mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium text-[#0F172A]">No recent activity</p>
              <p className="mt-1 text-sm text-[#64748B]">Events will appear as tickets are updated.</p>
            </div>
          ) : (
            <div className="relative space-y-0 pb-4">
              <div className="absolute bottom-2 left-[18px] top-2 w-px bg-[#E5E7EB]" />
              {display.map((event, index) => {
                const meta = TYPE_META[event.type] ?? TYPE_META["Status Updated"];
                const Icon = meta.icon;
                return (
                  <div key={`${event.id}-${index}`} className="relative flex gap-3 py-3">
                    <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl border border-[#E5E7EB] bg-white p-3 pt-2 shadow-sm">
                      <p className="text-sm font-medium text-[#0F172A]">{event.type}</p>
                      <p className="truncate text-xs text-[#64748B]">
                        #{event.ticketId} · {event.partner}
                      </p>
                      <p className="mt-1 text-[11px] text-[#64748B]">
                        {event.timestamp ? formatTicketDate(String(event.timestamp)) : "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {(allEvents?.length ?? events.length) > 8 && (
          <div className="border-t border-[#E5E7EB] p-3">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show less" : "View all"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
