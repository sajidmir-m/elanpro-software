import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { componentCategory } from "../lib/component-taxonomy";
import { fetchDistinctTicketValues, fetchMrfRows, fetchPartnerHierarchyMaps } from "../lib/ticket-query";
import { fetchReportingHierarchyDirectory } from "../lib/reporting-hierarchy";

const router: IRouter = Router();

router.get("/filters/options", requireAuth, async (_req, res): Promise<void> => {
  try {
    const [
      categories,
      products,
      partners,
      hierarchyDirectory,
      states,
      regions,
      warrantyTypes,
      ticketTypes,
      mrfRows,
      partnerHierarchy,
    ] = await Promise.all([
      fetchDistinctTicketValues("category"),
      fetchDistinctTicketValues("product"),
      fetchDistinctTicketValues("service_partner_name"),
      fetchReportingHierarchyDirectory(),
      fetchDistinctTicketValues("state"),
      fetchDistinctTicketValues("ticket_territory"),
      fetchDistinctTicketValues("support_type"),
      fetchDistinctTicketValues("ticket_type"),
      fetchMrfRows(),
      fetchPartnerHierarchyMaps(),
    ]);
    const componentCategories = [
      ...new Set(mrfRows.map((row) => componentCategory(row.component_name))),
    ].sort((a, b) => a.localeCompare(b));

    res.json({
      categories,
      products,
      servicePartners: partners,
      ashList: hierarchyDirectory.ashList,
      rshList: hierarchyDirectory.rshList,
      states,
      regions,
      warrantyTypes,
      ticketTypes,
      componentCategories,
      partnersByRsh: partnerHierarchy.byRsh,
      partnersByAsh: partnerHierarchy.byAsh,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load filter options" });
  }
});

/** Partners for one saved RSH, resolved through its saved ASH assignments. */
router.get("/filters/partners-by-rsh", requireAuth, async (req, res): Promise<void> => {
  try {
    const rsh = String(req.query.rsh ?? "").trim();
    if (!rsh) {
      res.status(400).json({ message: "rsh query param is required" });
      return;
    }

    const map = (await fetchPartnerHierarchyMaps()).byRsh;
    const exact = map[rsh];
    if (exact) {
      res.json({ rsh, partners: exact });
      return;
    }

    // Case-insensitive fallback
    const key = Object.keys(map).find((k) => k.toLowerCase() === rsh.toLowerCase());
    res.json({
      rsh,
      partners: key ? map[key]! : [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load partners for RSH" });
  }
});

/** Partners for one saved ASH/Reporting Manager. */
router.get("/filters/partners-by-ash", requireAuth, async (req, res): Promise<void> => {
  try {
    const ash = String(req.query.ash ?? "").trim();
    if (!ash) {
      res.status(400).json({ message: "ash query param is required" });
      return;
    }

    const map = (await fetchPartnerHierarchyMaps()).byAsh;
    const exact = map[ash];
    if (exact) {
      res.json({ ash, partners: exact });
      return;
    }

    const key = Object.keys(map).find((k) => k.toLowerCase() === ash.toLowerCase());
    res.json({
      ash,
      partners: key ? map[key]! : [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load partners for ASH" });
  }
});

export default router;
