import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const schedulesTable = pgTable("schedules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  reportTypes: text("report_types").array().notNull().default([]),
  frequency: text("frequency").notNull().default("daily"),
  weekDay: integer("week_day"),
  monthDay: integer("month_day"),
  customCron: text("custom_cron"),
  audiences: text("audiences").array().notNull().default([]),
  productCategories: text("product_categories").array().notNull().default([]),
  filters: text("filters"), // JSON string
  isActive: boolean("is_active").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Schedule = typeof schedulesTable.$inferSelect;
