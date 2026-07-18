/** Plain, dependency-free HTML email templates. */

function formatDollars(micro: number): string {
  return `$${(micro / 1_000_000).toFixed(2)}`;
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
      <p style="margin:0 0 16px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280">LayerFlow</p>
      <h1 style="margin:0 0 16px;font-size:20px">${title}</h1>
      ${bodyHtml}
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">You receive these alerts as a workspace owner. Manage budgets in your LayerFlow settings.</p>
    </div>
  </body>
</html>`;
}

export function budgetWarningEmail(args: {
  workspaceName: string;
  percentUsed: number;
  spentMicro: number;
  limitMicro: number;
  period: string;
}): { subject: string; html: string; text: string } {
  const pct = Math.floor(args.percentUsed);
  const subject = `LayerFlow: ${args.workspaceName} is at ${pct}% of its monthly budget`;
  const line =
    `Workspace "${args.workspaceName}" has used ${formatDollars(args.spentMicro)} of its ` +
    `${formatDollars(args.limitMicro)} budget for ${args.period} (${pct}%).`;
  return {
    subject,
    html: layout(
      `Budget at ${pct}%`,
      `<p style="margin:0 0 12px;font-size:14px;line-height:1.6">${line}</p>
       <p style="margin:0;font-size:14px;line-height:1.6">Calls keep working until the limit is reached. Raise the limit or watch usage if this is unexpected.</p>`,
    ),
    text: `${line}\nCalls keep working until the limit is reached.`,
  };
}

export function budgetBlockedEmail(args: {
  workspaceName: string;
  spentMicro: number;
  limitMicro: number;
  period: string;
}): { subject: string; html: string; text: string } {
  const subject = `LayerFlow: ${args.workspaceName} hit its monthly budget — calls are blocked`;
  const line =
    `Workspace "${args.workspaceName}" has consumed its full ${formatDollars(args.limitMicro)} ` +
    `budget for ${args.period}. New model calls return 402 until the limit is raised.`;
  return {
    subject,
    html: layout(
      "Budget fully consumed",
      `<p style="margin:0 0 12px;font-size:14px;line-height:1.6">${line}</p>
       <p style="margin:0;font-size:14px;line-height:1.6">Raise the monthly limit in Budget settings to resume immediately.</p>`,
    ),
    text: line,
  };
}

export function weeklyDigestEmail(args: {
  workspaceName: string;
  weekLabel: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costMicro: number;
  topModels: Array<{ model: string; costMicro: number; requests: number }>;
}): { subject: string; html: string; text: string } {
  const subject = `LayerFlow weekly digest — ${args.workspaceName} (${args.weekLabel})`;
  const modelRows = args.topModels
    .map(
      (m) =>
        `<tr><td style="padding:6px 0;font-size:13px">${m.model}</td>` +
        `<td style="padding:6px 0;font-size:13px;text-align:right">${m.requests}</td>` +
        `<td style="padding:6px 0;font-size:13px;text-align:right">${formatDollars(m.costMicro)}</td></tr>`,
    )
    .join("");
  const html = layout(
    `Your week in review (${args.weekLabel})`,
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6">
       ${args.requests} model calls · ${args.inputTokens.toLocaleString()} input tokens ·
       ${args.outputTokens.toLocaleString()} output tokens · ${formatDollars(args.costMicro)} total spend.
     </p>
     ${
       args.topModels.length > 0
         ? `<table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb">
             <tr><th style="padding:8px 0;font-size:12px;text-align:left;color:#6b7280">Model</th>
                 <th style="padding:8px 0;font-size:12px;text-align:right;color:#6b7280">Calls</th>
                 <th style="padding:8px 0;font-size:12px;text-align:right;color:#6b7280">Spend</th></tr>
             ${modelRows}
           </table>`
         : `<p style="margin:0;font-size:14px;color:#6b7280">No model calls this week.</p>`
     }`,
  );
  const text =
    `${args.workspaceName} — week ${args.weekLabel}: ${args.requests} calls, ` +
    `${formatDollars(args.costMicro)} spend.`;
  return { subject, html, text };
}
