import { getCurrentSubscription } from "../services/billing/dodo";
import { isBillingConfigured } from "../services/billing/dodo";

/**
 * Plan-based feature access for managed-mode AI calls.
 *
 * When LayerFlow uses its own platform keys (not BYOK), the user's plan
 * determines what they can access:
 *
 *   free    → only free-tier providers (groq, gemini)
 *   starter → free-tier + cheap providers (deepseek, kimi, xai-mini)
 *   pro     → all providers including flagship (openai, anthropic)
 *   team    → all providers
 *
 * If billing is not configured yet, all managed calls are allowed (beta mode).
 * BYOK calls are never gated — the user pays the provider directly.
 */

const PLAN_PROVIDER_ACCESS: Record<string, Set<string>> = {
  free: new Set(["groq", "google"]),
  starter: new Set(["groq", "google", "deepseek", "kimi", "xai", "opencode"]),
  pro: new Set(["groq", "google", "deepseek", "kimi", "xai", "openai", "anthropic", "openrouter", "opencode"]),
  team: new Set(["groq", "google", "deepseek", "kimi", "xai", "openai", "anthropic", "openrouter", "opencode"]),
};

export function getPlanForWorkspace(workspaceId: string): ReturnType<typeof getCurrentSubscription> {
  return getCurrentSubscription(workspaceId);
}

/**
 * Check if a managed-mode call to a provider is allowed by the user's plan.
 * Returns true if:
 * - billing is not configured (beta mode — everything allowed)
 * - the user has BYOK for this provider (BYOK is never gated)
 * - the user's plan includes this provider
 */
export async function canUseManagedProvider(
  workspaceId: string,
  provider: string,
  hasByok: boolean,
): Promise<{ allowed: boolean; reason?: string; plan: string }> {
  // BYOK is always allowed — user pays provider directly.
  if (hasByok) {
    return { allowed: true, plan: "byok" };
  }

  // Beta mode: billing not configured → everything allowed.
  if (!isBillingConfigured()) {
    return { allowed: true, plan: "beta" };
  }

  const sub = await getCurrentSubscription(workspaceId);
  const plan = sub.active ? sub.plan : "free";
  const allowedProviders = PLAN_PROVIDER_ACCESS[plan] ?? PLAN_PROVIDER_ACCESS.free;

  if (allowedProviders.has(provider)) {
    return { allowed: true, plan };
  }

  return {
    allowed: false,
    reason: `Your ${plan} plan doesn't include ${provider} managed access. Add your own ${provider} API key (BYOK) or upgrade to ${plan === "free" ? "Starter" : "Pro"}.`,
    plan,
  };
}
