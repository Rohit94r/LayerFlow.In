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

export interface AgentRunSummaryEmailPayload {
  to: string;
  userName: string;
  agentName: string;
  status: "succeeded" | "failed";
  summary: string;
  model?: string | null;
  costUsd?: number | null;
  detailsUrl?: string;
}

/**
 * Best-effort run summary email. Unlike the AutoSubmit email this never
 * throws: a failed summary (misconfigured Gmail, network error) must not fail
 * the underlying job.
 */
export async function sendAgentRunSummaryEmail(payload: AgentRunSummaryEmailPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const mailOptions = {
      from: `"LayerFlow Agents" <${process.env.GMAIL_USER || getEnv().FROM_EMAIL}>`,
      to: payload.to,
      subject: `Agent run ${payload.status === "succeeded" ? "finished" : "failed"}: ${payload.agentName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #1f2937; border-radius: 16px; background-color: #090d16; color: #f3f4f6;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #f97316; margin: 0; font-size: 24px;">LayerFlow Agent Summary</h1>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 4px;">${payload.status === "succeeded" ? "Your agent finished a run" : "One of your agents needs attention"}</p>
          </div>

          <p style="font-size: 16px; color: #e5e7eb;">Hi <strong>${payload.userName}</strong>,</p>

          <div style="background-color: #111827; border: 1px solid #374151; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; color: #9ca3af;">Agent</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #f3f4f6; font-weight: 600;">${payload.agentName}</p>

            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #1f2937;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af;"><strong>Status:</strong></p>
              <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; ${payload.status === "succeeded" ? "background-color: rgba(16,185,129,0.15); color: #34d399;" : "background-color: rgba(244,63,94,0.15); color: #fb7185;"}">${payload.status === "succeeded" ? "Completed" : "Failed"}</span>
            </div>

            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #1f2937;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af;"><strong>Summary:</strong></p>
              <p style="margin: 0; font-size: 14px; color: #d1d5db; white-space: pre-wrap; line-height: 1.6;">${payload.summary}</p>
            </div>

            ${(payload.model ?? payload.costUsd) ? `
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #1f2937; display: flex; gap: 16px; flex-wrap: wrap;">
                ${payload.model ? `<p style="margin: 0; font-size: 12px; color: #9ca3af;">Model: <strong style="color: #d1d5db;">${payload.model}</strong></p>` : ""}
                ${typeof payload.costUsd === "number" ? `<p style="margin: 0; font-size: 12px; color: #9ca3af;">Cost: <strong style="color: #d1d5db;">$${payload.costUsd.toFixed(4)}</strong></p>` : ""}
              </div>
            ` : ""}
          </div>

          ${payload.detailsUrl ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="${payload.detailsUrl}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600;">Open agent in LayerFlow</a>
            </div>
          ` : ""}

          <p style="font-size: 13px; color: #6b7280; text-align: center; margin-top: 32px;">
            Sent automatically by LayerFlow · Manage approval-gated agents at app.layerflow.dev/agents
          </p>
        </div>
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    logger.info({ to: payload.to, agent: payload.agentName, messageId: info.messageId }, "Agent run summary Gmail sent successfully");
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, to: payload.to }, "Failed to send agent run summary email");
    return { success: false, error: errorMsg };
  }
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
