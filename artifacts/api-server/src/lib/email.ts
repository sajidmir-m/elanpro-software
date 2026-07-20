import { Resend } from "resend";
import { logger } from "./logger";

let cachedClient: Resend | null = null;

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured. Add it to the API server's .env file.");
  }
  if (!cachedClient) cachedClient = new Resend(apiKey);
  return cachedClient;
}

/** Falls back to Resend's shared sandbox sender if no verified domain is configured. */
function defaultFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "Report Automation Hub <onboarding@resend.dev>";
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ id: string | null }> {
  const resend = getResendClient();
  const recipients = Array.isArray(to) ? to : [to];

  const { data, error } = await resend.emails.send({
    from: defaultFromAddress(),
    to: recipients,
    subject,
    html,
  });

  if (error) {
    logger.error({ err: error, recipients }, "Failed to send email via Resend");
    throw new Error(error.message);
  }

  return { id: data?.id ?? null };
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
