import { getServiceClient } from "@workspace/supabase";
import {
  applySavedReportingHierarchy,
  fetchReportingHierarchyDirectory,
  type ReportingHierarchyDirectory,
} from "./reporting-hierarchy";

export type CachedTable = "active_tickets" | "closed_tickets" | "mrf_data" | "sales_data";

const PAGE_SIZE = 2000;

type Snapshot = {
  rows: Record<string, unknown>[];
  loadedAt: number;
};

const tableCache = new Map<CachedTable, Snapshot>();
const inflight = new Map<CachedTable, Promise<Record<string, unknown>[]>>();

/** Enriched active/closed (hierarchy + MRF approval fields). */
const enrichedCache = new Map<"active_tickets" | "closed_tickets", Snapshot>();
const enrichedInflight = new Map<"active_tickets" | "closed_tickets", Promise<Record<string, unknown>[]>>();

let directoryCache: { value: ReportingHierarchyDirectory; loadedAt: number } | null = null;
let directoryInflight: Promise<ReportingHierarchyDirectory> | null = null;

let filterOptionsCache: { value: unknown; loadedAt: number } | null = null;

const FILTER_OPTIONS_TTL_MS = 120_000;

async function loadTableRows(table: CachedTable): Promise<Record<string, unknown>[]> {
  const supabase = getServiceClient();
  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (table === "sales_data") return rows;

  const directory = await getCachedHierarchyDirectory();
  return rows.map((row) => applySavedReportingHierarchy(row, directory));
}

export async function getCachedHierarchyDirectory(): Promise<ReportingHierarchyDirectory> {
  if (directoryCache) return directoryCache.value;
  if (!directoryInflight) {
    directoryInflight = fetchReportingHierarchyDirectory()
      .then((value) => {
        directoryCache = { value, loadedAt: Date.now() };
        directoryInflight = null;
        return value;
      })
      .catch((err) => {
        directoryInflight = null;
        throw err;
      });
  }
  return directoryInflight;
}

/**
 * Returns hierarchy-applied rows for a table. Concurrent callers share one DB load.
 * Cache is invalidated on Excel upload.
 */
export async function getCachedTableRows(table: CachedTable): Promise<Record<string, unknown>[]> {
  const hit = tableCache.get(table);
  if (hit) return hit.rows;

  let promise = inflight.get(table);
  if (!promise) {
    promise = loadTableRows(table)
      .then((rows) => {
        tableCache.set(table, { rows, loadedAt: Date.now() });
        inflight.delete(table);
        return rows;
      })
      .catch((err) => {
        inflight.delete(table);
        throw err;
      });
    inflight.set(table, promise);
  }
  return promise;
}

function buildMrfByTicket(mrfRows: Record<string, unknown>[]) {
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
  return byTicket;
}

export function attachMrfToTickets(
  ticketRows: Record<string, unknown>[],
  mrfRows: Record<string, unknown>[],
): Record<string, unknown>[] {
  if (ticketRows.length === 0) return ticketRows;
  const byTicket = buildMrfByTicket(mrfRows);

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

/** Active/closed rows with MRF fields, cached after first build. */
export async function getCachedEnrichedTickets(
  table: "active_tickets" | "closed_tickets",
): Promise<Record<string, unknown>[]> {
  const hit = enrichedCache.get(table);
  if (hit) return hit.rows;

  let promise = enrichedInflight.get(table);
  if (!promise) {
    promise = (async () => {
      const [tickets, mrf] = await Promise.all([
        getCachedTableRows(table),
        getCachedTableRows("mrf_data"),
      ]);
      const enriched = attachMrfToTickets(tickets, mrf);
      enrichedCache.set(table, { rows: enriched, loadedAt: Date.now() });
      enrichedInflight.delete(table);
      return enriched;
    })().catch((err) => {
      enrichedInflight.delete(table);
      throw err;
    });
    enrichedInflight.set(table, promise);
  }
  return promise;
}

export function getCachedFilterOptions<T>(): T | null {
  if (!filterOptionsCache) return null;
  if (Date.now() - filterOptionsCache.loadedAt > FILTER_OPTIONS_TTL_MS) {
    filterOptionsCache = null;
    return null;
  }
  return filterOptionsCache.value as T;
}

export function setCachedFilterOptions(value: unknown): void {
  filterOptionsCache = { value, loadedAt: Date.now() };
}

/** Call after a successful Excel upload so the next request reloads fresh data. */
export function invalidateDataCache(tables?: CachedTable[]): void {
  if (!tables || tables.length === 0) {
    tableCache.clear();
    enrichedCache.clear();
    directoryCache = null;
    filterOptionsCache = null;
    return;
  }
  for (const table of tables) {
    tableCache.delete(table);
    if (table === "active_tickets" || table === "closed_tickets") {
      enrichedCache.delete(table);
    }
    if (table === "mrf_data") {
      enrichedCache.delete("active_tickets");
      enrichedCache.delete("closed_tickets");
    }
  }
  filterOptionsCache = null;
}
