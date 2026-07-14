import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { buildTicketFilters, type FilterParams } from "../lib/filters";

const router: IRouter = Router();

router.get("/reports/product-failure", requireAuth, async (req, res): Promise<void> => {
  const params = req.query as FilterParams;
  const { where, values } = buildTicketFilters(params, "closed_tickets");

  const result = await pool.query(
    `SELECT
      COALESCE(product, 'Unknown') as product,
      COALESCE(category, 'Unknown') as category,
      COUNT(*) as "totalTickets",
      COUNT(*) FILTER (WHERE LOWER(ticket_type) LIKE '%breakdown%') as "breakdownTickets",
      COUNT(*) FILTER (WHERE LOWER(ticket_type) LIKE '%pm%' OR LOWER(service_type) LIKE '%pm%') as "pmTickets",
      COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%warranty%' AND LOWER(support_type) NOT LIKE '%out%' AND LOWER(support_type) NOT LIKE '%unverified%') as "warrantyCount",
      COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%out%' OR LOWER(support_type) LIKE '%unverified%') as "outOfWarrantyCount"
    FROM closed_tickets
    ${where}
    GROUP BY product, category
    ORDER BY "totalTickets" DESC
    LIMIT 50`,
    values,
  );

  res.json(
    result.rows.map((r: Record<string, unknown>) => ({
      product: r.product,
      category: r.category,
      totalTickets: parseInt(String(r.totalTickets), 10),
      breakdownTickets: parseInt(String(r.breakdownTickets), 10),
      pmTickets: parseInt(String(r.pmTickets), 10),
      warrantyCount: parseInt(String(r.warrantyCount), 10),
      outOfWarrantyCount: parseInt(String(r.outOfWarrantyCount), 10),
    })),
  );
});

router.get("/reports/component-failure", requireAuth, async (req, res): Promise<void> => {
  const params = req.query as { dateFrom?: string; dateTo?: string; category?: string; product?: string };
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.category) {
    values.push(params.category);
    conditions.push(`LOWER(category) = LOWER($${values.length})`);
  }
  if (params.product) {
    values.push(params.product);
    conditions.push(`LOWER(product) = LOWER($${values.length})`);
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const result = await pool.query(
    `SELECT
      COALESCE(component_name, 'Unknown') as component,
      COALESCE(part_code, '') as "partCode",
      SUM(COALESCE(quantity, 0))::int as "usageCount",
      ARRAY_AGG(DISTINCT product) FILTER (WHERE product IS NOT NULL) as "productList"
    FROM mrf_data
    ${where}
    GROUP BY component_name, part_code
    ORDER BY "usageCount" DESC
    LIMIT 50`,
    values,
  );

  res.json(
    result.rows.map((r: Record<string, unknown>) => ({
      component: r.component,
      partCode: r.partCode,
      usageCount: parseInt(String(r.usageCount ?? "0"), 10),
      productList: Array.isArray(r.productList) ? r.productList : [],
    })),
  );
});

