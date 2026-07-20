import { getServiceClient } from "@workspace/supabase";

export type ReportingHierarchyRow = {
  ash_id: number;
  ash_name: string;
  region_code: string;
  region_name: string;
  rsh_id: number | null;
  rsh_name: string;
  is_active: boolean;
};

export type ReportingHierarchyDirectory = {
  rows: ReportingHierarchyRow[];
  ashList: string[];
  rshList: string[];
  byAshName: Map<string, ReportingHierarchyRow>;
  ashesByRsh: Record<string, string[]>;
};

function normalizedName(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase();
}

export async function fetchReportingHierarchyDirectory(): Promise<ReportingHierarchyDirectory> {
  const { data, error } = await getServiceClient()
    .from("reporting_hierarchy")
    .select("ash_id,ash_name,region_code,region_name,rsh_id,rsh_name,is_active")
    .eq("is_active", true)
    .order("ash_name");

  if (error) {
    throw new Error(
      `Failed to load the saved ASH/RSH directory: ${error.message}. Run add_storage_and_reporting_hierarchy.sql first.`,
    );
  }

  const rows = (data ?? []) as ReportingHierarchyRow[];
  const byAshName = new Map<string, ReportingHierarchyRow>();
  const ashesByRshSet = new Map<string, Set<string>>();
  for (const row of rows) {
    byAshName.set(normalizedName(row.ash_name), row);
    if (!ashesByRshSet.has(row.rsh_name)) ashesByRshSet.set(row.rsh_name, new Set());
    ashesByRshSet.get(row.rsh_name)!.add(row.ash_name);
  }

  const ashesByRsh: Record<string, string[]> = {};
  for (const [rsh, ashes] of ashesByRshSet.entries()) {
    ashesByRsh[rsh] = [...ashes].sort((a, b) => a.localeCompare(b));
  }

  return {
    rows,
    ashList: [...new Set(rows.map((row) => row.ash_name))].sort((a, b) => a.localeCompare(b)),
    rshList: [...new Set(rows.map((row) => row.rsh_name))].sort((a, b) => a.localeCompare(b)),
    byAshName,
    ashesByRsh,
  };
}

/**
 * Excel's "Reporting Manager" value is stored in the legacy `rsh` column.
 * Resolve it through the admin-managed directory so uploaded names never
 * become authoritative ASH or RSH values.
 */
export function applySavedReportingHierarchy(
  row: Record<string, unknown>,
  directory: ReportingHierarchyDirectory,
): Record<string, unknown> {
  const uploadedReportingManager = String(row.rsh ?? "").trim();
  const hierarchy = directory.byAshName.get(normalizedName(uploadedReportingManager));

  // Fall back to the raw uploaded name (instead of a generic "Unmapped"
  // bucket) so tickets whose Reporting Manager isn't yet registered in the
  // admin directory still show up under their real name everywhere
  // (lists, filters, click-through drilldowns) instead of disappearing
  // into a shared placeholder that can't be filtered to consistently.
  return {
    ...row,
    uploaded_reporting_manager: uploadedReportingManager || null,
    representative: row.ash ?? null,
    ash: hierarchy?.ash_name ?? (uploadedReportingManager || "Unmapped"),
    rsh: hierarchy?.rsh_name ?? "Unassigned",
    hierarchy_region: hierarchy?.region_code ?? null,
  };
}
