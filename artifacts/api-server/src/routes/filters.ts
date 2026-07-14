import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/filters/options", requireAuth, async (req, res): Promise<void> => {
  const unionBase = `
    SELECT category, product, service_partner_name, ash, rsh, state, support_type, ticket_type FROM active_tickets
    UNION ALL
    SELECT category, product, service_partner_name, ash, rsh, state, support_type, ticket_type FROM closed_tickets
  `;

  const [categories, products, partners, ashList, rshList, states, warrantyTypes, ticketTypes] =
    await Promise.all([
      pool.query(`SELECT DISTINCT category FROM (${unionBase}) t WHERE category IS NOT NULL ORDER BY category`),
      pool.query(`SELECT DISTINCT product FROM (${unionBase}) t WHERE product IS NOT NULL ORDER BY product`),
      pool.query(`SELECT DISTINCT service_partner_name FROM (${unionBase}) t WHERE service_partner_name IS NOT NULL ORDER BY service_partner_name`),
      pool.query(`SELECT DISTINCT ash FROM (${unionBase}) t WHERE ash IS NOT NULL ORDER BY ash`),
      pool.query(`SELECT DISTINCT rsh FROM (${unionBase}) t WHERE rsh IS NOT NULL ORDER BY rsh`),
      pool.query(`SELECT DISTINCT state FROM (${unionBase}) t WHERE state IS NOT NULL ORDER BY state`),
      pool.query(`SELECT DISTINCT support_type FROM (${unionBase}) t WHERE support_type IS NOT NULL ORDER BY support_type`),
      pool.query(`SELECT DISTINCT ticket_type FROM (${unionBase}) t WHERE ticket_type IS NOT NULL ORDER BY ticket_type`),
    ]);

  res.json({
    categories: categories.rows.map((r: Record<string, unknown>) => r.category),
    products: products.rows.map((r: Record<string, unknown>) => r.product),
    servicePartners: partners.rows.map((r: Record<string, unknown>) => r.service_partner_name),
    ashList: ashList.rows.map((r: Record<string, unknown>) => r.ash),
    rshList: rshList.rows.map((r: Record<string, unknown>) => r.rsh),
    states: states.rows.map((r: Record<string, unknown>) => r.state),
    warrantyTypes: warrantyTypes.rows.map((r: Record<string, unknown>) => r.support_type),
    ticketTypes: ticketTypes.rows.map((r: Record<string, unknown>) => r.ticket_type),
  });
});

export default router;
