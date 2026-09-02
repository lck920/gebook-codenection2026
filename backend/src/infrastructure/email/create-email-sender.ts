import type { EmailConfig } from "../config";
import { createConsoleEmailSender } from "./console-email-sender";
import { createResendEmailSender } from "./resend-email-sender";
import type { EmailSender } from "./types";

/** Select the email adapter from env-backed {@link EmailConfig}. */
export function createEmailSender(config: EmailConfig): EmailSender {
  if (config.provider === "resend") {
    if (!config.resendApiKey) {
      throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
    }
    return createResendEmailSender({
      apiKey: config.resendApiKey,
      from: config.from,
    });
  }
  return createConsoleEmailSender();
}

export type { EmailSender, EmailMessage } from "./types";
