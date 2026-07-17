import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { FilterBarState } from "@/components/filter-bar";
import type { LiveOpsHierarchyNode } from "@/lib/analytics-api";
import { HEALTH_DOT, HEALTH_STYLES, OPS_CARD } from "./constants";

const LEVELS = [
  { key: "service_partner", label: "Service Partner", filterKey: "servicePartner" as const },
  { key: "ash", label: "Reporting Manager", filterKey: "ash" as const },
  { key: "rsh", label: "RSH", filterKey: "rsh" as const },
  { key: "national_head", label: "National Head", filterKey: "nationalHead" as const },
];

function findNode(nodes: LiveOpsHierarchyNode[], label: string | null | undefined): LiveOpsHierarchyNode | null {
  if (!label) return null;
  for (const n of nodes) {
    if (n.label === label) return n;
    const child = findNode(n.children ?? [], label);
    if (child) return child;
  }
  return null;
}

export function OwnershipDropdowns({
  nodes,
  filters,
  onChange,
}: {
  nodes: LiveOpsHierarchyNode[];
  filters: FilterBarState;
  onChange: (filters: FilterBarState) => void;
}) {
  const [partnerId, setPartnerId] = useState<string>("");
  const [managerId, setManagerId] = useState<string>("");
  const [rshId, setRshId] = useState<string>("");
  const [nhId, setNhId] = useState<string>("");

  const partner = nodes.find((n) => n.id === partnerId) ?? null;
  const managers = partner?.children ?? [];
  const manager = managers.find((n) => n.id === managerId) ?? null;
  const rshs = manager?.children ?? [];
  const rsh = rshs.find((n) => n.id === rshId) ?? null;
  const nationalHeads = rsh?.children ?? [];
  const nationalHead = nationalHeads.find((n) => n.id === nhId) ?? null;

  const selected = nationalHead ?? rsh ?? manager ?? partner;

  useEffect(() => {
    const p = findNode(nodes, filters.servicePartner);
    if (p) {
      setPartnerId(p.id);
      const m = findNode(p.children ?? [], filters.ash);
      setManagerId(m?.id ?? "");
      const r = m ? findNode(m.children ?? [], filters.rsh) : null;
      setRshId(r?.id ?? "");
      const nh = r ? findNode(r.children ?? [], filters.nationalHead) : null;
      setNhId(nh?.id ?? "");
    } else if (!filters.servicePartner) {
      setPartnerId("");
      setManagerId("");
      setRshId("");
      setNhId("");
    }
  }, [nodes, filters.servicePartner, filters.ash, filters.rsh, filters.nationalHead]);

  const applyFilters = (patch: Partial<FilterBarState>) => {
    onChange({ ...filters, ...patch });
  };

  const onPartnerChange = (id: string) => {
    setPartnerId(id);
    setManagerId("");
    setRshId("");
    setNhId("");
    const node = nodes.find((n) => n.id === id);
    applyFilters({
      servicePartner: node?.label ?? null,
      ash: null,
      rsh: null,
      nationalHead: null,
    });
  };

  const onManagerChange = (id: string) => {
    setManagerId(id);
    setRshId("");
    setNhId("");
    const node = managers.find((n) => n.id === id);
    applyFilters({ ash: node?.label ?? null, rsh: null, nationalHead: null });
  };

  const onRshChange = (id: string) => {
    setRshId(id);
    setNhId("");
    const node = rshs.find((n) => n.id === id);
    applyFilters({ rsh: node?.label ?? null, nationalHead: null });
  };

  const onNhChange = (id: string) => {
    setNhId(id);
    const node = nationalHeads.find((n) => n.id === id);
    applyFilters({ nationalHead: node?.label ?? null });
  };

  const clearAll = () => {
    setPartnerId("");
    setManagerId("");
    setRshId("");
    setNhId("");
    applyFilters({ servicePartner: null, ash: null, rsh: null, nationalHead: null });
  };

  const dropdowns = [
    { label: LEVELS[0].label, value: partnerId, items: nodes, onChange: onPartnerChange, disabled: false },
    { label: LEVELS[1].label, value: managerId, items: managers, onChange: onManagerChange, disabled: !partnerId },
    { label: LEVELS[2].label, value: rshId, items: rshs, onChange: onRshChange, disabled: !managerId },
    { label: LEVELS[3].label, value: nhId, items: nationalHeads, onChange: onNhChange, disabled: !rshId },
  ];

  return (
    <Card className={OPS_CARD}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold text-[#0F172A]">Who Owns the Work</CardTitle>
          <p className="text-sm text-[#64748B]">Select Service Partner → Manager → RSH → National Head</p>
        </div>
        {(partnerId || managerId || rshId || nhId) && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={clearAll}>
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {dropdowns.map((dd) => (
            <div key={dd.label} className="space-y-1.5">
              <label className="text-xs font-medium text-[#64748B]">{dd.label}</label>
              <Select value={dd.value || undefined} onValueChange={dd.onChange} disabled={dd.disabled}>
                <SelectTrigger className="h-11 rounded-xl border-[#E5E7EB] bg-white">
                  <SelectValue placeholder={`Select ${dd.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {dd.items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label} ({item.openCalls})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {selected ? (
          <div className="rounded-xl border border-[#E5E7EB] bg-slate-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">{selected.label}</p>
                <p className="text-xs text-[#64748B]">
                  {LEVELS.find((l) => l.key === selected.level)?.label ?? selected.level}
                </p>
              </div>
              <Badge variant="outline" className={HEALTH_STYLES[selected.health] ?? ""}>
                <span className={`mr-1.5 inline-block size-1.5 rounded-full ${HEALTH_DOT[selected.health] ?? ""}`} />
                {selected.health}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Metric label="Open Calls" value={selected.openCalls} />
              <Metric label="Critical" value={selected.critical} />
              <Metric label="Assigned" value={selected.assigned} />
              <Metric label="WIP" value={selected.wip} />
              <Metric label="Avg Age" value={`${selected.avgAge}d`} />
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[#E5E7EB] py-8 text-center text-sm text-[#64748B]">
            Select a service partner to explore ownership and workload.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[#64748B]">{label}</p>
      <p className="text-lg font-bold tabular-nums text-[#0F172A]">{value}</p>
    </div>
  );
}
