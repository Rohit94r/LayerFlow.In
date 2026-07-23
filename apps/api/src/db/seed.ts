import { eq } from "drizzle-orm";
import { db, pool } from "./client";
import { users } from "./schema/auth";
import { promptTags, prompts, promptVersions } from "./schema/prompts";
import { promptSessions, sessionMessages } from "./schema/sessions";
import { activityEvents, projects } from "./schema/workspace";
import { onboardNewUser } from "../services/onboarding";
import { seedLearning } from "../services/learning/seed";
import { logger } from "../config/logger";
import { seedModelPricingIfEmpty } from "./seed-pricing";

/**
 * Local/demo seed only (`npm run db:seed`).
 *
 * Creates a sample user (`alex@layerflow.dev`), onboarded workspace, projects,
 * prompts, learning content, and model_pricing rows. Idempotent.
 *
 * Never runs on API startup or deploy. Refuses remote DBs (e.g. Neon) unless
 * you explicitly set `ALLOW_PROD_SEED=1` — do not use that on production.
 */
function assertSafeToSeed(): void {
  if (process.env.ALLOW_PROD_SEED === "1") {
    logger.warn("ALLOW_PROD_SEED=1 — seeding anyway (not for production Neon)");
    return;
  }

  const url = process.env.DATABASE_URL ?? "";
  const looksRemote =
    /neon\.tech|supabase\.co|railway\.app|render\.com|\.aws\.|fly\.io|aivencloud|timescaledb\.cloud/i.test(
      url,
    );
  const looksLocal =
    /localhost|127\.0\.0\.1|@postgres(?::\d+)?\/|layerflow:layerflow@/i.test(url);

  if (looksRemote || (!looksLocal && url.length > 0)) {
    logger.error(
      "Refusing to seed: DATABASE_URL does not look like a local database. " +
        "db:seed is for local/demo only — never run it against Neon production. " +
        "Override only with ALLOW_PROD_SEED=1 (not recommended).",
    );
    process.exit(1);
  }
}

