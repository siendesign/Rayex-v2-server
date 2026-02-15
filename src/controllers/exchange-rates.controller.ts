import { Request, Response } from "express";
import prisma from "../lib/prisma";
import redisClient, { getIsRedisConnected } from "../lib/redis";
import { getIO } from "../lib/socket";
import sseManager from "../lib/sse";

/**
 * Get all exchange rates
 */
export const getExchangeRates = async (req: Request, res: Response) => {
  try {
    const rates = await prisma.exchangeRate.findMany({
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
      orderBy: { lastUpdated: "desc" },
    });

    return res.json({
      success: true,
      data: rates,
    });
  } catch (error: any) {
    console.error("Error fetching exchange rates:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch exchange rates",
      error: error.message,
    });
  }
};

/**
 * Get single exchange rate by ID
 */
export const getExchangeRateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rate = await prisma.exchangeRate.findUnique({
      where: { id },
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
    });

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: "Exchange rate not found",
      });
    }

    return res.json({
      success: true,
      data: rate,
    });
  } catch (error: any) {
    console.error("Error fetching exchange rate:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch exchange rate",
      error: error.message,
    });
  }
};

/**
 * Create or update exchange rate
 */
export const upsertExchangeRate = async (req: Request, res: Response) => {
  try {
    const { fromCurrencyId, toCurrencyId, rate, buyRate, sellRate, autoUpdate, active } = req.body;

    if (!fromCurrencyId || !toCurrencyId || rate === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // For trend tracking, we first find if a rate already exists
    const existingRate = await prisma.exchangeRate.findUnique({
      where: {
        fromCurrencyId_toCurrencyId: {
          fromCurrencyId,
          toCurrencyId,
        },
      },
    });

    let exchangeRate;
    if (existingRate) {
      exchangeRate = await prisma.exchangeRate.update({
        where: { id: existingRate.id },
        data: {
          rate,
          previousRate: existingRate.rate, // Store the old rate
          buyRate: buyRate || rate,
          sellRate: sellRate || rate,
          autoUpdate: autoUpdate !== undefined ? autoUpdate : existingRate.autoUpdate,
          active: active !== undefined ? active : existingRate.active,
          lastUpdated: new Date(),
        },
      });
    } else {
      exchangeRate = await prisma.exchangeRate.create({
        data: {
          fromCurrencyId,
          toCurrencyId,
          rate,
          previousRate: null,
          buyRate: buyRate || rate,
          sellRate: sellRate || rate,
          autoUpdate: autoUpdate !== undefined ? autoUpdate : false,
          active: active !== undefined ? active : true,
        },
      });
    }

    // Publish update to Redis for real-time WebSockets
    const rateData = await prisma.exchangeRate.findUnique({
      where: { id: exchangeRate.id },
      include: { fromCurrency: true, toCurrency: true }
    });
    
    if (rateData && getIsRedisConnected()) {
      await redisClient.publish('RATE_UPDATED', JSON.stringify(rateData));
    }
    
    if (rateData) {
      // Socket.io (legacy)
      getIO().emit('rate_updated', rateData);
      
      // SSE (new) - Broadcast to everyone (public room)
      sseManager.broadcast('public', 'rate_updated', rateData);
    }

    return res.json({
      success: true,
      message: "Exchange rate updated successfully",
      data: exchangeRate,
    });
  } catch (error: any) {
    console.error("Error upserting exchange rate:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update exchange rate",
      error: error.message,
    });
  }
};

/**
 * Update exchange rate
 */
export const updateExchangeRate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rate, buyRate, sellRate, autoUpdate, active } = req.body;

    // Get existing rate to set previousRate
    const currentRate = await prisma.exchangeRate.findUnique({
      where: { id }
    });

    const exchangeRate = await prisma.exchangeRate.update({
      where: { id },
      data: {
        rate,
        previousRate: currentRate?.rate,
        buyRate: buyRate !== undefined ? buyRate : undefined,
        sellRate: sellRate !== undefined ? sellRate : undefined,
        autoUpdate: autoUpdate !== undefined ? autoUpdate : undefined,
        active: active !== undefined ? active : undefined,
        lastUpdated: new Date(),
      },
    });

    // Publish update to Redis for real-time WebSockets
    const rateData = await prisma.exchangeRate.findUnique({
      where: { id: exchangeRate.id },
      include: { fromCurrency: true, toCurrency: true }
    });
    
    if (rateData && getIsRedisConnected()) {
      await redisClient.publish('RATE_UPDATED', JSON.stringify(rateData));
    }
    
    if (rateData) {
      // Socket.io (legacy)
      getIO().emit('rate_updated', rateData);
      
      // SSE (new) - Broadcast to everyone (public room)
      sseManager.broadcast('public', 'rate_updated', rateData);
    }

    return res.json({
      success: true,
      message: "Exchange rate updated successfully",
      data: exchangeRate,
    });
  } catch (error: any) {
    console.error("Error updating exchange rate:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update exchange rate",
      error: error.message,
    });
  }
};

/**
 * Trigger manual refresh for an exchange rate (Mock for now)
 */
export const refreshExchangeRate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // In a real scenario, this would call an external API (like CoinGecko or CurrencyLayer)
    // For now, we'll just update the timestamp
    
    const rate = await prisma.exchangeRate.update({
      where: { id },
      data: {
        lastUpdated: new Date(),
      },
    });

    return res.json({
      success: true,
      message: "Exchange rate refreshed successfully",
      data: rate,
    });
  } catch (error: any) {
    console.error("Error refreshing exchange rate:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to refresh exchange rate",
      error: error.message,
    });
  }
};

/**
 * Refresh all active auto-update rates
 */
export const refreshAllRates = async (req: Request, res: Response) => {
  try {
    // Mock implementation
    await prisma.exchangeRate.updateMany({
      where: { autoUpdate: true, active: true },
      data: { lastUpdated: new Date() },
    });

    return res.json({
      success: true,
      message: "All active auto-update rates refreshed",
    });
  } catch (error: any) {
    console.error("Error refreshing all rates:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to refresh rates",
      error: error.message,
    });
  }
};
