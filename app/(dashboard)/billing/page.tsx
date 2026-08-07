import { CreditCard, Check, Zap, Shield, Users } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/shared/stat";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { workspaceService } from "@/lib/services/workspace";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "@/components/billing/checkout-button";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/forever",
    description: "For trying LayerFlow on one project.",
    features: ["3 Rescue Reports / month", "10 saved prompts", "Work Ledger", "Community support"],
    cta: "Current plan",
    current: true,
  },
  {
    id: "starter",
    name: "Starter",
    price: "$5",
    period: "/month",
    description: "For solo builders working across AI tools.",
    features: [
      "Unlimited Rescue Reports",
      "Prompt Improver + scoring",
      "Cost Check",
      "BYOK Vault",
      "3 workspaces",
    ],
    cta: "Upgrade",
    current: false,
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$14",
    period: "/month",
    description: "For teams and heavy AI workflows.",
    features: [
      "Everything in Starter",
      "Agent mesh sessions",
      "Smart routing + model budgets",
      "Outcome feedback loop",
      "10 seats · priority support",
    ],
    cta: "Go Pro",
    current: false,
  },
];

const INVOICES = [
  { id: "INV-2026-001", date: "Jul 1, 2026", amount: "$0.00", status: "paid" },
  { id: "INV-2026-002", date: "Jun 1, 2026", amount: "$0.00", status: "paid" },
];

export default async function BillingPage() {
  const analytics = await workspaceService.getCostAnalytics();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Workflow value pricing — you pay for the workflow, not the tokens."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Current plan" value="Free" icon={<Zap className="h-4 w-4" />} />
        <Stat label="AI spend (Aug)" value={`$${analytics.monthlySpend.toFixed(1)}`} icon={<CreditCard className="h-4 w-4" />} />
        <Stat label="Saved by routing" value={`$${analytics.monthlySavings.toFixed(1)}`} icon={<Shield className="h-4 w-4" />} />
        <Stat label="Next invoice" value="—" icon={<Users className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <Panel
            key={plan.id}
            className={cn(
              "relative flex flex-col p-6",
              plan.highlighted && "border-brand/40 bg-gradient-to-b from-brand/10 to-surface/60",
            )}
          >
            {plan.highlighted ? (
              <Badge tone="amber" className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                Most popular
              </Badge>
            ) : null}
            <h3 className="text-sm font-semibold text-ink">{plan.name}</h3>
            <p className="mt-2">
              <span className="text-3xl font-bold tracking-tight text-ink">{plan.price}</span>
              <span className="text-sm text-faint">{plan.period}</span>
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{plan.description}</p>
            <ul className="mt-4 flex-1 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-brand-2" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-5">
              {plan.current ? (
                <Button variant="secondary" className="w-full" disabled>
                  Current plan
                </Button>
              ) : (
                <CheckoutButton
                  plan={plan.id as "starter" | "pro"}
                  label={plan.cta}
                  variant={plan.highlighted ? "primary" : "outline"}
                  className="w-full"
                />
              )}
            </div>
          </Panel>
        ))}
      </div>

      <Panel>
        <PanelHeader
          title="Billing history"
          description="Invoices and receipts"
          action={<Badge tone="mint">Payments simulated</Badge>}
        />
        <PanelBody>
          <Table>
            <THead>
              <TR>
                <TH>Invoice</TH>
                <TH>Date</TH>
                <TH>Amount</TH>
                <TH className="text-right">Status</TH>
              </TR>
            </THead>
            <TBody>
              {INVOICES.map((inv) => (
                <TR key={inv.id}>
                  <TD className="font-medium text-ink">{inv.id}</TD>
                  <TD>{inv.date}</TD>
                  <TD>{inv.amount}</TD>
                  <TD className="text-right">
                    <Badge tone={inv.status === "paid" ? "green" : "amber"}>{inv.status}</Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <p className="mt-3 text-[11px] text-faint">
            Payments are processed securely by Dodo Payments (cards + crypto). Access is
            granted automatically once the payment is confirmed.
          </p>
        </PanelBody>
      </Panel>
    </div>
  );
}