async function seed() {
  assertSafeToSeed();

  const DEV_USER_ID = "user_dev_alex";

  const pricingCount = await seedModelPricingIfEmpty();
  if (pricingCount > 0) {
    logger.info({ models: pricingCount }, "seeded model_pricing from model-registry");
  }

  await db
    .insert(users)
    .values({
      id: DEV_USER_ID,
      name: "Alex Chen",
      email: "alex@layerflow.dev",
      emailVerified: true,
    })
    .onConflictDoNothing();

  const workspaceId = await onboardNewUser({ id: DEV_USER_ID, name: "Alex Chen" });

  // Learning content is global (not workspace-scoped) and always safe to re-seed.
  await seedLearning();

  const existing = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.workspaceId, workspaceId),
  });
  if (existing) {
    logger.info({ workspaceId }, "seed data already present, nothing to do");
    await pool.end();
    return;
  }

  const codingDomain = await db.query.domains.findFirst({
    where: (d, { and, eq }) => and(eq(d.workspaceId, workspaceId), eq(d.slug, "coding")),
  });
  const resumeDomain = await db.query.domains.findFirst({
    where: (d, { and, eq }) => and(eq(d.workspaceId, workspaceId), eq(d.slug, "resume")),
  });
  if (!codingDomain || !resumeDomain) throw new Error("default domains missing");

  const [layerflowProject] = await db
    .insert(projects)
    .values({
      workspaceId,
      domainId: codingDomain.id,
      name: "LayerFlow App",
      description: "Core product prompts and experiments",
    })
    .returning();

  const [jobSearchProject] = await db
    .insert(projects)
    .values({
      workspaceId,
      domainId: resumeDomain.id,
      name: "Job Search 2026",
      description: "Resume and cover letter prompts",
    })
    .returning();

  // Prompt 1: sidebar prompt with a 3-version timeline.
  const [sidebarPrompt] = await db
    .insert(prompts)
    .values({
      workspaceId,
      domainId: codingDomain.id,
      projectId: layerflowProject.id,
      title: "App Sidebar Navigation",
      description: "Design a responsive sidebar for the AI workspace shell.",
      notes: "Reference Linear/Cursor aesthetic.",
    })
    .returning();

  const sidebarVersions = await db
    .insert(promptVersions)
    .values([
      {
        promptId: sidebarPrompt.id,
        workspaceId,
        version: 1,
        body: "Create a sidebar with links to main sections of an AI prompt management app.",
        note: "Initial draft",
        modelHint: "gpt-4o",
        createdByUserId: DEV_USER_ID,
      },
      {
        promptId: sidebarPrompt.id,
        workspaceId,
        version: 2,
        body: "Design a responsive sidebar for an AI workspace app. Include nav items for Workspace, Projects, Prompts, Compare, Budget, Settings, and Gateway.",
        note: "Added responsive behavior",
        modelHint: "claude-sonnet-4",
        createdByUserId: DEV_USER_ID,
      },
      {
        promptId: sidebarPrompt.id,
        workspaceId,
        version: 3,
        body: "Design a responsive sidebar for an AI workspace app. Include nav items for Workspace, Projects, Prompts, Compare, Budget, Settings, and Gateway. Use dark theme with subtle borders.",
        note: "Dark theme polish",
        modelHint: "gpt-4o",
        createdByUserId: DEV_USER_ID,
      },
    ])
    .returning();

  await db
    .update(prompts)
    .set({ currentVersionId: sidebarVersions[sidebarVersions.length - 1].id })
    .where(eq(prompts.id, sidebarPrompt.id));

  await db.insert(promptTags).values(
    ["ui", "navigation", "react"].map((tag) => ({
      promptId: sidebarPrompt.id,
      workspaceId,
      tag,
    })),
  );

  // Prompt 2: budget meter prompt with a single version.
  const [budgetPrompt] = await db
    .insert(prompts)
    .values({
      workspaceId,
      domainId: codingDomain.id,
      projectId: layerflowProject.id,
      title: "Hard Budget Meter UI",
      description: "Budget meter with block state when limit exceeded.",
    })
    .returning();

  const [budgetVersion] = await db
    .insert(promptVersions)
    .values({
      promptId: budgetPrompt.id,
      workspaceId,
      version: 1,
      body: "Create a progress bar showing AI spend vs monthly budget.",
      modelHint: "gpt-4o-mini",
      createdByUserId: DEV_USER_ID,
    })
    .returning();

  await db
    .update(prompts)
    .set({ currentVersionId: budgetVersion.id })
    .where(eq(prompts.id, budgetPrompt.id));

  // Prompt 3: resume prompt in the second project.
  const [resumePrompt] = await db
    .insert(prompts)
    .values({
      workspaceId,
      domainId: resumeDomain.id,
      projectId: jobSearchProject.id,
      title: "Resume Bullet Rewriter",
      description: "Rewrite resume bullets with impact metrics.",
    })
    .returning();

  const [resumeVersion] = await db
    .insert(promptVersions)
    .values({
      promptId: resumePrompt.id,
      workspaceId,
      version: 1,
      body: "Rewrite the following resume bullet points to emphasize measurable impact: {{bullets}}",
      modelHint: "gemini-2.5-flash",
      createdByUserId: DEV_USER_ID,
    })
    .returning();

  await db
    .update(prompts)
    .set({ currentVersionId: resumeVersion.id })
    .where(eq(prompts.id, resumePrompt.id));

  // One demo session: a conversation chain built on the resume prompt,
  // matching the "Resume Builder" session in lib/mock-data.ts.
  const [resumeSession] = await db
    .insert(promptSessions)
    .values({
      workspaceId,
      domainId: resumeDomain.id,
      projectId: jobSearchProject.id,
      title: "Resume Builder",
      description: "Iterating on resume bullets for the job search",
    })
    .returning();

  await db.insert(sessionMessages).values([
    {
      sessionId: resumeSession.id,
      workspaceId,
      role: "user" as const,
      body: "Rewrite the following resume bullet points to emphasize measurable impact: built internal dashboards.",
      promptId: resumePrompt.id,
      promptVersionId: resumeVersion.id,
      position: 0,
    },
    {
      sessionId: resumeSession.id,
      workspaceId,
      role: "assistant" as const,
      body: "Built 4 internal dashboards used by 30+ teammates weekly, cutting reporting time by 60%.",
      position: 1,
    },
    {
      sessionId: resumeSession.id,
      workspaceId,
      role: "user" as const,
      body: "Great — now make it sound less robotic and add the tech stack.",
      position: 2,
    },
  ]);

  await db.insert(activityEvents).values([
    {
      workspaceId,
      userId: DEV_USER_ID,
      type: "prompt.created",
      title: 'Created prompt "App Sidebar Navigation"',
      meta: { promptId: sidebarPrompt.id },
    },
    {
      workspaceId,
      userId: DEV_USER_ID,
      type: "session.created",
      title: 'Started session "Resume Builder"',
      meta: { sessionId: resumeSession.id },
    },
  ]);

  logger.info(
    { workspaceId, projects: 2, prompts: 3, sessions: 1, devUser: "alex@layerflow.dev" },
    "seed complete",
  );
  await pool.end();
}

seed().catch((err) => {
  logger.error({ err }, "seed failed");
  process.exit(1);
});
