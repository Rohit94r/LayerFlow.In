import { CreditCard, Check, Zap, Shield } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/shared/stat";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { billingService } from "@/lib/services/billing";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { cn } from "@/lib/utils";



export default async function BillingPage() {
  const { plans, subscription, invoices } = await billingService.getStatus();
  const isFree = subscription.plan === "free";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description={
          isFree
            ? "Choose Pro to unlock unlimited gateway requests, cost exports, and full spend control."
            : "You're on the Pro plan."
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Current plan" value={subscription.plan === "free" ? "Free" : subscription.plan} icon={<Zap className="h-4 w-4" />} />
        <Stat label="Status" value={subscription.active ? "Active" : subscription.status} icon={<Shield className="h-4 w-4" />} />
        {subscription.currentPeriodEnd ? (
          <Stat
            label="Renews"
            value={new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            icon={<CreditCard className="h-4 w-4" />}
          />
        ) : (
          <Stat label="Period" value="—" icon={<CreditCard className="h-4 w-4" />} />
        )}
        <Stat
          label={isFree ? "Billing" : "Amount due"}
          value={isFree ? "Not configured" : "$0.00"}
          icon={<Shield className="h-4 w-4" />}
        />
      </div>

      {!subscription.configured && isFree ? (
        <Panel>
          <PanelHeader
            title="Billing not configured"
            description="LayerFlow uses Dodo Payments. An admin needs to set DODO_PRODUCT_PRO in the API environment."
          />
          <PanelBody>
            <p className="text-sm text-muted">
              You can still use all features on the Free plan. Once billing is
              configured, upgrade buttons will become active.
            </p>
          </PanelBody>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = !isFree && subscription.plan === plan.id;
          return (
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
                <span className="text-3xl font-bold tracking-tight text-ink">{plan.priceLabel}</span>
              </p>
              {plan.trialPeriodDays ? (
                <p className="mt-1 text-xs text-faint">{plan.trialPeriodDays}-day trial</p>
              ) : null}
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
                {isCurrent ? (
                  <Button variant="secondary" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : isFree && !subscription.configured ? (
                  <Button variant="outline" className="w-full" disabled>
                    Configure billing first
                  </Button>
                ) : (
                  <CheckoutButton
                    plan={plan.id}
                    label={isFree ? "Choose" : "Upgrade"}
                    variant={plan.highlighted ? "primary" : "outline"}
                    className="w-full"
                  />
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel>
        <PanelHeader
          title="Billing history"
          description={invoices.length === 0 ? "No invoices yet" : "Paid invoices"}
        />
        <PanelBody>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted">
              No invoices yet. Upgrade to a paid plan to generate your first invoice.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Invoice</TH>
                  <TH>Date</TH>
                  <TH className="text-right">Amount</TH>
                  <TH className="text-right">Status</TH>
                </TR>
              </THead>
              <TBody>
                {invoices.map((inv) => (
                  <TR key={inv.id}>
                    <TD className="font-medium text-ink">{inv.id}</TD>
                    <TD>{inv.date}</TD>
                    <TD className="text-right">{inv.amount}</TD>
                    <TD className="text-right">
                      <Badge tone={inv.status === "paid" ? "green" : "amber"}>{inv.status}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
