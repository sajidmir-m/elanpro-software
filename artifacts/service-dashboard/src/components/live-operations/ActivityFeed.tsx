import { Activity, AlertTriangle, ClipboardList, Package, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTicketDate } from "@/lib/utils";
import type { LiveOperationsDashboard } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

const TYPE_ICONS: Record<string, typeof Activity> = {
  "Ticket Assigned": UserPlus,
  "MRF Requested": Package,
  "Work In Progress": ClipboardList,
  "Escalation Raised": AlertTriangle,
};

export function ActivityFeed({ events }: { events: LiveOperationsDashboard["activityFeed"] }) {
  return (
    <Card className={`${OPS_CARD} h-full`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Activity className="h-4 w-4" />
          Live Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[520px] px-4">
          {events.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No recent activity for filters.</p>
          ) : (
            <div className="space-y-3 pb-4">
              {events.map((event, index) => {
                const Icon = TYPE_ICONS[event.type] ?? Activity;
                return (
                  <div key={`${event.id}-${index}`} className="flex gap-3 rounded-lg border border-slate-100 p-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                      <Icon className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{event.type}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        #{event.ticketId} · {event.product}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {event.partner} · {event.manager}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {event.timestamp ? formatTicketDate(String(event.timestamp)) : "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
