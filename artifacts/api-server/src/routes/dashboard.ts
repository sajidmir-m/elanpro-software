import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { buildTicketFilters, AGE_DAYS_EXPR, type FilterParams } from "../lib/filters";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const params = req.query as FilterParams;
  const { where: activeWhere, values: activeValues } = buildTicketFilters(params, "active_tickets");
  const { where: closedWhere, values: closedValues } = buildTicketFilters(params, "closed_tickets");

  const [
    activeCount,
    closedCount,
    mrfCount,
    avgTat,
    ageDistribution,
    byState,
    byCategory,
    recentUploads,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) as count FROM active_tickets ${activeWhere}`, activeValues),
    pool.query(`SELECT COUNT(*) as count FROM closed_tickets ${closedWhere}`, closedValues),
    pool.query(`SELECT COUNT(*) as count FROM mrf_data`),
    pool.query(
      `SELECT AVG(tat_minutes::numeric) as avg_tat FROM closed_tickets ${closedWhere}`,
      closedValues,
    ),
    pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE ${AGE_DAYS_EXPR} <= 7) AS within7,
        COUNT(*) FILTER (WHERE ${AGE_DAYS_EXPR} > 7 AND ${AGE_DAYS_EXPR} <= 15) AS within15,
        COUNT(*) FILTER (WHERE ${AGE_DAYS_EXPR} > 15 AND ${AGE_DAYS_EXPR} <= 30) AS within30,
        COUNT(*) FILTER (WHERE ${AGE_DAYS_EXPR} > 30) AS above30
      FROM active_tickets ${activeWhere}`,
      activeValues,
    ),
    pool.query(
      `SELECT COALESCE(state, 'Unknown') as label, COUNT(*) as count 
       FROM active_tickets ${activeWhere}
       GROUP BY state ORDER BY count DESC LIMIT 15`,
      activeValues,
    ),
    pool.query(
      `SELECT COALESCE(category, 'Unknown') as label, COUNT(*) as count 
       FROM active_tickets ${activeWhere}
       GROUP BY category ORDER BY count DESC LIMIT 10`,
      activeValues,
    ),
    pool.query(
      `SELECT id, filename, file_type as "fileType", record_count as "recordCount",
              uploaded_at as "uploadedAt", status, error_message as "errorMessage"
       FROM uploads ORDER BY uploaded_at DESC LIMIT 5`,
    ),
  ]);

  const age = ageDistribution.rows[0] ?? {};

  res.json({
    totalActive: parseInt(activeCount.rows[0]?.count ?? "0", 10),
    totalClosed: parseInt(closedCount.rows[0]?.count ?? "0", 10),
    totalMrf: parseInt(mrfCount.rows[0]?.count ?? "0", 10),
    avgTatMinutes: avgTat.rows[0]?.avg_tat != null ? parseFloat(avgTat.rows[0].avg_tat) : null,
    pendingByAge: {
      within7Days: parseInt(age.within7 ?? "0", 10),
      within15Days: parseInt(age.within15 ?? "0", 10),
      within30Days: parseInt(age.within30 ?? "0", 10),
      above30Days: parseInt(age.above30 ?? "0", 10),
    },
    byState: byState.rows.map((r: Record<string, unknown>) => ({
      label: r.label,
      count: parseInt(String(r.count), 10),
    })),
    byCategory: byCategory.rows.map((r: Record<string, unknown>) => ({
      label: r.label,
      count: parseInt(String(r.count), 10),
    })),
    recentUploads: recentUploads.rows.map((u: Record<string, unknown>) => ({
      id: u.id,
      filename: u.filename,
      fileType: u.fileType,
      recordCount: u.recordCount,
      uploadedAt: u.uploadedAt instanceof Date ? u.uploadedAt.toISOString() : u.uploadedAt,
      status: u.status,
      errorMessage: u.errorMessage ?? null,
    })),
  });
});

