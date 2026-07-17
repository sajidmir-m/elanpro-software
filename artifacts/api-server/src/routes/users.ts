import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  getServiceClient,
  formatProfile,
  isAdmin,
  isManager,
  canManageProfile,
  validateCreateUser,
  validateUpdateUser,
} from "@workspace/supabase";
import { requireAuth } from "../lib/auth";
import type { ProfileRow } from "@workspace/supabase";

const router: IRouter = Router();

function requireUserManagement(req: Request, res: Response, next: NextFunction): void {
  const user = req.currentUser;
  if (!user || (!isAdmin(user) && !isManager(user))) {
    res.status(403).json({ error: "Admin or manager access required" });
    return;
  }
  next();
}

router.get("/users", requireAuth, requireUserManagement, async (req, res): Promise<void> => {
  const supabase = getServiceClient();
  const actor = req.currentUser!;

  let query = supabase.from("profiles").select("*").order("created_at", { ascending: true });

  if (isManager(actor)) {
    query = query.eq("manager_id", actor.id);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json((data as ProfileRow[]).map(formatProfile));
});

router.post("/users", requireAuth, requireUserManagement, async (req, res): Promise<void> => {
  const actor = req.currentUser!;
  const { name, email, password, role, managerId, department, permissions } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    managerId?: string | null;
    department?: string | null;
    permissions?: string[];
  };

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "name, email, password, and role are required" });
    return;
  }

  const validated = validateCreateUser(actor, { role, department, managerId });
  if (!validated.ok) {
    res.status(403).json({ error: validated.error });
    return;
  }

  const supabase = getServiceClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role: validated.role,
      department: validated.department,
    },
  });

  if (authError || !authData.user) {
    res.status(400).json({ error: authError?.message ?? "Failed to create user" });
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({
      name,
      role: validated.role,
      department: validated.department,
      manager_id: validated.managerId,
      permissions: permissions ?? [],
    })
    .eq("id", authData.user.id)
    .select("*")
    .single();

  if (profileError || !profile) {
    res.status(500).json({ error: profileError?.message ?? "Failed to update profile" });
    return;
  }

  res.status(201).json(formatProfile(profile as ProfileRow));
});

router.get("/users/:id", requireAuth, requireUserManagement, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const actor = req.currentUser!;
  const supabase = getServiceClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !profile) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const target = profile as ProfileRow;
  if (!isAdmin(actor) && !canManageProfile(actor, target) && target.id !== actor.id) {
    res.status(403).json({ error: "You cannot view this user" });
    return;
  }

  res.json(formatProfile(target));
});

router.patch("/users/:id", requireAuth, requireUserManagement, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const actor = req.currentUser!;
  const { name, email, role, isActive, managerId, department, permissions } = req.body as {
    name?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    managerId?: string | null;
    department?: string | null;
    permissions?: string[];
  };

  const supabase = getServiceClient();

  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const target = existing as ProfileRow;
  const updateCheck = validateUpdateUser(actor, target, { role, department, managerId });
  if (!updateCheck.ok) {
    res.status(403).json({ error: updateCheck.error });
    return;
  }

  if (!isAdmin(actor) && !canManageProfile(actor, target)) {
    res.status(403).json({ error: "You cannot modify this user" });
    return;
  }

  if (email !== undefined) {
    const { error: emailError } = await supabase.auth.admin.updateUserById(id, {
      email: email.toLowerCase(),
    });
    if (emailError) {
      res.status(400).json({ error: emailError.message });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email.toLowerCase();
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.is_active = isActive;
  if (managerId !== undefined) updates.manager_id = managerId;
  if (department !== undefined) updates.department = department;
  if (permissions !== undefined) updates.permissions = permissions;

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !profile) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatProfile(profile as ProfileRow));
});

router.delete("/users/:id", requireAuth, requireUserManagement, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const actor = req.currentUser!;

  if (actor.id === id) {
    res.status(400).json({ error: "You cannot delete your own account" });
    return;
  }

  const supabase = getServiceClient();
  const { data: existing } = await supabase.from("profiles").select("*").eq("id", id).single();

  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const target = existing as ProfileRow;
  if (!isAdmin(actor) && !canManageProfile(actor, target)) {
    res.status(403).json({ error: "You cannot delete this user" });
    return;
  }

  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.json({ message: "User deleted" });
});

router.patch("/users/:id/permissions", requireAuth, requireUserManagement, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const actor = req.currentUser!;
  const { permissions } = req.body as { permissions?: string[] };

  if (!Array.isArray(permissions)) {
    res.status(400).json({ error: "permissions must be an array" });
    return;
  }

  const supabase = getServiceClient();
  const { data: existing } = await supabase.from("profiles").select("*").eq("id", id).single();

  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const target = existing as ProfileRow;
  if (!isAdmin(actor) && !canManageProfile(actor, target)) {
    res.status(403).json({ error: "You cannot modify this user" });
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ permissions })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !profile) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatProfile(profile as ProfileRow));
});

export default router;
