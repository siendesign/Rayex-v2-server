import { Router } from "express";
import * as statsController from "../controllers/stats.controller";

const router = Router();

/**
 * GET /api/stats
 * Get platform-wide statistics
 */
router.get("/", statsController.getStats);

export default router;
