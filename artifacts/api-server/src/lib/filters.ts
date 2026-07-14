// Helper to build parameterized WHERE clause for ticket filter params
export type FilterParams = {
  dateFrom?: string | null;
  dateTo?: string | null;
  category?: string | null;
  product?: string | null;
  servicePartner?: string | null;
  ash?: string | null;
  rsh?: string | null;
  state?: string | null;
};

export function buildTicketFilters(params: FilterParams, table: "active_tickets" | "closed_tickets" | "mrf_data" = "active_tickets") {
  const conditions: string[] = [];
  const values: unknown[] = [];

  function add(cond: string, val: unknown) {
    values.push(val);
    // Replace first '?' placeholder with $N
    const idx = values.length;
    conditions.push(cond.replace("?", `$${idx}`));
  }

  // Date filter using the DD-MM-YYYY, HH24:MI:SS format
  const dateExpr = `(
    CASE WHEN created_on IS NOT NULL AND created_on ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}'
    THEN (substring(created_on from 7 for 4) || '-' || substring(created_on from 4 for 2) || '-' || substring(created_on from 1 for 2))::date
    ELSE NULL END
  )`;

  if (params.dateFrom) {
    add(`${dateExpr} >= ?::date`, params.dateFrom);
  }
  if (params.dateTo) {
    add(`${dateExpr} <= ?::date`, params.dateTo);
  }
  if (params.category) {
    add("LOWER(category) = LOWER(?)", params.category);
  }
  if (params.product) {
    add("LOWER(product) = LOWER(?)", params.product);
  }
  if (params.servicePartner) {
    add("LOWER(service_partner_name) = LOWER(?)", params.servicePartner);
  }
  if (params.ash) {
    add("LOWER(ash) = LOWER(?)", params.ash);
  }
  if (params.rsh) {
    add("LOWER(rsh) = LOWER(?)", params.rsh);
  }
  if (params.state) {
    add("LOWER(state) = LOWER(?)", params.state);
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  return { where, values };
}

// Age expression in days from created_on
export const AGE_DAYS_EXPR = `GREATEST(0, EXTRACT(day FROM (NOW() - (
  CASE WHEN created_on IS NOT NULL AND created_on ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}'
  THEN to_timestamp(split_part(created_on, ',', 1) || ':00', 'DD-MM-YYYY HH24:MI:SS')
  ELSE NOW() END
)))::int)`;
