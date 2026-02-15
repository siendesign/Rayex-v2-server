import { Router } from "express";
import * as usersController from "../controllers/users.controller";

const router = Router();

/**
 * POST /api/users/sync
 * Sync user from Clerk to database (upsert)
 */
router.post("/sync", usersController.syncUser);

/**
 * GET /api/users
 * Get all users with pagination and filters
 */
router.get("/", usersController.getUsers);

/**
 * GET /api/users/:id
 * Get single user by ID
 */
router.get("/:id", usersController.getUserById);

/**
 * PUT /api/users/:id/status
 * Update user status
 */
router.put("/:id/status", usersController.updateUserStatus);

export default router;
