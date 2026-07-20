import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import {
  applyHierarchySelection,
  average,
  classifyWarranty,
  fetchActive,
  fetchClosed,
  fetchMrf,
  fetchSales,
  groupCount,
  groupSum,
  hierarchyField,
  hoursBetween,
  nextHierarchyLevel,
  statusBreakdown,
  ageBreakdown,
  ageUrgency,
  bucketStatus,
  groupAgeByRegion,
  groupAgeByField,
  resolveRegion,
  operationalReasonForRow,
  summarizeActiveByAge,
  summarizeActiveRows,
  summarizeCallAgeDashboard,
  summarizeClosureDashboard,
  summarizeLiveOperationsDashboard,
  type AnalyticsParams,
} from "../lib/analytics";
import { attachTicketAges, rowAgeDays } from "../lib/ticket-query";
import { componentCategory } from "../lib/component-taxonomy";
import { matchesServicePartner } from "../lib/filters";

const router: IRouter = Router();

function q(req: { query: Record<string, unknown> }): AnalyticsParams {
  return req.query as AnalyticsParams;
}

router.get("/analytics/live-operations", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = q(req);
    const [active, closed] = await Promise.all([fetchActive(params), fetchClosed(params)]);
    res.json(summarizeLiveOperationsDashboard(active, closed));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load live operations dashboard" });
  }
});

router.get("/analytics/closure-operations", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = q(req);
    const closed = await fetchClosed(params);
    res.json(summarizeClosureDashboard(closed, params));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load closure analytics dashboard" });
  }
});

