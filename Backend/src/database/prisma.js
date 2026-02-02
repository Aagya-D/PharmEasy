// src/database/prisma.js
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter })
  // Optional: nice global error logging
  .$extends({
    query: {
      $allModels: {
        async $allOperations({ query, args }) {
          try {
            return await query(args);
          } catch (error) {
            console.error("Prisma query failed:", error);
            throw error;
          }
        },
      },
    },
  });

export const testConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connected successfully");
    return true;
  } catch (error) {
    console.error("Database connection error:", error);
    return false;
  }
};

export { prisma };
export default prisma;
