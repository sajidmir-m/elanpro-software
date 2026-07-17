import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import type { FilterParams } from "../lib/filters";
import {
  average,
  fetchMrfRows,
  fetchTicketRows,
  groupCount,
} from "../lib/ticket-query";

const router: IRouter = Router();

function lower(value: unknown): string {
  return String(value ?? "").toLowerCase();
}

router.get("/reports/product-failure", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = req.query as FilterParams;
    const rows = await fetchTicketRows("closed_tickets", params);
    const grouped = new Map<string, Record<string, unknown>>();

    for (const row of rows) {
      const key = `${row.product ?? "Unknown"}|${row.category ?? "Unknown"}`;
      const current = grouped.get(key) ?? {
        product: row.product ?? "Unknown",
        category: row.category ?? "Unknown",
        totalTickets: 0,
        breakdownTickets: 0,
        pmTickets: 0,
        warrantyCount: 0,
        outOfWarrantyCount: 0,
      };

      current.totalTickets = Number(current.totalTickets) + 1;
      if (lower(row.ticket_type).includes("breakdown")) current.breakdownTickets = Number(current.breakdownTickets) + 1;
      if (lower(row.ticket_type).includes("pm") || lower(row.service_type).includes("pm")) {
        current.pmTickets = Number(current.pmTickets) + 1;
      }
      const support = lower(row.support_type);
      if (support.includes("warranty") && !support.includes("out") && !support.includes("unverified")) {
        current.warrantyCount = Number(current.warrantyCount) + 1;
      }
      if (support.includes("out") || support.includes("unverified")) {
        current.outOfWarrantyCount = Number(current.outOfWarrantyCount) + 1;
      }
      grouped.set(key, current);
    }

    res.json(
      [...grouped.values()]
        .sort((a, b) => Number(b.totalTickets) - Number(a.totalTickets))
        .slice(0, 50)
        .map((row) => ({
          product: row.product,
          category: row.category,
          totalTickets: Number(row.totalTickets),
          breakdownTickets: Number(row.breakdownTickets),
          pmTickets: Number(row.pmTickets),
          warrantyCount: Number(row.warrantyCount),
          outOfWarrantyCount: Number(row.outOfWarrantyCount),
        })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load product failure report" });
  }
});

router.get("/reports/component-failure", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = req.query as { dateFrom?: string; dateTo?: string; category?: string; product?: string };
    const rows = await fetchMrfRows(params);
    const grouped = new Map<string, Record<string, unknown>>();

    for (const row of rows) {
      const key = `${row.component_name ?? "Unknown"}|${row.part_code ?? ""}`;
      const current = grouped.get(key) ?? {
        component: row.component_name ?? "Unknown",
        partCode: row.part_code ?? "",
        usageCount: 0,
        productList: new Set<string>(),
      };

      current.usageCount = Number(current.usageCount) + Number(row.quantity ?? 0);
      if (row.product) (current.productList as Set<string>).add(String(row.product));
      grouped.set(key, current);
    }

    res.json(
      [...grouped.values()]
        .sort((a, b) => Number(b.usageCount) - Number(a.usageCount))
        .slice(0, 50)
        .map((row) => ({
          component: row.component,
          partCode: row.partCode,
          usageCount: Number(row.usageCount),
          productList: [...(row.productList as Set<string>)],
        })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load component failure report" });
  }
});

