/** Outbound transactional email payload. */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Port for sending transactional email (OTP, resets, etc.). */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