router.get("/reports/warranty-analysis", requireAuth, async (req, res): Promise<void> => {
  const params = req.query as FilterParams;

  // Union active + closed for warranty analysis
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.category) { values.push(params.category); conditions.push(`LOWER(category) = LOWER($${values.length})`); }
  if (params.product) { values.push(params.product); conditions.push(`LOWER(product) = LOWER($${values.length})`); }
  if (params.servicePartner) { values.push(params.servicePartner); conditions.push(`LOWER(service_partner_name) = LOWER($${values.length})`); }
  if (params.ash) { values.push(params.ash); conditions.push(`LOWER(ash) = LOWER($${values.length})`); }
  if (params.rsh) { values.push(params.rsh); conditions.push(`LOWER(rsh) = LOWER($${values.length})`); }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const unionQuery = `
    SELECT support_type, product, service_partner_name, state FROM active_tickets ${where}
    UNION ALL
    SELECT support_type, product, service_partner_name, state FROM closed_tickets ${where}
  `;

  const [summary, byProduct, byPartner, byState] = await Promise.all([
    pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%in warranty%') as "inWarranty",
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%out%') as "outOfWarranty",
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%unverified%') as "unverified",
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%extended%') as "extended",
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%jeevanam%') as "jeevanam"
      FROM (${unionQuery}) t`,
      [...values, ...values],
    ),
    pool.query(
      `SELECT COALESCE(product, 'Unknown') as label,
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%in warranty%') as "inWarranty",
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%out%') as "outOfWarranty",
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%unverified%') as "unverified"
      FROM (${unionQuery}) t
      GROUP BY product ORDER BY "inWarranty" + "outOfWarranty" + "unverified" DESC LIMIT 20`,
      [...values, ...values],
    ),
    pool.query(
      `SELECT COALESCE(service_partner_name, 'Unknown') as label,
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%in warranty%') as "inWarranty",
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%out%') as "outOfWarranty",
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%unverified%') as "unverified"
      FROM (${unionQuery}) t
      GROUP BY service_partner_name ORDER BY "inWarranty" + "outOfWarranty" + "unverified" DESC LIMIT 15`,
      [...values, ...values],
    ),
    pool.query(
      `SELECT COALESCE(state, 'Unknown') as label,
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%in warranty%') as "inWarranty",
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%out%') as "outOfWarranty",
        COUNT(*) FILTER (WHERE LOWER(support_type) LIKE '%unverified%') as "unverified"
      FROM (${unionQuery}) t
      GROUP BY state ORDER BY "inWarranty" + "outOfWarranty" + "unverified" DESC LIMIT 15`,
      [...values, ...values],
    ),
  ]);

  const s = summary.rows[0] ?? {};
  const fmtWarranty = (rows: Record<string, unknown>[]) =>
    rows.map((r) => ({
      label: r.label,
      inWarranty: parseInt(String(r.inWarranty ?? "0"), 10),
      outOfWarranty: parseInt(String(r.outOfWarranty ?? "0"), 10),
      unverified: parseInt(String(r.unverified ?? "0"), 10),
    }));

  res.json({
    summary: {
      inWarranty: parseInt(String(s.inWarranty ?? "0"), 10),
      outOfWarranty: parseInt(String(s.outOfWarranty ?? "0"), 10),
      unverified: parseInt(String(s.unverified ?? "0"), 10),
      extended: parseInt(String(s.extended ?? "0"), 10),
      jeevanam: parseInt(String(s.jeevanam ?? "0"), 10),
    },
    byProduct: fmtWarranty(byProduct.rows),
    byServicePartner: fmtWarranty(byPartner.rows),
    byState: fmtWarranty(byState.rows),
  });
});

router.get("/reports/sales-complaint", requireAuth, async (req, res): Promise<void> => {
  const params = req.query as { dateFrom?: string; dateTo?: string; category?: string; product?: string; state?: string };
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.category) { values.push(params.category); conditions.push(`LOWER(category) = LOWER($${values.length})`); }
  if (params.product) { values.push(params.product); conditions.push(`LOWER(product) = LOWER($${values.length})`); }
  if (params.state) { values.push(params.state); conditions.push(`LOWER(state) = LOWER($${values.length})`); }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const result = await pool.query(
    `SELECT
      COALESCE(product, 'Unknown') as product,
      COALESCE(category, 'Unknown') as category,
      COALESCE(state, 'Unknown') as state,
      COUNT(*) FILTER (WHERE LOWER(ticket_type) LIKE '%breakdown%') as "bdTickets",
      COUNT(*) as "totalTickets"
    FROM (
      SELECT product, category, state, ticket_type FROM active_tickets ${where}
      UNION ALL
      SELECT product, category, state, ticket_type FROM closed_tickets ${where}
    ) t
    GROUP BY product, category, state
    ORDER BY "totalTickets" DESC
    LIMIT 50`,
    [...values, ...values],
  );

  res.json(
    result.rows.map((r: Record<string, unknown>) => ({
      product: r.product,
      category: r.category,
      state: r.state,
      bdTickets: parseInt(String(r.bdTickets ?? "0"), 10),
      totalTickets: parseInt(String(r.totalTickets ?? "0"), 10),
    })),
  );
});

router.get("/reports/tat-analysis", requireAuth, async (req, res): Promise<void> => {
  const params = req.query as FilterParams;
  const { where, values } = buildTicketFilters(params, "closed_tickets");

  const [overall, byPartner, byAsh, byRsh, byState] = await Promise.all([
    pool.query(
      `SELECT
        AVG(tat_minutes::numeric) as avg_tat,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tat_minutes::numeric) as median_tat,
        COUNT(*) FILTER (WHERE tat_minutes::numeric <= 1440) as within24h,
        COUNT(*) FILTER (WHERE tat_minutes::numeric > 1440 AND tat_minutes::numeric <= 2880) as within48h,
        COUNT(*) FILTER (WHERE tat_minutes::numeric > 2880 AND tat_minutes::numeric <= 4320) as within72h,
        COUNT(*) FILTER (WHERE tat_minutes::numeric > 4320) as above72h
      FROM closed_tickets ${where}
      WHERE tat_minutes IS NOT NULL`,
      values,
    ),
    pool.query(
      `SELECT COALESCE(service_partner_name, 'Unknown') as label, COUNT(*) as count, AVG(tat_minutes::numeric) as avg_tat_minutes
       FROM closed_tickets ${where}
       GROUP BY service_partner_name ORDER BY count DESC LIMIT 15`,
      values,
    ),
    pool.query(
      `SELECT COALESCE(ash, 'N/A') as label, COUNT(*) as count, AVG(tat_minutes::numeric) as avg_tat_minutes
       FROM closed_tickets ${where}
       GROUP BY ash ORDER BY count DESC LIMIT 15`,
      values,
    ),
    pool.query(
      `SELECT COALESCE(rsh, 'N/A') as label, COUNT(*) as count, AVG(tat_minutes::numeric) as avg_tat_minutes
       FROM closed_tickets ${where}
       GROUP BY rsh ORDER BY count DESC LIMIT 15`,
      values,
    ),
    pool.query(
      `SELECT COALESCE(state, 'Unknown') as label, COUNT(*) as count, AVG(tat_minutes::numeric) as avg_tat_minutes
       FROM closed_tickets ${where}
       GROUP BY state ORDER BY count DESC LIMIT 15`,
      values,
    ),
  ]);

  const o = overall.rows[0] ?? {};
  const fmtTat = (rows: Record<string, unknown>[]) =>
    rows.map((r) => ({
      label: r.label,
      count: parseInt(String(r.count), 10),
      avgTatMinutes: r.avg_tat_minutes != null ? parseFloat(String(r.avg_tat_minutes)) : null,
    }));

  res.json({
    overall: {
      avgTatMinutes: o.avg_tat != null ? parseFloat(String(o.avg_tat)) : null,
      medianTatMinutes: o.median_tat != null ? parseFloat(String(o.median_tat)) : null,
      within24h: parseInt(String(o.within24h ?? "0"), 10),
      within48h: parseInt(String(o.within48h ?? "0"), 10),
      within72h: parseInt(String(o.within72h ?? "0"), 10),
      above72h: parseInt(String(o.above72h ?? "0"), 10),
    },
    stages: {
      wipAvgMinutes: null,
      mrfRequestAvgMinutes: null,
      mrfApprovedAvgMinutes: null,
      dispatchedAvgMinutes: null,
    },
    byServicePartner: fmtTat(byPartner.rows),
    byAsh: fmtTat(byAsh.rows),
    byRsh: fmtTat(byRsh.rows),
    byState: fmtTat(byState.rows),
  });
});

router.get("/reports/mrf-analysis", requireAuth, async (req, res): Promise<void> => {
  const params = req.query as { servicePartner?: string; ash?: string; rsh?: string };
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.servicePartner) { values.push(params.servicePartner); conditions.push(`LOWER(service_partner_name) = LOWER($${values.length})`); }
  if (params.ash) { values.push(params.ash); conditions.push(`LOWER(ash) = LOWER($${values.length})`); }
  if (params.rsh) { values.push(params.rsh); conditions.push(`LOWER(rsh) = LOWER($${values.length})`); }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const [counts, byComponent, byPartner] = await Promise.all([
    pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE LOWER(mrf_status) LIKE '%approved%') as approved,
        COUNT(*) FILTER (WHERE LOWER(mrf_status) NOT LIKE '%approved%' AND LOWER(mrf_status) NOT LIKE '%dispatch%') as pending,
        COUNT(*) FILTER (WHERE LOWER(mrf_status) LIKE '%dispatch%') as dispatched
      FROM mrf_data ${where}`,
      values,
    ),
    pool.query(
      `SELECT
        COALESCE(component_name, 'Unknown') as component,
        COALESCE(part_code, '') as "partCode",
        SUM(COALESCE(quantity, 0))::int as quantity,
        COUNT(*) as "mrfCount"
      FROM mrf_data ${where}
      GROUP BY component_name, part_code
      ORDER BY quantity DESC LIMIT 20`,
      values,
    ),
    pool.query(
      `SELECT COALESCE(service_partner_name, 'Unknown') as label, COUNT(*) as count
       FROM mrf_data ${where}
       GROUP BY service_partner_name ORDER BY count DESC LIMIT 15`,
      values,
    ),
  ]);

  const c = counts.rows[0] ?? {};

  res.json({
    totalMrf: parseInt(String(c.total ?? "0"), 10),
    approved: parseInt(String(c.approved ?? "0"), 10),
    pending: parseInt(String(c.pending ?? "0"), 10),
    dispatched: parseInt(String(c.dispatched ?? "0"), 10),
    byComponent: byComponent.rows.map((r: Record<string, unknown>) => ({
      component: r.component,
      partCode: r.partCode,
      quantity: parseInt(String(r.quantity ?? "0"), 10),
      mrfCount: parseInt(String(r.mrfCount ?? "0"), 10),
    })),
    byServicePartner: byPartner.rows.map((r: Record<string, unknown>) => ({
      label: r.label,
      count: parseInt(String(r.count), 10),
    })),
  });
});

export default router;
