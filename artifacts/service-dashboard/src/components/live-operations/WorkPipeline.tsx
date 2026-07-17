import { ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { LiveOpsPipelineStage } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

export function WorkPipeline({ stages }: { stages: LiveOpsPipelineStage[] }) {
  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-semibold text-[#0F172A]">Workflow Pipeline</CardTitle>
        <p className="text-sm text-[#64748B]">How open calls flow through operations</p>
      </CardHeader>
      <CardContent className="space-y-1">
        {stages.map((stage, index) => (
          <div key={stage.stage} className="animate-in fade-in duration-300" style={{ animationDelay: `${index * 40}ms` }}>
            <div className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] px-5 py-4">
              <div className="min-w-0">
                <p className="text-base font-semibold text-[#0F172A]">{stage.stage}</p>
                <p className="mt-0.5 text-sm text-[#64748B]">
                  {stage.pct}% of pipeline
                  {stage.avgDays != null && stage.avgDays > 0 ? ` · ${stage.avgDays}d avg` : ""}
                </p>
                {stage.description && (
                  <p className="mt-1 text-xs text-[#64748B]">{stage.description}</p>
                )}
              </div>
              <p className="text-3xl font-bold tabular-nums text-[#0F172A]">{stage.count.toLocaleString()}</p>
            </div>
            <Progress value={stage.pct} className="mt-2 h-2 bg-slate-100" />
            {index < stages.length - 1 && (
              <div className="flex justify-center py-2 text-slate-300">
                <ArrowDown className="h-5 w-5 animate-pulse" />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
