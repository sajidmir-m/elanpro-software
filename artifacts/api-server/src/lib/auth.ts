import { type Request, type Response, type NextFunction } from "express";
import {
  getServiceClient,
  formatProfile,
  type ProfileRow,
} from "@workspace/supabase";

declare global {
  namespace Express {
    interface Request {
      currentUser?: ProfileRow;
    }
  }
}

export { formatProfile as formatUser };

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = authHeader.slice(7);
  const supabase = getServiceClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    res.status(401).json({ error: "Profile not found" });
    return;
  }

  if (!profile.is_active) {
    res.status(401).json({ error: "Account is inactive" });
    return;
  }

  req.currentUser = profile as ProfileRow;
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.currentUser?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function requireUploadAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const role = req.currentUser?.role;
  if (role !== "admin" && role !== "manager") {
    res.status(403).json({ error: "Upload access requires admin or manager role" });
    return;
  }
  next();
}
