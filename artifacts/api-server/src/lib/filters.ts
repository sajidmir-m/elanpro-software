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

/** Split multi-partner filter. Delimiter is "||" so partner names can contain commas. */
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

export function matchesServicePartner(rowPartner: unknown, filter?: string | null): boolean {
  const partners = parseServicePartners(filter);
  if (partners.length === 0) return true;
  const actual = String(rowPartner ?? "").trim().toLowerCase();
  return partners.some((p) => p.toLowerCase() === actual);
}

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
  if (normalized.product) {
    add("LOWER(product) = LOWER(?)", normalized.product);
  }
  if (normalized.servicePartner) {
    const partners = parseServicePartners(normalized.servicePartner);
    if (partners.length === 1) {
      add("LOWER(service_partner_name) = LOWER(?)", partners[0]);
    } else if (partners.length > 1) {
      const placeholders = partners.map((p) => {
        values.push(p);
        return `LOWER($${values.length})`;
      });
      conditions.push(`LOWER(service_partner_name) IN (${placeholders.join(", ")})`);
    }
  }
  if (normalized.ash) {
    add("LOWER(ash) = LOWER(?)", normalized.ash);
  }
  if (normalized.rsh) {
    add("LOWER(rsh) = LOWER(?)", normalized.rsh);
  }
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
