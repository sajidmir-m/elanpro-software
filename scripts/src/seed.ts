import { getServiceClient } from "@workspace/supabase";

const ADMIN_PERMISSIONS = [
  "dashboard",
  "active_tickets",
  "closed_tickets",
  "product_failure",
  "component_failure",
  "warranty",
  "sales_complaint",
  "tat_analysis",
  "mrf_analysis",
  "schedules",
  "uploads",
  "users",
];

const MANAGER_PERMISSIONS = [
  "dashboard",
  "active_tickets",
  "closed_tickets",
  "product_failure",
  "warranty",
  "tat_analysis",
];

async function seed() {
  const supabase = getServiceClient();

  console.log("Seeding users via Supabase Auth...");

  const { data: existingAdmin } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "admin@elanpro.net")
    .maybeSingle();

  if (existingAdmin) {
    console.log("Admin user already exists, skipping.");
    process.exit(0);
  }

  const { data: adminAuth, error: adminError } = await supabase.auth.admin.createUser({
    email: "admin@elanpro.net",
    password: "Admin@1234",
    email_confirm: true,
    user_metadata: { name: "System Admin", role: "admin" },
  });

  if (adminError || !adminAuth.user) {
    console.error("Failed to create admin:", adminError?.message);
    process.exit(1);
  }

  await supabase
    .from("profiles")
    .update({ role: "admin", permissions: ADMIN_PERMISSIONS })
    .eq("id", adminAuth.user.id);

  const { data: managerAuth, error: managerError } = await supabase.auth.admin.createUser({
    email: "vijay.kumar@elanpro.net",
    password: "Manager@1234",
    email_confirm: true,
    user_metadata: { name: "Vijay Kumar", role: "ash" },
  });

  if (managerError || !managerAuth.user) {
    console.error("Failed to create manager:", managerError?.message);
    process.exit(1);
  }

  await supabase
    .from("profiles")
    .update({
      role: "ash",
      manager_id: adminAuth.user.id,
      permissions: MANAGER_PERMISSIONS,
    })
    .eq("id", managerAuth.user.id);

  console.log("✓ Seeded admin user: admin@elanpro.net / Admin@1234");
  console.log("✓ Seeded ASH user: vijay.kumar@elanpro.net / Manager@1234");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
