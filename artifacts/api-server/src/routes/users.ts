import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { requireAuth, formatUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users.map(formatUser));
});

router.post("/users", requireAuth, async (req, res): Promise<void> => {
  const { name, email, password, role, managerId, permissions } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    managerId?: number | null;
    permissions?: string[];
  };

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "name, email, password, and role are required" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      managerId: managerId ?? null,
      permissions: permissions ?? [],
    })
    .returning();

  res.status(201).json(formatUser(user));
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const { name, email, role, isActive, managerId, permissions } = req.body as {
    name?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    managerId?: number | null;
    permissions?: string[];
  };

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email.toLowerCase();
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;
  if (managerId !== undefined) updates.managerId = managerId;
  if (permissions !== undefined) updates.permissions = permissions;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

router.delete("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ message: "User deleted" });
});

router.patch("/users/:id/permissions", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const { permissions } = req.body as { permissions?: string[] };
  if (!Array.isArray(permissions)) {
    res.status(400).json({ error: "permissions must be an array" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ permissions })
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

export default router;
