import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LiveOpsHierarchyNode } from "@/lib/analytics-api";
import { OPS_CARD } from "./constants";

function NodeRow({
  node,
  depth,
  onSelect,
}: {
  node: LiveOpsHierarchyNode;
  depth: number;
  onSelect?: (node: LiveOpsHierarchyNode) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (hasChildren) setOpen((v) => !v);
          onSelect?.(node);
        }}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-muted/40"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <span className="w-4" />
        )}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{node.label}</p>
          <p className="text-[11px] text-muted-foreground capitalize">{node.level.replace("_", " ")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
          <span>{node.openCalls}</span>
          <Badge variant="outline" className="font-normal text-[10px]">
            A{node.assigned}
          </Badge>
          <Badge variant="outline" className="font-normal text-[10px]">
            W{node.wip}
          </Badge>
          <Badge variant="outline" className="font-normal text-[10px]">
            M{node.mrf}
          </Badge>
          {node.critical > 0 && (
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 text-[10px]">
              {node.critical} crit
            </Badge>
          )}
        </div>
      </button>
      {open &&
        node.children?.map((child) => (
          <NodeRow key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />
        ))}
    </div>
  );
}

export function HierarchyTree({
  nodes,
  onSelect,
}: {
  nodes: LiveOpsHierarchyNode[];
  onSelect?: (node: LiveOpsHierarchyNode) => void;
}) {
  return (
    <Card className={OPS_CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Operational Hierarchy</CardTitle>
        <p className="text-xs text-muted-foreground">Service Partner → Reporting Manager → RSH</p>
      </CardHeader>
      <CardContent className="max-h-[420px] overflow-auto">
        {nodes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hierarchy data for filters.</p>
        ) : (
          nodes.map((node) => <NodeRow key={node.id} node={node} depth={0} onSelect={onSelect} />)
        )}
      </CardContent>
    </Card>
  );
}
