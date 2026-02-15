import { Router } from "express";
import * as ordersController from "../controllers/orders.controller";

const router = Router();

/**
 * GET /api/orders
 * Get all orders with pagination and filters
 */
router.get("/", ordersController.getOrders);

/**
 * GET /api/orders/by-user
 * Get orders for a specific user
 */
router.get("/by-user", ordersController.getUserOrders);

/**
 * GET /api/orders/:id
 * Get single order by ID
 */
router.get("/:id", ordersController.getOrderById);

/**
 * POST /api/orders
 * Create a new order
 */
router.post("/", ordersController.createOrder);

/**
 * PUT /api/orders/:id/status
 * Update order status
 */
router.put("/:id/status", ordersController.updateOrderStatus);

export default router;
