import { getServiceClient } from "@workspace/supabase";
import { matchesServicePartner, normalizeFilterParams, type FilterParams } from "./filters";
import { attachTicketAges, rowAgeDays, formatDataAsOf, dataAsOfFromRows } from "./ticket-query";
import {
  applySavedReportingHierarchy,
  fetchReportingHierarchyDirectory,
} from "./reporting-hierarchy";

const PAGE_SIZE = 1000;
export const CHART_COLORS = [
  "hsl(215 60% 45%)",
  "hsl(38 92% 50%)",
  "hsl(142 71% 45%)",
  "hsl(0 72% 55%)",
  "hsl(280 55% 55%)",
  "hsl(190 70% 45%)",
  "hsl(24 90% 55%)",
  "hsl(340 65% 55%)",
  "hsl(160 55% 42%)",
  "hsl(255 55% 60%)",
  "hsl(48 90% 50%)",
  "hsl(200 65% 40%)",
];

export type WarrantyFilter = "all" | "in" | "out";
export type HierarchyLevel = "national_head" | "rsh" | "service_partner" | "ash";

export type CallAgeRange = "all" | "green" | "orange" | "red" | "older30" | "older60";

export type AnalyticsParams = FilterParams & {
  warranty?: WarrantyFilter | string | null;
  ticketStatus?: string | null;
  callAgeRange?: CallAgeRange | string | null;
  level?: HierarchyLevel | string | null;
  value?: string | null;
  componentCategory?: string | null;
  region?: string | null;
  product?: string | null;
  category?: string | null;
  component?: string | null;
  serialNumber?: string | null;
  ticketId?: string | null;
  area?: string | null;
  nationalHead?: string | null;
  customerCategory?: string | null;
  customerName?: string | null;
  closureType?: string | null;
};

export function classifyWarranty(supportType: unknown): "in" | "out" | "other" {
  const s = String(supportType ?? "").toLowerCase();
  if (!s) return "other";
  if (s.includes("out") || s.includes("unverified")) return "out";
  if (s.includes("in warranty") || (s.includes("warranty") && !s.includes("out"))) return "in";
  if (s.includes("extended") || s.includes("jeevanam")) return "in";
  return "other";
}

