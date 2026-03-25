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

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const from = process.env.SMTP_FROM ?? "noreply@deepest-dive.local";
  const transport = createTransport();

  await transport.sendMail({
    from,
    to,
    subject: "Reset your Deepest Dive password",
    text: `You requested a password reset.\n\nClick the link below to set a new password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Reset your Deepest Dive password</h2>
        <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #7cb9e8; color: #0d0d1a; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">Or copy this link: <a href="${resetUrl}" style="color: #7cb9e8;">${resetUrl}</a></p>
        <p style="color: #666; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });
}
