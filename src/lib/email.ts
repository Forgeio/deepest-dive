import nodemailer from "nodemailer";

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: parseInt(process.env.SMTP_PORT ?? "1025", 10),
    secure: false, // Mailpit does not use TLS
    auth: undefined,
  });
}

export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<void> {
  const appUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const from = process.env.SMTP_FROM ?? "noreply@deepest-dive.local";
  const transport = createTransport();

  await transport.sendMail({
    from,
    to,
    subject: "Verify your Deepest Dive account",
    text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nOr visit: ${appUrl}/verify-email`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Verify your Deepest Dive account</h2>
        <p>Enter this code on the verification page:</p>
        <div style="background: #f4f4f8; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${code}</span>
        </div>
        <p style="color: #666;">This code expires in <strong>15 minutes</strong>.</p>
        <p style="color: #666; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
}
