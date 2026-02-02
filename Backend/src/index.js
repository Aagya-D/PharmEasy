/**
 * PharmEasy Backend
 * Main Express application entry point
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./database/prisma.js";
import { errorHandler, asyncHandler } from "./middlewares/errorHandler.js";
import loggingMiddleware from "./middlewares/logger.middleware.js";
import logger from "./utils/logger.js";
import authRoutes from "./modules/auth/auth.routes.js";
import pharmacyRoutes from "./modules/pharmacy/pharmacy.routes.js";
import adminRoutes from "./routes/admin.routes.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "localhost";
const NODE_ENV = process.env.NODE_ENV || "development";

// ============================================
// MIDDLEWARE
// ============================================

// CORS Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body Parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Request/Response Logger (comprehensive)
app.use(loggingMiddleware);

// ============================================
// HEALTH CHECK
// ============================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// ============================================
// DATABASE CHECK
// ============================================

app.get(
  "/api/db-check",
  asyncHandler(async (req, res) => {
    const result = await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      message: "Database connection successful",
      data: result,
    });
  })
);

// ============================================
// API ROUTES
// ============================================

// Authentication routes
app.use("/api/auth", authRoutes);

// Pharmacy routes (onboarding & admin verification)
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api", pharmacyRoutes);

// Admin routes (pharmacy approval/rejection)
app.use("/api/admin", adminRoutes);

// Root API endpoint
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PharmEasy API - Healthcare Platform",
    version: "1.0.0",
    documentation: {
      auth: "/api/auth",
      health: "/api/health",
      dbCheck: "/api/db-check",
    },
  });
});

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      status: 404,
      message: `Cannot ${req.method} ${req.path}`,
    },
  });
});

// ============================================
// ERROR HANDLER (Must be last)
// ============================================

app.use(errorHandler);

// ============================================
// SERVER START
// ============================================

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✓ Database connection successful");

    const server = app.listen(PORT, HOST, () => {
      console.log(`
╭────────────────────────────────────────────╮
│  🚀 PharmEasy Backend Server Started       │
├────────────────────────────────────────────┤
│  URL:         http://${HOST}:${PORT}
│  Environment: ${NODE_ENV}
│  Node:        ${process.version}
╰────────────────────────────────────────────╯

📚 Available Endpoints:
  • Health:    GET  /api/health
  • DB Check:  GET  /api/db-check
  • Auth:      POST /api/auth/register
  • Auth:      POST /api/auth/login
  • Auth:      POST /api/auth/verify-otp

🔐 Authentication:
  • Access Token expiry:  15 minutes
  • Refresh Token expiry: 7 days
  • OTP expiry:          10 minutes
  • Reset Token expiry:   1 hour

📖 API Documentation:
  GET /api - View all endpoints

⚠️  Default test credentials available after seed:
  npm run prisma:seed
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n📍 ${signal} received, shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log("✓ Server closed");
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error("Force closing server");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();

export default app;
