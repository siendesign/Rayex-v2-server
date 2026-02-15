import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { clerkClient } from "@clerk/clerk-sdk-node";

/**
 * Suspend a user in both Clerk and Database
 */
export const suspendUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find user by ID
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update database status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: "suspended",
        lastActive: new Date(),
      },
    });

    // Try to ban user in Clerk
    try {
      // Find Clerk user by email
      const clerkUsers = await clerkClient.users.getUserList({
        emailAddress: [user.email],
      });

      if (clerkUsers.length > 0) {
        const clerkUser = clerkUsers[0];

        // Ban the user in Clerk by updating their banned status
        await clerkClient.users.updateUser(clerkUser.id, {
          publicMetadata: {
            ...clerkUser.publicMetadata,
            banned: true,
          },
        });

        console.log(`User banned in Clerk: ${clerkUser.id}`);
      }
    } catch (clerkError: any) {
      console.error("Error banning user in Clerk:", clerkError);
      // Continue even if Clerk fails - database is updated
    }

    return res.json({
      success: true,
      message: "User suspended successfully",
      data: updatedUser,
    });
  } catch (error: any) {
    console.error("Error suspending user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to suspend user",
      error: error.message,
    });
  }
};

/**
 * Activate a suspended user in both Clerk and Database
 */
export const activateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find user by ID
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update database status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: "active",
        lastActive: new Date(),
      },
    });

    // Try to unban user in Clerk
    try {
      // Find Clerk user by email
      const clerkUsers = await clerkClient.users.getUserList({
        emailAddress: [user.email],
      });

      if (clerkUsers.length > 0) {
        const clerkUser = clerkUsers[0];

        // Unban the user in Clerk by removing banned status
        await clerkClient.users.updateUser(clerkUser.id, {
          publicMetadata: {
            ...clerkUser.publicMetadata,
            banned: false,
          },
        });

        console.log(`User unbanned in Clerk: ${clerkUser.id}`);
      }
    } catch (clerkError: any) {
      console.error("Error unbanning user in Clerk:", clerkError);
      // Continue even if Clerk fails - database is updated
    }

    return res.json({
      success: true,
      message: "User activated successfully",
      data: updatedUser,
    });
  } catch (error: any) {
    console.error("Error activating user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to activate user",
      error: error.message,
    });
  }
};

/**
 * Update user role in both Clerk and Database
 */
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be: user or admin",
      });
    }

    // Find user by ID
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update database role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role,
        lastActive: new Date(),
      },
    });

    // Try to update role in Clerk
    try {
      // Find Clerk user by email
      const clerkUsers = await clerkClient.users.getUserList({
        emailAddress: [user.email],
      });

      if (clerkUsers.length > 0) {
        const clerkUser = clerkUsers[0];

        // Update user metadata in Clerk
        await clerkClient.users.updateUser(clerkUser.id, {
          publicMetadata: {
            role: role,
          },
        });

        console.log(`User role updated in Clerk: ${clerkUser.id} -> ${role}`);
      }
    } catch (clerkError: any) {
      console.error("Error updating role in Clerk:", clerkError);
      // Continue even if Clerk fails - database is updated
    }

    return res.json({
      success: true,
      message: "User role updated successfully",
      data: updatedUser,
    });
  } catch (error: any) {
    console.error("Error updating user role:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user role",
      error: error.message,
    });
  }
};

/**
 * Delete user from both Clerk and Database
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find user by ID
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete from database
    await prisma.user.delete({
      where: { id },
    });

    // Try to delete user from Clerk
    try {
      // Find Clerk user by email
      const clerkUsers = await clerkClient.users.getUserList({
        emailAddress: [user.email],
      });

      if (clerkUsers.length > 0) {
        const clerkUser = clerkUsers[0];

        // Delete user from Clerk
        await clerkClient.users.deleteUser(clerkUser.id);

        console.log(`User deleted from Clerk: ${clerkUser.id}`);
      }
    } catch (clerkError: any) {
      console.error("Error deleting user from Clerk:", clerkError);
      // Continue even if Clerk fails - database is updated
    }

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};
