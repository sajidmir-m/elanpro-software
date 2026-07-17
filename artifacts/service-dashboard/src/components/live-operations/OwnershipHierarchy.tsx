import { useState } from "react";
import { Building2, ChevronDown, ChevronRight, Globe2, UserCircle2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LiveOpsHierarchyNode } from "@/lib/analytics-api";
import { HEALTH_STYLES, OPS_CARD } from "./constants";

const LEVEL_META = {
  service_partner: { icon: Building2, label: "Service Partner" },
  ash: { icon: UserCircle2, label: "Reporting Manager" },
  rsh: { icon: Users, label: "RSH" },
  national_head: { icon: Globe2, label: "National Head" },
};

function initials(label: string) {
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function NodeRow({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: LiveOpsHierarchyNode;
  depth: number;
  selectedId?: string;
  onSelect?: (node: LiveOpsHierarchyNode) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const meta = LEVEL_META[node.level];
  const Icon = meta.icon;
  const selected = selectedId === node.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (hasChildren) setOpen((v) => !v);
          onSelect?.(node);
        }}
        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
          selected
            ? "border-[#2563EB]/40 bg-[#EFF6FF]"
            : "border-transparent hover:border-[#E7EAF0] hover:bg-[#F7F8FA]"
        }`}
        style={{ marginLeft: depth * 12 }}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-[#667085]" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[#667085]" />
          )
        ) : (
          <span className="w-4" />
        )}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7F8FA] text-xs font-semibold text-[#111827]">
          {initials(node.label)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-[#667085]" />
            <p className="truncate text-[15px] font-medium text-[#111827]">{node.label}</p>
          </div>
          <p className="text-[13px] text-[#667085]">{meta.label}</p>
        </div>
        <div className="hidden shrink-0 items-center gap-3 text-[13px] tabular-nums text-[#667085] sm:flex">
          <span title="Open">{node.openCalls} open</span>
          <span title="Assigned">A{node.assigned}</span>
          <span title="WIP">W{node.wip}</span>
          <span title="Critical" className={node.critical > 0 ? "text-[#DC2626]" : ""}>
            C{node.critical}
          </span>
          <span title="Avg Age">{node.avgAge}d</span>
          {node.sla != null && <span title="SLA">{node.sla}%</span>}
        </div>
        <Badge variant="outline" className={`shrink-0 text-[11px] ${HEALTH_STYLES[node.health] ?? ""}`}>
          {node.health}
        </Badge>
      </button>
      {open &&
        node.children?.map((child) => (
          <NodeRow key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
        ))}
    </div>
  );
}

export function OwnershipHierarchy({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: LiveOpsHierarchyNode[];
  selectedId?: string;
  onSelect?: (node: LiveOpsHierarchyNode) => void;
}) {
  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-[22px] font-semibold text-[#111827]">Who Owns the Work</CardTitle>
        <p className="text-[15px] text-[#667085]">
          Service Partner → Reporting Manager → RSH → National Head
        </p>
      </CardHeader>
      <CardContent className="max-h-[480px] overflow-auto">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-[#E7EAF0]" />
            <p className="font-medium text-[#111827]">No ownership hierarchy for selected filters.</p>
            <p className="mt-1 text-[13px] text-[#667085]">Try clearing partner or region filters.</p>
          </div>
        ) : (
          nodes.map((node) => (
            <NodeRow key={node.id} node={node} depth={0} selectedId={selectedId} onSelect={onSelect} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
