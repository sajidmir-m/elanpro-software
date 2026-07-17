import { resolveApiUrl } from "./api-config";
import { supabase } from "./supabase";
import type { WarrantyFilter } from "@/components/analytics/types";

export type AnalyticsQuery = {
  warranty?: WarrantyFilter;
  dateRangeDays?: number | null;
  category?: string | null;
  product?: string | null;
  servicePartner?: string | null;
  ash?: string | null;
  rsh?: string | null;
  nationalHead?: string | null;
  state?: string | null;
  region?: string | null;
  level?: string | null;
  value?: string | null;
  ticketStatus?: string | null;
  status?: "WIP" | "MRF" | null;
  view?: LiveOpsDrilldownView | null;
  callAgeRange?: string | null;
  componentCategory?: string | null;
  component?: string | null;
  serialNumber?: string | null;
  ticketId?: string | null;
  area?: string | null;
  step?: string | null;
  search?: string | null;
  dataset?: string | null;
  page?: number | null;
  pageSize?: number | null;
  sortBy?: string | null;
  sortDir?: "asc" | "desc" | null;
};

export type ColumnDef = {
  key: string;
  label: string;
  type?: "number" | "date" | "text" | "green" | "orange" | "red";
  toneKey?: string;
};

export type RecordsResponse = {
  dataset: string;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
};

export type StatusCallRow = {
  ticketId: string;
  ticketStatus: string;
  classification: "WIP" | "MRF";
  reason: string;
  wipSubStage: string;
  lastAction: string;
  servicePartner: string;
  reportingManager: string;
  rsh: string;
  product: string;
  category: string;
  customer: string;
  customerCategory: string;
  city: string;
  state: string;
  components: string;
  mrfApproval: string;
  mrfStatus: string;
  mrfComponents: string;
  mrfApprovedBy: string;
  mrfApprovedDate: unknown;
  mrfDispatchDate: unknown;
  ageDays: number;
  createdOn: unknown;
};

export type StatusCallsResponse = {
  status: "WIP" | "MRF";
  total: number;
  rows: StatusCallRow[];
};

export type LiveOpsDrilldownView =
  | "servicePartners"
  | "regions"
  | "products"
  | "customerCategories"
  | "customers"
  | "warranty"
  | "mrfApproval"
  | "ticketTypes"
  | "problemDescriptions"
  | "priorities"
  | "statuses"
  | "wipStages"
  | "lastActions"
  | "cities";

export type LiveOpsDrilldownRow = {
  group: string;
  ticketId: string;
  createdOn: unknown;
  ageDays: number;
  customer: string;
  customerCategory: string;
  city: string;
  state: string;
  servicePartner: string;
  reportingManager: string;
  rsh: string;
  product: string;
  productCategory: string;
  warranty: string;
  ticketType: string;
  problemDescription: string;
  priority: string;
  ticketStatus: string;
  wipSubStage: string;
  lastAction: string;
  components: string;
  mrfApproval: string;
  mrfStatus: string;
  mrfComponents: string;
  mrfApprovedBy: string;
  mrfApprovedDate: unknown;
  mrfDispatchDate: unknown;
};

export type LiveOpsDrilldownResponse = {
  view: LiveOpsDrilldownView;
  title: string;
  totalCalls: number;
  uniqueValues: number;
  groups: Array<{ label: string; count: number; overdue: number; overduePct: number; avgAge: number }>;
  rows: LiveOpsDrilldownRow[];
};

export type FilterOptions = {
  categories: string[];
  products: string[];
  servicePartners: string[];
  ashList: string[];
  rshList: string[];
  states: string[];
  regions: string[];
  warrantyTypes: string[];
  ticketTypes: string[];
  nationalHeads?: string[];
  componentCategories: string[];
  /** Saved RSH name → partners resolved through saved ASH assignments */
  partnersByRsh?: Record<string, string[]>;
  /** Saved ASH/Reporting Manager name → partners in active tickets */
  partnersByAsh?: Record<string, string[]>;
};

function toQuery(params: AnalyticsQuery): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "" || value === "all") continue;
    sp.set(key, String(value));
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

