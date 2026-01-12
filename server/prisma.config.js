import 'dotenv/config';  // Loads your .env file
import { defineConfig } from 'prisma/config';  // Note: This import might need adjustment if not exposed; fallback to require if issues arise, but stick to ES for now

export default defineConfig({
  schema: 'prisma/schema.prisma',  // Path to your schema file
  migrations: {
    path: 'prisma/migrations',  // Where migrations are stored
    seed: 'node prisma/seed.js'  // Your seed script (update if using something else, e.g., 'node prisma/seed.js' for JS)
  },
  datasource: {
    url: process.env.DATABASE_URL,  // Loaded from .env
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL  // If you use this for migrations
  }
});