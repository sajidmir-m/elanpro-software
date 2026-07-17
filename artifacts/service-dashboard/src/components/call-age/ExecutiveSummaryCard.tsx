import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTERPRISE_CARD } from "./constants";

export function ExecutiveSummaryCard({ summary }: { summary: string }) {
  return (
    <Card className={`${ENTERPRISE_CARD} bg-gradient-to-br from-blue-50/80 to-card dark:from-blue-950/20`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <Sparkles className="h-4 w-4" />
          </span>
          Executive Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
      </CardContent>
    </Card>
  );
}
