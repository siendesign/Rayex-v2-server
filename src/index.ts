import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";
import http from "http";
import { initSocket } from "./lib/socket";
import { connectRedis } from "./lib/redis";
import { connectKafka } from "./lib/kafka";
import usersRouter from "./routes/users.route";
import adminRouter from "./routes/admin.route";
import webhooksRouter from "./routes/webhooks.route";
import ordersRouter from "./routes/orders.route";
import currenciesRouter from "./routes/currencies.route";
import ratesRouter from "./routes/exchange-rates.route";
import methodsRouter from "./routes/payment-methods.route";
import statsRouter from "./routes/stats.route";

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();

// Get port from environment or use default
const PORT = parseInt(process.env.PORT || "3003", 10);

// CORS Configuration - Support multiple origins
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || ['http://localhost:3000'];

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
); // Security headers with cross-origin support
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// SSE Endpoint (Move it here, before compression/morgan)
import sseManager from "./lib/sse";
app.get("/api/realtime/sse", (req: Request, res: Response): void => {
  const email = req.query.email as string;
  const role = req.query.role as string;
  const origin = req.headers.origin;

  console.log(`🔌 SSE Request - Origin: ${origin}, Email: ${email}, Role: ${role}`);

  // Set explicit CORS for this route just in case
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (!email && role !== 'admin' && role !== 'public') {
    console.warn(`⚠️ SSE Rejected: Missing email or valid role`);
    res.status(400).json({ error: "Email or valid role is required for SSE" });
    return;
  }

  const rooms: string[] = [];
  if (role === 'admin') {
    rooms.push('admins');
  }
  if (email) {
    rooms.push(`user_${email}`);
  }

  const clientId = email || `admin_${Math.random().toString(36).substr(2, 9)}`;
  sseManager.addClient(clientId, res, rooms);
});

app.use(compression()); // Compress regular JSON responses
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")); // HTTP request logger
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "RayEx API Server",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/users", usersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/currencies", currenciesRouter);
app.use("/api/exchange-rates", ratesRouter);
app.use("/api/payment-methods", methodsRouter);
app.use("/api/stats", statsRouter);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io (Keeping it for now to avoid breaking things instantly, will remove later)
initSocket(server);

// Start server - Listen on 0.0.0.0 for Railway/production
server.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  
  try {
    // Connect to external services
    await connectRedis();
    await connectKafka();
  } catch (error) {
    console.error("❌ Failed to connect to external services:", error);
  }

  console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check available at /health`);
  console.log(`✅ Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});

export default app;
