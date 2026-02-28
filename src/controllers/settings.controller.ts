import { Request, Response } from "express";
import prisma from "../lib/prisma";

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findMany();
    // Convert array of {key, value} to a key-value object
    const settingsObj = settings.reduce(
      (
        acc: Record<string, string>,
        current: { key: string; value: string },
      ) => {
        acc[current.key] = current.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    res.status(200).json(settingsObj);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const settingsPayload = req.body;

    // Upsert each key in the payload
    const promises = Object.entries(settingsPayload).map(
      async ([key, value]) => {
        if (typeof value === "string") {
          return prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          });
        }
        return Promise.resolve();
      },
    );

    await Promise.all(promises);

    res.status(200).json({ message: "Settings updated successfully" });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
};
