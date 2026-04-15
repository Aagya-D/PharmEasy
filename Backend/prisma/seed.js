import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcrypt";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Seed the fixed role records used by the app.
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

// Seed roles and the default admin user.
async function main() {
  try {
    console.log("Starting role seeding...\n");

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

    console.log("Seeding system admin user...\n");

    const adminEmail = process.env.SYSTEM_ADMIN_EMAIL || "admin@pharmeasy.com";
    const adminPassword = process.env.SYSTEM_ADMIN_PASSWORD || "Admin@123";
    const adminName = process.env.SYSTEM_ADMIN_NAME || "System Administrator";

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log(`✓ System Admin already exists: ${adminEmail}`);
      console.log(`   User ID: ${existingAdmin.id}`);
      console.log(`   Role ID: ${existingAdmin.roleId}\n`);
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: hashedPassword,
          roleId: 1,
          isVerified: true,
          verifiedAt: new Date(),
          isActive: true,
        },
      });

      console.log(`✓ Created System Admin User`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   User ID: ${adminUser.id}`);
      console.log(`   Role ID: ${adminUser.roleId}`);
      console.log(`   Password: ${adminPassword}\n`);
      console.log(`⚠️  IMPORTANT: Change admin password after first login!\n`);
    }

    console.log("Registration role selection:");
    console.log("   User selects Patient (ID 3) or Pharmacy Admin (ID 2)");
    console.log("   System Admin (ID 1) is backend-only\n");

    console.log("Registration flow:");
    console.log("   1. User selects role on registration form");
    console.log("   2. Frontend sends: { email, password, roleId: 2 or 3 }");
    console.log("   3. Backend validates roleId is 2 or 3");
    console.log("   4. Backend creates user with roleId directly");
    console.log("   5. No role lookup query needed\n");

    console.log("Seeding completed successfully!\n");
    console.log("Admin login credentials:");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}\n`);
  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