export function bucketStatus(row: Record<string, unknown>): "Assigned" | "WIP" | "MRF" | "Other" {
  const status = String(row.ticket_status ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  const stage = String(row.wip_sub_stage ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  const combined = `${status} ${stage}`;
  if (/\b(?:mrf|mrp)\b|parts?\s+pending|spares?\s+pending/.test(combined)) return "MRF";
  if (/\bwip\b|\bwork\s+in\s+progress\b/.test(combined)) return "WIP";
  if (!/\bunassigned\b/.test(combined) && /\bassign(?:ed|ment)?\b/.test(combined)) return "Assigned";
  return "Other";
}

function isTechnicianAccepted(row: Record<string, unknown>): boolean {
  const status = String(row.ticket_status ?? "").toLowerCase();
  const stage = String(row.wip_sub_stage ?? "").toLowerCase();
  const combined = `${status} ${stage}`;
  return combined.includes("accept") || combined.includes("technician accepted");
}

function parseDate(value: unknown): Date | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^[0-9]{2}-[0-9]{2}-[0-9]{4}/.test(raw)) {
    const datePart = raw.split(",")[0]?.trim();
    if (!datePart) return null;
    const [day, month, year] = datePart.split("-").map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function hoursBetween(from: unknown, to: unknown): number | null {
  const a = parseDate(from);
  const b = parseDate(to);
  if (!a || !b) return null;
  const hours = (b.getTime() - a.getTime()) / 3_600_000;
  return hours >= 0 ? hours : null;
}

function matchesWarranty(row: Record<string, unknown>, warranty?: WarrantyFilter | string | null) {
  if (!warranty || warranty === "all") return true;
  const cls = classifyWarranty(row.support_type);
  if (warranty === "in") return cls === "in";
  if (warranty === "out") return cls === "out";
  return true;
}

function matchesAnalyticsFilters(row: Record<string, unknown>, params: AnalyticsParams): boolean {
  const normalized = normalizeFilterParams(params);
  if (!matchesWarranty(row, params.warranty as WarrantyFilter)) return false;
  if (params.category && String(row.category ?? "").toLowerCase() !== params.category.toLowerCase()) {
    return false;
  }
  if (params.product && !matchesServicePartner(row.product, params.product)) {
    return false;
  }
  if (params.servicePartner && !matchesServicePartner(row.service_partner_name, params.servicePartner)) {
    return false;
  }
  if (params.ash && !matchesServicePartner(row.ash, params.ash)) {
    return false;
  }
  if (params.rsh && !matchesServicePartner(row.rsh, params.rsh)) {
    return false;
  }
  if (
    params.nationalHead &&
    String(row.national_head ?? "").toLowerCase() !== params.nationalHead.toLowerCase()
  ) {
    return false;
  }
  if (params.state && String(row.state ?? "").toLowerCase() !== params.state.toLowerCase()) {
    return false;
  }
  if (params.region && resolveRegion(row).toLowerCase() !== params.region.toLowerCase()) {
    return false;
  }
  if (params.area) {
    const area = String(row.state ?? row.ticket_territory ?? row.dispatch_state ?? "").toLowerCase();
    if (area !== params.area.toLowerCase()) return false;
  }
  if (params.ticketStatus) {
    if (bucketStatus(row).toLowerCase() !== params.ticketStatus.toLowerCase()) return false;
  }
  if (params.callAgeRange && params.callAgeRange !== "all") {
    if (!matchesCallAgeRange(row, params.callAgeRange)) return false;
  }
  if (params.component && String(row.component_name ?? "").toLowerCase() !== params.component.toLowerCase()) {
    return false;
  }
  if (params.serialNumber && String(row.serial_number ?? "").toLowerCase() !== params.serialNumber.toLowerCase()) {
    return false;
  }
  if (params.ticketId && String(row.ticket_id ?? "") !== params.ticketId) return false;

  if (
    params.customerCategory &&
    String(row.customer_category ?? "").toLowerCase() !== params.customerCategory.toLowerCase()
  ) {
    return false;
  }
  if (params.customerName) {
    const needle = params.customerName.toLowerCase();
    if (!String(row.customer_name ?? "").toLowerCase().includes(needle)) return false;
  }
  if (
    params.closureType &&
    String(row.closure_type ?? "").toLowerCase() !== params.closureType.toLowerCase()
  ) {
    return false;
  }

  if (params.search) {
    const needle = String(params.search).trim().toLowerCase();
    if (needle) {
      let hit = false;
      for (const value of Object.values(row)) {
        if (value != null && String(value).toLowerCase().includes(needle)) {
          hit = true;
          break;
        }
      }
      if (!hit) return false;
    }
  }

  if (normalized.dateFrom || normalized.dateTo) {
    const created = parseDate(row.created_on);
    if (!created) return false;
    if (normalized.dateFrom) {
      const from = new Date(normalized.dateFrom);
      from.setHours(0, 0, 0, 0);
      if (created < from) return false;
    }
    if (normalized.dateTo) {
      const to = new Date(normalized.dateTo);
      to.setHours(23, 59, 59, 999);
      if (created > to) return false;
    }
  }
  return true;
}

async function fetchAll(
  table: "active_tickets" | "closed_tickets" | "mrf_data" | "sales_data",
  columns = "*",
): Promise<Record<string, unknown>[]> {
  const supabase = getServiceClient();
  const rows: Record<string, unknown>[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  if (table === "sales_data") return rows;

  const directory = await fetchReportingHierarchyDirectory();
  return rows.map((row) => applySavedReportingHierarchy(row, directory));
}

async function attachMrfApproval(
  ticketRows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (ticketRows.length === 0) return ticketRows;
  const mrfRows = await fetchAll("mrf_data");
  const byTicket = new Map<
    string,
    {
      count: number;
      statuses: Set<string>;
      components: Set<string>;
      approvedBy: Set<string>;
      approvedDates: Set<string>;
      dispatchDates: Set<string>;
      hasApproval: boolean;
      hasRejection: boolean;
    }
  >();

  for (const row of mrfRows) {
    const ticketId = String(row.ticket_id ?? "").trim().toLowerCase();
    if (!ticketId) continue;
    const current = byTicket.get(ticketId) ?? {
      count: 0,
      statuses: new Set<string>(),
      components: new Set<string>(),
      approvedBy: new Set<string>(),
      approvedDates: new Set<string>(),
      dispatchDates: new Set<string>(),
      hasApproval: false,
      hasRejection: false,
    };
    current.count += 1;

    const status = String(row.mrf_status ?? "").trim();
    const approvedBy = String(row.approved_by ?? "").trim();
    const approvedDate = String(row.approved_date ?? row.ash_approved_date ?? "").trim();
    const dispatchDate = String(row.dispatch_date ?? "").trim();
    const component = String(row.component_name ?? "").trim();
    if (status) current.statuses.add(status);
    if (component) current.components.add(component);
    if (approvedBy) current.approvedBy.add(approvedBy);
    if (approvedDate) current.approvedDates.add(approvedDate);
    if (dispatchDate) current.dispatchDates.add(dispatchDate);
    const normalizedStatus = status.toLowerCase();
    if (approvedBy || approvedDate || normalizedStatus.includes("approv")) current.hasApproval = true;
    if (normalizedStatus.includes("reject") || normalizedStatus.includes("declin")) {
      current.hasRejection = true;
    }
    byTicket.set(ticketId, current);
  }

  return ticketRows.map((row) => {
    const ticketId = String(row.ticket_id ?? "").trim().toLowerCase();
    const mrf = byTicket.get(ticketId);
    if (!mrf) {
      return {
        ...row,
        mrf_record_count: 0,
        mrf_approval: "No MRF",
        mrf_status: null,
        mrf_components: null,
        mrf_approved_by: null,
        mrf_approved_date: null,
        mrf_dispatch_date: null,
      };
    }

    return {
      ...row,
      mrf_record_count: mrf.count,
      mrf_approval: mrf.hasApproval ? "Approved" : mrf.hasRejection ? "Rejected" : "Pending",
      mrf_status: [...mrf.statuses].join(", ") || "Pending",
      mrf_components: [...mrf.components].join(", ") || null,
      mrf_approved_by: [...mrf.approvedBy].join(", ") || null,
      mrf_approved_date: [...mrf.approvedDates].join(", ") || null,
      mrf_dispatch_date: [...mrf.dispatchDates].join(", ") || null,
    };
  });
}

export async function fetchActive(params: AnalyticsParams = {}) {
  const all = await attachMrfApproval(await fetchAll("active_tickets"));
  // Age against the full extract (max Created On), then filter — so Green/Orange/Red
  // stay stable when RSH/ASH/product filters are applied.
  attachTicketAges(all);
  return all.filter((r) => matchesAnalyticsFilters(r, params));
}

export async function fetchClosed(params: AnalyticsParams = {}) {
  const normalized = normalizeFilterParams(params);
  const nonDateParams = {
    ...params,
    dateFrom: null,
    dateTo: null,
    dateRangeDays: null,
  };
  return (await attachMrfApproval(await fetchAll("closed_tickets"))).filter((row) => {
    if (!matchesAnalyticsFilters(row, nonDateParams)) return false;
    if (!normalized.dateFrom && !normalized.dateTo) return true;
    const closed = parseDate(row.closed_date);
    if (!closed) return false;
    if (normalized.dateFrom) {
      const from = new Date(normalized.dateFrom);
      from.setHours(0, 0, 0, 0);
      if (closed < from) return false;
    }
    if (normalized.dateTo) {
      const to = new Date(normalized.dateTo);
      to.setHours(23, 59, 59, 999);
      if (closed > to) return false;
    }
    return true;
  });
}

export async function fetchMrf(params: AnalyticsParams = {}) {
  return (await fetchAll("mrf_data")).filter((r) => matchesAnalyticsFilters(r, params));
}

export async function fetchSales(params: AnalyticsParams = {}) {
  return (await fetchAll("sales_data")).filter((r) => {
    if (params.category && String(r.category ?? "").toLowerCase() !== params.category.toLowerCase()) return false;
    if (params.product && String(r.product ?? "").toLowerCase() !== params.product.toLowerCase()) return false;
    if (params.state && String(r.state ?? "").toLowerCase() !== params.state.toLowerCase()) return false;
    if (params.servicePartner && !matchesServicePartner(r.service_partner_name, params.servicePartner)) {
      return false;
    }
    if (params.search) {
      const needle = String(params.search).trim().toLowerCase();
      if (needle && !Object.values(r).some((v) => v != null && String(v).toLowerCase().includes(needle))) {
        return false;
      }
    }
    return true;
  });
}

export function groupCount(
  rows: Record<string, unknown>[],
  field: string,
  fallback = "Unknown",
  limit = 20,
): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = String(row[field] ?? fallback) || fallback;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function groupSum(
  rows: Record<string, unknown>[],
  field: string,
  valueField: string,
  fallback = "Unknown",
  limit = 20,
): Array<{ label: string; count: number }> {
  const sums = new Map<string, number>();
  for (const row of rows) {
    const label = String(row[field] ?? fallback) || fallback;
    sums.set(label, (sums.get(label) ?? 0) + Number(row[valueField] ?? 0));
  }
  return [...sums.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function average(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (!nums.length) return null;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

export function statusBreakdown(rows: Record<string, unknown>[]) {
  const buckets = { Assigned: 0, WIP: 0, MRF: 0, Other: 0 };
  for (const row of rows) buckets[bucketStatus(row)] += 1;
  return [
    { label: "Assigned", count: buckets.Assigned, color: CHART_COLORS[0] },
    { label: "WIP", count: buckets.WIP, color: CHART_COLORS[1] },
    { label: "MRF", count: buckets.MRF, color: CHART_COLORS[2] },
    { label: "Other", count: buckets.Other, color: CHART_COLORS[3] },
  ].filter((b) => b.count > 0);
}

export function resolveRegion(row: Record<string, unknown>): string {
  const territory = String(row.ticket_territory ?? "").trim();
  if (territory) return territory;
  const category = String(row.territory_category ?? "").trim();
  if (category) return category;
  const state = String(row.state ?? "").trim();
  return state || "Unknown";
}

export type AgeUrgency = "green" | "orange" | "red";

export function ageUrgency(days: number): AgeUrgency {
  if (days <= 3) return "green";
  if (days <= 5) return "orange";
  return "red";
}

export function ageBreakdown(rows: Record<string, unknown>[]) {
  const counts = { green: 0, orange: 0, red: 0 };
  for (const row of rows) {
    counts[ageUrgency(rowAgeDays(row))] += 1;
  }
  return [
    { label: "≤3 days", count: counts.green, color: "hsl(142 71% 45%)" },
    { label: "4-5 days", count: counts.orange, color: "hsl(38 92% 50%)" },
    { label: ">5 days (Urgent)", count: counts.red, color: "hsl(0 72% 55%)" },
  ].filter((b) => b.count > 0);
}

export function groupAgeByRegion(rows: Record<string, unknown>[], limit = 20) {
  const map = new Map<string, { label: string; green: number; orange: number; red: number; total: number }>();
  for (const row of rows) {
    const label = resolveRegion(row);
    const urgency = ageUrgency(rowAgeDays(row));
    const current = map.get(label) ?? { label, green: 0, orange: 0, red: 0, total: 0 };
    current[urgency] += 1;
    current.total += 1;
    map.set(label, current);
  }
  return [...map.values()].sort((a, b) => b.red - a.red || b.total - a.total).slice(0, limit);
}

export function groupAgeByField(
  rows: Record<string, unknown>[],
  field: string,
  fallback = "Unknown",
  limit = 12,
) {
  const map = new Map<string, { label: string; green: number; orange: number; red: number; total: number }>();
  for (const row of rows) {
    const label = String(row[field] ?? fallback).trim() || fallback;
    const urgency = ageUrgency(rowAgeDays(row));
    const current = map.get(label) ?? { label, green: 0, orange: 0, red: 0, total: 0 };
    current[urgency] += 1;
    current.total += 1;
    map.set(label, current);
  }
  return [...map.values()].sort((a, b) => b.red - a.red || b.total - a.total).slice(0, limit);
}

export function summarizeActiveByAge(rows: Record<string, unknown>[]) {
  dataAsOfFromRows(rows);
  type SummaryRow = {
    region: string;
    rsh: string;
    reporting_manager: string;
    green_calls: number;
    orange_calls: number;
    red_calls: number;
    total: number;
    avg_age_days: number;
    max_age_days: number;
    _ageSum: number;
  };

  const map = new Map<string, SummaryRow>();

  for (const row of rows) {
    const region = resolveRegion(row);
    const rsh = String(row.rsh ?? "Unassigned").trim() || "Unassigned";
    const reporting_manager = String(row.ash ?? "Unassigned").trim() || "Unassigned";
    const age = rowAgeDays(row);
    const urgency = ageUrgency(age);
    const key = [region, rsh, reporting_manager].join("|||");

    const current = map.get(key) ?? {
      region,
      rsh,
      reporting_manager,
      green_calls: 0,
      orange_calls: 0,
      red_calls: 0,
      total: 0,
      avg_age_days: 0,
      max_age_days: 0,
      _ageSum: 0,
    };

    if (urgency === "green") current.green_calls += 1;
    else if (urgency === "orange") current.orange_calls += 1;
    else current.red_calls += 1;
    current.total += 1;
    current._ageSum += age;
    current.max_age_days = Math.max(current.max_age_days, age);
    map.set(key, current);
  }

  return [...map.values()]
    .map(({ _ageSum, ...row }) => ({
      ...row,
      avg_age_days: row.total > 0 ? Math.round(_ageSum / row.total) : 0,
    }))
    .sort((a, b) => b.red_calls - a.red_calls || b.max_age_days - a.max_age_days || b.total - a.total);
}

export function summarizeActiveRows(rows: Record<string, unknown>[]) {
  type SummaryRow = {
    reporting_manager: string;
    product: string;
    category: string;
    service_partner: string;
    region: string;
    assigned: number;
    wip: number;
    mrf: number;
    other: number;
    total: number;
  };

  const map = new Map<string, SummaryRow>();

  for (const row of rows) {
    const reporting_manager = String(row.ash ?? "Unassigned").trim() || "Unassigned";
    const product = String(row.product ?? "Unknown").trim() || "Unknown";
    const category = String(row.category ?? "Unknown").trim() || "Unknown";
    const service_partner = String(row.service_partner_name ?? "Unknown").trim() || "Unknown";
    const region = resolveRegion(row);
    const key = [reporting_manager, product, category, service_partner, region].join("|||");
    const bucket = bucketStatus(row);

    const current = map.get(key) ?? {
      reporting_manager,
      product,
      category,
      service_partner,
      region,
      assigned: 0,
      wip: 0,
      mrf: 0,
      other: 0,
      total: 0,
    };

    if (bucket === "Assigned") current.assigned += 1;
    else if (bucket === "WIP") current.wip += 1;
    else if (bucket === "MRF") current.mrf += 1;
    else current.other += 1;
    current.total += 1;
    map.set(key, current);
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function hierarchyField(level: string | null | undefined): string {
  switch (level) {
    case "national_head":
      return "national_head";
    case "rsh":
      return "rsh";
    case "service_partner":
      return "service_partner_name";
    case "ash":
      return "ash";
    default:
      return "ash";
  }
}

export function applyHierarchySelection(
  params: AnalyticsParams,
  level?: string | null,
  value?: string | null,
): AnalyticsParams {
  if (!level || !value) return params;
  const next = { ...params };
  if (level === "rsh") next.rsh = value;
  if (level === "service_partner") next.servicePartner = value;
  if (level === "ash") next.ash = value;
  return next;
}

export function nextHierarchyLevel(level?: string | null): HierarchyLevel | null {
  if (!level || level === "root") return "rsh";
  if (level === "rsh") return "service_partner";
  if (level === "service_partner") return "ash";
  return null;
}

export function matchesCallAgeRange(row: Record<string, unknown>, range?: string | null): boolean {
  if (!range || range === "all") return true;
  const age = rowAgeDays(row);
  const urgency = ageUrgency(age);
  if (range === "green") return urgency === "green";
  if (range === "orange") return urgency === "orange";
  if (range === "red") return urgency === "red";
  if (range === "older30") return age >= 30;
  if (range === "older60") return age >= 60;
  return true;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function urgencyScore(green: number, orange: number, red: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(((red * 3 + orange * 2 + green * 0.5) / total) * 33);
}

function performanceBadge(red: number, total: number): "Critical" | "High Risk" | "Watch" | "On Track" {
  if (total <= 0) return "On Track";
  const pct = (red / total) * 100;
  if (pct >= 50) return "Critical";
  if (pct >= 30) return "High Risk";
  if (pct >= 15) return "Watch";
  return "On Track";
}

function performanceScore(red: number, total: number): number {
  if (total <= 0) return 100;
  return Math.max(0, Math.round(100 - (red / total) * 100));
}

function bucketByCreatedDate(rows: Record<string, unknown>[], days: number): Array<{ label: string; count: number }> {
  const buckets = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const row of rows) {
    const created = parseDate(row.created_on);
    if (!created) continue;
    const key = created.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [...buckets.entries()].map(([label, count]) => ({ label, count }));
}

function bucketWeekly(rows: Record<string, unknown>[], weeks: number): Array<{ label: string; count: number }> {
  const buckets: Array<{ label: string; count: number; start: number }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(today);
    start.setDate(start.getDate() - i * 7);
    const label = `W${weeks - i}`;
    buckets.push({ label, count: 0, start: start.getTime() });
  }

  for (const row of rows) {
    const created = parseDate(row.created_on);
    if (!created) continue;
    const ts = created.getTime();
    for (let i = buckets.length - 1; i >= 0; i--) {
      const start = buckets[i]!.start;
      const end = i < buckets.length - 1 ? buckets[i + 1]!.start : Number.POSITIVE_INFINITY;
      if (ts >= start && ts < end) {
        buckets[i]!.count += 1;
        break;
      }
    }
  }

  return buckets.map(({ label, count }) => ({ label, count }));
}

function bucketMonthly(rows: Record<string, unknown>[], months: number): Array<{ label: string; count: number }> {
  const buckets = new Map<string, number>();
  const today = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    buckets.set(label, 0);
  }

  for (const row of rows) {
    const created = parseDate(row.created_on);
    if (!created) continue;
    const label = created.toLocaleString("en-US", { month: "short", year: "2-digit" });
    if (buckets.has(label)) buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }

  return [...buckets.entries()].map(([label, count]) => ({ label, count }));
}

function sparklineForUrgency(
  rows: Record<string, unknown>[],
  urgency: AgeUrgency,
  asOf: Date,
  days = 7,
): number[] {
  const end = new Date(asOf);
  end.setHours(0, 0, 0, 0);
  const counts = Array(days).fill(0);

  for (const row of rows) {
    if (ageUrgency(rowAgeDays(row)) !== urgency) continue;
    const created = parseDate(row.created_on);
    if (!created) continue;
    const diff = Math.floor((end.getTime() - created.getTime()) / 86_400_000);
    if (diff >= 0 && diff < days) counts[days - 1 - diff] += 1;
  }

  return counts;
}

function trendPct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function summarizeCallAgeDashboard(rows: Record<string, unknown>[]) {
  const dataAsOf = dataAsOfFromRows(rows);
  const ages = rows.map((r) => rowAgeDays(r));
  const total = rows.length;
  const green = rows.filter((r) => ageUrgency(rowAgeDays(r)) === "green").length;
  const orange = rows.filter((r) => ageUrgency(rowAgeDays(r)) === "orange").length;
  const red = rows.filter((r) => ageUrgency(rowAgeDays(r)) === "red").length;
  const oldest = ages.length ? Math.max(...ages) : 0;
  const avgAge = ages.length ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : 0;
  const medianAge = Math.round(median(ages));
  const slaCompliance = total > 0 ? Math.round((green / total) * 100) : 0;
  const urgencyPct = total > 0 ? Math.round((red / total) * 100) : 0;

  const dailyTrend = bucketByCreatedDate(rows, 14);
  const weeklyTrend = bucketWeekly(rows, 8);
  const monthlyTrend = bucketMonthly(rows, 6);
  const yesterdayCount = dailyTrend.length >= 2 ? dailyTrend[dailyTrend.length - 2]!.count : 0;
  const todayCount = dailyTrend.length >= 1 ? dailyTrend[dailyTrend.length - 1]!.count : 0;

  const regionMap = new Map<
    string,
    {
      region: string;
      green: number;
      orange: number;
      red: number;
      total: number;
      ageSum: number;
      maxAge: number;
      managers: Map<string, number>;
    }
  >();
  const rshMap = new Map<
    string,
    { rsh: string; green: number; orange: number; red: number; total: number; ageSum: number; maxAge: number }
  >();
  const ashMap = new Map<
    string,
    { ash: string; green: number; orange: number; red: number; total: number; ageSum: number; maxAge: number }
  >();
  const partnerMap = new Map<
    string,
    {
      servicePartner: string;
      green: number;
      orange: number;
      red: number;
      total: number;
      ageSum: number;
      maxAge: number;
      rshSet: Set<string>;
    }
  >();
  const productMap = new Map<string, number>();

  for (const row of rows) {
    const region = resolveRegion(row);
    const rsh = String(row.rsh ?? "Unassigned").trim() || "Unassigned";
    const manager = String(row.ash ?? "Unassigned").trim() || "Unassigned";
    const servicePartner = String(row.service_partner_name ?? "Unassigned").trim() || "Unassigned";
    const product = String(row.product ?? "Unknown").trim() || "Unknown";
    const age = rowAgeDays(row);
    const urgency = ageUrgency(age);

    productMap.set(product, (productMap.get(product) ?? 0) + 1);

    const r = regionMap.get(region) ?? {
      region,
      green: 0,
      orange: 0,
      red: 0,
      total: 0,
      ageSum: 0,
      maxAge: 0,
      managers: new Map<string, number>(),
    };
    r[urgency] += 1;
    r.total += 1;
    r.ageSum += age;
    r.maxAge = Math.max(r.maxAge, age);
    r.managers.set(manager, (r.managers.get(manager) ?? 0) + 1);
    regionMap.set(region, r);

    const h = rshMap.get(rsh) ?? { rsh, green: 0, orange: 0, red: 0, total: 0, ageSum: 0, maxAge: 0 };
    h[urgency] += 1;
    h.total += 1;
    h.ageSum += age;
    h.maxAge = Math.max(h.maxAge, age);
    rshMap.set(rsh, h);

    const a = ashMap.get(manager) ?? { ash: manager, green: 0, orange: 0, red: 0, total: 0, ageSum: 0, maxAge: 0 };
    a[urgency] += 1;
    a.total += 1;
    a.ageSum += age;
    a.maxAge = Math.max(a.maxAge, age);
    ashMap.set(manager, a);

    const p = partnerMap.get(servicePartner) ?? {
      servicePartner,
      green: 0,
      orange: 0,
      red: 0,
      total: 0,
      ageSum: 0,
      maxAge: 0,
      rshSet: new Set<string>(),
    };
    p[urgency] += 1;
    p.total += 1;
    p.ageSum += age;
    p.maxAge = Math.max(p.maxAge, age);
    if (rsh !== "Unassigned") p.rshSet.add(rsh);
    partnerMap.set(servicePartner, p);
  }

  const topRiskRegions = [...regionMap.values()]
    .map((r) => ({
      region: r.region,
      green: r.green,
      orange: r.orange,
      red: r.red,
      total: r.total,
      avgAge: r.total > 0 ? Math.round(r.ageSum / r.total) : 0,
      oldestTicket: r.maxAge,
      urgencyScore: urgencyScore(r.green, r.orange, r.red, r.total),
      overduePct: r.total > 0 ? Math.round((r.red / r.total) * 100) : 0,
      reportingManagers: [...r.managers.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name),
    }))
    .sort((a, b) => b.red - a.red || b.urgencyScore - a.urgencyScore)
    .map((row, i) => ({ rank: i + 1, ...row }));

  const topRshWorkload = [...rshMap.values()]
    .map((r) => ({
      rsh: r.rsh,
      totalCalls: r.total,
      urgentCalls: r.red,
      avgAge: r.total > 0 ? Math.round(r.ageSum / r.total) : 0,
      oldestTicket: r.maxAge,
      performanceScore: performanceScore(r.red, r.total),
      withinFiveDaysPct: performanceScore(r.red, r.total),
      badge: performanceBadge(r.red, r.total),
    }))
    .sort((a, b) => b.urgentCalls - a.urgentCalls || a.performanceScore - b.performanceScore);

  const topAshWorkload = [...ashMap.values()]
    .map((a) => ({
      ash: a.ash,
      totalCalls: a.total,
      urgentCalls: a.red,
      avgAge: a.total > 0 ? Math.round(a.ageSum / a.total) : 0,
      oldestTicket: a.maxAge,
      performanceScore: performanceScore(a.red, a.total),
      withinFiveDaysPct: performanceScore(a.red, a.total),
      badge: performanceBadge(a.red, a.total),
    }))
    .sort((a, b) => b.urgentCalls - a.urgentCalls || a.performanceScore - b.performanceScore);

  const topServicePartnersAtRisk = [...partnerMap.values()]
    .map((p) => ({
      servicePartner: p.servicePartner,
      rshList: [...p.rshSet].sort((a, b) => a.localeCompare(b)),
      green: p.green,
      orange: p.orange,
      red: p.red,
      total: p.total,
      avgAge: p.total > 0 ? Math.round(p.ageSum / p.total) : 0,
      oldestTicket: p.maxAge,
      overduePct: p.total > 0 ? Math.round((p.red / p.total) * 100) : 0,
    }))
    .sort((a, b) => b.red - a.red || b.overduePct - a.overduePct)
    .map((row, i) => ({ rank: i + 1, ...row }));

  const criticalTickets = [...rows]
    .map((row) => {
      const age = rowAgeDays(row);
      const level = ageUrgency(age);
      let priority = "5-30 Days";
      if (age > 60) priority = ">60 Days";
      else if (age > 30) priority = "30-60 Days";
      return {
        ticket_id: row.ticket_id,
        region: resolveRegion(row),
        reporting_manager: row.ash,
        ticket_status: row.ticket_status,
        product: row.product,
        age_days: age,
        priority,
        created_on: row.created_on,
        urgency_tone: level,
      };
    })
    .sort((a, b) => Number(b.age_days) - Number(a.age_days))
    .slice(0, 25);

  const topRegion = topRiskRegions[0];
  const topRsh = topRshWorkload[0];
  const overdue30 = rows.filter((r) => rowAgeDays(r) >= 30).length;

  const executiveSummary = [
    `There are ${total.toLocaleString()} open calls.`,
    red > 0
      ? `${red.toLocaleString()} (${urgencyPct}%) are overdue (>5 days).`
      : "No calls are currently in the urgent red bucket.",
    topRegion
      ? `Most backlog is concentrated in ${topRegion.region}.`
      : null,
    topRsh
      ? `${topRsh.rsh} currently owns the highest urgent workload (${topRsh.urgentCalls} urgent calls).`
      : null,
    oldest > 0
      ? `The oldest unresolved ticket is ${oldest} days old.`
      : null,
    topRiskRegions.length >= 3
      ? "Immediate focus on the top regions and RSHs could significantly reduce pending calls."
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const recommendedActions: Array<{ id: string; tone: "warning" | "info" | "critical"; message: string }> = [];
  if (red > 0) {
    recommendedActions.push({
      id: "close-overdue",
      tone: "critical",
      message: `Close ${red.toLocaleString()} overdue tickets (>5 days)`,
    });
  }
  if (overdue30 > 0) {
    recommendedActions.push({
      id: "escalate-30",
      tone: "warning",
      message: `Escalate ${overdue30.toLocaleString()} tickets older than 30 days`,
    });
  }
  if (topRsh) {
    recommendedActions.push({
      id: "review-rsh",
      tone: "warning",
      message: `Review ${topRsh.rsh} workload (${topRsh.urgentCalls} urgent)`,
    });
  }
  for (const region of topRiskRegions.slice(0, 3)) {
    if (region.red > 0) {
      recommendedActions.push({
        id: `region-${region.region}`,
        tone: "info",
        message: `${region.region} requires attention — ${region.red} urgent calls`,
      });
    }
  }

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return {
    totalTickets: total,
    /** Snapshot end date used for age buckets (max Created On in the upload). */
    dataAsOf: formatDataAsOf(dataAsOf),
    ageMix: ageBreakdown(rows),
    kpis: {
      total: {
        value: total,
        pct: 100,
        trendPct: trendPct(todayCount, yesterdayCount),
        sparkline: dailyTrend.slice(-7).map((d) => d.count),
      },
      green: {
        value: green,
        pct: pct(green),
        trendPct: null,
        sparkline: sparklineForUrgency(rows, "green", dataAsOf),
      },
      orange: {
        value: orange,
        pct: pct(orange),
        trendPct: null,
        sparkline: sparklineForUrgency(rows, "orange", dataAsOf),
      },
      red: {
        value: red,
        pct: pct(red),
        trendPct: null,
        sparkline: sparklineForUrgency(rows, "red", dataAsOf),
      },
    },
    stats: {
      avgAge,
      medianAge,
      oldestTicket: oldest,
      slaCompliance,
      urgencyPct,
    },
    executiveSummary,
    topRiskRegions,
    topRshWorkload,
    topAshWorkload,
    topServicePartnersAtRisk,
    criticalTickets,
    recommendedActions,
    byProduct: [...productMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    byRegionAge: groupAgeByRegion(rows, 20),
    byRshAge: groupAgeByField(rows, "rsh", "Unassigned", 9999),
    byAshAge: groupAgeByField(rows, "ash", "Unassigned", 9999),
    trends: {
      daily: dailyTrend,
      weekly: weeklyTrend,
      monthly: monthlyTrend,
    },
  };
}

function closureTatMinutes(row: Record<string, unknown>): number | null {
  const supplied = Number(row.tat_minutes);
  if (Number.isFinite(supplied) && supplied >= 0) return supplied;
  const calculatedHours = hoursBetween(row.created_on, row.closed_date);
  return calculatedHours == null ? null : calculatedHours * 60;
}

function closureBreakdown(
  rows: Record<string, unknown>[],
  valueFor: (row: Record<string, unknown>) => unknown,
  limit = 8,
) {
  const groups = new Map<string, { count: number; tatTotal: number; tatCount: number; within24: number }>();
  for (const row of rows) {
    const label = String(valueFor(row) ?? "").trim() || "Not recorded";
    const tat = closureTatMinutes(row);
    const current = groups.get(label) ?? { count: 0, tatTotal: 0, tatCount: 0, within24: 0 };
    current.count += 1;
    if (tat != null) {
      current.tatTotal += tat;
      current.tatCount += 1;
      if (tat <= 1_440) current.within24 += 1;
    }
    groups.set(label, current);
  }
  return [...groups.entries()]
    .map(([label, value]) => ({
      label,
      count: value.count,
      pct: rows.length > 0 ? Math.round((value.count / rows.length) * 100) : 0,
      avgTatHours: value.tatCount > 0 ? Math.round(value.tatTotal / value.tatCount / 60) : null,
      within24Pct: value.tatCount > 0 ? Math.round((value.within24 / value.tatCount) * 100) : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

const CALL_TYPE_AGE_BUCKETS = [
  { key: "0-24", label: "00–24 Hrs", min: 0, max: 24 },
  { key: "24-48", label: "24–48 Hrs", min: 24.0001, max: 48 },
  { key: "48-96", label: "48–96 Hrs", min: 48.0001, max: 96 },
  { key: "96+", label: ">96 Hrs", min: 96.0001, max: Infinity },
];

/** Tickets that needed a dispatched part (linked MRF) vs. tickets resolved without one. */
function callTypeForRow(row: Record<string, unknown>): "Part Tickets" | "Non Part Tickets" {
  const mrfApproval = String(row.mrf_approval ?? "").trim();
  return mrfApproval && mrfApproval !== "No MRF" ? "Part Tickets" : "Non Part Tickets";
}

/**
 * Call Type × Customer Type × Age-in-hours matrix, with count and percentage
 * per cell. When a Customer Name filter is active, this pivots to
 * Customer Name × Call Type instead, so the same table shows a per-customer
 * breakdown.
 */
function buildCallTypeAgeMatrix(rows: Record<string, unknown>[], groupByCustomerName: boolean) {
  const total = rows.length;
  const structure = new Map<string, Map<string, Map<string, number>>>();

  for (const row of rows) {
    const callType = callTypeForRow(row);
    const groupLabel = groupByCustomerName
      ? String(row.customer_name ?? "Not Recorded").trim() || "Not Recorded"
      : String(row.customer_type ?? "Not Recorded").trim() || "Not Recorded";
    const tatMinutes = closureTatMinutes(row);
    const hours = tatMinutes != null ? tatMinutes / 60 : null;
    const bucket = hours == null ? null : CALL_TYPE_AGE_BUCKETS.find((b) => hours >= b.min && hours <= b.max);
    if (!bucket) continue;

    const outerKey = groupByCustomerName ? groupLabel : callType;
    const innerKey = groupByCustomerName ? callType : groupLabel;
    if (!structure.has(outerKey)) structure.set(outerKey, new Map());
    const inner = structure.get(outerKey)!;
    if (!inner.has(innerKey)) inner.set(innerKey, new Map());
    const byBucket = inner.get(innerKey)!;
    byBucket.set(bucket.key, (byBucket.get(bucket.key) ?? 0) + 1);
  }

  const matrixRows = [];
  for (const [outerKey, inner] of structure.entries()) {
    for (const [innerKey, byBucket] of inner.entries()) {
      const cells = CALL_TYPE_AGE_BUCKETS.map((b) => {
        const count = byBucket.get(b.key) ?? 0;
        return {
          bucket: b.label,
          count,
          pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        };
      });
      const rowTotal = cells.reduce((sum, c) => sum + c.count, 0);
      const callType = groupByCustomerName ? innerKey : outerKey;
      const groupLabel = groupByCustomerName ? outerKey : innerKey;
      matrixRows.push({ callType, groupLabel, cells, total: rowTotal });
    }
  }
  matrixRows.sort((a, b) => a.callType.localeCompare(b.callType) || b.total - a.total);

  return {
    groupBy: groupByCustomerName ? ("customerName" as const) : ("customerType" as const),
    buckets: CALL_TYPE_AGE_BUCKETS.map((b) => b.label),
    rows: matrixRows,
    grandTotal: total,
  };
}

export function summarizeClosureDashboard(rows: Record<string, unknown>[], params: AnalyticsParams = {}) {
  const total = rows.length;
  const tatValues = rows
    .map(closureTatMinutes)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const avgTatHours =
    tatValues.length > 0 ? Math.round(tatValues.reduce((sum, value) => sum + value, 0) / tatValues.length / 60) : 0;
  const medianTatHours = tatValues.length > 0 ? Math.round(median(tatValues) / 60) : 0;
  const within24 = tatValues.filter((value) => value <= 1_440).length;
  const within24Pct = tatValues.length > 0 ? Math.round((within24 / tatValues.length) * 100) : 0;
  const mrfApproved = rows.filter((row) => row.mrf_approval === "Approved").length;
  const mrfPending = rows.filter((row) => row.mrf_approval === "Pending").length;
  const today = new Date();
  const closedToday = rows.filter((row) => {
    const closed = parseDate(row.closed_date);
    return (
      closed != null &&
      closed.getFullYear() === today.getFullYear() &&
      closed.getMonth() === today.getMonth() &&
      closed.getDate() === today.getDate()
    );
  }).length;

  const tatBuckets = [
    { label: "Within 24 hours", min: 0, max: 1_440, color: "#16A34A" },
    { label: "24–48 hours", min: 1_440.0001, max: 2_880, color: "#F59E0B" },
    { label: "48–72 hours", min: 2_880.0001, max: 4_320, color: "#F97316" },
    { label: "More than 72 hours", min: 4_320.0001, max: Infinity, color: "#DC2626" },
  ].map((bucket) => ({
    label: bucket.label,
    count: tatValues.filter((value) => value >= bucket.min && value <= bucket.max).length,
    color: bucket.color,
  }));

  const uniqueCount = (valueFor: (row: Record<string, unknown>) => unknown) =>
    new Set(rows.map((row) => String(valueFor(row) ?? "").trim()).filter(Boolean)).size;

  return {
    refreshedAt: new Date().toISOString(),
    totalClosed: total,
    kpis: {
      totalClosed: total,
      closedToday,
      avgTatHours,
      medianTatHours,
      within24Pct,
      mrfApproved,
      mrfPending,
    },
    tatBuckets,
    closureTypes: closureBreakdown(rows, (row) => row.closure_type),
    products: closureBreakdown(rows, (row) => row.product),
    allProducts: closureBreakdown(rows, (row) => row.product, 9999),
    callTypeAgeMatrix: buildCallTypeAgeMatrix(rows, Boolean(params.customerName)),
    customerCategories: closureBreakdown(rows, (row) => row.customer_category),
    regions: closureBreakdown(rows, resolveRegion),
    servicePartners: closureBreakdown(rows, (row) => row.service_partner_name, 12),
    reportingManagers: closureBreakdown(rows, (row) => row.ash, 12),
    warranty: closureBreakdown(rows, (row) => row.support_type),
    closedBy: closureBreakdown(rows, (row) => row.ticket_closed_by),
    mrfApproval: closureBreakdown(rows, (row) => row.mrf_approval),
    dataCoverage: {
      closedCalls: total,
      servicePartners: uniqueCount((row) => row.service_partner_name),
      regions: uniqueCount(resolveRegion),
      products: uniqueCount((row) => row.product),
      customers: uniqueCount((row) => row.customer_name),
      customerCategories: uniqueCount((row) => row.customer_category),
      closureTypes: uniqueCount((row) => row.closure_type),
      closedBy: uniqueCount((row) => row.ticket_closed_by),
    },
  };
}

type OpsBucket = {
  assigned: number;
  wip: number;
  mrf: number;
  other: number;
  technicianAccepted: number;
  total: number;
  ageSum: number;
  critical: number;
  assignedAgeSum: number;
  wipAgeSum: number;
  mrfAgeSum: number;
  techAcceptedAgeSum: number;
};

function emptyOpsBucket(): OpsBucket {
  return {
    assigned: 0,
    wip: 0,
    mrf: 0,
    other: 0,
    technicianAccepted: 0,
    total: 0,
    ageSum: 0,
    critical: 0,
    assignedAgeSum: 0,
    wipAgeSum: 0,
    mrfAgeSum: 0,
    techAcceptedAgeSum: 0,
  };
}

function mergeOps(target: OpsBucket, source: OpsBucket) {
  target.assigned += source.assigned;
  target.wip += source.wip;
  target.mrf += source.mrf;
  target.other += source.other;
  target.technicianAccepted += source.technicianAccepted;
  target.total += source.total;
  target.ageSum += source.ageSum;
  target.critical += source.critical;
  target.assignedAgeSum += source.assignedAgeSum;
  target.wipAgeSum += source.wipAgeSum;
  target.mrfAgeSum += source.mrfAgeSum;
  target.techAcceptedAgeSum += source.techAcceptedAgeSum;
}

function accumulateOps(bucket: OpsBucket, row: Record<string, unknown>) {
  const age = rowAgeDays(row);
  const status = bucketStatus(row);
  if (status === "Assigned") {
    bucket.assigned += 1;
    bucket.assignedAgeSum += age;
  } else if (status === "WIP") {
    bucket.wip += 1;
    bucket.wipAgeSum += age;
  } else if (status === "MRF") {
    bucket.mrf += 1;
    bucket.mrfAgeSum += age;
  } else bucket.other += 1;
  if (isTechnicianAccepted(row)) {
    bucket.technicianAccepted += 1;
    bucket.techAcceptedAgeSum += age;
  }
  bucket.total += 1;
  bucket.ageSum += age;
  if (ageUrgency(age) === "red") bucket.critical += 1;
}

function avgStageDays(sum: number, count: number): number {
  return count > 0 ? Math.round(sum / count) : 0;
}

function opsHealth(mrf: number, total: number, openCalls: number): "Excellent" | "Good" | "Watch" | "Critical" {
  if (total <= 0) return "Excellent";
  const mrfPct = (mrf / total) * 100;
  if (mrfPct >= 40 || openCalls >= 80) return "Critical";
  if (mrfPct >= 25 || openCalls >= 50) return "Watch";
  if (mrfPct >= 12 || openCalls >= 25) return "Good";
  return "Excellent";
}

function isToday(value: unknown): boolean {
  const d = parseDate(value);
  if (!d) return false;
  return d.toDateString() === new Date().toDateString();
}

function workloadScore(openCalls: number, critical: number, mrf: number): number {
  return Math.round(openCalls + critical * 2 + mrf * 1.5);
}

function opsNode(
  level: "service_partner" | "ash" | "rsh" | "national_head",
  label: string,
  stats: OpsBucket,
  children: Array<ReturnType<typeof opsNode>> = [],
) {
  return {
    id: `${level}:${label}`,
    level,
    label,
    openCalls: stats.total,
    assigned: stats.assigned,
    wip: stats.wip,
    mrf: stats.mrf,
    avgAge: stats.total > 0 ? Math.round(stats.ageSum / stats.total) : 0,
    critical: stats.critical,
    health: opsHealth(stats.mrf, stats.total, stats.total),
    children,
  };
}

function kpiTrendLabel(value: number, baseline: number): string {
  const diff = value - baseline;
  if (diff === 0) return "Same as yesterday";
  return diff > 0 ? `${diff} more than yesterday` : `${Math.abs(diff)} fewer than yesterday`;
}

type OperationalReasonItem = {
  reason: string;
  count: number;
  pct: number;
  avgAge: number;
  critical: number;
};

function cleanReason(value: unknown): string | null {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'.\s]+|["'.\s]+$/g, "");
  if (!text || text === "-" || text.toLowerCase() === "n/a") return null;
  return text.length > 90 ? `${text.slice(0, 87)}...` : text;
}

export function operationalReasonForRow(row: Record<string, unknown>, status: "WIP" | "MRF"): string {
  const rawStage = String(row.wip_sub_stage ?? "");
  const state = cleanReason(rawStage.match(/State\s*-\s*"([^"]+)"/i)?.[1]);
  const comment = cleanReason(rawStage.match(/Comments?\s*-\s*(.*)$/i)?.[1]);
  const lastAction = cleanReason(row.last_action);
  const components = cleanReason(row.components);
  const stage = cleanReason(rawStage);

  if (status === "MRF") {
    return comment ?? state ?? components ?? lastAction ?? stage ?? "Reason not provided";
  }
  return state ?? lastAction ?? stage ?? "Reason not provided";
}

function operationalReasonBreakdown(
  rows: Record<string, unknown>[],
  status: "WIP" | "MRF",
): { total: number; missingReasonCount: number; items: OperationalReasonItem[] } {
  const scoped = rows.filter((row) => bucketStatus(row) === status);
  const grouped = new Map<string, { count: number; ageSum: number; critical: number }>();

  for (const row of scoped) {
    const reason = operationalReasonForRow(row, status);
    const age = rowAgeDays(row);
    const current = grouped.get(reason) ?? { count: 0, ageSum: 0, critical: 0 };
    current.count += 1;
    current.ageSum += age;
    if (ageUrgency(age) === "red") current.critical += 1;
    grouped.set(reason, current);
  }

  const allItems = [...grouped.entries()]
    .map(([reason, value]) => ({
      reason,
      count: value.count,
      pct: scoped.length > 0 ? Math.round((value.count / scoped.length) * 100) : 0,
      avgAge: value.count > 0 ? Math.round(value.ageSum / value.count) : 0,
      critical: value.critical,
    }))
    .sort((a, b) => b.count - a.count || b.critical - a.critical);

  const visible = allItems.slice(0, 6);
  const remainder = allItems.slice(6);
  if (remainder.length > 0) {
    const count = remainder.reduce((sum, item) => sum + item.count, 0);
    const weightedAge = remainder.reduce((sum, item) => sum + item.avgAge * item.count, 0);
    visible.push({
      reason: "Other recorded reasons",
      count,
      pct: scoped.length > 0 ? Math.round((count / scoped.length) * 100) : 0,
      avgAge: count > 0 ? Math.round(weightedAge / count) : 0,
      critical: remainder.reduce((sum, item) => sum + item.critical, 0),
    });
  }

  return {
    total: scoped.length,
    missingReasonCount: grouped.get("Reason not provided")?.count ?? 0,
    items: visible,
  };
}

export function summarizeLiveOperationsDashboard(
  activeRows: Record<string, unknown>[],
  closedRows: Record<string, unknown>[] = [],
) {
  // Ages already stamped in fetchActive against the full extract; keep that basis.
  dataAsOfFromRows(activeRows);
  const total = activeRows.length;
  const root = emptyOpsBucket();
  for (const row of activeRows) accumulateOps(root, row);

  const assigned = root.assigned;
  const wip = root.wip;
  const mrf = root.mrf;
  const other = root.other;
  const technicianAccepted = root.technicianAccepted;
  const completedToday = closedRows.filter((r) => isToday(r.closed_date)).length;
  const slaPct = total > 0 ? Math.round(((assigned + wip) / total) * 100) : 0;
  const operationalReasons = {
    wip: operationalReasonBreakdown(activeRows, "WIP"),
    mrf: operationalReasonBreakdown(activeRows, "MRF"),
  };
  const uniqueCount = (valueFor: (row: Record<string, unknown>) => unknown) =>
    new Set(
      activeRows
        .map((row) => String(valueFor(row) ?? "").trim())
        .filter(Boolean),
    ).size;
  const dataCoverage = {
    activeCalls: total,
    servicePartners: uniqueCount((row) => row.service_partner_name),
    regions: uniqueCount(resolveRegion),
    products: uniqueCount((row) => row.product),
    customerCategories: uniqueCount((row) => row.customer_category),
    customers: uniqueCount((row) => row.customer_name),
    ticketTypes: uniqueCount((row) => row.ticket_type),
    problemDescriptions: uniqueCount((row) => row.problem_description),
    priorities: uniqueCount((row) => row.ticket_priority),
    statuses: uniqueCount((row) => row.ticket_status),
    wipStages: uniqueCount((row) => row.wip_sub_stage),
    lastActions: uniqueCount((row) => row.last_action),
    warrantyTypes: uniqueCount((row) => row.support_type),
    mrfApprovals: uniqueCount((row) => row.mrf_approval),
  };

  const dailyTrend = bucketByCreatedDate(activeRows, 14);
  const yesterdayCount = dailyTrend.length >= 2 ? dailyTrend[dailyTrend.length - 2]!.count : 0;
  const todayCount = dailyTrend.length >= 1 ? dailyTrend[dailyTrend.length - 1]!.count : 0;
  const sparkline = dailyTrend.slice(-7).map((d) => d.count);

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const workloadOverview = [
    { label: "Assigned", count: assigned, pct: pct(assigned), color: "#2563EB" },
    { label: "WIP", count: wip, pct: pct(wip), color: "#F59E0B" },
    { label: "MRF Pending", count: mrf, pct: pct(mrf), color: "#8B5CF6" },
    ...(other > 0 ? [{ label: "Other", count: other, pct: pct(other), color: "#64748B" }] : []),
  ];

  type PartnerAgg = OpsBucket & {
    label: string;
    managers: Set<string>;
    rshSet: Set<string>;
    regions: Set<string>;
    products: Set<string>;
    tickets: Array<{
      ticketId: string;
      status: string;
      product: string;
      age: number;
      timestamp: unknown;
    }>;
  };
  const partnerMap = new Map<string, PartnerAgg>();
  const managerMap = new Map<string, OpsBucket & { label: string; partners: Set<string> }>();
  const rshMap = new Map<string, OpsBucket & { label: string; regions: Set<string>; partners: Set<string> }>();
  const productMap = new Map<string, OpsBucket & { label: string }>();
  const regionMap = new Map<string, OpsBucket & { label: string }>();
  const hierarchyMap = new Map<
    string,
    { partner: string; manager: string; rsh: string; nationalHead: string; stats: OpsBucket }
  >();

  for (const row of activeRows) {
    const partner = String(row.service_partner_name ?? "Unassigned").trim() || "Unassigned";
    const manager = String(row.ash ?? "Unassigned").trim() || "Unassigned";
    const rsh = String(row.rsh ?? "Unassigned").trim() || "Unassigned";
    const nationalHead = String(row.national_head ?? "Unassigned").trim() || "Unassigned";
    const product = String(row.product ?? "Unknown").trim() || "Unknown";
    const region = resolveRegion(row);
    const age = rowAgeDays(row);

    const p =
      partnerMap.get(partner) ??
      {
        ...emptyOpsBucket(),
        label: partner,
        managers: new Set(),
        rshSet: new Set(),
        regions: new Set(),
        products: new Set(),
        tickets: [],
      };
    accumulateOps(p, row);
    p.managers.add(manager);
    p.rshSet.add(rsh);
    p.regions.add(region);
    p.products.add(product);
    p.tickets.push({
      ticketId: String(row.ticket_id ?? "—"),
      status: String(row.ticket_status ?? "—"),
      product,
      age,
      timestamp: row.created_on,
    });
    partnerMap.set(partner, p);

    const m = managerMap.get(manager) ?? { ...emptyOpsBucket(), label: manager, partners: new Set<string>() };
    accumulateOps(m, row);
    m.partners.add(partner);
    managerMap.set(manager, m);

    const h = rshMap.get(rsh) ?? { ...emptyOpsBucket(), label: rsh, regions: new Set(), partners: new Set() };
    accumulateOps(h, row);
    h.regions.add(region);
    h.partners.add(partner);
    rshMap.set(rsh, h);

    const prod = productMap.get(product) ?? { ...emptyOpsBucket(), label: product };
    accumulateOps(prod, row);
    productMap.set(product, prod);

    const reg = regionMap.get(region) ?? { ...emptyOpsBucket(), label: region };
    accumulateOps(reg, row);
    regionMap.set(region, reg);

    const hKey = `${partner}|||${manager}|||${rsh}|||${nationalHead}`;
    const node = hierarchyMap.get(hKey) ?? { partner, manager, rsh, nationalHead, stats: emptyOpsBucket() };
    accumulateOps(node.stats, row);
    hierarchyMap.set(hKey, node);
  }

  const topServicePartners = [...partnerMap.values()]
    .sort((a, b) => b.total - a.total)
    .map((p, i) => {
      const oldestTicket = p.tickets.reduce((max, t) => Math.max(max, t.age), 0);
      const recentTickets = [...p.tickets]
        .sort((a, b) => {
          const da = parseDate(a.timestamp);
          const db = parseDate(b.timestamp);
          return (db?.getTime() ?? 0) - (da?.getTime() ?? 0);
        })
        .slice(0, 5);
      return {
        rank: i + 1,
        servicePartner: p.label,
        openCalls: p.total,
        assigned: p.assigned,
        wip: p.wip,
        mrf: p.mrf,
        critical: p.critical,
        avgAge: p.total > 0 ? Math.round(p.ageSum / p.total) : 0,
        oldestTicket,
        reportingManager: [...p.managers][0] ?? "—",
        reportingManagers: [...p.managers],
        rsh: [...p.rshSet][0] ?? "—",
        rshList: [...p.rshSet],
        region: [...p.regions][0] ?? "—",
        regions: [...p.regions],
        products: [...p.products].slice(0, 8),
        recentTickets,
        health: opsHealth(p.mrf, p.total, p.total),
      };
    });

  const avgPerManager = managerMap.size > 0 ? total / managerMap.size : 1;
  const reportingManagers = [...managerMap.values()]
    .map((m) => ({
      name: m.label,
      totalCalls: m.total,
      partnersManaged: m.partners.size,
      openCalls: m.total,
      criticalCalls: m.critical,
      avgAge: m.total > 0 ? Math.round(m.ageSum / m.total) : 0,
      utilizationPct: Math.min(200, Math.round((m.total / avgPerManager) * 100)),
      assigned: m.assigned,
      wip: m.wip,
      mrf: m.mrf,
    }))
    .sort((a, b) => b.openCalls - a.openCalls);

  const rshLeaderboard = [...rshMap.values()]
    .sort((a, b) => workloadScore(b.total, b.critical, b.mrf) - workloadScore(a.total, a.critical, a.mrf))
    .map((r, i) => ({
      rank: i + 1,
      rsh: r.label,
      regions: r.regions.size,
      partners: r.partners.size,
      openCalls: r.total,
      critical: r.critical,
      sla: r.total > 0 ? Math.round(((r.assigned + r.wip) / r.total) * 100) : 100,
      workloadScore: workloadScore(r.total, r.critical, r.mrf),
    }));

  const productInsights = [...productMap.values()]
    .map((p) => ({
      product: p.label,
      openCalls: p.total,
      assigned: p.assigned,
      wip: p.wip,
      mrf: p.mrf,
      failurePct: p.total > 0 ? Math.round((p.critical / p.total) * 100) : 0,
      avgAge: p.total > 0 ? Math.round(p.ageSum / p.total) : 0,
    }))
    .sort((a, b) => b.openCalls - a.openCalls)
    .slice(0, 12);

  const maxRegionLoad = Math.max(1, ...[...regionMap.values()].map((r) => r.total));
  const regionalHeatmap = [...regionMap.values()]
    .map((r) => ({
      region: r.label,
      openCalls: r.total,
      assigned: r.assigned,
      wip: r.wip,
      mrf: r.mrf,
      intensity: Math.round((r.total / maxRegionLoad) * 100),
    }))
    .sort((a, b) => b.openCalls - a.openCalls);

  const treeMap = new Map<string, Map<string, Map<string, Map<string, OpsBucket>>>>();
  for (const { partner, manager, rsh, nationalHead, stats } of hierarchyMap.values()) {
    if (!treeMap.has(partner)) treeMap.set(partner, new Map());
    const mMap = treeMap.get(partner)!;
    if (!mMap.has(manager)) mMap.set(manager, new Map());
    const rMap = mMap.get(manager)!;
    if (!rMap.has(rsh)) rMap.set(rsh, new Map());
    rMap.get(rsh)!.set(nationalHead, stats);
  }

  const hierarchy = [...treeMap.entries()]
    .map(([partner, managers]) => {
      const partnerStats = emptyOpsBucket();
      const managerChildren = [...managers.entries()].map(([manager, rshs]) => {
        const managerStats = emptyOpsBucket();
        const rshChildren = [...rshs.entries()].map(([rsh, nationalHeads]) => {
          const rshStats = emptyOpsBucket();
          const nhChildren = [...nationalHeads.entries()].map(([nationalHead, stats]) => {
            mergeOps(rshStats, stats);
            return opsNode("national_head", nationalHead, stats);
          });
          mergeOps(managerStats, rshStats);
          return opsNode("rsh", rsh, rshStats, nhChildren);
        });
        mergeOps(partnerStats, managerStats);
        return opsNode("ash", manager, managerStats, rshChildren);
      });
      return opsNode("service_partner", partner, partnerStats, managerChildren);
    })
    .sort((a, b) => b.openCalls - a.openCalls);

  const activityFeedAll = [...activeRows]
    .sort((a, b) => {
      const da = parseDate(a.created_on);
      const db = parseDate(b.created_on);
      return (db?.getTime() ?? 0) - (da?.getTime() ?? 0);
    })
    .slice(0, 30)
    .map((row) => {
      const status = bucketStatus(row);
      const rawStatus = String(row.ticket_status ?? "").toLowerCase();
      const isCritical = ageUrgency(rowAgeDays(row)) === "red";
      let type = "Status Updated";
      if (isCritical) type = "Escalation Raised";
      else if (rawStatus.includes("close")) type = "Ticket Closed";
      else if (status === "Assigned") type = "Ticket Assigned";
      else if (status === "MRF") type = "MRF Requested";
      else if (isTechnicianAccepted(row)) type = "Technician Updated";
      else if (rawStatus.includes("partner")) type = "Partner Changed";
      else if (status === "WIP") type = "Technician Updated";
      return {
        id: String(row.ticket_id ?? Math.random()),
        type,
        ticketId: String(row.ticket_id ?? "—"),
        partner: String(row.service_partner_name ?? "—"),
        manager: String(row.ash ?? "—"),
        product: String(row.product ?? "—"),
        region: resolveRegion(row),
        timestamp: row.created_on,
      };
    });

  const activityFeed = activityFeedAll.slice(0, 8);

  const topPartner = topServicePartners[0];
  const topManager = reportingManagers[0];
  const topRegion = regionalHeatmap[0];
  const criticalPartners = topServicePartners.filter((p) => p.health === "Critical" || p.health === "Watch");
  const assignedPct = pct(assigned);
  const partnerSharePct = topPartner && total > 0 ? Math.round((topPartner.openCalls / total) * 100) : 0;
  const managerSharePct = topManager && total > 0 ? Math.round((topManager.openCalls / total) * 100) : 0;

  const executiveInsights = [
    { icon: "activity" as const, text: `${total.toLocaleString()} active service calls.` },
    { icon: "check" as const, text: `${assignedPct}% already assigned.` },
    topManager
      ? { icon: "user" as const, text: `${topManager.name} currently manages the highest workload.` }
      : { icon: "user" as const, text: "Workload is evenly distributed across managers." },
    criticalPartners[0]
      ? { icon: "alert" as const, text: `${criticalPartners[0].servicePartner} requires immediate attention.` }
      : { icon: "check" as const, text: "All service partners are operating within limits." },
  ];

  const executiveSummary = executiveInsights.map((i) => i.text).join(" ");

  const workPipeline = [
    {
      stage: "Open Calls",
      count: total,
      pct: 100,
      avgDays: total > 0 ? Math.round(root.ageSum / total) : 0,
      description: "All active calls in the current view",
    },
    {
      stage: "Assigned",
      count: assigned,
      pct: pct(assigned),
      avgDays: avgStageDays(root.assignedAgeSum, assigned),
      description: "Calls assigned awaiting technician action",
    },
    {
      stage: "Technician Accepted",
      count: technicianAccepted,
      pct: pct(technicianAccepted),
      avgDays: avgStageDays(root.techAcceptedAgeSum, technicianAccepted),
      description: "Technicians have accepted assigned calls",
    },
    {
      stage: "Work In Progress",
      count: wip,
      pct: pct(wip),
      avgDays: avgStageDays(root.wipAgeSum, wip),
      description: "Calls actively being serviced",
    },
    {
      stage: "Waiting Parts (MRF)",
      count: mrf,
      pct: pct(mrf),
      avgDays: avgStageDays(root.mrfAgeSum, mrf),
      description: "Calls blocked waiting on parts",
    },
    {
      stage: "Completed",
      count: completedToday,
      pct: total > 0 ? Math.round((completedToday / total) * 100) : 0,
      avgDays: 0,
      description: "Tickets closed today",
    },
  ];

  const smartInsights = [
    topManager
      ? { id: "manager-load", tone: "info" as const, message: `${topManager.name} manages ${managerSharePct}% of workload.` }
      : null,
    topRegion
      ? {
          id: "region-backlog",
          tone: topRegion.intensity >= 70 ? ("warning" as const) : ("info" as const),
          message: `${topRegion.region} has the highest regional backlog.`,
        }
      : null,
    mrf > 0
      ? {
          id: "mrf-level",
          tone: mrf >= assigned ? ("warning" as const) : ("info" as const),
          message:
            mrf >= assigned
              ? `MRF backlog is elevated with ${mrf} parts-pending calls.`
              : `MRF requests remain manageable at ${pct(mrf)}% of open calls.`,
        }
      : { id: "mrf-clear", tone: "info" as const, message: "No significant MRF backlog today." },
    {
      id: "avg-age",
      tone: root.total > 0 && root.ageSum / root.total > 5 ? ("warning" as const) : ("info" as const),
      message:
        root.total > 0
          ? `Average call age is ${Math.round(root.ageSum / root.total)} days across the network.`
          : "Average call age is healthy today.",
    },
    root.critical > 0
      ? { id: "critical", tone: "warning" as const, message: `${root.critical} critical tickets need escalation review.` }
      : { id: "critical-clear", tone: "info" as const, message: "Critical backlog is under control." },
  ].filter(Boolean) as Array<{ id: string; tone: "info" | "warning" | "critical"; message: string }>;

  const ageBucketDefs = [
    { label: "0-3 days", min: 0, max: 3 },
    { label: "4-5 days", min: 4, max: 5 },
    { label: "6-8 days", min: 6, max: 8 },
    { label: "9-15 days", min: 9, max: 15 },
    { label: "16+ days", min: 16, max: Infinity },
  ];
  const ageingBuckets = ageBucketDefs.map((b) => ({
    label: b.label,
    count: activeRows.filter((r) => {
      const age = rowAgeDays(r);
      return age >= b.min && age <= b.max;
    }).length,
  }));

  let longestAgeingTicket: {
    ticketId: string;
    days: number;
    manager: string;
    partner: string;
    region: string;
  } | null = null;
  for (const row of activeRows) {
    const age = rowAgeDays(row);
    if (!longestAgeingTicket || age > longestAgeingTicket.days) {
      longestAgeingTicket = {
        ticketId: String(row.ticket_id ?? "—"),
        days: age,
        manager: String(row.ash ?? "—"),
        partner: String(row.service_partner_name ?? "—"),
        region: resolveRegion(row),
      };
    }
  }

  const warrantyCounts = { in: 0, out: 0, other: 0 };
  for (const row of activeRows) {
    const cls = classifyWarranty(row.support_type);
    if (cls === "in") warrantyCounts.in += 1;
    else if (cls === "out") warrantyCounts.out += 1;
    else warrantyCounts.other += 1;
  }
  const warrantyBreakdown = [
    { label: "In Warranty", count: warrantyCounts.in, color: "#16A34A" },
    { label: "Out of Warranty", count: warrantyCounts.out, color: "#F59E0B" },
    { label: "Other / Unverified", count: warrantyCounts.other, color: "#94A3B8" },
  ].map((w) => ({ ...w, pct: total > 0 ? Math.round((w.count / total) * 100) : 0 }));

  const cityMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  for (const row of activeRows) {
    const city = String(row.city ?? row.ticket_territory ?? "Unknown").trim() || "Unknown";
    cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
    const cat = String(row.customer_category ?? "Unknown").trim() || "Unknown";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }
  // Note: these are NOT capped here — the "All" option in the UI's per-panel
  // "Show" selector relies on receiving the complete list. Panels default to
  // showing only the first 5/6 client-side and expand when "All" is chosen.
  const topCities = [...cityMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([city, count]) => ({ city, count }));
  const categoryBreakdown = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

  const opsOverview = {
    avgTicketAge: total > 0 ? Math.round(root.ageSum / total) : 0,
    ageingBuckets,
    longestAgeingTicket,
    warrantyBreakdown,
    statusSummary: { assigned, wip, mrf, other },
    operationalReasons,
    topCities,
    categoryBreakdown,
    topManagers: reportingManagers.map((m, i) => ({
      rank: i + 1,
      name: m.name,
      openCalls: m.openCalls,
      criticalCalls: m.criticalCalls,
      avgAge: m.avgAge,
      partnersManaged: m.partnersManaged,
    })),
    topRsh: rshLeaderboard,
    topRegions: regionalHeatmap,
  };

  const charts = {
    statusBreakdown: {
      title: "Open Calls by Status",
      subtitle: "Distribution across operational stages",
      segments: [
        { label: "Assigned", count: assigned, color: "#2563EB" },
        { label: "WIP", count: wip, color: "#F59E0B" },
        { label: "MRF", count: mrf, color: "#DC2626" },
        ...(other > 0 ? [{ label: "Other", count: other, color: "#94A3B8" }] : []),
      ],
      insight:
        assigned >= wip
          ? `Assigned calls (${assigned}) outpace in-progress work (${wip}).`
          : `Work in progress (${wip}) is leading operational flow.`,
    },
    topPartners: {
      title: "Top 10 Service Partners",
      subtitle: "Partners ranked by open call volume",
      items: topServicePartners.slice(0, 10).map((p) => ({
        label: p.servicePartner,
        count: p.openCalls,
        pct: total > 0 ? Math.round((p.openCalls / total) * 100) : 0,
      })),
      insight: topPartner
        ? `${topPartner.servicePartner} owns ${partnerSharePct}% of today's workload.`
        : "No partner workload concentration detected.",
    },
    productDistribution: {
      title: "Product Distribution",
      subtitle: "Service demand by product line",
      items: productInsights.slice(0, 12).map((p) => ({
        label: p.product,
        count: p.openCalls,
        pct: total > 0 ? Math.round((p.openCalls / total) * 100) : 0,
      })),
      insight: productInsights[0]
        ? `${productInsights[0].product} generates the highest service demand.`
        : "Product demand is evenly distributed.",
    },
    regionalWorkload: {
      title: "Regional Workload",
      subtitle: "Geographic concentration of open calls",
      items: regionalHeatmap,
      insight: topRegion
        ? `${topRegion.region} needs the most operational support today.`
        : "Regional workload is balanced.",
    },
  };

  const actions: Array<{ id: string; label: string; tone: "default" | "warning" | "critical"; target?: string }> = [];
  if (criticalPartners[0]) {
    actions.push({
      id: "assign-tech",
      tone: "critical",
      label: `Assign technician to ${criticalPartners[0].servicePartner}`,
      target: criticalPartners[0].servicePartner,
    });
  }
  if (root.critical > 0) {
    actions.push({
      id: "escalate-sla",
      tone: "warning",
      label: `Escalate ${root.critical} overdue tickets`,
    });
  }
  if (criticalPartners[0]) {
    actions.push({
      id: "review-partner",
      tone: "warning",
      label: `Review overloaded ${criticalPartners[0].servicePartner}`,
      target: criticalPartners[0].servicePartner,
    });
  }
  if (slaPct < 70) {
    actions.push({
      id: "review-sla",
      tone: "critical",
      label: "Review SLA breaches",
    });
  }
  actions.push({ id: "download", tone: "default", label: "Download Daily Report" });
  actions.push({ id: "refresh", tone: "default", label: "Refresh data" });

  const kpiStatus = (value: number, healthy: number, warning: number): "healthy" | "warning" | "critical" => {
    if (value >= healthy) return "healthy";
    if (value >= warning) return "warning";
    return "critical";
  };

  return {
    refreshedAt: new Date().toISOString(),
    totalTickets: total,
    executiveSummary,
    executiveInsights,
    kpis: {
      open: {
        value: total,
        trendPct: trendPct(todayCount, yesterdayCount),
        trendLabel: kpiTrendLabel(todayCount, yesterdayCount),
        description: "All open service calls in view",
        sparkline,
        status: "healthy" as const,
      },
      assigned: {
        value: assigned,
        trendPct: null,
        trendLabel: `${assignedPct}% of open calls`,
        description: "Calls assigned to technicians",
        sparkline,
        status: kpiStatus(assignedPct, 50, 30),
      },
      wip: {
        value: wip,
        trendPct: null,
        trendLabel: `${pct(wip)}% actively in progress`,
        description: "Calls being worked on now",
        sparkline,
        status: wip > 0 ? ("healthy" as const) : ("warning" as const),
      },
      mrf: {
        value: mrf,
        trendPct: null,
        trendLabel: mrf > 0 ? `${pct(mrf)}% waiting on parts` : "No parts backlog",
        description: "Calls blocked on MRF",
        sparkline,
        status: mrf <= assigned ? ("healthy" as const) : ("warning" as const),
      },
      completedToday: {
        value: completedToday,
        trendPct: null,
        trendLabel: completedToday > 0 ? "Closed today" : "None closed today",
        description: "Tickets completed today",
        sparkline: [],
        status: completedToday > 0 ? ("healthy" as const) : ("warning" as const),
      },
      sla: {
        value: slaPct,
        trendPct: null,
        trendLabel: slaPct >= 70 ? "Healthy" : "Needs attention",
        description: "Calls in Assigned or WIP",
        sparkline: [],
        status: kpiStatus(slaPct, 70, 50),
      },
    },
    workPipeline,
    charts,
    opsOverview,
    hierarchy,
    topServicePartners,
    activityFeed,
    activityFeedAll,
    actions,
    smartInsights,
    dataCoverage,
    // legacy fields kept for compatibility
    workloadOverview: [
      { label: "Assigned", count: assigned, pct: pct(assigned), color: "#64748B" },
      { label: "WIP", count: wip, pct: pct(wip), color: "#64748B" },
      { label: "MRF Pending", count: mrf, pct: pct(mrf), color: "#64748B" },
    ],
    reportingManagers,
    rshLeaderboard,
    productInsights,
    regionalHeatmap,
    operationsTable: summarizeActiveRows(activeRows),
  };
}
