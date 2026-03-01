import { Resend } from "resend";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

// Ensure the API key exists
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey && process.env.NODE_ENV === "production") {
  console.warn("⚠️  RESEND_API_KEY is missing from the environment variables!");
}

// Initialize Resend Client
export const resend = new Resend(resendApiKey || "re_dummy");

/**
 * Utility function to send emails via Resend REST API
 * Bypasses strict SMTP routing blocks on VPS providers
 */
export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: SendEmailOptions) => {
  try {
    // Determine sender using custom 'Reply-to' or hardcoded defaults
    const fromName = process.env.EMAIL_FROM_NAME || "RayEx Support";
    // NOTE: Resend requires verified domains in production (e.g., support@rayex.co)
    // You cannot send "From" generic @gmail.com addresses with Resend.
    const fromAddress =
      process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev";

    const data = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to: typeof to === "string" ? [to] : to,
      subject,
      text: text || "",
      html: html || "",
    });

    if (data.error) {
      console.error("Resend API rejected email:", data.error);
      throw new Error(data.error.message);
    }

    console.log("Resend Message sent: %s", data.data?.id);
    return data;
  } catch (error) {
    console.error("Error sending email via Resend:", error);
    throw error;
  }
};