router.get("/reports/warranty-analysis", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = req.query as FilterParams;
    const [activeRows, closedRows] = await Promise.all([
      fetchTicketRows("active_tickets", params),
      fetchTicketRows("closed_tickets", params),
    ]);
    const rows = [...activeRows, ...closedRows];

    const summary = {
      inWarranty: 0,
      outOfWarranty: 0,
      unverified: 0,
      extended: 0,
      jeevanam: 0,
    };

    for (const row of rows) {
      const support = lower(row.support_type);
      if (support.includes("in warranty")) summary.inWarranty += 1;
      if (support.includes("out")) summary.outOfWarranty += 1;
      if (support.includes("unverified")) summary.unverified += 1;
      if (support.includes("extended")) summary.extended += 1;
      if (support.includes("jeevanam")) summary.jeevanam += 1;
    }

    const fmtWarranty = (field: string, limit = 15) => {
      const groups = new Map<string, { inWarranty: number; outOfWarranty: number; unverified: number }>();
      for (const row of rows) {
        const label = String(row[field] ?? "Unknown");
        const current = groups.get(label) ?? { inWarranty: 0, outOfWarranty: 0, unverified: 0 };
        const support = lower(row.support_type);
        if (support.includes("in warranty")) current.inWarranty += 1;
        if (support.includes("out")) current.outOfWarranty += 1;
        if (support.includes("unverified")) current.unverified += 1;
        groups.set(label, current);
      }
      return [...groups.entries()]
        .map(([label, counts]) => ({ label, ...counts }))
        .sort((a, b) => b.inWarranty + b.outOfWarranty + b.unverified - (a.inWarranty + a.outOfWarranty + a.unverified))
        .slice(0, limit);
    };

    res.json({
      summary,
      byProduct: fmtWarranty("product", 20),
      byServicePartner: fmtWarranty("service_partner_name"),
      byState: fmtWarranty("state"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load warranty analysis report" });
  }
});

router.get("/reports/sales-complaint", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = req.query as { dateFrom?: string; dateTo?: string; category?: string; product?: string; state?: string };
    const filterParams: FilterParams = {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      category: params.category,
      product: params.product,
      state: params.state,
    };
    const [activeRows, closedRows] = await Promise.all([
      fetchTicketRows("active_tickets", filterParams),
      fetchTicketRows("closed_tickets", filterParams),
    ]);
    const rows = [...activeRows, ...closedRows];
    const grouped = new Map<string, Record<string, unknown>>();

    for (const row of rows) {
      const key = `${row.product ?? "Unknown"}|${row.category ?? "Unknown"}|${row.state ?? "Unknown"}`;
      const current = grouped.get(key) ?? {
        product: row.product ?? "Unknown",
        category: row.category ?? "Unknown",
        state: row.state ?? "Unknown",
        bdTickets: 0,
        totalTickets: 0,
      };
      current.totalTickets = Number(current.totalTickets) + 1;
      if (lower(row.ticket_type).includes("breakdown")) current.bdTickets = Number(current.bdTickets) + 1;
      grouped.set(key, current);
    }

    res.json(
      [...grouped.values()]
        .sort((a, b) => Number(b.totalTickets) - Number(a.totalTickets))
        .slice(0, 50)
        .map((row) => ({
          product: row.product,
          category: row.category,
          state: row.state,
          bdTickets: Number(row.bdTickets),
          totalTickets: Number(row.totalTickets),
        })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load sales complaint report" });
  }
});

router.get("/reports/tat-analysis", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = req.query as FilterParams;
    const rows = (await fetchTicketRows("closed_tickets", params)).filter(
      (row) => row.tat_minutes != null,
    );
    const tatValues = rows
      .map((row) => Number(row.tat_minutes))
      .filter((value) => !Number.isNaN(value))
      .sort((a, b) => a - b);

    const median = tatValues.length
      ? tatValues.length % 2
        ? tatValues[Math.floor(tatValues.length / 2)]
        : (tatValues[tatValues.length / 2 - 1] + tatValues[tatValues.length / 2]) / 2
      : null;

    const overall = {
      avgTatMinutes: average(tatValues),
      medianTatMinutes: median,
      within24h: tatValues.filter((value) => value <= 1440).length,
      within48h: tatValues.filter((value) => value > 1440 && value <= 2880).length,
      within72h: tatValues.filter((value) => value > 2880 && value <= 4320).length,
      above72h: tatValues.filter((value) => value > 4320).length,
    };

    const fmtTat = (field: string) => {
      const groups = new Map<string, number[]>();
      for (const row of rows) {
        const label = String(row[field] ?? (field === "ash" || field === "rsh" ? "N/A" : "Unknown"));
        const bucket = groups.get(label) ?? [];
        bucket.push(Number(row.tat_minutes));
        groups.set(label, bucket);
      }
      return [...groups.entries()]
        .map(([label, values]) => ({
          label,
          count: values.length,
          avgTatMinutes: average(values),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
    };

    res.json({
      overall,
      stages: {
        wipAvgMinutes: null,
        mrfRequestAvgMinutes: null,
        mrfApprovedAvgMinutes: null,
        dispatchedAvgMinutes: null,
      },
      byServicePartner: fmtTat("service_partner_name"),
      byAsh: fmtTat("ash"),
      byRsh: fmtTat("rsh"),
      byState: fmtTat("state"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load TAT analysis report" });
  }
});

router.get("/reports/mrf-analysis", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = req.query as { servicePartner?: string; ash?: string; rsh?: string };
    const rows = await fetchMrfRows(params);

    const counts = {
      total: rows.length,
      approved: 0,
      pending: 0,
      dispatched: 0,
    };

    for (const row of rows) {
      const status = lower(row.mrf_status);
      if (status.includes("approved")) counts.approved += 1;
      else if (status.includes("dispatch")) counts.dispatched += 1;
      else counts.pending += 1;
    }

    const byComponent = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const key = `${row.component_name ?? "Unknown"}|${row.part_code ?? ""}`;
      const current = byComponent.get(key) ?? {
        component: row.component_name ?? "Unknown",
        partCode: row.part_code ?? "",
        quantity: 0,
        mrfCount: 0,
      };
      current.quantity = Number(current.quantity) + Number(row.quantity ?? 0);
      current.mrfCount = Number(current.mrfCount) + 1;
      byComponent.set(key, current);
    }

    res.json({
      totalMrf: counts.total,
      approved: counts.approved,
      pending: counts.pending,
      dispatched: counts.dispatched,
      byComponent: [...byComponent.values()]
        .sort((a, b) => Number(b.quantity) - Number(a.quantity))
        .slice(0, 20)
        .map((row) => ({
          component: row.component,
          partCode: row.partCode,
          quantity: Number(row.quantity),
          mrfCount: Number(row.mrfCount),
        })),
      byServicePartner: groupCount(rows, "service_partner_name"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load MRF analysis report" });
  }
});

export default router;
