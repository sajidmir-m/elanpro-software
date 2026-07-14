import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding admin user...");

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, "admin@elanpro.net"));

  if (existing.length > 0) {
    console.log("Admin user already exists, skipping.");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash("Admin@1234", 10);

  await db.insert(usersTable).values({
    name: "System Admin",
    email: "admin@elanpro.net",
    passwordHash,
    role: "admin",
    isActive: true,
    permissions: [
      "dashboard",
      "active_tickets",
      "closed_tickets",
      "reports:product_failure",
      "reports:component_failure",
      "reports:warranty",
      "reports:sales_complaint",
      "reports:tat",
      "reports:mrf",
      "schedules",
      "uploads",
      "users",
    ],
  });

  // Also seed a manager user
  const managerHash = await bcrypt.hash("Manager@1234", 10);
  const [admin] = await db.select().from(usersTable).where(eq(usersTable.email, "admin@elanpro.net"));

  await db.insert(usersTable).values({
    name: "Vijay Kumar",
    email: "vijay.kumar@elanpro.net",
    passwordHash: managerHash,
    role: "ash",
    isActive: true,
    managerId: admin?.id ?? null,
    permissions: [
      "dashboard",
      "active_tickets",
      "closed_tickets",
      "reports:product_failure",
      "reports:warranty",
      "reports:tat",
    ],
  });

  console.log("✓ Seeded admin user: admin@elanpro.net / Admin@1234");
  console.log("✓ Seeded ASH user: vijay.kumar@elanpro.net / Manager@1234");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
