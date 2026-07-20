export type FilterParams = {
  dateFrom?: string | null;
  dateTo?: string | null;
  dateRangeDays?: string | number | null;
  category?: string | null;
  product?: string | null;
  servicePartner?: string | null;
  ash?: string | null;
  rsh?: string | null;
  region?: string | null;
  state?: string | null;
  warranty?: string | null;
  search?: string | null;
};

/**
 * Generic multi-value filter. Delimiter is "||" so names can contain commas.
 * Shared by Service Partner, RSH and ASH "browse and pick many" filters.
 */
export function parseMultiValue(value?: string | null): string[] {
  if (!value || value === "all") return [];
  return String(value)
    .split("||")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeMultiValue(values: string[]): string | null {
  const clean = [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0]!;
  return clean.join("||");
}

export function matchesMultiValue(rowValue: unknown, filter?: string | null): boolean {
  const values = parseMultiValue(filter);
  if (values.length === 0) return true;
  const actual = String(rowValue ?? "").trim().toLowerCase();
  return values.some((v) => v.toLowerCase() === actual);
}

/** @deprecated use parseMultiValue — kept for existing imports. */
export const parseServicePartners = parseMultiValue;
/** @deprecated use serializeMultiValue — kept for existing imports. */
export const serializeServicePartners = serializeMultiValue;
/** @deprecated use matchesMultiValue — kept for existing imports. */
export const matchesServicePartner = matchesMultiValue;

export function classifyWarranty(supportType: unknown): "in" | "out" | "other" {
  const s = String(supportType ?? "").toLowerCase();
  if (!s) return "other";
  if (s.includes("out") || s.includes("unverified")) return "out";
  if (s.includes("extended") || s.includes("jeevanam")) return "in";
  if (s.includes("warranty")) return "in";
  return "other";
}

export function matchesSearch(row: Record<string, unknown>, search?: string | null): boolean {
  if (!search) return true;
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  for (const value of Object.values(row)) {
    if (value == null) continue;
    if (String(value).toLowerCase().includes(needle)) return true;
  }
  return false;
}

export function normalizeFilterParams(params: FilterParams): FilterParams {
  const next = { ...params };
  const days = Number(params.dateRangeDays);

  if (Number.isFinite(days) && days > 0 && !params.dateFrom) {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - days);
    next.dateFrom = from.toISOString().slice(0, 10);
    next.dateTo = new Date().toISOString().slice(0, 10);
  }

  return next;
}

export function buildTicketFilters(
  params: FilterParams,
  _table: "active_tickets" | "closed_tickets" | "mrf_data" = "active_tickets",
) {
  const normalized = normalizeFilterParams(params);
  const conditions: string[] = [];
  const values: unknown[] = [];

  function add(cond: string, val: unknown) {
    values.push(val);
    const idx = values.length;
    conditions.push(cond.replace("?", `$${idx}`));
  }

  const dateExpr = `(
    CASE WHEN created_on IS NOT NULL AND created_on ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}'
    THEN (substring(created_on from 7 for 4) || '-' || substring(created_on from 4 for 2) || '-' || substring(created_on from 1 for 2))::date
    ELSE NULL END
  )`;

  if (normalized.dateFrom) {
    add(`${dateExpr} >= ?::date`, normalized.dateFrom);
  }
  if (normalized.dateTo) {
    add(`${dateExpr} <= ?::date`, normalized.dateTo);
  }
  if (normalized.category) {
    add("LOWER(category) = LOWER(?)", normalized.category);
  }
  function addMultiValue(column: string, filter: string | null | undefined) {
    const list = parseMultiValue(filter);
    if (list.length === 1) {
      add(`LOWER(${column}) = LOWER(?)`, list[0]);
    } else if (list.length > 1) {
      const placeholders = list.map((v) => {
        values.push(v);
        return `LOWER($${values.length})`;
      });
      conditions.push(`LOWER(${column}) IN (${placeholders.join(", ")})`);
    }
  }

  addMultiValue("product", normalized.product);
  addMultiValue("service_partner_name", normalized.servicePartner);
  addMultiValue("ash", normalized.ash);
  addMultiValue("rsh", normalized.rsh);
  if (normalized.state) {
    add("LOWER(state) = LOWER(?)", normalized.state);
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  return { where, values };
}

export const AGE_DAYS_EXPR = `GREATEST(0, EXTRACT(day FROM (NOW() - (
  CASE WHEN created_on IS NOT NULL AND created_on ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}'
  THEN to_timestamp(split_part(created_on, ',', 1) || ':00', 'DD-MM-YYYY HH24:MI:SS')
  ELSE NOW() END
)))::int)`;
