import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import type { FilterParams } from "../lib/filters";
import {
  average,
  fetchMrfRows,
  fetchRecentUploads,
  fetchTicketRows,
  groupCount,
  attachTicketAges,
  rowAgeDays,
} from "../lib/ticket-query";

function isPendingNpcApproval(row: Record<string, unknown>): boolean {
  const value = String(row.npc_approval ?? "").trim().toLowerCase();
  return value === "" || value === "pending";
}

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = req.query as FilterParams;
    const [activeRows, closedRows, mrfRows, recentUploads] = await Promise.all([
      fetchTicketRows("active_tickets", params),
      fetchTicketRows("closed_tickets", params),
      fetchMrfRows(params),
      fetchRecentUploads(5),
    ]);

    attachTicketAges(activeRows);

    const pendingByAge = {
      within7Days: 0,
      within15Days: 0,
      within30Days: 0,
      above30Days: 0,
    };

    for (const row of activeRows) {
      const age = rowAgeDays(row);
      if (age <= 7) pendingByAge.within7Days += 1;
      else if (age <= 15) pendingByAge.within15Days += 1;
      else if (age <= 30) pendingByAge.within30Days += 1;
      else pendingByAge.above30Days += 1;
    }

    res.json({
      totalActive: activeRows.length,
      totalClosed: closedRows.length,
      totalMrf: mrfRows.length,
      mrfPendingNpcApproval: mrfRows.filter(isPendingNpcApproval).length,
      avgTatMinutes: average(
        closedRows.map((row) =>
          row.tat_minutes != null ? Number(row.tat_minutes) : null,
        ),
      ),
      pendingByAge,
      byState: groupCount(activeRows, "state", "Unknown", 100),
      byCategory: groupCount(activeRows, "category", "Unknown", 10),
      byCustomerCategory: groupCount(activeRows, "customer_category", "Unknown", 50),
      recentUploads: recentUploads.map((upload) => ({
        id: upload.id,
        filename: upload.filename,
        fileType: upload.file_type,
        recordCount: upload.record_count,
        uploadedAt: upload.uploaded_at,
        status: upload.status,
        errorMessage: upload.error_message ?? null,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load dashboard summary" });
  }
});

router.get("/dashboard/active-tickets", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = req.query as FilterParams & { page?: string; pageSize?: string };
    const page = Math.max(1, parseInt(params.page ?? "1", 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(params.pageSize ?? "50", 10)));
    const offset = (page - 1) * pageSize;

    const rows = await fetchTicketRows("active_tickets", params);
    const pageRows = rows.slice(offset, offset + pageSize);

    res.json({
      tickets: pageRows.map((row) => ({
        ticketId: row.ticket_id,
        createdOn: row.created_on,
        product: row.product,
        category: row.category,
        servicePartner: row.service_partner_name,
        ash: row.ash ?? "N/A",
        rsh: row.rsh ?? "N/A",
        state: row.state ?? "Unknown",
        status: row.ticket_status,
        wipSubStage: row.wip_sub_stage,
        ticketType: row.ticket_type,
        supportType: row.support_type,
        customerName: row.customer_name,
        ageDays: rowAgeDays(row),
      })),
      total: rows.length,
      byProduct: groupCount(rows, "product"),
      byServicePartner: groupCount(rows, "service_partner_name"),
      byAsh: groupCount(rows, "ash", "N/A"),
      byRsh: groupCount(rows, "rsh", "N/A"),
      byAgeBucket: buildAgeBuckets(rows),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load active tickets" });
  }
});

router.get("/dashboard/closed-tickets", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = req.query as FilterParams & { page?: string; pageSize?: string };
    const page = Math.max(1, parseInt(params.page ?? "1", 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(params.pageSize ?? "50", 10)));
    const offset = (page - 1) * pageSize;

    const rows = await fetchTicketRows("closed_tickets", params);
    const pageRows = rows.slice(offset, offset + pageSize);

    res.json({
      tickets: pageRows.map((row) => ({
        ticketId: row.ticket_id,
        createdOn: row.created_on,
        product: row.product,
        category: row.category,
        servicePartner: row.service_partner_name,
        ash: row.ash ?? "N/A",
        rsh: row.rsh ?? "N/A",
        state: row.state ?? "Unknown",
        closedDate: row.closed_date,
        tatMinutes: row.tat_minutes != null ? Number(row.tat_minutes) : null,
        supportType: row.support_type,
        ticketType: row.ticket_type,
        closureType: row.closure_type,
        customerName: row.customer_name,
      })),
      total: rows.length,
      avgTat: average(
        rows.map((row) => (row.tat_minutes != null ? Number(row.tat_minutes) : null)),
      ),
      byServicePartner: groupCountWithAvg(rows, "service_partner_name"),
      byAsh: groupCountWithAvg(rows, "ash", "N/A"),
      byRsh: groupCountWithAvg(rows, "rsh", "N/A"),
      byState: groupCountWithAvg(rows, "state"),
      byTicketType: groupCountWithAvg(rows, "ticket_type"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load closed tickets" });
  }
});

function buildAgeBuckets(rows: Record<string, unknown>[]) {
  const buckets = new Map<string, number>([
    ["0-7 days", 0],
    ["8-15 days", 0],
    ["16-30 days", 0],
    ["30+ days", 0],
  ]);

  for (const row of rows) {
    const age = rowAgeDays(row);
    if (age <= 7) buckets.set("0-7 days", (buckets.get("0-7 days") ?? 0) + 1);
    else if (age <= 15) buckets.set("8-15 days", (buckets.get("8-15 days") ?? 0) + 1);
    else if (age <= 30) buckets.set("16-30 days", (buckets.get("16-30 days") ?? 0) + 1);
    else buckets.set("30+ days", (buckets.get("30+ days") ?? 0) + 1);
  }

  return [...buckets.entries()].map(([label, count]) => ({ label, count }));
}

function groupCountWithAvg(
  rows: Record<string, unknown>[],
  field: string,
  fallback = "Unknown",
) {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const label = String(row[field] ?? fallback) || fallback;
    const bucket = groups.get(label) ?? [];
    bucket.push(row);
    groups.set(label, bucket);
  }

  return [...groups.entries()]
    .map(([label, groupRows]) => ({
      label,
      count: groupRows.length,
      avgTatMinutes: average(
        groupRows.map((row) =>
          row.tat_minutes != null ? Number(row.tat_minutes) : null,
        ),
      ),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

export default router;