router.get("/dashboard/active-tickets", requireAuth, async (req, res): Promise<void> => {
  const params = req.query as FilterParams & { page?: string; pageSize?: string };
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(params.pageSize ?? "50", 10)));
  const offset = (page - 1) * pageSize;

  const { where, values } = buildTicketFilters(params, "active_tickets");

  const [ticketsResult, totalResult, byProduct, byPartner, byAsh, byRsh, byAge] = await Promise.all([
    pool.query(
      `SELECT 
        ticket_id as "ticketId",
        created_on as "createdOn",
        product,
        category,
        service_partner_name as "servicePartner",
        COALESCE(ash, 'N/A') as ash,
        COALESCE(rsh, 'N/A') as rsh,
        COALESCE(state, 'Unknown') as state,
        ticket_status as status,
        wip_sub_stage as "wipSubStage",
        ticket_type as "ticketType",
        support_type as "supportType",
        customer_name as "customerName",
        ${AGE_DAYS_EXPR} as "ageDays"
      FROM active_tickets
      ${where}
      ORDER BY created_on DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, offset],
    ),
    pool.query(`SELECT COUNT(*) as count FROM active_tickets ${where}`, values),
    pool.query(
      `SELECT COALESCE(product, 'Unknown') as label, COUNT(*) as count FROM active_tickets ${where} GROUP BY product ORDER BY count DESC LIMIT 15`,
      values,
    ),
    pool.query(
      `SELECT COALESCE(service_partner_name, 'Unknown') as label, COUNT(*) as count FROM active_tickets ${where} GROUP BY service_partner_name ORDER BY count DESC LIMIT 15`,
      values,
    ),
    pool.query(
      `SELECT COALESCE(ash, 'N/A') as label, COUNT(*) as count FROM active_tickets ${where} GROUP BY ash ORDER BY count DESC LIMIT 15`,
      values,
    ),
    pool.query(
      `SELECT COALESCE(rsh, 'N/A') as label, COUNT(*) as count FROM active_tickets ${where} GROUP BY rsh ORDER BY count DESC LIMIT 15`,
      values,
    ),
    pool.query(
      `SELECT 
        CASE 
          WHEN ${AGE_DAYS_EXPR} <= 7 THEN '0-7 days'
          WHEN ${AGE_DAYS_EXPR} <= 15 THEN '8-15 days'
          WHEN ${AGE_DAYS_EXPR} <= 30 THEN '16-30 days'
          ELSE '30+ days'
        END as label,
        COUNT(*) as count
      FROM active_tickets ${where}
      GROUP BY 1 ORDER BY MIN(${AGE_DAYS_EXPR})`,
      values,
    ),
  ]);

  res.json({
    tickets: ticketsResult.rows,
    total: parseInt(totalResult.rows[0]?.count ?? "0", 10),
    byProduct: byProduct.rows.map((r: Record<string, unknown>) => ({ label: r.label, count: parseInt(String(r.count), 10) })),
    byServicePartner: byPartner.rows.map((r: Record<string, unknown>) => ({ label: r.label, count: parseInt(String(r.count), 10) })),
    byAsh: byAsh.rows.map((r: Record<string, unknown>) => ({ label: r.label, count: parseInt(String(r.count), 10) })),
    byRsh: byRsh.rows.map((r: Record<string, unknown>) => ({ label: r.label, count: parseInt(String(r.count), 10) })),
    byAgeBucket: byAge.rows.map((r: Record<string, unknown>) => ({ label: r.label, count: parseInt(String(r.count), 10) })),
  });
});

router.get("/dashboard/closed-tickets", requireAuth, async (req, res): Promise<void> => {
  const params = req.query as FilterParams & { page?: string; pageSize?: string };
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(params.pageSize ?? "50", 10)));
  const offset = (page - 1) * pageSize;

  const { where, values } = buildTicketFilters(params, "closed_tickets");

  const [ticketsResult, totalResult, avgTatResult, byPartner, byAsh, byRsh, byState, byType] = await Promise.all([
    pool.query(
      `SELECT 
        ticket_id as "ticketId",
        created_on as "createdOn",
        product,
        category,
        service_partner_name as "servicePartner",
        COALESCE(ash, 'N/A') as ash,
        COALESCE(rsh, 'N/A') as rsh,
        COALESCE(state, 'Unknown') as state,
        closed_date as "closedDate",
        tat_minutes::numeric as "tatMinutes",
        support_type as "supportType",
        ticket_type as "ticketType",
        closure_type as "closureType",
        customer_name as "customerName"
      FROM closed_tickets
      ${where}
      ORDER BY closed_date DESC NULLS LAST
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, offset],
    ),
    pool.query(`SELECT COUNT(*) as count FROM closed_tickets ${where}`, values),
    pool.query(`SELECT AVG(tat_minutes::numeric) as avg_tat FROM closed_tickets ${where}`, values),
    pool.query(
      `SELECT COALESCE(service_partner_name, 'Unknown') as label, COUNT(*) as count, AVG(tat_minutes::numeric) as avg_tat_minutes FROM closed_tickets ${where} GROUP BY service_partner_name ORDER BY count DESC LIMIT 15`,
      values,
    ),
    pool.query(
      `SELECT COALESCE(ash, 'N/A') as label, COUNT(*) as count, AVG(tat_minutes::numeric) as avg_tat_minutes FROM closed_tickets ${where} GROUP BY ash ORDER BY count DESC LIMIT 15`,
      values,
    ),
    pool.query(
      `SELECT COALESCE(rsh, 'N/A') as label, COUNT(*) as count, AVG(tat_minutes::numeric) as avg_tat_minutes FROM closed_tickets ${where} GROUP BY rsh ORDER BY count DESC LIMIT 15`,
      values,
    ),
    pool.query(
      `SELECT COALESCE(state, 'Unknown') as label, COUNT(*) as count, AVG(tat_minutes::numeric) as avg_tat_minutes FROM closed_tickets ${where} GROUP BY state ORDER BY count DESC LIMIT 15`,
      values,
    ),
    pool.query(
      `SELECT COALESCE(ticket_type, 'Unknown') as label, COUNT(*) as count, AVG(tat_minutes::numeric) as avg_tat_minutes FROM closed_tickets ${where} GROUP BY ticket_type ORDER BY count DESC`,
      values,
    ),
  ]);

  const fmtTatRows = (rows: Record<string, unknown>[]) =>
    rows.map((r) => ({
      label: r.label,
      count: parseInt(String(r.count), 10),
      avgTatMinutes: r.avg_tat_minutes != null ? parseFloat(String(r.avg_tat_minutes)) : null,
    }));

  res.json({
    tickets: ticketsResult.rows.map((r: Record<string, unknown>) => ({
      ...r,
      tatMinutes: r.tatMinutes != null ? parseFloat(String(r.tatMinutes)) : null,
    })),
    total: parseInt(totalResult.rows[0]?.count ?? "0", 10),
    avgTat: avgTatResult.rows[0]?.avg_tat != null ? parseFloat(avgTatResult.rows[0].avg_tat) : null,
    byServicePartner: fmtTatRows(byPartner.rows),
    byAsh: fmtTatRows(byAsh.rows),
    byRsh: fmtTatRows(byRsh.rows),
    byState: fmtTatRows(byState.rows),
    byTicketType: fmtTatRows(byType.rows),
  });
});

export default router;
