import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { Webhook } from "svix";

/**
 * Handle Clerk webhooks to sync user changes to database
 */
export const handleClerkWebhook = async (req: Request, res: Response) => {
  try {
    // Get the webhook secret from environment
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error("CLERK_WEBHOOK_SECRET not configured");
      return res.status(500).json({
        success: false,
        message: "Webhook secret not configured",
      });
    }

    // Get Svix headers for verification
    const svix_id = req.headers["svix-id"] as string;
    const svix_timestamp = req.headers["svix-timestamp"] as string;
    const svix_signature = req.headers["svix-signature"] as string;

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing svix headers",
      });
    }

    // Get the body
    const body = JSON.stringify(req.body);

    // Create a new Svix instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: any;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as any;
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    // Handle the webhook
    const eventType = evt.type;
    const userData = evt.data;

    console.log(`Webhook received: ${eventType}`);

    switch (eventType) {
      case "user.created":
      case "user.updated":
        // Upsert user to database
        await prisma.user.upsert({
          where: {
            email: userData.email_addresses[0]?.email_address || "",
          },
          update: {
            name: `${userData.first_name || ""} ${userData.last_name || ""}`.trim() || "User",
            phone: userData.phone_numbers[0]?.phone_number || null,
            role: (userData.public_metadata?.role as string) ||
                  (userData.unsafe_metadata?.role as string) ||
                  "user",
            lastActive: new Date(),
          },
          create: {
            email: userData.email_addresses[0]?.email_address || "",
            name: `${userData.first_name || ""} ${userData.last_name || ""}`.trim() || "User",
            password: "", // Clerk handles auth
            phone: userData.phone_numbers[0]?.phone_number || null,
            role: (userData.public_metadata?.role as string) ||
                  (userData.unsafe_metadata?.role as string) ||
                  "user",
            status: "active",
            verificationStatus: "verified",
            lastActive: new Date(),
          },
        });

        console.log(`User ${eventType === "user.created" ? "created" : "updated"}: ${userData.id}`);
        break;

      case "user.deleted":
        // Soft delete or hard delete user
        const email = userData.email_addresses?.[0]?.email_address;
        if (email) {
          // Option 1: Soft delete (set status to suspended)
          await prisma.user.update({
            where: { email },
            data: {
              status: "suspended",
              lastActive: new Date(),
            },
          });

          console.log(`User deleted: ${userData.id}`);
        }
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return res.status(200).json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process webhook",
      error: error.message,
    });
  }
};
