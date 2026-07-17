import {
  Activity,
  Building2,
  ChevronRight,
  ClipboardList,
  Clock3,
  MapPinned,
  Package,
  ShieldCheck,
  Tags,
  TriangleAlert,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LiveOperationsDashboard, LiveOpsDrilldownView } from "@/lib/analytics-api";

type Coverage = NonNullable<LiveOperationsDashboard["dataCoverage"]>;

export function LiveOpsDataExplorer({
  coverage,
  onOpen,
}: {
  coverage: Coverage;
  onOpen: (view: LiveOpsDrilldownView) => void;
}) {
  const items: Array<{
    view: LiveOpsDrilldownView;
    label: string;
    count: number;
    unit: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      view: "servicePartners",
      label: "Service Partners",
      count: coverage.servicePartners,
      unit: "unique partners",
      description: "All partners and their individual active calls",
      icon: <UsersRound className="size-4" />,
    },
    {
      view: "customers",
      label: "Customers",
      count: coverage.customers,
      unit: "unique customers",
      description: "Customer names, categories, locations and tickets",
      icon: <UserRound className="size-4" />,
    },
    {
      view: "customerCategories",
      label: "Customer Categories",
      count: coverage.customerCategories,
      unit: "customer types",
      description: "Separate from product category",
      icon: <Building2 className="size-4" />,
    },
    {
      view: "products",
      label: "Products",
      count: coverage.products,
      unit: "unique products",
      description: "Product workload, problems and warranty",
      icon: <Package className="size-4" />,
    },
    {
      view: "regions",
      label: "Regions",
      count: coverage.regions,
      unit: "uploaded territories",
      description: "Complete region and ticket coverage",
      icon: <MapPinned className="size-4" />,
    },
    {
      view: "warranty",
      label: "Warranty / Support",
      count: coverage.warrantyTypes,
      unit: "recorded types",
      description: "In, out, unverified and other support values",
      icon: <ShieldCheck className="size-4" />,
    },
    {
      view: "mrfApproval",
      label: "MRF Approval",
      count: coverage.mrfApprovals,
      unit: "approval states",
      description: "Approved, pending, rejected and tickets without MRF",
      icon: <ShieldCheck className="size-4" />,
    },
    {
      view: "ticketTypes",
      label: "Ticket Types",
      count: coverage.ticketTypes,
      unit: "recorded types",
      description: "Includes scheduled service breakdown",
      icon: <ClipboardList className="size-4" />,
    },
    {
      view: "problemDescriptions",
      label: "Problems",
      count: coverage.problemDescriptions,
      unit: "recorded descriptions",
      description: "Reported problem against each ticket",
      icon: <TriangleAlert className="size-4" />,
    },
    {
      view: "priorities",
      label: "Ticket Priorities",
      count: coverage.priorities,
      unit: "priority values",
      description: "Priority and status shown separately",
      icon: <Tags className="size-4" />,
    },
    {
      view: "statuses",
      label: "Uploaded Status",
      count: coverage.statuses,
      unit: "raw status values",
      description: "Exact status from the uploaded sheet",
      icon: <Activity className="size-4" />,
    },
    {
      view: "wipStages",
      label: "WIP Sub-Stages",
      count: coverage.wipStages,
      unit: "recorded stage/details",
      description: "Why calls are WIP, including comments",
      icon: <Clock3 className="size-4" />,
    },
    {
      view: "lastActions",
      label: "Last Actions",
      count: coverage.lastActions,
      unit: "recorded actions",
      description: "Latest action and full ticket context",
      icon: <ChevronRight className="size-4" />,
    },
  ];

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[15px] font-semibold text-[#111827]">Complete Data Explorer</h2>
        <p className="text-[12px] text-[#667085]">
          The uploaded sheet contains {coverage.activeCalls.toLocaleString()} active calls. Counts below are unique
          values; open any card for every matching ticket.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <button
            type="button"
            key={item.view}
            onClick={() => onOpen(item.view)}
            className="group rounded-xl border border-[#E7EAF0] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                {item.icon}
              </span>
              <ChevronRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
            </div>
            <p className="mt-3 text-[13px] font-semibold text-[#111827]">{item.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#111827]">{item.count.toLocaleString()}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#98A2B3]">{item.unit}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-[#667085]">{item.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
