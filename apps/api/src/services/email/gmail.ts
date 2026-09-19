import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "../../config/env";
import { logger } from "../../config/logger";

let transporter: Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_USER || getEnv().FROM_EMAIL;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be configured to send AutoSubmit emails");
    }

    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

export interface AutoSubmitEmailPayload {
  to: string;
  userName: string;
  formUrl: string;
  prompt?: string;
  submissionSummary: string;
}

export async function sendAutoSubmitConfirmation(payload: AutoSubmitEmailPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const mailOptions = {
      from: `"LayerFlow AutoSubmit" <${process.env.GMAIL_USER || getEnv().FROM_EMAIL}>`,
      to: payload.to,
      subject: `🎉 Form Successfully Auto-Submitted: ${new URL(payload.formUrl).hostname}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #1f2937; border-radius: 16px; background-color: #090d16; color: #f3f4f6;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #f97316; margin: 0; font-size: 24px;">LayerFlow AutoSubmit</h1>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 4px;">Automated Form Submission Confirmation</p>
          </div>

          <p style="font-size: 16px; color: #e5e7eb;">Hi <strong>${payload.userName}</strong>,</p>
          
          <p style="font-size: 14px; color: #9ca3af; line-height: 1.6;">
            Your request to automatically complete and submit the following form has been executed successfully by LayerFlow AI!
          </p>

          <div style="background-color: #111827; border: 1px solid #374151; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af;"><strong>Target Form URL:</strong></p>
            <a href="${payload.formUrl}" style="color: #60a5fa; font-size: 14px; word-break: break-all;" target="_blank">${payload.formUrl}</a>
            
            ${payload.prompt ? `
              <p style="margin: 16px 0 8px 0; font-size: 13px; color: #9ca3af;"><strong>Your Prompt / Note:</strong></p>
              <p style="margin: 0; font-size: 14px; color: #d1d5db; font-style: italic;">"${payload.prompt}"</p>
            ` : ""}
          </div>

          <div style="background-color: #111827; border: 1px solid #374151; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #10b981;"><strong>Submission Details & Summary:</strong></p>
            <p style="margin: 0; font-size: 13px; color: #d1d5db; white-space: pre-wrap; line-height: 1.5;">${payload.submissionSummary}</p>
          </div>

          <p style="font-size: 13px; color: #6b7280; text-align: center; margin-top: 32px;">
            Sent automatically by LayerFlow · No manual detail filling needed next time!
          </p>
        </div>
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    logger.info({ to: payload.to, messageId: info.messageId }, "AutoSubmit Gmail sent successfully");
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, to: payload.to }, "Failed to send AutoSubmit confirmation email");
    return { success: false, error: errorMsg };
  }
}
