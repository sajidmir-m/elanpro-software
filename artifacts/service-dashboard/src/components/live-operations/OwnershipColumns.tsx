import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LiveOpsHierarchyNode } from "@/lib/analytics-api";
import { HEALTH_DOT, HEALTH_STYLES, OPS_CARD } from "./constants";

const COL_TITLES = ["Service Partner", "Reporting Manager", "RSH", "National Head"] as const;

function Column({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: LiveOpsHierarchyNode[];
  selectedId?: string;
  onSelect: (node: LiveOpsHierarchyNode) => void;
}) {
  return (
    <div className="flex min-h-[320px] min-w-0 flex-1 flex-col border-r border-[#E5E7EB] last:border-r-0">
      <div className="border-b border-[#E5E7EB] bg-slate-50/80 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">{title}</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-[#64748B]">Select parent level</p>
        ) : (
          items.map((node) => {
            const active = selectedId === node.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelect(node)}
                className={`flex w-full items-center justify-between gap-2 border-b border-[#E5E7EB]/60 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                  active ? "bg-blue-50/80" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#0F172A]">{node.label}</p>
                  <p className="text-[11px] text-[#64748B]">
                    {node.openCalls} open · {node.critical} critical
                  </p>
                </div>
                <Badge variant="outline" className={`shrink-0 text-[10px] ${HEALTH_STYLES[node.health] ?? ""}`}>
                  <span className={`mr-1 inline-block size-1.5 rounded-full ${HEALTH_DOT[node.health] ?? ""}`} />
                  {node.health}
                </Badge>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function OwnershipColumns({
  nodes,
  onSelect,
}: {
  nodes: LiveOpsHierarchyNode[];
  onSelect?: (node: LiveOpsHierarchyNode) => void;
}) {
  const [partner, setPartner] = useState<LiveOpsHierarchyNode | null>(null);
  const [manager, setManager] = useState<LiveOpsHierarchyNode | null>(null);
  const [rsh, setRsh] = useState<LiveOpsHierarchyNode | null>(null);

  const managers = partner?.children ?? [];
  const rshs = manager?.children ?? [];
  const nationalHeads = rsh?.children ?? [];

  const pick = (node: LiveOpsHierarchyNode, level: number) => {
    onSelect?.(node);
    if (level === 0) {
      setPartner(node);
      setManager(null);
      setRsh(null);
    } else if (level === 1) {
      setManager(node);
      setRsh(null);
    } else if (level === 2) {
      setRsh(node);
    }
  };

  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-[#0F172A]">Who Owns the Work</CardTitle>
        <p className="text-sm text-[#64748B]">Click through each level — Service Partner → Manager → RSH → National Head</p>
      </CardHeader>
      <CardContent className="p-0">
        {nodes.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[#64748B]">No ownership data for current filters.</p>
        ) : (
          <div className="flex overflow-x-auto">
            <Column title={COL_TITLES[0]} items={nodes} selectedId={partner?.id} onSelect={(n) => pick(n, 0)} />
            <Column title={COL_TITLES[1]} items={managers} selectedId={manager?.id} onSelect={(n) => pick(n, 1)} />
            <Column title={COL_TITLES[2]} items={rshs} selectedId={rsh?.id} onSelect={(n) => pick(n, 2)} />
            <Column
              title={COL_TITLES[3]}
              items={nationalHeads}
              onSelect={(n) => onSelect?.(n)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
