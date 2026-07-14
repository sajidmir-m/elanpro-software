import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const uploadsTable = pgTable("uploads", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(), // active_tickets | closed_tickets | mrf_data
  recordCount: integer("record_count").notNull().default(0),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("processing"), // processing | completed | failed
  errorMessage: text("error_message"),
});

export type Upload = typeof uploadsTable.$inferSelect;
