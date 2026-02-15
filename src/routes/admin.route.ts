import { Router } from "express";
import * as adminController from "../controllers/admin.controller";

const router = Router();

/**
 * PUT /api/admin/users/:id/suspend
 * Suspend a user in both Clerk and Database
 */
router.put("/users/:id/suspend", adminController.suspendUser);

/**
 * PUT /api/admin/users/:id/activate
 * Activate a suspended user in both Clerk and Database
 */
router.put("/users/:id/activate", adminController.activateUser);

/**
 * PUT /api/admin/users/:id/role
 * Update user role in both Clerk and Database
 */
router.put("/users/:id/role", adminController.updateUserRole);

/**
 * DELETE /api/admin/users/:id
 * Delete user from both Clerk and Database
 */
router.delete("/users/:id", adminController.deleteUser);

export default router;
