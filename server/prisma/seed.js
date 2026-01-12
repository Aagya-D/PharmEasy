import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Initialize Prisma with adapter
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * FIXED ROLE ID SYSTEM
 *
 * All role IDs are hardcoded and immutable:
 * - ID 1: System Admin (backend-only, never exposed to end users)
 * - ID 2: Pharmacy Admin (selectable during user registration)
 * - ID 3: Patient (selectable during user registration)
 *
 * Why Fixed IDs:
 * 1. Deterministic: Role IDs never change across environments
 * 2. Fast: No role name lookup needed anywhere in code
 * 3. Simple: Frontend sends ID directly, backend uses ID directly
 * 4. Secure: System Admin restricted at application layer
 * 5. Scalable: Works with any number of users
 *
 * Seeding Strategy:
 * - This seed runs once during initial database setup
 * - Subsequent application runs check if roles exist (idempotent)
 * - Never creates roles dynamically at runtime
 * - Migration handles schema changes, seed handles data
 */
const rolesWithFixedIds = [
  {
    id: 1,
    name: "SYSTEM_ADMIN",
    displayName: "System Administrator",
    description:
      "System administrator with full platform access and governance",
  },
  {
    id: 2,
    name: "PHARMACY_ADMIN",
    displayName: "Pharmacy Administrator",
    description: "Administrator of a pharmacy who manages inventory and orders",
  },
  {
    id: 3,
    name: "PATIENT",
    displayName: "Patient",
    description:
      "Patient user who can browse and order medicines from pharmacies",
  },
];

/**
 * Main seed function - Idempotent role seeding
 *
 * Idempotency means:
 * - Running this multiple times has the same effect as running once
 * - Safe to re-run without duplicate errors
 * - Checks existence before creating
 */
async function main() {
  try {
    console.log("🌱 Starting fixed ID role seeding...\n");

    const seedResults = [];

    for (const roleData of rolesWithFixedIds) {
      const existingRole = await prisma.role.findUnique({
        where: { id: roleData.id },
      });

      if (existingRole) {
        console.log(
          `✓ Role ID ${roleData.id} "${roleData.displayName}" already exists`
        );
        seedResults.push(existingRole);
      } else {
        const newRole = await prisma.role.create({
          data: roleData,
        });
        console.log(
          `✓ Created role ID ${roleData.id} "${roleData.displayName}"`
        );
        seedResults.push(newRole);
      }
    }

    console.log("\n✅ Role seeding completed!\n");
    console.log("📋 Available Roles (Fixed IDs):");
    seedResults.forEach((role) => {
      console.log(`   ID ${role.id}: ${role.displayName} (${role.name})`);
      console.log(`      → ${role.description}\n`);
    });

    console.log("📝 Registration Role Selection (Frontend):");
    console.log("   User selects: Patient (ID 3) or Pharmacy Admin (ID 2)");
    console.log("   System Admin (ID 1) is backend-only\n");

    console.log("🔄 Registration Flow:");
    console.log("   1. User selects role on registration form");
    console.log("   2. Frontend sends: { email, password, roleId: 2 or 3 }");
    console.log("   3. Backend validates roleId is 2 or 3");
    console.log("   4. Backend creates user with roleId directly");
    console.log("   5. No role lookup query needed\n");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
