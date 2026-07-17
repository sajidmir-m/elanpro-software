export type UserRole = "admin" | "manager" | "employee" | "ash" | "rsh" | "service_partner";

export type UploadFileType = "active_tickets" | "closed_tickets" | "mrf_data" | "sales_data";
export type UploadStatus = "processing" | "completed" | "failed";

export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  permissions: string[];
  manager_id: string | null;
  department: string | null;
  created_at: string;
}

export interface UploadRow {
  id: number;
  filename: string;
  file_type: UploadFileType;
  record_count: number;
  uploaded_at: string;
  status: UploadStatus;
  error_message: string | null;
  uploaded_by: string | null;
}

export interface ScheduleRow {
  id: number;
  name: string;
  report_types: string[];
  frequency: string;
  week_day: number | null;
  month_day: number | null;
  custom_cron: string | null;
  audiences: string[];
  product_categories: string[];
  filters: unknown | null;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}
