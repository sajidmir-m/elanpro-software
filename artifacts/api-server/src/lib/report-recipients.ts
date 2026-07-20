import { getServiceClient } from "@workspace/supabase";
import type { ProfileRow, UserRole } from "@workspace/supabase";

export const REPORT_AUDIENCE_ROLES: UserRole[] = ["rsh", "ash", "service_partner", "manager", "admin"];

export async function resolveRecipientsByRole(roles: UserRole[]): Promise<ProfileRow[]> {
  if (roles.length === 0) return [];
  const { data, error } = await getServiceClient()
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .in("role", roles)
    .order("name");

  if (error) throw new Error(`Failed to load recipients: ${error.message}`);
  return (data ?? []) as ProfileRow[];
}

function normalizedName(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase();
}

/**
 * Scopes ticket rows down to the ones a given recipient owns, matched by
 * name against the corresponding uploaded field. Managers/admins see the
 * unfiltered (company-wide) rows. Falls back to the full dataset when a
 * role-specific person has no name match in the current data, so nobody
 * silently receives an empty report tied to a stale/misspelled name.
 */
export function rowsForRecipient(
  rows: Record<string, unknown>[],
  profile: Pick<ProfileRow, "name" | "role">,
): { rows: Record<string, unknown>[]; scoped: boolean } {
  const fieldByRole: Partial<Record<UserRole, string>> = {
    rsh: "rsh",
    ash: "ash",
    service_partner: "service_partner_name",
  };
  const field = fieldByRole[profile.role];
  if (!field) return { rows, scoped: false };

  const needle = normalizedName(profile.name);
  const matched = rows.filter((row) => normalizedName(row[field]) === needle);
  return matched.length > 0 ? { rows: matched, scoped: true } : { rows, scoped: false };
}

export function scopeLabelForRecipient(profile: Pick<ProfileRow, "name" | "role">, scoped: boolean): string {
  if (!scoped) return "Company-wide";
  switch (profile.role) {
    case "rsh":
      return `RSH: ${profile.name}`;
    case "ash":
      return `ASH: ${profile.name}`;
    case "service_partner":
      return `Service Partner: ${profile.name}`;
    default:
      return "Company-wide";
  }
}
