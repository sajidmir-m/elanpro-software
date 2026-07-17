import type { ProfileRow, ScheduleRow, UploadRow } from "./types";

export function formatProfile(profile: ProfileRow) {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    isActive: profile.is_active,
    permissions: profile.permissions ?? [],
    managerId: profile.manager_id,
    department: profile.department,
    createdAt: profile.created_at,
  };
}

export function formatUpload(upload: UploadRow) {
  return {
    id: upload.id,
    filename: upload.filename,
    fileType: upload.file_type,
    recordCount: upload.record_count,
    uploadedAt: upload.uploaded_at,
    status: upload.status,
    errorMessage: upload.error_message,
  };
}

export function formatSchedule(schedule: ScheduleRow) {
  return {
    id: schedule.id,
    name: schedule.name,
    reportTypes: schedule.report_types ?? [],
    frequency: schedule.frequency,
    weekDay: schedule.week_day,
    monthDay: schedule.month_day,
    customCron: schedule.custom_cron,
    audiences: schedule.audiences ?? [],
    productCategories: schedule.product_categories ?? [],
    filters: schedule.filters ?? null,
    isActive: schedule.is_active,
    lastRunAt: schedule.last_run_at,
    nextRunAt: schedule.next_run_at,
    createdAt: schedule.created_at,
  };
}

export function keysToSnake<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snake] = value;
  }
  return result;
}
