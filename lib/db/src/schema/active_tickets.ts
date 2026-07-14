import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const activeTicketsTable = pgTable("active_tickets", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id").notNull(),
  ticketId: text("ticket_id").notNull(),
  createdOn: text("created_on"),
  customerType: text("customer_type"),
  customerCategory: text("customer_category"),
  customerName: text("customer_name"),
  city: text("city"),
  state: text("state"),
  // RSH = Reporting Manager (Regional Service Head - Elanpro internal)
  rsh: text("rsh"),
  rshEmail: text("rsh_email"),
  // Service Partner
  servicePartnerName: text("service_partner_name"),
  servicePartnerEmail: text("service_partner_email"),
  // ASH = Representative (Area Service Head entity)
  ash: text("ash"),
  ashPhone: text("ash_phone"),
  category: text("category"),
  product: text("product"),
  serialNumber: text("serial_number"),
  support: text("support"),
  supportType: text("support_type"),
  invoiceDate: text("invoice_date"),
  invoiceNumber: text("invoice_number"),
  installationDate: text("installation_date"),
  territoryType: text("territory_type"),
  ticketType: text("ticket_type"),
  serviceType: text("service_type"),
  problemDescription: text("problem_description"),
  ticketPriority: text("ticket_priority"),
  ticketStatus: text("ticket_status"),
  wipSubStage: text("wip_sub_stage"),
  wipSubStageDate: text("wip_sub_stage_date"),
  lastAction: text("last_action"),
  ticketTerritory: text("ticket_territory"),
  components: text("components"),
  reOpenTicket: text("re_open_ticket"),
  repeatTicket: text("repeat_ticket"),
  freeOfCost: text("free_of_cost"),
  paymentType: text("payment_type"),
  territoryCategory: text("territory_category"),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActiveTicket = typeof activeTicketsTable.$inferSelect;
