#!/usr/bin/env node

/**
 * Pharmacy Location Diagnostic Tool
 * 
 * This script helps debug the "Locate Me" and "Nearby Pharmacies" features
 * by checking:
 * 1. Database connectivity
 * 2. Pharmacy data in the database
 * 3. Coordinate validation
 * 4. Distance calculations
 */

import { prisma } from "./src/database/prisma.js";
import { calculateDistance } from "./src/utils/distance.js";

async function runDiagnostics() {
  console.log("🏥 PharmEasy Location Diagnostics");
  console.log("=====================================\n");

  try {
    // Test 1: Database Connection
    console.log("1️⃣  Testing database connection...");
    const dbTest = await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected\n");

    // Test 2: Count total pharmacies
    console.log("2️⃣  Checking pharmacy data...");
    const totalPharmacies = await prisma.pharmacy.count();
    console.log(`✅ Total pharmacies in database: ${totalPharmacies}\n`);

    // Test 3: Count verified pharmacies
    console.log("3️⃣  Checking verified pharmacies...");
    const verifiedPharmacies = await prisma.pharmacy.count({
      where: { verificationStatus: "VERIFIED" },
    });
    console.log(`✅ Verified pharmacies: ${verifiedPharmacies}\n`);

    // Test 4: Check for pharmacies with valid coordinates
    console.log("4️⃣  Checking pharmacy coordinates...");
    const allPharmacies = await prisma.pharmacy.findMany({
      select: {
        id: true,
        pharmacyName: true,
        latitude: true,
        longitude: true,
        verificationStatus: true,
      },
    });

    if (allPharmacies.length === 0) {
      console.log("❌ No pharmacies found in database!\n");
      return;
    }

    // Analyze coordinates
    const validCoords = allPharmacies.filter(
      (p) => p.latitude !== 0 && p.longitude !== 0 && p.latitude && p.longitude
    );
    const invalidCoords = allPharmacies.filter(
      (p) => p.latitude === 0 || p.longitude === 0 || !p.latitude || !p.longitude
    );

    console.log(`   ✅ With real coordinates: ${validCoords.length}`);
    console.log(`   ❌ With (0,0) or missing: ${invalidCoords.length}`);

    if (validCoords.length > 0) {
      console.log(`\n   First valid pharmacy:`);
      const first = validCoords[0];
      console.log(`   - Name: ${first.pharmacyName}`);
      console.log(`   - Location: ${first.latitude}, ${first.longitude}`);
      console.log(`   - Status: ${first.verificationStatus}`);
    }

    if (invalidCoords.length > 0) {
      console.log(`\n   ⚠️  Pharmacies with invalid coordinates:`);
      invalidCoords.slice(0, 3).forEach((p) => {
        console.log(`   - ${p.pharmacyName}: (${p.latitude}, ${p.longitude})`);
      });
      if (invalidCoords.length > 3) {
        console.log(`   ... and ${invalidCoords.length - 3} more`);
      }
    }
    console.log();

    // Test 5: Simulate nearby search
    console.log("5️⃣  Testing proximity search (5km radius from Kathmandu)...");
    const kathmandu = { lat: 27.7172, lng: 85.324 };
    const radius = 5;

    const nearbyPharmacies = validCoords
      .map((pharmacy) => ({
        id: pharmacy.id,
        name: pharmacy.pharmacyName,
        lat: pharmacy.latitude,
        lng: pharmacy.longitude,
        distance: calculateDistance(
          kathmandu.lat,
          kathmandu.lng,
          pharmacy.latitude,
          pharmacy.longitude
        ),
      }))
      .filter((p) => p.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    if (nearbyPharmacies.length === 0) {
      console.log(
        `❌ No pharmacies found within ${radius}km of Kathmandu center`
      );
      console.log(`💡 Consider increasing radius or adding pharmacy locations\n`);
    } else {
      console.log(`✅ Found ${nearbyPharmacies.length} pharmacies:\n`);
      nearbyPharmacies.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name}`);
        console.log(`      Distance: ${p.distance.toFixed(2)}km`);
        console.log(`      Coords: ${p.lat}, ${p.lng}`);
      });
    }
    console.log();

    // Test 6: Check inventory
    console.log("6️⃣  Checking medicine inventory...");
    const totalInventory = await prisma.inventory.count();
    const inStockCount = await prisma.inventory.count({
      where: { quantity: { gt: 0 } },
    });

    console.log(`✅ Total inventory items: ${totalInventory}`);
    console.log(`✅ In-stock items: ${inStockCount}`);

    if (totalInventory === 0) {
      console.log(
        "\n⚠️  WARNING: No medicines in inventory. Add some to test search!"
      );
    }
    console.log();

    // Test 7: Check verified pharmacies with inventory
    console.log("7️⃣  Checking verified pharmacies with stock...");
    const verifiedWithStock = await prisma.pharmacy.findMany({
      where: {
        verificationStatus: "VERIFIED",
        inventory: {
          some: {
            quantity: { gt: 0 },
          },
        },
      },
      select: {
        pharmacyName: true,
        latitude: true,
        longitude: true,
        inventory: {
          where: { quantity: { gt: 0 } },
          select: { name: true, quantity: true },
        },
      },
    });

    if (verifiedWithStock.length === 0) {
      console.log("❌ No verified pharmacies with stock!");
      console.log(
        "💡 Create a pharmacy, verify it, and add some medicines to it"
      );
    } else {
      console.log(`✅ Found ${verifiedWithStock.length} verified pharmacies with stock\n`);
      verifiedWithStock.slice(0, 2).forEach((p) => {
        console.log(`   ${p.pharmacyName}`);
        console.log(`   Coords: ${p.latitude}, ${p.longitude}`);
        console.log(
          `   Medicines in stock: ${p.inventory.length}`
        );
      });
    }
    console.log();

    // Summary
    console.log("=====================================");
    console.log("📊 DIAGNOSTICS SUMMARY\n");

    const issues = [];
    if (verifiedPharmacies === 0) issues.push("No verified pharmacies");
    if (validCoords.length === 0) issues.push("No pharmacies with real coordinates");
    if (totalInventory === 0) issues.push("No medicines in inventory");
    if (verifiedWithStock.length === 0) issues.push("No verified pharmacies with medicines");

    if (issues.length === 0) {
      console.log("✅ All checks passed! System should be working.");
      console.log("\nIf you're still not seeing results:");
      console.log(
        "1. Check browser console for JavaScript errors"
      );
      console.log(
        "2. Check network tab - is API returning data?"
      );
      console.log(
        "3. Check if location permission is being granted"
      );
    } else {
      console.log("❌ Issues found:");
      issues.forEach((issue) => console.log(`   • ${issue}`));
      console.log("\nFix these issues and the features should work!");
    }
  } catch (error) {
    console.error("❌ Error running diagnostics:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runDiagnostics();
