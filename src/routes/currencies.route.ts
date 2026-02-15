import { Router } from "express";
import * as currenciesController from "../controllers/currencies.controller";
import { upload } from "../middleware/upload.middleware";

const router = Router();

/**
 * GET /api/currencies
 * Get all currencies
 */
router.get("/", currenciesController.getCurrencies);

/**
 * GET /api/currencies/:id
 * Get single currency by ID
 */
router.get("/:id", currenciesController.getCurrencyById);

/**
 * POST /api/currencies
 * Create new currency
 */
router.post("/", upload.single("flagImage"), currenciesController.createCurrency);

/**
 * PUT /api/currencies/:id
 * Update currency
 */
router.put("/:id", upload.single("flagImage"), currenciesController.updateCurrency);

/**
 * DELETE /api/currencies/:id
 * Delete currency
 */
router.delete("/:id", currenciesController.deleteCurrency);

/**
 * POST /api/currencies/:id/toggle
 * Toggle currency active status
 */
router.post("/:id/toggle", currenciesController.toggleCurrencyActive);

export default router;
