import { Router } from "express";
import * as ratesController from "../controllers/exchange-rates.controller";

const router = Router();

/**
 * GET /api/exchange-rates
 * Get all exchange rates
 */
router.get("/", ratesController.getExchangeRates);

/**
 * GET /api/exchange-rates/:id
 * Get single exchange rate by ID
 */
router.get("/:id", ratesController.getExchangeRateById);

/**
 * POST /api/exchange-rates
 * Create or update exchange rate
 */
router.post("/", ratesController.upsertExchangeRate);

/**
 * PUT /api/exchange-rates/:id
 * Update exchange rate
 */
router.put("/:id", ratesController.updateExchangeRate);

/**
 * POST /api/exchange-rates/:id/refresh
 * Refresh a specific exchange rate
 */
router.post("/:id/refresh", ratesController.refreshExchangeRate);

/**
 * POST /api/exchange-rates/refresh-all
 * Refresh all active exchange rates
 */
router.post("/refresh-all", ratesController.refreshAllRates);

export default router;
