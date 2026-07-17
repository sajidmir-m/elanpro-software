import { Activity, AlertTriangle, CheckCircle2, Sparkles, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { LiveOpsExecutiveBrief, LiveOpsInsight } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

const ICONS = {
  activity: Activity,
  check: CheckCircle2,
  user: User,
  alert: AlertTriangle,
};

export function ExecutiveSummaryCard({
  brief,
  insights,
}: {
  brief?: LiveOpsExecutiveBrief;
  insights?: LiveOpsInsight[];
}) {
  const bullets = brief?.bullets ?? insights?.map((i) => i.text) ?? [];

  return (
    <Card className={`${OPS_CARD} overflow-hidden border-[#E7EAF0]`}>
      <div className="h-1 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#2563EB]" />
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-[#F5F3FF] text-[#2563EB]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-[22px] font-semibold text-[#111827]">Today&apos;s Operations Summary</h2>
              <p className="text-[13px] text-[#667085]">AI-assisted executive brief for live operations</p>
            </div>
          </div>
          {brief?.confidence != null && (
            <Badge variant="outline" className="border-[#E7EAF0] bg-[#F7F8FA] text-[#111827]">
              {brief.confidence}% confidence
            </Badge>
          )}
        </div>
        <ul className="mt-5 space-y-2.5">
          {bullets.map((text, i) => {
            const insight = insights?.[i];
            const Icon = insight ? (ICONS[insight.icon] ?? Activity) : Activity;
            return (
              <li key={i} className="flex items-start gap-3 rounded-xl bg-[#F7F8FA] px-4 py-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#667085]" />
                <span className="text-[15px] leading-relaxed text-[#111827]">{text}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
