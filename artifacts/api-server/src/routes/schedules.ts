import { Router, type IRouter } from "express";
import { db, schedulesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function formatSchedule(s: typeof schedulesTable.$inferSelect) {
  let filters: unknown = null;
  try {
    if (s.filters) filters = JSON.parse(s.filters);
  } catch {
    filters = null;
  }
  return {
    id: s.id,
    name: s.name,
    reportTypes: s.reportTypes ?? [],
    frequency: s.frequency,
    weekDay: s.weekDay ?? null,
    monthDay: s.monthDay ?? null,
    customCron: s.customCron ?? null,
    audiences: s.audiences ?? [],
    productCategories: s.productCategories ?? [],
    filters,
    isActive: s.isActive,
    lastRunAt: s.lastRunAt?.toISOString() ?? null,
    nextRunAt: s.nextRunAt?.toISOString() ?? null,
    createdAt: s.createdAt?.toISOString() ?? null,
  };
}

router.get("/schedules", requireAuth, async (req, res): Promise<void> => {
  const schedules = await db.select().from(schedulesTable).orderBy(desc(schedulesTable.createdAt));
  res.json(schedules.map(formatSchedule));
});

router.post("/schedules", requireAuth, async (req, res): Promise<void> => {
  const {
    name,
    reportTypes,
    frequency,
    weekDay,
    monthDay,
    customCron,
    audiences,
    productCategories,
    filters,
    isActive,
  } = req.body as {
    name?: string;
    reportTypes?: string[];
    frequency?: string;
    weekDay?: number | null;
    monthDay?: number | null;
    customCron?: string | null;
    audiences?: string[];
    productCategories?: string[];
    filters?: unknown;
    isActive?: boolean;
  };

  if (!name || !frequency) {
    res.status(400).json({ error: "name and frequency are required" });
    return;
  }

  const [schedule] = await db
    .insert(schedulesTable)
    .values({
      name,
      reportTypes: reportTypes ?? [],
      frequency,
      weekDay: weekDay ?? null,
      monthDay: monthDay ?? null,
      customCron: customCron ?? null,
      audiences: audiences ?? [],
      productCategories: productCategories ?? [],
      filters: filters ? JSON.stringify(filters) : null,
      isActive: isActive ?? true,
    })
    .returning();

  res.status(201).json(formatSchedule(schedule));
});

router.get("/schedules/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  res.json(formatSchedule(schedule));
});

router.patch("/schedules/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const updates: Record<string, unknown> = {};
  const body = req.body as Record<string, unknown>;

  if (body.name !== undefined) updates.name = body.name;
  if (body.reportTypes !== undefined) updates.reportTypes = body.reportTypes;
  if (body.frequency !== undefined) updates.frequency = body.frequency;
  if (body.weekDay !== undefined) updates.weekDay = body.weekDay;
  if (body.monthDay !== undefined) updates.monthDay = body.monthDay;
  if (body.customCron !== undefined) updates.customCron = body.customCron;
  if (body.audiences !== undefined) updates.audiences = body.audiences;
  if (body.productCategories !== undefined) updates.productCategories = body.productCategories;
  if (body.filters !== undefined) updates.filters = body.filters ? JSON.stringify(body.filters) : null;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  const [schedule] = await db
    .update(schedulesTable)
    .set(updates)
    .where(eq(schedulesTable.id, id))
    .returning();

  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  res.json(formatSchedule(schedule));
});

router.delete("/schedules/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  await db.delete(schedulesTable).where(eq(schedulesTable.id, id));
  res.json({ message: "Schedule deleted" });
});

export default router;
