import { PrismaClient } from "../generated/prisma";

// Create a single instance of PrismaClient to be reused
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

export default prisma;
