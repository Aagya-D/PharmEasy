// PharmEasy backend entry point.

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
import userRoutes from "./modules/user/user.routes.js";
import chatHandler from "./sockets/chatHandler.js";
// adminExtendedRoutes still uses CommonJS and is handled separately.

// Resolve __dirname for ES modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables.
dotenv.config();

// Validate environment variables before starting.
try {
  validateEnvironment();
} catch (error) {
  console.error("Environment validation failed:");
  console.error(error.message);
  process.exit(1);
}

const app = express();
const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || 5050;
const HOST =
  process.env.HOST || (NODE_ENV === "production" ? "0.0.0.0" : "localhost");

// Middleware.

// CORS setup.
const parseOriginValues = (...rawValues) =>
  rawValues
    .flatMap((value) => String(value || "").split(","))
    .map((origin) => origin.trim())
    .filter(Boolean);

const toRegexFromWildcard = (pattern) => {
  const escaped = pattern
    .replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
};

const allowedOrigins = new Set(
  [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    ...parseOriginValues(
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN,
      process.env.CORS_ORIGINS
    ),
  ].filter(Boolean)
);

const allowedOriginPatterns = parseOriginValues(
  process.env.CORS_ORIGIN_PATTERNS
).map((pattern) => toRegexFromWildcard(pattern));

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

      if (allowedOriginPatterns.some((pattern) => pattern.test(origin))) {
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

// Body parser.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Add a simple success response helper.
app.use((req, res, next) => {
  res.success = (data) => {
    res.status(200).json({
      success: true,
      ...data,
    });
  };
  next();
});

// Request and response logger.
app.use(loggingMiddleware);

// Serve local upload fallback assets.
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));


// Health check endpoint.
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

// Status check endpoint with database validation.
app.get("/api/status", asyncHandler(async (req, res) => {
  const startTime = Date.now();

  // Check database connectivity.
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



// Authentication routes.
app.use("/api/auth", authRoutes);

// Search routes are public.
app.use("/api", searchRoutes);

// Patient routes.
app.use("/api/patient", patientRoutes);

// Cart routes.
app.use("/api/cart", cartRoutes);

// Order routes.
app.use("/api/orders", orderRoutes);

// Notification routes.
app.use("/api/notifications", notificationRoutes);

// Pharmacy routes.
app.use("/api", pharmacyRoutes);

// Inventory routes.
app.use("/api", inventoryRoutes);

// Admin routes.
app.use("/api/admin", adminRoutes);

// Content routes.
app.use("/api/content", contentRoutes);

// Chat routes.
app.use("/api/chat", chatRoutes);

// Review routes.
app.use("/api/reviews", reviewRoutes);

// User profile routes.
app.use("/api/user", userRoutes);

// Load admin extended routes dynamically.
import("./modules/admin/admin-extended.routes.js")
  .then((module) => {
    app.use("/api/admin", module.default || module);
    logger.info("Admin extended routes loaded");
  })
  .catch((err) => {
    logger.error("Failed to load admin extended routes:", err);
  });

// Root API endpoint.
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

// Serve the frontend build in production.

if (NODE_ENV === "production") {
  // Serve static files from the frontend build.
  const frontendBuildPath = path.join(__dirname, "../../Frontend/dist");
  
  app.use(express.static(frontendBuildPath, {
    maxAge: "1y", // Cache static assets for 1 year
    etag: true,
    lastModified: true,
  }));

  // Serve the SPA shell for non-API routes.
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
}

// Return JSON 404s in development.

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

// Error handler.

app.use(errorHandler);

// Start the server.

const startServer = async () => {
  try {
    // Check the database connection.
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connection successful");

    // Create the HTTP server and Socket.IO instance.
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

    // Register the chat socket handler.
    chatHandler(io);
    // Make io available to controllers.
    app.set("io", io);
    console.log("Socket.IO initialized with chat handler");

    // Handle port-in-use errors and retry once.
    server.on("error", async (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`\nPort ${PORT} is already in use. Attempting auto-cleanup...`);
        try {
          const { execSync } = await import("child_process");
          if (process.platform === "win32") {
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
          console.log(`Cleared port ${PORT}. Retrying in 1 second...`);
          await new Promise(r => setTimeout(r, 1000));
          server.listen(PORT, HOST);
          return;
        } catch (killErr) {
          console.error(`\nCould not auto-clear port ${PORT}.`);
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
      console.log(`PharmEasy backend server started at http://${HOST}:${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`Node: ${process.version}`);
      console.log("Available endpoints: GET /api/health, GET /api/db-check, POST /api/auth/register, POST /api/auth/login, POST /api/auth/verify-otp");
      console.log("Authentication: access token 30 minutes, refresh token 7 days, OTP 5 minutes, reset token 1 hour");
      console.log("API documentation: GET /api");
      console.log("Default test credentials are available after seeding: npm run prisma:seed");
    });

    // Graceful shutdown.
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log("Server closed");
        process.exit(0);
      });

      // Force shutdown after 10 seconds.
      setTimeout(() => {
        console.error("Force closing server");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();

export default app;
