import { Router } from "express";
import * as paymentMethodsController from "../controllers/payment-methods.controller";
import { upload } from "../middleware/upload.middleware";

const router = Router();

/**
 * GET /api/payment-methods
 * Get all payment methods
 */
router.get("/", paymentMethodsController.getPaymentMethods);

/**
 * GET /api/payment-methods/:id
 * Get single payment method by ID
 */
router.get("/:id", paymentMethodsController.getPaymentMethodById);

/**
 * POST /api/payment-methods
 * Create new payment method
 */
router.post(
  "/",
  upload.single("qrCodeImage"),
  paymentMethodsController.createPaymentMethod,
);

/**
 * PUT /api/payment-methods/:id
 * Update payment method
 */
router.put(
  "/:id",
  upload.single("qrCodeImage"),
  paymentMethodsController.updatePaymentMethod,
);

/**
 * DELETE /api/payment-methods/:id
 * Delete payment method
 */
router.delete("/:id", paymentMethodsController.deletePaymentMethod);

export default router;
