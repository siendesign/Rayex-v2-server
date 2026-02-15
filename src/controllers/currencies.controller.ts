import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { uploadImage } from "../lib/cloudinary";
import sseManager from "../lib/sse";

/**
 * Get all currencies
 */
export const getCurrencies = async (req: Request, res: Response) => {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: { code: "asc" },
    });

    return res.json({
      success: true,
      data: currencies,
    });
  } catch (error: any) {
    console.error("Error fetching currencies:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch currencies",
      error: error.message,
    });
  }
};

/**
 * Get single currency by ID
 */
export const getCurrencyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const currency = await prisma.currency.findUnique({
      where: { id },
    });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: "Currency not found",
      });
    }

    return res.json({
      success: true,
      data: currency,
    });
  } catch (error: any) {
    console.error("Error fetching currency:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch currency",
      error: error.message,
    });
  }
};

/**
 * Create new currency
 */
export const createCurrency = async (req: Request, res: Response) => {
  try {
    const { code, name, symbol, flag, type, decimals } = req.body;
    let flagUrl = null;

    if (!code || !name || !symbol || !flag || !type) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Handle file upload to Cloudinary
    if ((req as any).file) {
      const file = (req as any).file;
      const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const uploadResult = await uploadImage(fileBase64);
      flagUrl = uploadResult.secure_url;
    }

    const currency = await prisma.currency.create({
      data: {
        code,
        name,
        symbol,
        flag,
        flagUrl,
        type,
        decimals: decimals ? parseInt(decimals.toString()) : 2,
        active: true,
      },
    });

    // Broadcast update to admins
    sseManager.broadcast('admins', 'currency_updated', currency);

    return res.status(201).json({
      success: true,
      message: "Currency created successfully",
      data: currency,
    });
  } catch (error: any) {
    console.error("Error creating currency:", error);
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Currency with this code already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create currency",
      error: error.message,
    });
  }
};

/**
 * Update currency
 */
export const updateCurrency = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, symbol, flag, type, decimals, active } = req.body;
    let flagUrl = req.body.flagUrl;

    // Handle file upload to Cloudinary
    if ((req as any).file) {
      const file = (req as any).file;
      const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const uploadResult = await uploadImage(fileBase64);
      flagUrl = uploadResult.secure_url;
    }

    const currency = await prisma.currency.update({
      where: { id },
      data: {
        name,
        symbol,
        flag,
        flagUrl,
        type,
        decimals: decimals ? parseInt(decimals.toString()) : undefined,
        active: active === "true" || active === true,
      },
    });

    // Broadcast update to admins
    sseManager.broadcast('admins', 'currency_updated', currency);

    return res.json({
      success: true,
      message: "Currency updated successfully",
      data: currency,
    });
  } catch (error: any) {
    console.error("Error updating currency:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update currency",
      error: error.message,
    });
  }
};

/**
 * Delete currency
 */
export const deleteCurrency = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if currency is used in any orders or rates
    // Prisma will handle this with Cascade/Restrict if configured, 
    // but we can check explicitly if needed.
    
    await prisma.currency.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Currency deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting currency:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete currency",
      error: error.message,
    });
  }
};

/**
 * Toggle currency active status
 */
export const toggleCurrencyActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const currentCurrency = await prisma.currency.findUnique({
      where: { id },
      select: { active: true },
    });

    if (!currentCurrency) {
      return res.status(404).json({
        success: false,
        message: "Currency not found",
      });
    }

    const currency = await prisma.currency.update({
      where: { id },
      data: {
        active: !currentCurrency.active,
      },
    });

    // Broadcast update to admins
    sseManager.broadcast('admins', 'currency_updated', currency);

    return res.json({
      success: true,
      message: `Currency ${currency.active ? "activated" : "deactivated"} successfully`,
      data: currency,
    });
  } catch (error: any) {
    console.error("Error toggling currency status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle currency status",
      error: error.message,
    });
  }
};
