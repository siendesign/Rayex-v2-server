import { Router } from "express";
import * as webhooksController from "../controllers/webhooks.controller";

const router = Router();

/**
 * POST /api/webhooks/clerk
 * Webhook to sync user changes from Clerk to database
 */
router.post("/clerk", webhooksController.handleClerkWebhook);

export default router;