router.get("/analytics/status-calls", requireAuth, async (req, res): Promise<void> => {
  try {
    const requestedStatus = String(req.query.status ?? "").toUpperCase();
    if (requestedStatus !== "WIP" && requestedStatus !== "MRF") {
      res.status(400).json({ message: "status must be WIP or MRF" });
      return;
    }

    const params: AnalyticsParams = { ...q(req), ticketStatus: null };
    const active = await fetchActive(params);
    attachTicketAges(active);
    const rows = active
      .filter((row) => bucketStatus(row) === requestedStatus)
      .map((row) => ({
        ticketId: String(row.ticket_id ?? "—"),
        ticketStatus: String(row.ticket_status ?? "—"),
        classification: requestedStatus,
        reason: operationalReasonForRow(row, requestedStatus),
        wipSubStage: String(row.wip_sub_stage ?? "—"),
        lastAction: String(row.last_action ?? "—"),
        servicePartner: String(row.service_partner_name ?? "—"),
        reportingManager: String(row.ash ?? "—"),
        rsh: String(row.rsh ?? "—"),
        product: String(row.product ?? "—"),
        category: String(row.category ?? "—"),
        customer: String(row.customer_name ?? "—"),
        customerCategory: String(row.customer_category ?? "—"),
        address: String(row.ticket_territory ?? row.state ?? "—").trim() || "—",
        city: String(row.city ?? "—"),
        state: String(row.state ?? "—"),
        components: String(row.components ?? "—"),
        reOpenTicket: String(row.re_open_ticket ?? "No"),
        repeatTicket: String(row.repeat_ticket ?? "No"),
        mrfApproval: String(row.mrf_approval ?? "No MRF"),
        mrfStatus: String(row.mrf_status ?? "—"),
        mrfComponents: String(row.mrf_components ?? "—"),
        mrfApprovedBy: String(row.mrf_approved_by ?? "—"),
        mrfApprovedDate: row.mrf_approved_date ?? null,
        mrfDispatchDate: row.mrf_dispatch_date ?? null,
        ageDays: rowAgeDays(row),
        createdOn: row.created_on ?? null,
      }))
      .sort((a, b) => b.ageDays - a.ageDays);

    res.json({ status: requestedStatus, total: rows.length, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load status call details" });
  }
});

router.get("/analytics/live-operations/drilldown", requireAuth, async (req, res): Promise<void> => {
  try {
    const view = String(req.query.view ?? "");
    const views: Record<
      string,
      { title: string; value: (row: Record<string, unknown>) => unknown }
    > = {
      servicePartners: { title: "All Service Partners", value: (row) => row.service_partner_name },
      regions: { title: "All Regions", value: (row) => resolveRegion(row) },
      products: { title: "All Products", value: (row) => row.product },
      customerCategories: { title: "All Customer Categories", value: (row) => row.customer_category },
      customers: { title: "All Customers", value: (row) => row.customer_name },
      warranty: { title: "Warranty and Support Types", value: (row) => row.support_type },
      mrfApproval: { title: "MRF Approval Status", value: (row) => row.mrf_approval },
      ticketTypes: { title: "Ticket Type / Scheduled Service Breakdown", value: (row) => row.ticket_type },
      problemDescriptions: { title: "Problem Descriptions", value: (row) => row.problem_description },
      priorities: { title: "Ticket Priorities", value: (row) => row.ticket_priority },
      statuses: { title: "Uploaded Ticket Statuses", value: (row) => row.ticket_status },
      wipStages: { title: "WIP Sub-Stages and Reasons", value: (row) => row.wip_sub_stage },
      lastActions: { title: "Last Recorded Actions", value: (row) => row.last_action },
      cities: { title: "All Cities", value: (row) => row.city },
    };
    const definition = views[view];
    if (!definition) {
      res.status(400).json({ message: "Unsupported live-operations drill-down view" });
      return;
    }

    const params: AnalyticsParams = { ...q(req) };
    if (view === "servicePartners") params.servicePartner = null;
    if (view === "regions") params.region = null;
    if (view === "products") params.product = null;
    if (view === "warranty") params.warranty = null;
    if (view === "statuses") params.ticketStatus = null;

    const active = await fetchActive(params);
    attachTicketAges(active);
    const groups = new Map<string, { count: number; overdue: number; ageSum: number }>();
    const rows = active.map((row) => {
      const group = String(definition.value(row) ?? "").trim() || "Not recorded";
      const ageDays = rowAgeDays(row);
      const aggregate = groups.get(group) ?? { count: 0, overdue: 0, ageSum: 0 };
      aggregate.count += 1;
      aggregate.ageSum += ageDays;
      if (ageDays > 5) aggregate.overdue += 1;
      groups.set(group, aggregate);

      return {
        group,
        ticketId: String(row.ticket_id ?? "—"),
        createdOn: row.created_on ?? null,
        ageDays,
        customer: String(row.customer_name ?? "—"),
        customerCategory: String(row.customer_category ?? "—"),
        address: String(row.ticket_territory ?? row.state ?? "—").trim() || "—",
        city: String(row.city ?? "—"),
        state: String(row.state ?? "—"),
        servicePartner: String(row.service_partner_name ?? "—"),
        reportingManager: String(row.ash ?? "—"),
        rsh: String(row.rsh ?? "—"),
        product: String(row.product ?? "—"),
        productCategory: String(row.category ?? "—"),
        warranty: String(row.support_type ?? "Not recorded"),
        ticketType: String(row.ticket_type ?? "Not recorded"),
        problemDescription: String(row.problem_description ?? "—"),
        priority: String(row.ticket_priority ?? "Not recorded"),
        ticketStatus: String(row.ticket_status ?? "Not recorded"),
        wipSubStage: String(row.wip_sub_stage ?? "—"),
        lastAction: String(row.last_action ?? "—"),
        components: String(row.components ?? "—"),
        reOpenTicket: String(row.re_open_ticket ?? "No"),
        repeatTicket: String(row.repeat_ticket ?? "No"),
        mrfApproval: String(row.mrf_approval ?? "No MRF"),
        mrfStatus: String(row.mrf_status ?? "—"),
        mrfComponents: String(row.mrf_components ?? "—"),
        mrfApprovedBy: String(row.mrf_approved_by ?? "—"),
        mrfApprovedDate: row.mrf_approved_date ?? null,
        mrfDispatchDate: row.mrf_dispatch_date ?? null,
      };
    });

    const summary = [...groups.entries()]
      .map(([label, aggregate]) => ({
        label,
        count: aggregate.count,
        overdue: aggregate.overdue,
        overduePct:
          aggregate.count > 0 ? Math.round((aggregate.overdue / aggregate.count) * 100) : 0,
        avgAge: aggregate.count > 0 ? Math.round(aggregate.ageSum / aggregate.count) : 0,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    res.json({
      view,
      title: definition.title,
      totalCalls: rows.length,
      uniqueValues: summary.length,
      groups: summary,
      rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load live-operations drill-down" });
  }
});

router.get("/analytics/call-age", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = q(req);
    const rows = await fetchActive(params);
    res.json(summarizeCallAgeDashboard(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load call age dashboard" });
  }
});

router.get("/analytics/hierarchy", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = q(req);
    // `level` = dimension we are listing now; prior selection uses nationalHead/rsh/servicePartner/ash query params
    const level = String(params.level ?? "ash");
    const selected = await fetchActive(params);
    const field = hierarchyField(level);
    const entities = groupCount(selected, field, "Unassigned", 30);
    const nextLevel = nextHierarchyLevel(level);
    const mrf = await fetchMrf(params);

    res.json({
      level,
      nextLevel,
      totalTickets: selected.length,
      entities,
      statusMix: statusBreakdown(selected),
      ageMix: ageBreakdown(selected),
      byProduct: groupCount(selected, "product", "Unknown", 15),
      byReportingManager: groupCount(selected, "ash", "Unassigned", 12),
      byRegionAge: groupAgeByRegion(selected, 20),
      byRshAge: groupAgeByField(selected, "rsh", "Unassigned", 12),
      mrfByCategory: groupSum(mrf, "category", "quantity", "Unknown", 15),
      topServicePartners: groupCount(selected, "service_partner_name", "Unknown", 10),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load hierarchy analytics" });
  }
});

router.get("/analytics/status-breakdown", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = q(req);
    const scoped = applyHierarchySelection(params, params.level as string, params.value as string);
    const active = await fetchActive(scoped);
    res.json({
      total: active.length,
      buckets: statusBreakdown(active),
      byProduct: groupCount(active, "product", "Unknown", 15),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load status breakdown" });
  }
});

router.get("/analytics/mrf-by-category", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = q(req);
    const scoped = applyHierarchySelection(params, params.level as string, params.value as string);
    const mrf = await fetchMrf(scoped);
    const filtered = params.category
      ? mrf.filter((r) => String(r.category ?? "").toLowerCase() === String(params.category).toLowerCase())
      : mrf;

    res.json({
      byCategory: groupSum(mrf, "category", "quantity", "Unknown", 20),
      byComponent: groupSum(filtered, "component_name", "quantity", "Unknown", 25),
      totalQuantity: filtered.reduce((s, r) => s + Number(r.quantity ?? 0), 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load MRF category analytics" });
  }
});

router.get("/analytics/consumption", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = q(req);
    const step = String(req.query.step ?? "ash");
    let mrf = await fetchMrf(params);
    const active = await fetchActive(params);
    const closed = await fetchClosed(params);
    const ticketsById = new Map<string, Record<string, unknown>>();
    for (const t of [...active, ...closed]) {
      ticketsById.set(String(t.ticket_id), t);
    }

    if (params.ash) mrf = mrf.filter((r) => matchesServicePartner(r.ash, params.ash));
    if (params.servicePartner) {
      mrf = mrf.filter((r) => matchesServicePartner(r.service_partner_name, params.servicePartner));
    }
    if (params.area) {
      mrf = mrf.filter((r) => String(r.state ?? r.dispatch_state ?? "").toLowerCase() === String(params.area).toLowerCase());
    }
    if (params.product) {
      mrf = mrf.filter((r) => matchesServicePartner(r.product, params.product));
    }
    if (params.category) {
      mrf = mrf.filter((r) => String(r.category ?? "").toLowerCase() === String(params.category).toLowerCase());
    }
    if (params.component) {
      mrf = mrf.filter((r) => String(r.component_name ?? "").toLowerCase() === String(params.component).toLowerCase());
    }

    if (step === "ash") {
      res.json({
        step: "ash",
        items: groupSum(mrf, "ash", "quantity", "Unassigned", 25),
        topServicePartners: groupSum(mrf, "service_partner_name", "quantity", "Unknown", 10),
      });
      return;
    }

    if (step === "partners") {
      const byArea = new Map<string, number>();
      for (const row of mrf) {
        const partner = String(row.service_partner_name ?? "Unknown");
        const area = String(row.state ?? row.dispatch_state ?? "Unknown");
        const key = `${partner}|||${area}`;
        byArea.set(key, (byArea.get(key) ?? 0) + Number(row.quantity ?? 0));
      }
      res.json({
        step: "partners",
        items: [...byArea.entries()]
          .map(([key, count]) => {
            const [partner, area] = key.split("|||");
            return { label: partner, area, count };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 30),
        topServicePartners: groupSum(mrf, "service_partner_name", "quantity", "Unknown", 10),
      });
      return;
    }

    if (step === "products") {
      res.json({
        step: "products",
        items: groupSum(mrf, "product", "quantity", "Unknown", 40),
        topServicePartners: groupSum(mrf, "service_partner_name", "quantity", "Unknown", 10),
      });
      return;
    }

    if (step === "categories") {
      res.json({
        step: "categories",
        items: groupSum(mrf, "category", "quantity", "Unknown", 30),
      });
      return;
    }

    if (step === "components") {
      res.json({
        step: "components",
        items: groupSum(mrf, "component_name", "quantity", "Unknown", 40).map((item) => {
          const sample = mrf.find((r) => String(r.component_name ?? "Unknown") === item.label);
          return { ...item, partCode: sample?.part_code ?? "" };
        }),
      });
      return;
    }

    if (step === "serials") {
      const serials = new Map<string, { serial: string; ticketId: string; quantity: number; product: string }>();
      for (const row of mrf) {
        const ticket = ticketsById.get(String(row.ticket_id));
        const serial = String(ticket?.serial_number ?? row.ticket_id ?? "Unknown");
        const key = `${serial}|||${row.ticket_id}`;
        const current = serials.get(key) ?? {
          serial,
          ticketId: String(row.ticket_id ?? ""),
          quantity: 0,
          product: String(row.product ?? ticket?.product ?? "Unknown"),
        };
        current.quantity += Number(row.quantity ?? 0);
        serials.set(key, current);
      }
      res.json({
        step: "serials",
        items: [...serials.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 50),
      });
      return;
    }

    // detail
    const ticketId = String(params.ticketId ?? "");
    const serial = String(params.serialNumber ?? "");
    const detailRows = mrf.filter((r) => {
      const ticket = ticketsById.get(String(r.ticket_id));
      const rowSerial = String(ticket?.serial_number ?? r.ticket_id ?? "");
      if (ticketId) return String(r.ticket_id) === ticketId;
      if (serial) return rowSerial.toLowerCase() === serial.toLowerCase();
      return false;
    });

    const ticket = ticketsById.get(ticketId) ?? ticketsById.get(String(detailRows[0]?.ticket_id ?? ""));

    res.json({
      step: "detail",
      serialNumber: String(ticket?.serial_number ?? serial ?? "—"),
      ticketId: String(ticket?.ticket_id ?? ticketId ?? "—"),
      product: String(ticket?.product ?? detailRows[0]?.product ?? "—"),
      category: String(ticket?.category ?? detailRows[0]?.category ?? "—"),
      customerName: String(ticket?.customer_name ?? "—"),
      ash: String(ticket?.ash ?? detailRows[0]?.ash ?? "—"),
      servicePartner: String(ticket?.service_partner_name ?? detailRows[0]?.service_partner_name ?? "—"),
      area: String(ticket?.state ?? detailRows[0]?.state ?? detailRows[0]?.dispatch_state ?? "—"),
      warranty: classifyWarranty(ticket?.support_type ?? detailRows[0]?.support_type),
      totalQuantity: detailRows.reduce((s, r) => s + Number(r.quantity ?? 0), 0),
      replacements: detailRows.map((r) => ({
        mrfNo: r.mrf_no,
        component: r.component_name,
        partCode: r.part_code,
        quantity: Number(r.quantity ?? 0),
        status: r.mrf_status,
        issuedFrom: r.component_to_be_issued_from,
        ash: r.ash,
        servicePartner: r.service_partner_name,
        area: r.state ?? r.dispatch_state,
        mrfCreatedDate: r.mrf_created_date,
        approvedDate: r.approved_date,
        dispatchDate: r.dispatch_date,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load consumption analytics" });
  }
});

router.get("/analytics/rankings", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = q(req);
    const [active, closed, mrf] = await Promise.all([
      fetchActive(params),
      fetchClosed(params),
      fetchMrf(params),
    ]);

    const partnerStats = new Map<
      string,
      { label: string; openCalls: number; closedCalls: number; mrfQty: number; tatSum: number; tatCount: number }
    >();

    const bump = (label: string, patch: Partial<(typeof partnerStats extends Map<string, infer V> ? V : never)>) => {
      const key = label || "Unknown";
      const current = partnerStats.get(key) ?? {
        label: key,
        openCalls: 0,
        closedCalls: 0,
        mrfQty: 0,
        tatSum: 0,
        tatCount: 0,
      };
      Object.assign(current, {
        openCalls: current.openCalls + (patch.openCalls ?? 0),
        closedCalls: current.closedCalls + (patch.closedCalls ?? 0),
        mrfQty: current.mrfQty + (patch.mrfQty ?? 0),
        tatSum: current.tatSum + (patch.tatSum ?? 0),
        tatCount: current.tatCount + (patch.tatCount ?? 0),
      });
      partnerStats.set(key, current);
    };

    for (const row of active) bump(String(row.service_partner_name ?? "Unknown"), { openCalls: 1 });
    for (const row of closed) {
      const tat = row.tat_minutes != null ? Number(row.tat_minutes) : null;
      bump(String(row.service_partner_name ?? "Unknown"), {
        closedCalls: 1,
        tatSum: tat ?? 0,
        tatCount: tat != null ? 1 : 0,
      });
    }
    for (const row of mrf) {
      bump(String(row.service_partner_name ?? "Unknown"), { mrfQty: Number(row.quantity ?? 0) });
    }

    const rankings = [...partnerStats.values()]
      .map((p) => ({
        label: p.label,
        openCalls: p.openCalls,
        closedCalls: p.closedCalls,
        mrfQty: p.mrfQty,
        avgTatHours: p.tatCount ? p.tatSum / p.tatCount / 60 : null,
        score: p.openCalls + p.closedCalls + p.mrfQty,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    res.json({ topServicePartners: rankings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load rankings" });
  }
});

router.get("/analytics/stage-tat", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = q(req);
    const [active, closed, mrf] = await Promise.all([
      fetchActive(params),
      fetchClosed(params),
      fetchMrf(params),
    ]);

    const mrfByTicket = new Map<string, Date>();
    for (const row of mrf) {
      const d = hoursBetween(row.created_on, row.mrf_created_date);
      // track earliest mrf date per ticket via parse
      const created = row.mrf_created_date;
      const ticketId = String(row.ticket_id ?? "");
      if (!ticketId || !created) continue;
      const parsed = (() => {
        const raw = String(created);
        if (/^[0-9]{2}-[0-9]{2}-[0-9]{4}/.test(raw)) {
          const [day, month, year] = raw.split(",")[0].trim().split("-").map(Number);
          return new Date(year, month - 1, day);
        }
        return new Date(raw);
      })();
      if (Number.isNaN(parsed.getTime())) continue;
      const prev = mrfByTicket.get(ticketId);
      if (!prev || parsed < prev) mrfByTicket.set(ticketId, parsed);
    }

    type Slice = {
      label: string;
      wipHours: number[];
      mrfHours: number[];
      closeHours: number[];
      excelTatMinutes: number[];
      inWarranty: number;
      outWarranty: number;
    };
    const slices = new Map<string, Slice>();

    const ensure = (dim: string, label: string) => {
      const key = `${dim}:::${label}`;
      if (!slices.has(key)) {
        slices.set(key, {
          label,
          wipHours: [],
          mrfHours: [],
          closeHours: [],
          excelTatMinutes: [],
          inWarranty: 0,
          outWarranty: 0,
        });
      }
      return slices.get(key)!;
    };

    const pushTicket = (row: Record<string, unknown>, closedRow: boolean) => {
      const warranty = classifyWarranty(row.support_type);
      const dims = [
        ["product", String(row.product ?? "Unknown")],
        ["customer", String(row.customer_name ?? "Unknown")],
        ["service_partner", String(row.service_partner_name ?? "Unknown")],
        ["ash", String(row.ash ?? "Unknown")],
        ["rsh", String(row.rsh ?? "Unknown")],
      ] as const;

      const wipH = hoursBetween(row.created_on, row.wip_sub_stage_date);
      const ticketId = String(row.ticket_id ?? "");
      const mrfDate = mrfByTicket.get(ticketId);
      const mrfH = mrfDate
        ? (() => {
            const a = (() => {
              const raw = String(row.created_on ?? "");
              if (/^[0-9]{2}-[0-9]{2}-[0-9]{4}/.test(raw)) {
                const [day, month, year] = raw.split(",")[0].trim().split("-").map(Number);
                return new Date(year, month - 1, day);
              }
              return new Date(raw);
            })();
            if (Number.isNaN(a.getTime())) return null;
            return (mrfDate.getTime() - a.getTime()) / 3_600_000;
          })()
        : null;
      const closeH = closedRow
        ? hoursBetween(row.created_on, row.closed_date) ??
          (row.tat_minutes != null ? Number(row.tat_minutes) / 60 : null)
        : null;

      for (const [dim, label] of dims) {
        const s = ensure(dim, label);
        if (wipH != null) s.wipHours.push(wipH);
        if (mrfH != null && mrfH >= 0) s.mrfHours.push(mrfH);
        if (closeH != null) s.closeHours.push(closeH);
        if (closedRow && row.tat_minutes != null) s.excelTatMinutes.push(Number(row.tat_minutes));
        if (warranty === "in") s.inWarranty += 1;
        if (warranty === "out") s.outWarranty += 1;
      }
    };

    for (const row of active) pushTicket(row, false);
    for (const row of closed) pushTicket(row, true);

    const fmtDim = (dim: string, limit = 12) =>
      [...slices.entries()]
        .filter(([key]) => key.startsWith(`${dim}:::`))
        .map(([, s]) => ({
          label: s.label,
          avgWipHours: average(s.wipHours),
          avgMrfHours: average(s.mrfHours),
          avgCloseHours: average(s.closeHours),
          avgExcelTatHours: average(s.excelTatMinutes.map((m) => m / 60)),
          inWarranty: s.inWarranty,
          outWarranty: s.outWarranty,
          samples: s.closeHours.length + s.wipHours.length,
        }))
        .sort((a, b) => (b.avgCloseHours ?? 0) - (a.avgCloseHours ?? 0))
        .slice(0, limit);

    const productSlice = [...slices.entries()].filter(([k]) => k.startsWith("product:::"));
    const wipHours = productSlice.flatMap(([, s]) => s.wipHours);
    const mrfHours = productSlice.flatMap(([, s]) => s.mrfHours);
    const closeHours = productSlice.flatMap(([, s]) => s.closeHours);
    const excelTat = productSlice.flatMap(([, s]) => s.excelTatMinutes);

    res.json({
      overall: {
        avgWipHours: average(wipHours),
        avgMrfHours: average(mrfHours),
        avgCloseHours: average(closeHours),
        avgExcelTatHours: average(excelTat.map((m) => m / 60)),
        within24h: excelTat.filter((m) => m <= 1440).length,
        within48h: excelTat.filter((m) => m > 1440 && m <= 2880).length,
        within72h: excelTat.filter((m) => m > 2880 && m <= 4320).length,
        above72h: excelTat.filter((m) => m > 4320).length,
      },
      byProduct: fmtDim("product"),
      byCustomer: fmtDim("customer"),
      byServicePartner: fmtDim("service_partner"),
      byAsh: fmtDim("ash"),
      byRsh: fmtDim("rsh"),
      note: "Stage times are approximate from available date fields (time to enter WIP / first MRF / close).",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load stage TAT analytics" });
  }
});

type ColumnDef = {
  key: string;
  label: string;
  type?: "number" | "date" | "text" | "green" | "orange" | "red";
  toneKey?: string;
};

const RECORD_COLUMNS: Record<string, ColumnDef[]> = {
  active_call_tickets: [
    { key: "ticket_id", label: "Ticket ID" },
    { key: "region", label: "Region" },
    { key: "rsh", label: "RSH" },
    { key: "reporting_manager", label: "Reporting Manager" },
    { key: "ticket_status", label: "Status" },
    { key: "product", label: "Product" },
    { key: "age_days", label: "Call Age (days)", type: "number" },
    { key: "urgency", label: "Urgency", toneKey: "urgency_tone" },
    { key: "created_on", label: "Created", type: "date" },
  ],
  active_age_summary: [
    { key: "region", label: "Region" },
    { key: "rsh", label: "RSH" },
    { key: "reporting_manager", label: "Reporting Manager" },
    { key: "green_calls", label: "≤3 days", type: "green" },
    { key: "orange_calls", label: "4-5 days", type: "orange" },
    { key: "red_calls", label: ">5 days (Urgent)", type: "red" },
    { key: "avg_age_days", label: "Avg Age (days)", type: "number" },
    { key: "max_age_days", label: "Oldest (days)", type: "number" },
    { key: "total", label: "Total", type: "number" },
  ],
  active_summary: [
    { key: "reporting_manager", label: "Reporting Manager" },
    { key: "product", label: "Product" },
    { key: "category", label: "Category" },
    { key: "service_partner", label: "Service Partner" },
    { key: "region", label: "Region" },
    { key: "assigned", label: "Assigned", type: "number" },
    { key: "wip", label: "WIP", type: "number" },
    { key: "mrf", label: "MRF", type: "number" },
    { key: "other", label: "Other", type: "number" },
    { key: "total", label: "Total", type: "number" },
  ],
  component_consumption: [
    { key: "component_category", label: "Component Category" },
    { key: "component_name", label: "Component / Model" },
    { key: "part_code", label: "Part Code" },
    { key: "product", label: "Product" },
    { key: "product_category", label: "Product Category" },
    { key: "total_quantity", label: "Total Quantity", type: "number" },
  ],
  tickets: [
    { key: "ticket_id", label: "Ticket ID" },
    { key: "ticket_status", label: "Status" },
    { key: "customer_name", label: "Customer" },
    { key: "product", label: "Product" },
    { key: "category", label: "Category" },
    { key: "support_type", label: "Warranty" },
    { key: "ticket_type", label: "Ticket Type" },
    { key: "service_partner_name", label: "Service Partner" },
    { key: "ash", label: "Reporting Manager" },
    { key: "rsh", label: "RSH" },
    { key: "state", label: "State" },
    { key: "tat_minutes", label: "TAT (min)", type: "number" },
    { key: "created_on", label: "Created", type: "date" },
  ],
  active_tickets: [
    { key: "ticket_id", label: "Ticket ID" },
    { key: "ticket_status", label: "Status" },
    { key: "wip_sub_stage", label: "WIP Stage" },
    { key: "last_action", label: "Last Action" },
    { key: "ticket_priority", label: "Priority" },
    { key: "ticket_type", label: "Ticket Type" },
    { key: "customer_name", label: "Customer" },
    { key: "customer_category", label: "Customer Category" },
    { key: "problem_description", label: "Problem" },
    { key: "product", label: "Product" },
    { key: "category", label: "Product Category" },
    { key: "support_type", label: "Warranty" },
    { key: "mrf_approval", label: "MRF Approval" },
    { key: "mrf_status", label: "MRF Status" },
    { key: "mrf_components", label: "MRF Components" },
    { key: "mrf_approved_by", label: "MRF Approved By" },
    { key: "mrf_approved_date", label: "MRF Approved Date", type: "date" },
    { key: "mrf_dispatch_date", label: "MRF Dispatch Date", type: "date" },
    { key: "service_partner_name", label: "Service Partner" },
    { key: "ash", label: "Reporting Manager" },
    { key: "rsh", label: "RSH" },
    { key: "state", label: "State" },
    { key: "created_on", label: "Created", type: "date" },
  ],
  closed_tickets: [
    { key: "ticket_id", label: "Ticket ID" },
    { key: "ticket_status", label: "Status" },
    { key: "wip_sub_stage", label: "Final WIP Stage" },
    { key: "last_action", label: "Last Action" },
    { key: "ticket_priority", label: "Priority" },
    { key: "ticket_type", label: "Ticket Type" },
    { key: "customer_name", label: "Customer" },
    { key: "customer_category", label: "Customer Category" },
    { key: "problem_description", label: "Problem" },
    { key: "product", label: "Product" },
    { key: "category", label: "Product Category" },
    { key: "support_type", label: "Warranty" },
    { key: "mrf_approval", label: "MRF Approval" },
    { key: "mrf_status", label: "MRF Status" },
    { key: "mrf_components", label: "MRF Components" },
    { key: "mrf_approved_by", label: "MRF Approved By" },
    { key: "mrf_approved_date", label: "MRF Approved Date", type: "date" },
    { key: "mrf_dispatch_date", label: "MRF Dispatch Date", type: "date" },
    { key: "service_partner_name", label: "Service Partner" },
    { key: "ash", label: "Reporting Manager" },
    { key: "rsh", label: "RSH" },
    { key: "state", label: "State" },
    { key: "tat_minutes", label: "TAT (min)", type: "number" },
    { key: "closure_type", label: "Closure Type" },
    { key: "closure_remarks", label: "Closure Remarks" },
    { key: "closure_comments", label: "Closure Comments" },
    { key: "consumed_components", label: "Consumed Components" },
    { key: "created_on", label: "Created", type: "date" },
    { key: "closed_date", label: "Closed", type: "date" },
  ],
  mrf_data: [
    { key: "mrf_no", label: "MRF No" },
    { key: "ticket_id", label: "Ticket ID" },
    { key: "component_name", label: "Component" },
    { key: "part_code", label: "Part Code" },
    { key: "quantity", label: "Qty", type: "number" },
    { key: "mrf_status", label: "MRF Status" },
    { key: "product", label: "Product" },
    { key: "category", label: "Category" },
    { key: "service_partner_name", label: "Service Partner" },
    { key: "ash", label: "Reporting Manager" },
    { key: "state", label: "State" },
    { key: "mrf_created_date", label: "MRF Date", type: "date" },
  ],
  sales_data: [
    { key: "product", label: "Product" },
    { key: "category", label: "Category" },
    { key: "state", label: "State" },
    { key: "service_partner_name", label: "Service Partner" },
    { key: "period_month", label: "Period" },
    { key: "quantity", label: "Quantity", type: "number" },
  ],
};

router.get("/analytics/records", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = q(req);
    const dataset = String(req.query.dataset ?? "active_tickets");
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const pageSize = Math.min(500, Math.max(10, Number(req.query.pageSize ?? 50) || 50));
    const sortBy = req.query.sortBy ? String(req.query.sortBy) : null;
    const sortDir = String(req.query.sortDir ?? "asc") === "desc" ? "desc" : "asc";

    const columns = RECORD_COLUMNS[dataset];
    if (!columns) {
      res.status(400).json({ message: "Unknown dataset" });
      return;
    }

    let rows: Record<string, unknown>[];
    if (dataset === "active_age_summary") {
      rows = summarizeActiveByAge(await fetchActive(params));
    } else if (dataset === "active_call_tickets") {
      const active = await fetchActive(params);
      attachTicketAges(active);
      rows = active
        .map((row) => {
          const age = rowAgeDays(row);
          const level = ageUrgency(age);
          return {
            ticket_id: row.ticket_id,
            region: resolveRegion(row),
            rsh: row.rsh,
            reporting_manager: row.ash,
            ticket_status: row.ticket_status,
            product: row.product,
            age_days: age,
            urgency:
              level === "green" ? "≤3 days" : level === "orange" ? "4-5 days" : ">5 days (Urgent)",
            urgency_tone: level,
            created_on: row.created_on,
          };
        })
        .sort((a, b) => Number(b.age_days) - Number(a.age_days));
    } else if (dataset === "active_summary") {
      rows = summarizeActiveRows(await fetchActive(params));
    } else if (dataset === "component_consumption") {
      const sourceParams = { ...params, search: null };
      const sourceRows = await fetchMrf(sourceParams);
      const grouped = new Map<string, Record<string, unknown>>();

      for (const row of sourceRows) {
        const family = componentCategory(row.component_name);
        if (
          params.componentCategory &&
          family.toLowerCase() !== String(params.componentCategory).toLowerCase()
        ) {
          continue;
        }

        const componentName = String(row.component_name ?? "Unspecified").trim() || "Unspecified";
        const partCode = String(row.part_code ?? "").trim();
        const product = String(row.product ?? "Unspecified").trim() || "Unspecified";
        const productCategory = String(row.category ?? "Unspecified").trim() || "Unspecified";
        const key = [family, componentName, partCode, product, productCategory].join("|||");
        const current = grouped.get(key) ?? {
          component_category: family,
          component_name: componentName,
          part_code: partCode || null,
          product,
          product_category: productCategory,
          total_quantity: 0,
        };
        current.total_quantity = Number(current.total_quantity ?? 0) + Number(row.quantity ?? 0);
        grouped.set(key, current);
      }

      rows = [...grouped.values()];
      const search = String(params.search ?? "").trim().toLowerCase();
      if (search) {
        rows = rows.filter((row) =>
          Object.values(row).some(
            (value) => value != null && String(value).toLowerCase().includes(search),
          ),
        );
      }
    } else if (dataset === "tickets") {
      const [active, closed] = await Promise.all([fetchActive(params), fetchClosed(params)]);
      rows = [...active, ...closed];
    } else if (dataset === "active_tickets") rows = await fetchActive(params);
    else if (dataset === "closed_tickets") rows = await fetchClosed(params);
    else if (dataset === "mrf_data") rows = await fetchMrf(params);
    else rows = await fetchSales(params);

    if (sortBy) {
      const col = columns.find((c) => c.key === sortBy);
      rows = [...rows].sort((a, b) => {
        const av = a[sortBy];
        const bv = b[sortBy];
        let cmp: number;
        if (col?.type === "number") {
          cmp = (Number(av) || 0) - (Number(bv) || 0);
        } else {
          cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
        }
        return sortDir === "desc" ? -cmp : cmp;
      });
    }

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize).map((row) => {
      const picked: Record<string, unknown> = {};
      for (const col of columns) picked[col.key] = row[col.key] ?? null;
      return picked;
    });

    res.json({ dataset, columns, rows: pageRows, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load records" });
  }
});

router.get("/analytics/sales-vs-bd", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = q(req);
    const [active, closed, sales] = await Promise.all([
      fetchActive(params),
      fetchClosed(params),
      fetchSales(params),
    ]);
    const tickets = [...active, ...closed];

    const bdRows = tickets.filter((r) => String(r.ticket_type ?? "").toLowerCase().includes("breakdown"));

    if (sales.length === 0) {
      res.json({
        hasSales: false,
        totalBd: bdRows.length,
        totalSales: 0,
        byProduct: [],
        byCategory: [],
        byState: [],
        message: "Upload sales data to see BD vs Sales ratios.",
      });
      return;
    }

    const salesBy = (field: string) => {
      const map = new Map<string, { sales: number; bd: number; totalTickets: number }>();
      for (const row of sales) {
        const label = String(row[field] ?? "Unknown");
        const cur = map.get(label) ?? { sales: 0, bd: 0, totalTickets: 0 };
        cur.sales += Number(row.quantity ?? 0);
        map.set(label, cur);
      }
      for (const row of tickets) {
        const label = String(row[field] ?? "Unknown");
        const cur = map.get(label) ?? { sales: 0, bd: 0, totalTickets: 0 };
        cur.totalTickets += 1;
        if (String(row.ticket_type ?? "").toLowerCase().includes("breakdown")) cur.bd += 1;
        map.set(label, cur);
      }
      return [...map.entries()]
        .map(([label, v]) => ({
          label,
          salesQty: v.sales,
          bdTickets: v.bd,
          totalTickets: v.totalTickets,
          bdPerSales: v.sales > 0 ? v.bd / v.sales : null,
        }))
        .sort((a, b) => b.bdTickets - a.bdTickets)
        .slice(0, 20);
    };

    const totalSales = sales.reduce((s, r) => s + Number(r.quantity ?? 0), 0);

    res.json({
      hasSales: true,
      totalBd: bdRows.length,
      totalSales,
      bdPerSales: totalSales > 0 ? bdRows.length / totalSales : null,
      byProduct: salesBy("product"),
      byCategory: salesBy("category"),
      byState: salesBy("state"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load sales vs BD analytics" });
  }
});

export default router;
