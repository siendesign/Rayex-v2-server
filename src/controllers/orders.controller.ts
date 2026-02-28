import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { uploadImage } from "../lib/cloudinary";
import { emitEvent } from "../lib/kafka";
import { getIO } from "../lib/socket";
import sseManager from "../lib/sse";
import { sendEmail } from "../lib/mailer";
import {
  getOrderStatusUpdateEmail,
  getOrderCreatedEmail,
} from "../lib/email-templates";

/**
 * Get all orders with pagination and filters
 */
export const getOrders = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { id: { contains: search as string, mode: "insensitive" } },
        { user: { name: { contains: search as string, mode: "insensitive" } } },
        {
          user: { email: { contains: search as string, mode: "insensitive" } },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.order.count({ where });

    // Get orders
    const orders = await prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        fromCurrency: true,
        toCurrency: true,
      },
    });

    return res.json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

/**
 * Get single order by ID
 */
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        fromCurrency: true,
        toCurrency: true,
        paymentMethod: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error("Error fetching order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = [
      "pending_payment",
      "payment_received",
      "processing",
      "completed",
      "failed",
      "cancelled",
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        notes: notes !== undefined ? notes : undefined,
      },
      include: {
        fromCurrency: true,
        toCurrency: true,
        user: true,
        paymentMethod: true,
      },
    });

    // Emit Kafka event, WebSocket update, and SSE update
    await emitEvent("orders", "ORDER_STATUS_UPDATED", order);

    const userRoom = `user_${order.user.email}`;
    console.log(`📡 Emitting order_updated to admins and ${userRoom}`);

    // Socket.io (legacy)
    getIO().to("admins").to(userRoom).emit("order_updated", order);

    // SSE (new)
    sseManager.broadcast(["admins", userRoom], "order_updated", order);

    // Send Status Update Email
    try {
      await sendEmail({
        to: order.user.email,
        subject: `RayEx Order Status Update: ${status.replace("_", " ").toUpperCase()}`,
        html: getOrderStatusUpdateEmail(
          order.user.name,
          order.id,
          status,
          notes,
        ),
      });
      console.log(
        `✉️ Status update email sent successfully to ${order.user.email}`,
      );
    } catch (emailErr) {
      console.error(
        `⚠️ Failed to send status email to ${order.user.email}, but continuing...`,
        emailErr,
      );
    }

    return res.json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error: any) {
    console.error("Error updating order status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
};

/**
 * Create a new order
 */
export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      userEmail,
      fromCurrencyId,
      fromAmount,
      toCurrencyId,
      toAmount,
      paymentMethodId,
      recipientName,
      recipientBank,
      recipientAccountNumber,
      recipientSwift,
      recipientWalletAddress,
      exchangeRate,
      notes,
    } = req.body;

    // Validate required fields
    if (
      !userEmail ||
      !fromCurrencyId ||
      !toCurrencyId ||
      !fromAmount ||
      !toAmount ||
      !paymentMethodId ||
      !exchangeRate
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    let recipientQrCodeUrl = null;

    // Handle file upload to Cloudinary
    if ((req as any).file) {
      const file = (req as any).file;
      const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const uploadResult = await uploadImage(fileBase64);
      recipientQrCodeUrl = uploadResult.secure_url;
    }

    // 1. Find the user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please ensure you are logged in and synced.",
      });
    }

    // 2. Create the order
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        fromCurrencyId,
        fromAmount: parseFloat(fromAmount.toString()),
        toCurrencyId,
        toAmount: parseFloat(toAmount.toString()),
        paymentMethodId,
        recipientName: recipientName || null,
        recipientBank: recipientBank || null,
        recipientAccountNumber: recipientAccountNumber || null,
        recipientSwift: recipientSwift || null,
        recipientWalletAddress: recipientWalletAddress || null,
        recipientQrCodeUrl: recipientQrCodeUrl || null,
        exchangeRate: parseFloat(exchangeRate.toString()),
        fee: 0,
        notes: notes || null,
        status: "pending_payment",
      },
      include: {
        fromCurrency: true,
        toCurrency: true,
        paymentMethod: true,
      },
    });

    // 3. Update user metrics
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totalOrders: { increment: 1 },
      },
    });

    // Emit Kafka event, WebSocket update, and SSE update
    await emitEvent("orders", "ORDER_CREATED", order);

    const userRoom = `user_${user.email}`;

    // Socket.io (legacy)
    getIO().to("admins").to(userRoom).emit("new_order", order);

    // SSE (new)
    sseManager.broadcast(["admins", userRoom], "new_order", order);

    // Send Creation Confirmation Email
    try {
      await sendEmail({
        to: userEmail,
        subject: "RayEx Order Confirmation",
        html: getOrderCreatedEmail(
          user.name,
          order.id,
          order.fromAmount,
          order.fromCurrency.symbol,
          order.toAmount,
          order.toCurrency.symbol,
        ),
      });
      console.log(`✉️ Order creation email sent successfully to ${userEmail}`);
    } catch (emailErr) {
      console.error(
        `⚠️ Failed to send creation email to ${userEmail}, but continuing...`,
        emailErr,
      );
    }

    // Send Admin Notification Email
    try {
      const adminEmailSetting = await prisma.setting.findUnique({
        where: { key: "notificationEmail" },
      });
      const adminEmail = adminEmailSetting?.value;

      if (adminEmail) {
        await sendEmail({
          to: adminEmail,
          subject: `RayEx Alert: New Exchange Request`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #6d28d9; margin-top: 0;">New Order Created</h2>
              <p>A new exchange order has just been submitted on RayEx by <strong>${user.name}</strong> (${user.email}).</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9fafb; border-radius: 6px;">
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Order ID</strong></td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${order.id}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Sending</strong></td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${order.fromAmount} ${order.fromCurrency.code}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Receiving</strong></td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${order.toAmount.toLocaleString()} ${order.toCurrency.code}</td>
                </tr>
                <tr>
                  <td style="padding: 12px;"><strong>Method</strong></td>
                  <td style="padding: 12px;">${order.paymentMethod.name}</td>
                </tr>
              </table>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",")[0] : "http://localhost:3000"}/admin/orders" 
                   style="background-color: #6d28d9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  View in Admin Panel
                </a>
              </div>
            </div>
          `,
        });
        console.log(
          `✉️ Admin notification email sent successfully to ${adminEmail}`,
        );
      }
    } catch (adminErr) {
      console.error(`⚠️ Failed to send admin notification email:`, adminErr);
    }

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error: any) {
    console.error("Error creating order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

/**
 * Get orders for a specific user by email
 */
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "User email is required",
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        user: {
          email: email as string,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        fromCurrency: true,
        toCurrency: true,
        paymentMethod: true,
      },
    });

    return res.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error("Error fetching user orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user orders",
      error: error.message,
    });
  }
};
