import { Request, Response } from "express";
import prisma from "../lib/prisma";
import sseManager from "../lib/sse";

/**
 * Sync user from Clerk to database (upsert)
 */
export const syncUser = async (req: Request, res: Response) => {
  try {
    const { clerkId, name, email, phone, role, metadata } = req.body;

    // Validate required fields
    if (!clerkId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: clerkId, email, name",
      });
    }

    // Upsert user (create if doesn't exist, update if exists)
    const user = await prisma.user.upsert({
      where: {
        email: email,
      },
      update: {
        name,
        phone,
        role: role || "user",
        lastActive: new Date(),
      },
      create: {
        email,
        name,
        password: "", // Clerk handles authentication, no password needed
        phone,
        role: role || "user",
        status: "active",
        verificationStatus: "verified", // Clerk already verified
        lastActive: new Date(),
      },
    });

    // Broadcast user event to admins
    sseManager.broadcast('admins', 'user_updated', user);

    return res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error("Error syncing user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to sync user",
      error: error.message,
    });
  }
};

/**
 * Get all users with pagination and filters
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      role = "",
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (role) {
      where.role = role;
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { joinedAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role: true,
        totalOrders: true,
        totalVolume: true,
        verificationStatus: true,
        joinedAt: true,
        lastActive: true,
      },
    });

    return res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

/**
 * Get single user by ID
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};

/**
 * Update user status
 */
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["active", "suspended", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be: active, suspended, or pending",
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status },
    });

    // Broadcast user event to admins
    sseManager.broadcast('admins', 'user_updated', user);

    return res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error("Error updating user status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
    });
  }
};
