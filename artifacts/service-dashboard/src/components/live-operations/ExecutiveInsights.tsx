import { Activity, AlertTriangle, CheckCircle2, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LiveOpsInsight } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

const ICONS = {
  activity: Activity,
  check: CheckCircle2,
  user: User,
  alert: AlertTriangle,
};

export function ExecutiveInsights({ insights }: { insights: LiveOpsInsight[] }) {
  return (
    <Card className={`${OPS_CARD} border-l-4 border-l-[#2563EB]`}>
      <CardContent className="p-5">
        <h2 className="text-lg font-semibold text-[#0F172A]">Today&apos;s Operations Summary</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {insights.map((item, i) => {
            const Icon = ICONS[item.icon] ?? Activity;
            return (
              <div key={i} className="flex items-start gap-2.5 rounded-xl bg-slate-50/80 px-3 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#64748B] shadow-sm">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm leading-snug text-[#0F172A]/90">{item.text}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
