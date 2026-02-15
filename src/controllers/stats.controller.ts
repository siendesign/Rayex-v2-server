import { Request, Response } from "express";
import prisma from "../lib/prisma";

/**
 * Get platform-wide statistics for the admin dashboard
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    // 1. Total Volume (Sum of all completed orders toAmount in USD equivalent)
    // For simplicity, we'll sum toAmount of completed orders.
    const volumeResult = await prisma.order.aggregate({
      where: { status: "completed" },
      _sum: { toAmount: true },
    });

    // 2. Total Orders
    const totalOrders = await prisma.order.count();

    // 3. User Count
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { status: "active" } });

    // 4. Pending Tasks
    const pendingOrders = await prisma.order.count({ 
      where: { 
        status: { in: ["pending_payment", "payment_received", "processing"] } 
      } 
    });
    
    const pendingVerifications = await prisma.user.count({ 
      where: { verificationStatus: "pending" } 
    });

    // 5. Recent Activity (Last 5 orders)
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        fromCurrency: true,
        toCurrency: true,
      },
    });

    // 6. Revenue / Fees
    const feesResult = await prisma.order.aggregate({
      where: { status: "completed" },
      _sum: { fee: true },
    });

    return res.json({
      success: true,
      data: {
        metrics: {
          totalVolume: volumeResult._sum.toAmount || 0,
          totalOrders,
          totalUsers,
          activeUsers,
          pendingOrders,
          pendingVerifications,
          totalFees: feesResult._sum.fee || 0,
        },
        recentOrders,
      },
    });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
};
