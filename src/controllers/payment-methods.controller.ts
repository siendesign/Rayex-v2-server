import { Request, Response } from "express";
import prisma from "../lib/prisma";

/**
 * Get all payment methods
 */
export const getPaymentMethods = async (req: Request, res: Response) => {
  try {
    const methods = await prisma.paymentMethod.findMany({
      include: {
        currency: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      data: methods,
    });
  } catch (error: any) {
    console.error("Error fetching payment methods:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment methods",
      error: error.message,
    });
  }
};

/**
 * Get single payment method by ID
 */
export const getPaymentMethodById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const method = await prisma.paymentMethod.findUnique({
      where: { id },
      include: {
        currency: true,
      },
    });

    if (!method) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found",
      });
    }

    return res.json({
      success: true,
      data: method,
    });
  } catch (error: any) {
    console.error("Error fetching payment method:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment method",
      error: error.message,
    });
  }
};

/**
 * Create new payment method
 */
export const createPaymentMethod = async (req: Request, res: Response) => {
  try {
    const {
      name,
      type,
      currencyId,
      active,
      bankName,
      accountName,
      accountNumber,
      routingNumber,
      swift,
      iban,
      walletAddress,
      network,
      instructions,
    } = req.body;

    if (!name || !type || !currencyId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, type, currencyId",
      });
    }

    const method = await prisma.paymentMethod.create({
      data: {
        name,
        type,
        currencyId,
        active: active !== undefined ? active : true,
        bankName,
        accountName,
        accountNumber,
        routingNumber,
        swift,
        iban,
        walletAddress,
        network,
        instructions,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Payment method created successfully",
      data: method,
    });
  } catch (error: any) {
    console.error("Error creating payment method:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create payment method",
      error: error.message,
    });
  }
};

/**
 * Update payment method
 */
export const updatePaymentMethod = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      currencyId,
      active,
      bankName,
      accountName,
      accountNumber,
      routingNumber,
      swift,
      iban,
      walletAddress,
      network,
      instructions,
    } = req.body;

    const method = await prisma.paymentMethod.update({
      where: { id },
      data: {
        name,
        type,
        currencyId,
        active,
        bankName,
        accountName,
        accountNumber,
        routingNumber,
        swift,
        iban,
        walletAddress,
        network,
        instructions,
      },
    });

    return res.json({
      success: true,
      message: "Payment method updated successfully",
      data: method,
    });
  } catch (error: any) {
    console.error("Error updating payment method:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update payment method",
      error: error.message,
    });
  }
};

/**
 * Delete payment method
 */
export const deletePaymentMethod = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.paymentMethod.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Payment method deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting payment method:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete payment method",
      error: error.message,
    });
  }
};
