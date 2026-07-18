import { createId } from "../db/schema/_helpers";
import { db } from "../db/client";
import { budgets } from "../db/schema/cost";
import { workspaceSettings } from "../db/schema/intelligence";
import { workspaceMembers, workspaces } from "../db/schema/tenancy";
import { domains } from "../db/schema/workspace";
import { logger } from "../config/logger";

/** The 9 default domains every new workspace starts with (mirrors the UI). */
export const DEFAULT_DOMAINS = [
  { name: "Marketing", slug: "marketing", description: "Copy, SEO, social, and campaign ideas", icon: "Megaphone", color: "#f59e0b" },
  { name: "Coding", slug: "coding", description: "Dev prompts, debugging, and code generation", icon: "Code2", color: "#44edbc" },
  { name: "Study", slug: "study", description: "Learning, summaries, and exam prep", icon: "GraduationCap", color: "#60a5fa" },
  { name: "Business", slug: "business", description: "Strategy, ops, and decision support", icon: "Briefcase", color: "#a78bfa" },
  { name: "Research", slug: "research", description: "Literature review and analysis", icon: "Microscope", color: "#f472b6" },
  { name: "Resume", slug: "resume", description: "CV, cover letters, and interview prep", icon: "FileText", color: "#34d399" },
  { name: "Clients", slug: "clients", description: "Client deliverables and proposals", icon: "Users", color: "#fb923c" },
  { name: "School", slug: "school", description: "Assignments and coursework help", icon: "BookOpen", color: "#38bdf8" },
  { name: "Personal", slug: "personal", description: "Side projects and experiments", icon: "Sparkles", color: "#e879f9" },
] as const;

/** Default hard cap for new workspaces: $10/month in micro-dollars. */
const DEFAULT_MONTHLY_LIMIT_MICRO = 10_000_000;

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

/**
 * First-login setup: default workspace, owner membership, settings, budget,
 * and the 9 default domains. Runs from the Better Auth after-signup hook and
 * from the seed script. Idempotent per user (skips if a workspace exists).
 */
export async function onboardNewUser(user: { id: string; name: string }): Promise<string> {
  const existing = await db.query.workspaceMembers.findFirst({
    where: (m, { eq }) => eq(m.userId, user.id),
  });
  if (existing) return existing.workspaceId;

  const workspaceId = await db.transaction(async (tx) => {
    const firstName = user.name.trim().split(/\s+/)[0] || "My";
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        ownerUserId: user.id,
        name: `${firstName}'s Workspace`,
        slug: createId("wsl"), // opaque unique slug; users can rename later
      })
      .returning();

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    });

    await tx.insert(workspaceSettings).values({ workspaceId: workspace.id });

    await tx.insert(budgets).values({
      workspaceId: workspace.id,
      period: currentPeriod(),
      monthlyLimitMicro: DEFAULT_MONTHLY_LIMIT_MICRO,
    });

    await tx.insert(domains).values(
      DEFAULT_DOMAINS.map((d, i) => ({
        workspaceId: workspace.id,
        name: d.name,
        slug: d.slug,
        description: d.description,
        icon: d.icon,
        color: d.color,
        sortOrder: i,
      })),
    );

    return workspace.id;
  });

  logger.info({ userId: user.id, workspaceId }, "onboarded new user");
  return workspaceId;
}