async function authFetch<T>(path: string): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(resolveApiUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCallAgeDashboard(params: AnalyticsQuery) {
  return authFetch<CallAgeDashboard>(`/api/analytics/call-age${toQuery(params)}`);
}

export type ClosureBreakdownRow = {
  label: string;
  count: number;
  pct: number;
  avgTatHours: number | null;
  within24Pct: number | null;
};

export type ClosureDashboard = {
  refreshedAt: string;
  totalClosed: number;
  kpis: {
    totalClosed: number;
    closedToday: number;
    avgTatHours: number;
    medianTatHours: number;
    within24Pct: number;
    mrfApproved: number;
    mrfPending: number;
  };
  tatBuckets: Array<{ label: string; count: number; color: string }>;
  closureTypes: ClosureBreakdownRow[];
  products: ClosureBreakdownRow[];
  customerCategories: ClosureBreakdownRow[];
  regions: ClosureBreakdownRow[];
  servicePartners: ClosureBreakdownRow[];
  reportingManagers: ClosureBreakdownRow[];
  warranty: ClosureBreakdownRow[];
  closedBy: ClosureBreakdownRow[];
  mrfApproval: ClosureBreakdownRow[];
  dataCoverage: {
    closedCalls: number;
    servicePartners: number;
    regions: number;
    products: number;
    customers: number;
    customerCategories: number;
    closureTypes: number;
    closedBy: number;
  };
};

export async function fetchClosureDashboard(params: AnalyticsQuery) {
  return authFetch<ClosureDashboard>(`/api/analytics/closure-operations${toQuery(params)}`);
}

export type CallAgeDashboard = {
  totalTickets: number;
  ageMix: Array<{ label: string; count: number; color?: string }>;
  kpis: {
    total: { value: number; pct: number; trendPct: number | null; sparkline: number[] };
    green: { value: number; pct: number; trendPct: number | null; sparkline: number[] };
    orange: { value: number; pct: number; trendPct: number | null; sparkline: number[] };
    red: { value: number; pct: number; trendPct: number | null; sparkline: number[] };
  };
  stats: {
    avgAge: number;
    medianAge: number;
    oldestTicket: number;
    slaCompliance: number;
    urgencyPct: number;
  };
  executiveSummary: string;
  topRiskRegions: Array<{
    rank: number;
    region: string;
    green: number;
    orange: number;
    red: number;
    total: number;
    avgAge: number;
    oldestTicket: number;
    urgencyScore: number;
    overduePct: number;
    reportingManagers: string[];
  }>;
  topRshWorkload: Array<{
    rsh: string;
    totalCalls: number;
    urgentCalls: number;
    avgAge: number;
    oldestTicket: number;
    performanceScore: number;
    withinFiveDaysPct: number;
    badge: string;
  }>;
  criticalTickets: Array<Record<string, unknown>>;
  recommendedActions: Array<{ id: string; tone: "warning" | "info" | "critical"; message: string }>;
  byProduct: Array<{ label: string; count: number }>;
  byRegionAge: Array<{ label: string; green: number; orange: number; red: number; total: number }>;
  byRshAge: Array<{ label: string; green: number; orange: number; red: number; total: number }>;
  trends: {
    daily: Array<{ label: string; count: number }>;
    weekly: Array<{ label: string; count: number }>;
    monthly: Array<{ label: string; count: number }>;
  };
};

export type LiveOpsHierarchyNode = {
  id: string;
  level: "service_partner" | "ash" | "rsh" | "national_head";
  label: string;
  openCalls: number;
  assigned: number;
  wip: number;
  mrf: number;
  avgAge: number;
  critical: number;
  health: string;
  children?: LiveOpsHierarchyNode[];
};

export type LiveOpsKpi = {
  value: number;
  trendPct: number | null;
  trendLabel: string;
  description: string;
  sparkline: number[];
  status?: "healthy" | "warning" | "critical";
};

export type LiveOpsInsight = {
  icon: "activity" | "check" | "user" | "alert";
  text: string;
};

export type LiveOpsSmartInsight = {
  id: string;
  tone: "info" | "warning" | "critical";
  message: string;
};

export type LiveOpsProductInsight = {
  product: string;
  openCalls: number;
  assigned: number;
  wip: number;
  mrf: number;
  failurePct: number;
  avgAge: number;
};

export type LiveOpsPipelineStage = {
  stage: string;
  count: number;
  pct: number;
  avgDays?: number;
  description?: string;
};

export type LiveOpsPartnerRow = {
  rank: number;
  servicePartner: string;
  openCalls: number;
  assigned: number;
  wip: number;
  mrf: number;
  critical: number;
  avgAge: number;
  oldestTicket?: number;
  reportingManager: string;
  reportingManagers?: string[];
  rsh: string;
  rshList?: string[];
  region?: string;
  regions?: string[];
  products?: string[];
  recentTickets?: Array<{
    ticketId: string;
    status: string;
    product: string;
    age: number;
    timestamp: unknown;
  }>;
  health: string;
};

export type LiveOpsCharts = {
  statusBreakdown: {
    title: string;
    subtitle: string;
    segments: Array<{ label: string; count: number; color: string }>;
    insight: string;
  };
  topPartners: {
    title: string;
    subtitle: string;
    items: Array<{ label: string; count: number; pct: number }>;
    insight: string;
  };
  productDistribution: {
    title: string;
    subtitle: string;
    items: Array<{ label: string; count: number; pct: number }>;
    insight: string;
  };
  regionalWorkload: {
    title: string;
    subtitle: string;
    items: Array<{
      region: string;
      openCalls: number;
      assigned: number;
      wip: number;
      mrf: number;
      intensity: number;
    }>;
    insight: string;
  };
};

export type LiveOperationsDashboard = {
  refreshedAt: string;
  totalTickets: number;
  executiveSummary: string;
  executiveInsights?: LiveOpsInsight[];
  kpis: {
    open: LiveOpsKpi;
    assigned: LiveOpsKpi;
    wip: LiveOpsKpi;
    mrf: LiveOpsKpi;
    completedToday: LiveOpsKpi;
    sla: LiveOpsKpi;
  };
  workPipeline: LiveOpsPipelineStage[];
  charts?: LiveOpsCharts;
  hierarchy: LiveOpsHierarchyNode[];
  topServicePartners: LiveOpsPartnerRow[];
  activityFeed: Array<{
    id: string;
    type: string;
    ticketId: string;
    partner: string;
    manager: string;
    product: string;
    region: string;
    timestamp: unknown;
  }>;
  activityFeedAll?: Array<{
    id: string;
    type: string;
    ticketId: string;
    partner: string;
    manager: string;
    product: string;
    region: string;
    timestamp: unknown;
  }>;
  actions: Array<{
    id: string;
    label: string;
    tone: "default" | "warning" | "critical";
    target?: string;
  }>;
  smartInsights?: LiveOpsSmartInsight[];
  dataCoverage?: {
    activeCalls: number;
    servicePartners: number;
    regions: number;
    products: number;
    customerCategories: number;
    customers: number;
    ticketTypes: number;
    problemDescriptions: number;
    priorities: number;
    statuses: number;
    wipStages: number;
    lastActions: number;
    warrantyTypes: number;
    mrfApprovals: number;
  };
  opsOverview?: {
    avgTicketAge: number;
    ageingBuckets: Array<{ label: string; count: number }>;
    longestAgeingTicket: {
      ticketId: string;
      days: number;
      manager: string;
      partner: string;
      region: string;
    } | null;
    warrantyBreakdown: Array<{ label: string; count: number; pct: number; color: string }>;
    statusSummary?: { assigned: number; wip: number; mrf: number; other: number };
    operationalReasons?: {
      wip: {
        total: number;
        missingReasonCount: number;
        items: Array<{ reason: string; count: number; pct: number; avgAge: number; critical: number }>;
      };
      mrf: {
        total: number;
        missingReasonCount: number;
        items: Array<{ reason: string; count: number; pct: number; avgAge: number; critical: number }>;
      };
    };
    topCities?: Array<{ city: string; count: number }>;
    categoryBreakdown?: Array<{ category: string; count: number; pct: number }>;
    topManagers: Array<{
      rank: number;
      name: string;
      openCalls: number;
      criticalCalls: number;
      avgAge: number;
      partnersManaged: number;
    }>;
    topRsh: Array<Record<string, unknown>>;
    topRegions: Array<{
      region: string;
      openCalls: number;
      assigned: number;
      wip: number;
      mrf: number;
      intensity: number;
    }>;
  };
  // legacy
  workloadOverview?: Array<{ label: string; count: number; pct: number; color: string }>;
  reportingManagers?: unknown[];
  rshLeaderboard?: unknown[];
  productInsights?: LiveOpsProductInsight[];
  regionalHeatmap?: Array<{
    region: string;
    openCalls: number;
    assigned: number;
    wip: number;
    mrf: number;
    intensity: number;
  }>;
  operationsTable?: Record<string, unknown>[];
};

export async function fetchLiveOperationsDashboard(params: AnalyticsQuery) {
  return authFetch<LiveOperationsDashboard>(`/api/analytics/live-operations${toQuery(params)}`);
}

export async function fetchStatusCalls(status: "WIP" | "MRF", params: AnalyticsQuery) {
  return authFetch<StatusCallsResponse>(
    `/api/analytics/status-calls${toQuery({ ...params, ticketStatus: null, status })}`,
  );
}

export async function fetchLiveOpsDrilldown(view: LiveOpsDrilldownView, params: AnalyticsQuery) {
  return authFetch<LiveOpsDrilldownResponse>(
    `/api/analytics/live-operations/drilldown${toQuery({ ...params, view })}`,
  );
}

export async function fetchHierarchy(params: AnalyticsQuery) {
  return authFetch<any>(`/api/analytics/hierarchy${toQuery(params)}`);
}

export async function fetchStatusBreakdown(params: AnalyticsQuery) {
  return authFetch<any>(`/api/analytics/status-breakdown${toQuery(params)}`);
}

export async function fetchMrfByCategory(params: AnalyticsQuery) {
  return authFetch<any>(`/api/analytics/mrf-by-category${toQuery(params)}`);
}

export async function fetchConsumption(params: AnalyticsQuery) {
  return authFetch<any>(`/api/analytics/consumption${toQuery(params)}`);
}

export async function fetchRankings(params: AnalyticsQuery) {
  return authFetch<any>(`/api/analytics/rankings${toQuery(params)}`);
}

export async function fetchStageTat(params: AnalyticsQuery) {
  return authFetch<any>(`/api/analytics/stage-tat${toQuery(params)}`);
}

export async function fetchSalesVsBd(params: AnalyticsQuery) {
  return authFetch<any>(`/api/analytics/sales-vs-bd${toQuery(params)}`);
}

export async function fetchRecords(params: AnalyticsQuery): Promise<RecordsResponse> {
  return authFetch<RecordsResponse>(`/api/analytics/records${toQuery(params)}`);
}

export async function fetchFilterOptions(): Promise<FilterOptions> {
  return authFetch<FilterOptions>(`/api/filters/options`);
}

export async function fetchPartnersByRsh(rsh: string): Promise<{ rsh: string; partners: string[] }> {
  return authFetch<{ rsh: string; partners: string[] }>(
    `/api/filters/partners-by-rsh?rsh=${encodeURIComponent(rsh)}`,
  );
}

export async function fetchPartnersByAsh(ash: string): Promise<{ ash: string; partners: string[] }> {
  return authFetch<{ ash: string; partners: string[] }>(
    `/api/filters/partners-by-ash?ash=${encodeURIComponent(ash)}`,
  );
}

/** Multi-partner filter uses "||" delimiter (partner names may contain commas). */
export function parseServicePartners(value?: string | null): string[] {
  if (!value || value === "all") return [];
  return String(value)
    .split("||")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeServicePartners(partners: string[]): string | null {
  const clean = [...new Set(partners.map((p) => p.trim()).filter(Boolean))];
  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0]!;
  return clean.join("||");
}
