import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";
import usersRouter from "./routes/users";
import adminRouter from "./routes/admin";

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();

// Get port from environment or use default
const PORT = parseInt(process.env.PORT || "3003", 10);

// CORS Configuration - Support multiple origins
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];

// Middleware
app.use(helmet()); // Security headers
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
app.use(compression()); // Compress responses
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

// Start server - Listen on 0.0.0.0 for Railway/production
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check available at /health`);
  console.log(`✅ Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});

export default app;
