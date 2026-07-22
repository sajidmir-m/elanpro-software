import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { componentCategory } from "../lib/component-taxonomy";
import {
  fetchDistinctTicketValues,
  fetchMrfRows,
  fetchPartnerHierarchyMaps,
  fetchResolvedHierarchyNames,
} from "../lib/ticket-query";
import {
  getCachedFilterOptions,
  getCachedHierarchyDirectory,
  setCachedFilterOptions,
} from "../lib/data-cache";

const router: IRouter = Router();

router.get("/filters/options", requireAuth, async (_req, res): Promise<void> => {
  try {
    const cached = getCachedFilterOptions<Record<string, unknown>>();
    if (cached) {
      res.json(cached);
      return;
    }

    const [
      categories,
      products,
      partners,
      hierarchyDirectory,
      states,
      regions,
      warrantyTypes,
      ticketStatuses,
      ticketTypes,
      mrfRows,
      partnerHierarchy,
      resolvedHierarchyNames,
      customerCategories,
      closureTypes,
    ] = await Promise.all([
      fetchDistinctTicketValues("category"),
      fetchDistinctTicketValues("product"),
      fetchDistinctTicketValues("service_partner_name"),
      getCachedHierarchyDirectory(),
      fetchDistinctTicketValues("state"),
      fetchDistinctTicketValues("ticket_territory"),
      fetchDistinctTicketValues("support_type"),
      fetchDistinctTicketValues("ticket_status", ["active_tickets"]),
      fetchDistinctTicketValues("ticket_type"),
      fetchMrfRows(),
      fetchPartnerHierarchyMaps(),
      fetchResolvedHierarchyNames(),
      fetchDistinctTicketValues("customer_category"),
      fetchDistinctTicketValues("closure_type", ["closed_tickets"]),
    ]);
    const ashList = [...new Set([...hierarchyDirectory.ashList, ...resolvedHierarchyNames.ashList])].sort(
      (a, b) => a.localeCompare(b),
    );
    const rshList = [...new Set([...hierarchyDirectory.rshList, ...resolvedHierarchyNames.rshList])].sort(
      (a, b) => a.localeCompare(b),
    );
    const componentCategories = [
      ...new Set(mrfRows.map((row) => componentCategory(row.component_name))),
    ].sort((a, b) => a.localeCompare(b));

    const payload = {
      categories,
      products,
      servicePartners: partners,
      ashList,
      rshList,
      ashesByRsh: hierarchyDirectory.ashesByRsh,
      states,
      regions,
      warrantyTypes,
      ticketStatuses,
      ticketTypes,
      componentCategories,
      customerCategories,
      closureTypes,
      partnersByRsh: partnerHierarchy.byRsh,
      partnersByAsh: partnerHierarchy.byAsh,
    };
    setCachedFilterOptions(payload);
    res.json(payload);
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
