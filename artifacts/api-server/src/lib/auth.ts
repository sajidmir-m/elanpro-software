import { type Request, type Response, type NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { User } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      currentUser?: User;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionId = (req.cookies as Record<string, string | undefined>)?.session;
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));

  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));

  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }

  req.currentUser = user;
  next();
}

export function formatUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    permissions: user.permissions ?? [],
    managerId: user.managerId ?? null,
    createdAt: user.createdAt?.toISOString() ?? null,
  };
}
