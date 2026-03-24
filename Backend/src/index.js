/**
 * PharmEasy Backend
 * Main Express application entry point
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import { Server as SocketIOServer } from "socket.io";
import { prisma } from "./database/prisma.js";
import { errorHandler, asyncHandler } from "./middlewares/errorHandler.js";
import loggingMiddleware from "./middlewares/logger.middleware.js";
import logger from "./utils/logger.js";
import validateEnvironment from "./utils/validateEnv.js";
import authRoutes from "./modules/auth/auth.routes.js";
import pharmacyRoutes from "./modules/pharmacy/pharmacy.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import patientRoutes from "./modules/patient/patient.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import orderRoutes from "./modules/order/order.routes.js";
import searchRoutes from "./modules/search/search.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import contentRoutes from "./routes/content.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import reviewRoutes from "./modules/review/review.routes.js";
import chatHandler from "./sockets/chatHandler.js";
// Note: adminExtendedRoutes uses CommonJS, will need conversion or dynamic import

// ES Module __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Validate environment variables before starting
try {
  validateEnvironment();
} catch (error) {
  console.error('❌ Environment validation failed:');
  console.error(error.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5050;
const HOST = process.env.HOST || "localhost";
const NODE_ENV = process.env.NODE_ENV || "development";

// ============================================
// MIDDLEWARE
// ============================================

// CORS Configuration
const allowedOrigins = new Set(
  [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
  ].filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      if (NODE_ENV === "development") {
        const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
        if (isLocalhost.test(origin)) {
          callback(null, true);
          return;
        }
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  })
);

// Body Parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Response Helper Middleware
app.use((req, res, next) => {
  res.success = (data) => {
    res.status(200).json({
      success: true,
      ...data,
    });
  };
  next();
});

// Request/Response Logger (comprehensive)
app.use(loggingMiddleware);


// Simple health check (no dependencies)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
  });
});

// Comprehensive status check (includes DB)
app.get("/api/status", asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  // Check database connection
  let dbStatus = "disconnected";
  let dbLatency = null;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
    dbStatus = "connected";
  } catch (error) {
    dbStatus = "error";
  }
  
  const responseTime = Date.now() - startTime;
  
  res.status(200).json({
    success: true,
    message: "Server status check",
    status: {
      api: "healthy",
      database: dbStatus,
    },
    metrics: {
      uptime: `${Math.floor(process.uptime())}s`,
      responseTime: `${responseTime}ms`,
      dbLatency: dbLatency ? `${dbLatency}ms` : "N/A",
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
    },
    environment: {
      nodeVersion: process.version,
      environment: NODE_ENV,
      port: PORT,
      host: HOST,
    },
    timestamp: new Date().toISOString(),
  });
}));


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



// Authentication routes
app.use("/api/auth", authRoutes);

// Search routes (public access - no authentication required)
// Routes include: /api/search, /api/search/nearby, /api/search/stats
app.use("/api", searchRoutes);

// Patient routes (dashboard, orders, medications, SOS)
// Routes include: /patient/dashboard, /patient/orders, /patient/medications, /patient/sos/request, etc.
app.use("/api/patient", patientRoutes);

// Cart routes (persistent patient cart operations)
app.use("/api/cart", cartRoutes);

// Order routes (checkout + pharmacy order status transitions)
app.use("/api/orders", orderRoutes);

// Notification routes (user notifications, real-time alerts)
// Routes include: /notifications, /notifications/unread-count, /notifications/:id/read, etc.
app.use("/api/notifications", notificationRoutes);

// Pharmacy routes (onboarding, pharmacy management & admin verification)
// Routes include: /pharmacy/onboard, /pharmacy/my-pharmacy, /admin/pharmacies, /admin/pharmacy/:id, etc.
app.use("/api", pharmacyRoutes);

// Inventory routes (medicine CRUD for verified pharmacies)
// Routes include: /inventory, /inventory/my-stock, /inventory/:id
app.use("/api", inventoryRoutes);

// Admin routes (profile settings, password change, pharmacy management)
// Routes include: /admin/profile, /admin/change-password, /admin/pharmacies, etc.
app.use("/api/admin", adminRoutes);

// Content routes (public health tips and announcements for all authenticated users)
// Routes include: /content/health-tips, /content/announcements, etc.
app.use("/api/content", contentRoutes);

// Chat routes (real-time messaging between Patient and Pharmacy per SOS)
// Routes include: /chat/:sosRequestId
app.use("/api/chat", chatRoutes);

// Review routes (patient-to-pharmacy ratings and reviews)
// Routes include: POST /reviews, GET /reviews/:pharmacyId
app.use("/api/reviews", reviewRoutes);

// Admin extended routes will be loaded dynamically
// Dynamic import for CommonJS module compatibility
import("./modules/admin/admin-extended.routes.js")
  .then((module) => {
    app.use("/api/admin", module.default || module);
    logger.info("✓ Admin extended routes loaded");
  })
  .catch((err) => {
    logger.error("✗ Failed to load admin extended routes:", err);
  });

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
// STATIC FILE SERVING (Production Only)
// ============================================

if (NODE_ENV === "production") {
  // Serve static files from the Frontend build directory
  const frontendBuildPath = path.join(__dirname, "../../Frontend/dist");
  
  app.use(express.static(frontendBuildPath, {
    maxAge: "1y", // Cache static assets for 1 year
    etag: true,
    lastModified: true,
  }));

  // Catch-all route for SPA - must be AFTER API routes
  // Only serve index.html for non-API routes
  app.get("*", (req, res, next) => {
    // Never serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
}

// ============================================
// 404 HANDLER (Development Only - API routes)
// ============================================

if (NODE_ENV !== "production") {
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: `Cannot ${req.method} ${req.path}`,
      },
    });
  });
}

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

    // Create HTTP server and attach Socket.IO
    const server = http.createServer(app);

    const io = new SocketIOServer(server, {
      cors: {
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
          } else if (NODE_ENV === "development" && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Register chat socket handler
    chatHandler(io);
    // Expose io globally so controllers can emit real-time events
    app.set("io", io);
    console.log("✓ Socket.IO initialized with chat handler");

    // Handle port-in-use errors gracefully — attempt auto-kill then retry once
    server.on("error", async (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`\n⚠️  Port ${PORT} is already in use. Attempting auto-cleanup...`);
        try {
          // Try to free the port automatically
          const { execSync } = await import("child_process");
          if (process.platform === "win32") {
            // Find PID on the port and kill it
            const out = execSync(`netstat -ano | findstr ":${PORT}"`, { encoding: "utf8" });
            const pids = [...new Set(
              out.split("\n")
                .map(l => l.trim().split(/\s+/).pop())
                .filter(p => p && /^\d+$/.test(p) && p !== "0" && p !== String(process.pid))
            )];
            for (const pid of pids) {
              try { execSync(`taskkill /PID ${pid} /F`, { encoding: "utf8" }); } catch {}
            }
          } else {
            execSync(`lsof -ti :${PORT} | xargs kill -9 2>/dev/null || true`, { encoding: "utf8" });
          }
          console.log(`✓ Cleared port ${PORT}. Retrying in 1 second...`);
          await new Promise(r => setTimeout(r, 1000));
          server.listen(PORT, HOST);
          return;
        } catch (killErr) {
          console.error(`\n❌ Could not auto-clear port ${PORT}.`);
          console.error(`   Manually kill the process and retry:\n`);
          console.error(`   Windows:  netstat -ano | findstr ":${PORT}" → taskkill /PID <pid> /F`);
          console.error(`   Mac/Linux: lsof -i :${PORT} → kill -9 <pid>\n`);
        }
        await prisma.$disconnect();
        process.exit(1);
      }
      throw err;
    });

    server.listen(PORT, HOST, () => {
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
  • Access Token expiry:  30 minutes
  • Refresh Token expiry: 7 days
  • OTP expiry:           5 minutes
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
