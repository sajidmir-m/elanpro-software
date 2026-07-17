import type { ProfileRow, UserRole } from "./types";

export const DEPARTMENTS = [
  "Operations",
  "Service",
  "Technical",
  "Sales",
  "Logistics",
  "Quality",
  "Administration",
] as const;

/** Roles an admin may assign when creating users */
export const ADMIN_CREATABLE_ROLES: UserRole[] = ["manager"];

/** Roles a manager may assign when creating users */
export const MANAGER_CREATABLE_ROLES: UserRole[] = ["employee"];

export function isAdmin(profile: ProfileRow): boolean {
  return profile.role === "admin";
}

export function isManager(profile: ProfileRow): boolean {
  return profile.role === "manager";
}

export function canAccessUserManagement(profile: ProfileRow): boolean {
  return isAdmin(profile) || isManager(profile);
}

export function canManageProfile(actor: ProfileRow, target: ProfileRow): boolean {
  if (actor.id === target.id) return false;
  if (isAdmin(actor)) return target.role !== "admin";
  if (isManager(actor)) {
    return target.manager_id === actor.id && target.role === "employee";
  }
  return false;
}

export function validateCreateUser(
  actor: ProfileRow,
  input: {
    role: string;
    department?: string | null;
    managerId?: string | null;
  },
): { ok: true; role: UserRole; department: string | null; managerId: string | null } | { ok: false; error: string } {
  if (isAdmin(actor)) {
    if (input.role !== "manager") {
      return { ok: false, error: "Admins can only create department managers" };
    }
    if (!input.department?.trim()) {
      return { ok: false, error: "Department is required when creating a manager" };
    }
    return {
      ok: true,
      role: "manager",
      department: input.department.trim(),
      managerId: null,
    };
  }

  if (isManager(actor)) {
    if (input.role !== "employee") {
      return { ok: false, error: "Managers can only create employees" };
    }
    if (!actor.department) {
      return { ok: false, error: "Your manager profile is missing a department" };
    }
    return {
      ok: true,
      role: "employee",
      department: actor.department,
      managerId: actor.id,
    };
  }

  return { ok: false, error: "You do not have permission to create users" };
}

export function validateUpdateUser(
  actor: ProfileRow,
  target: ProfileRow,
  input: {
    role?: string;
    department?: string | null;
    managerId?: string | null;
  },
): { ok: false; error: string } | { ok: true } {
  if (isAdmin(actor)) {
    if (target.role === "admin") {
      return { ok: false, error: "Cannot modify admin accounts" };
    }
    return { ok: true };
  }

  if (!canManageProfile(actor, target)) {
    return { ok: false, error: "You cannot modify this user" };
  }

  if (isManager(actor)) {
    if (input.role !== undefined && input.role !== "employee") {
      return { ok: false, error: "Managers can only manage employees" };
    }
    if (input.department !== undefined && input.department !== actor.department) {
      return { ok: false, error: "Managers cannot change employee department" };
    }
    if (input.managerId !== undefined && input.managerId !== actor.id) {
      return { ok: false, error: "Managers cannot reassign employees to another manager" };
    }
  }

  return { ok: true };
}
