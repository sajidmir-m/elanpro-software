import { getServiceClient } from "@workspace/supabase";
import { classifyWarranty, matchesSearch, matchesServicePartner, normalizeFilterParams, type FilterParams } from "./filters";
import {
  applySavedReportingHierarchy,
  fetchReportingHierarchyDirectory,
} from "./reporting-hierarchy";

type TicketTable = "active_tickets" | "closed_tickets" | "mrf_data";

const PAGE_SIZE = 1000;

function parseCreatedDate(createdOn: string | null | undefined): Date | null {
  if (!createdOn) return null;
  const raw = String(createdOn).trim();

  // DD-MM-YYYY or DD-MM-YYYY, HH:MM:SS
  if (/^[0-9]{2}-[0-9]{2}-[0-9]{4}/.test(raw)) {
    const datePart = raw.split(",")[0]?.trim();
    if (!datePart) return null;
    const [day, month, year] = datePart.split("-").map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }

  // ISO / native parseable formats from Excel cellDates
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function ticketAgeDays(createdOn: string | null | undefined): number {
  const created = parseCreatedDate(createdOn);
  if (!created) return 0;
  return Math.max(0, Math.floor((Date.now() - created.getTime()) / 86_400_000));
}

function matchesDateFilters(row: Record<string, unknown>, params: FilterParams): boolean {
  const normalized = normalizeFilterParams(params);
  if (!normalized.dateFrom && !normalized.dateTo) return true;
  const created = parseCreatedDate(row.created_on as string | undefined);
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
  return true;
}

function matchesFilters(row: Record<string, unknown>, params: FilterParams): boolean {
  const normalized = normalizeFilterParams(params);
  if (normalized.category && String(row.category ?? "").toLowerCase() !== normalized.category.toLowerCase()) {
    return false;
  }
  if (normalized.product && String(row.product ?? "").toLowerCase() !== normalized.product.toLowerCase()) {
    return false;
  }
  if (
    normalized.servicePartner &&
    !matchesServicePartner(row.service_partner_name, normalized.servicePartner)
  ) {
    return false;
  }
  if (normalized.ash && String(row.ash ?? "").toLowerCase() !== normalized.ash.toLowerCase()) {
    return false;
  }
  if (normalized.rsh && String(row.rsh ?? "").toLowerCase() !== normalized.rsh.toLowerCase()) {
    return false;
  }
  if (normalized.state && String(row.state ?? "").toLowerCase() !== normalized.state.toLowerCase()) {
    return false;
  }
  if (normalized.warranty && normalized.warranty !== "all") {
    const cls = classifyWarranty(row.support_type);
    if (normalized.warranty === "in" && cls !== "in") return false;
    if (normalized.warranty === "out" && cls !== "out") return false;
  }
  if (!matchesSearch(row, normalized.search)) return false;
  return matchesDateFilters(row, normalized);
}

async function fetchAllRows(
  table: TicketTable,
  columns = "*",
  params: FilterParams = {},
): Promise<Record<string, unknown>[]> {
  const supabase = getServiceClient();
  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const directory = await fetchReportingHierarchyDirectory();
  return rows
    .map((row) => applySavedReportingHierarchy(row, directory))
    .filter((row) => matchesFilters(row, params));
}

export async function countRows(table: TicketTable, params: FilterParams = {}): Promise<number> {
  const hasFilters = Object.values(params).some((value) => value != null && value !== "");
  if (!hasFilters) {
    const { count, error } = await getServiceClient()
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  }
  const rows = await fetchAllRows(table, "created_on,category,product,service_partner_name,ash,rsh,state", params);
  return rows.length;
}

export function groupCount(
  rows: Record<string, unknown>[],
  field: string,
  fallback = "Unknown",
  limit = 15,
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

export function average(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

export async function fetchTicketRows(
  table: "active_tickets" | "closed_tickets",
  params: FilterParams = {},
): Promise<Record<string, unknown>[]> {
  return fetchAllRows(table, "*", params);
}

export async function fetchMrfRows(params: FilterParams = {}): Promise<Record<string, unknown>[]> {
  return fetchAllRows("mrf_data", "*", params);
}

export async function fetchDistinctTicketValues(
  field:
    | "category"
    | "product"
    | "service_partner_name"
    | "ash"
    | "rsh"
    | "state"
    | "support_type"
    | "ticket_type"
    | "ticket_territory",
): Promise<string[]> {
  const supabase = getServiceClient();
  const values = new Set<string>();

  for (const table of ["active_tickets", "closed_tickets"] as const) {
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select(field)
        .not(field, "is", null)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data?.length) break;

      for (const row of data as unknown as Record<string, unknown>[]) {
        const value = row[field];
        if (typeof value === "string" && value.trim()) values.add(value);
      }

      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  return [...values].sort((a, b) => a.localeCompare(b));
}

/** Build saved RSH/ASH → service partner maps from current active tickets. */
export async function fetchPartnerHierarchyMaps(): Promise<{
  byRsh: Record<string, string[]>;
  byAsh: Record<string, string[]>;
}> {
  const supabase = getServiceClient();
  const directory = await fetchReportingHierarchyDirectory();
  const byRsh = new Map<string, Set<string>>();
  const byAsh = new Map<string, Set<string>>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("active_tickets")
      .select("service_partner_name,rsh")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const rawRow of data as unknown as Record<string, unknown>[]) {
      const row = applySavedReportingHierarchy(rawRow, directory);
      const rsh = String(row.rsh ?? "").trim();
      const ash = String(row.ash ?? "").trim();
      const partner = String(row.service_partner_name ?? "").trim();
      if (!partner) continue;

      if (rsh && rsh !== "Unassigned") {
        if (!byRsh.has(rsh)) byRsh.set(rsh, new Set());
        byRsh.get(rsh)!.add(partner);
      }
      if (ash && ash !== "Unmapped") {
        if (!byAsh.has(ash)) byAsh.set(ash, new Set());
        byAsh.get(ash)!.add(partner);
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const serialize = (map: Map<string, Set<string>>): Record<string, string[]> => {
    const result: Record<string, string[]> = {};
    for (const [name, partners] of map.entries()) {
      result[name] = [...partners].sort((a, b) => a.localeCompare(b));
    }
    return result;
  };

  return {
    byRsh: serialize(byRsh),
    byAsh: serialize(byAsh),
  };
}

export async function fetchPartnersByRshMap(): Promise<Record<string, string[]>> {
  return (await fetchPartnerHierarchyMaps()).byRsh;
}

export async function fetchPartnersByAshMap(): Promise<Record<string, string[]>> {
  return (await fetchPartnerHierarchyMaps()).byAsh;
}

export async function fetchRecentUploads(limit = 5) {
  const { data, error } = await getServiceClient()
    .from("uploads")
    .select("id, filename, file_type, record_count, uploaded_at, status, error_message")
    .order("uploaded_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
