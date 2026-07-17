import { Router, type IRouter } from "express";
import { getServiceClient, formatSchedule, type ScheduleRow } from "@workspace/supabase";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/schedules", requireAuth, async (_req, res): Promise<void> => {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json((data as ScheduleRow[]).map(formatSchedule));
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

  const supabase = getServiceClient();
  const { data: schedule, error } = await supabase
    .from("schedules")
    .insert({
      name,
      report_types: reportTypes ?? [],
      frequency,
      week_day: weekDay ?? null,
      month_day: monthDay ?? null,
      custom_cron: customCron ?? null,
      audiences: audiences ?? [],
      product_categories: productCategories ?? [],
      filters: filters ?? null,
      is_active: isActive ?? true,
    })
    .select("*")
    .single();

  if (error || !schedule) {
    res.status(500).json({ error: error?.message ?? "Failed to create schedule" });
    return;
  }

  res.status(201).json(formatSchedule(schedule as ScheduleRow));
});

router.get("/schedules/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const supabase = getServiceClient();

  const { data: schedule, error } = await supabase
    .from("schedules")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  res.json(formatSchedule(schedule as ScheduleRow));
});

router.patch("/schedules/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const body = req.body as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.reportTypes !== undefined) updates.report_types = body.reportTypes;
  if (body.frequency !== undefined) updates.frequency = body.frequency;
  if (body.weekDay !== undefined) updates.week_day = body.weekDay;
  if (body.monthDay !== undefined) updates.month_day = body.monthDay;
  if (body.customCron !== undefined) updates.custom_cron = body.customCron;
  if (body.audiences !== undefined) updates.audiences = body.audiences;
  if (body.productCategories !== undefined) updates.product_categories = body.productCategories;
  if (body.filters !== undefined) updates.filters = body.filters ?? null;
  if (body.isActive !== undefined) updates.is_active = body.isActive;

  const supabase = getServiceClient();
  const { data: schedule, error } = await supabase
    .from("schedules")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  res.json(formatSchedule(schedule as ScheduleRow));
});

router.delete("/schedules/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const supabase = getServiceClient();

  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ message: "Schedule deleted" });
});

export default router;
