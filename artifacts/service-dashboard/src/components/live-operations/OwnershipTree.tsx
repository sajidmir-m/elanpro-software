import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LiveOpsHierarchyNode } from "@/lib/analytics-api";
import { HEALTH_DOT, HEALTH_STYLES, OPS_CARD } from "./constants";

const LEVEL_LABEL: Record<string, string> = {
  service_partner: "Service Partner",
  ash: "Reporting Manager",
  rsh: "RSH",
  national_head: "National Head",
};

function TreeNode({
  node,
  depth,
  onSelect,
}: {
  node: LiveOpsHierarchyNode;
  depth: number;
  onSelect?: (node: LiveOpsHierarchyNode) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div className="select-none">
      <button
        type="button"
        onClick={() => {
          if (hasChildren) setOpen((v) => !v);
          onSelect?.(node);
        }}
        className="flex w-full items-start gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left shadow-sm transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md"
        style={{ marginLeft: depth * 16 }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="mt-1 h-4 w-4 text-[#64748B]" /> : <ChevronRight className="mt-1 h-4 w-4 text-[#64748B]" />
        ) : (
          <span className="w-4" />
        )}
        {open && hasChildren ? (
          <FolderOpen className="mt-0.5 h-5 w-5 text-[#64748B]" />
        ) : (
          <Folder className="mt-0.5 h-5 w-5 text-[#64748B]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-[#0F172A]">{node.label}</p>
          <p className="text-xs text-[#64748B]">{LEVEL_LABEL[node.level] ?? node.level}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#64748B] sm:grid-cols-5">
            <Metric label="Open" value={node.openCalls} />
            <Metric label="Critical" value={node.critical} />
            <Metric label="Avg Age" value={`${node.avgAge}d`} />
            <Metric label="Assigned" value={node.assigned} />
            <Metric label="WIP" value={node.wip} />
          </div>
        </div>
        <Badge variant="outline" className={`shrink-0 ${HEALTH_STYLES[node.health] ?? ""}`}>
          <span className={`mr-1.5 inline-block size-1.5 rounded-full ${HEALTH_DOT[node.health] ?? "bg-slate-400"}`} />
          {node.health}
        </Badge>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {node.children?.map((child) => (
            <TreeNode key={`${node.id}-${child.id}`} node={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider">{label}</p>
      <p className="font-semibold tabular-nums text-[#0F172A]">{value}</p>
    </div>
  );
}

export function OwnershipTree({
  nodes,
  onSelect,
}: {
  nodes: LiveOpsHierarchyNode[];
  onSelect?: (node: LiveOpsHierarchyNode) => void;
}) {
  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-semibold text-[#0F172A]">Who Owns the Work</CardTitle>
        <p className="text-sm text-[#64748B]">Service Partner → Reporting Manager → RSH → National Head</p>
      </CardHeader>
      <CardContent className="max-h-[560px] space-y-2 overflow-auto">
        {nodes.length === 0 ? (
          <EmptyOwnership />
        ) : (
          nodes.map((node) => <TreeNode key={node.id} node={node} depth={0} onSelect={onSelect} />)
        )}
      </CardContent>
    </Card>
  );
}

function EmptyOwnership() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] py-16 text-center">
      <Folder className="mb-3 h-10 w-10 text-slate-300" />
      <p className="font-medium text-[#0F172A]">No ownership hierarchy yet</p>
      <p className="mt-1 max-w-sm text-sm text-[#64748B]">Adjust filters or upload active ticket data to explore workload ownership.</p>
    </div>
  );
}
