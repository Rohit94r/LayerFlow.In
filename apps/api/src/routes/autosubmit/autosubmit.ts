import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { db } from "../../db/client";
import { userProfiles, formSubmissions } from "../../db/schema/autosubmit";
import { users } from "../../db/schema/auth";
import { deviceCommands } from "../../db/schema/terminal";
import { sendAutoSubmitConfirmation } from "../../services/email/gmail";
import type { AppEnv } from "../../types";

export const autosubmitRouter = new Hono<AppEnv>();
autosubmitRouter.use(requireAuth);
const DEVICE_ID = process.env.LF_FORM_FILLER_DEVICE_ID ?? "lf-form-filler";

const saveProfileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  collegeName: z.string().optional(),
  rollNumber: z.string().optional(),
  branchDepartment: z.string().optional(),
  graduationYear: z.string().optional(),
  bioDetails: z.string().optional(),
  customFields: z.record(z.string(), z.string()).optional(),
});

const submitFormSchema = z.object({
  formUrl: z.string().url("Valid Form URL is required"),
  prompt: z.string().optional(),
});

// GET /api/autosubmit/profile - Retrieve current user's profile
autosubmitRouter.get("/profile", async (c) => {
  const userId = c.get("userId");
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  return c.json({
    profile: profile || {
      fullName: dbUser?.name || "",
      email: dbUser?.email || "",
      phone: "",
      collegeName: "",
      rollNumber: "",
      branchDepartment: "",
      graduationYear: "",
      bioDetails: "",
      customFields: {},
    },
  });
});

// POST /api/autosubmit/profile - Create or update profile
autosubmitRouter.post("/profile", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = saveProfileSchema.parse(body);

  const [existing] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  let updated;
  if (existing) {
    [updated] = await db
      .update(userProfiles)
      .set({
        ...parsed,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, existing.id))
      .returning();
  } else {
    [updated] = await db
      .insert(userProfiles)
      .values({
        userId,
        ...parsed,
      })
      .returning();
  }

  return c.json({ profile: updated });
});

// POST /api/autosubmit/submit - Process form auto-submission
autosubmitRouter.post("/submit", async (c) => {
  const userId = c.get("userId");
  const workspaceId = c.get("workspaceId");
  const body = await c.req.json();
  const { formUrl, prompt } = submitFormSchema.parse(body);

  const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  // Retrieve user profile
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const profileData = profile || {
    fullName: dbUser?.name || "",
    email: dbUser?.email || "",
    collegeName: "",
    rollNumber: "",
    branchDepartment: "",
    graduationYear: "",
    bioDetails: "",
  };

  // Create submission record
  const [submission] = await db
    .insert(formSubmissions)
    .values({
      workspaceId,
      userId,
      formUrl,
      prompt: prompt || "Auto-fill college form with saved profile and positive ratings",
      status: "processing",
    })
    .returning();

    // NO fabrication. AutoSubmit enqueues a REAL browser-fill job for the
  // form-filler daemon (Playwright + your logged-in Google profile). The
  // daemon opens the REAL form, fills the REAL fields from the saved profile,
  // clicks the REAL submit, and reports back on the REAL confirmation page.
  // Email is only sent on REAL success via the terminal result handler.
  await db.insert(deviceCommands).values({
    workspaceId,
    userId,
    deviceId: DEVICE_ID || "lf-form-filler",
    command: `LF_FORM_FILL ${JSON.stringify({
      submission_id: submission.id,
      form_url: formUrl,
      prompt: prompt ?? "",
      profile: profileData,
    })}`,
    status: "pending",
    output: "",
  });

  return c.json({
    success: true,
    submission: {
      id: submission.id,
      formUrl,
      prompt: prompt ?? "",
      status: "processing",
      createdAt: submission.createdAt,
    },
  });
});

// GET /api/autosubmit/history - Get past submissions for this user
autosubmitRouter.get("/history", async (c) => {
  const userId = c.get("userId");
  const workspaceId = c.get("workspaceId");

  const history = await db
    .select()
    .from(formSubmissions)
    .where(and(eq(formSubmissions.workspaceId, workspaceId), eq(formSubmissions.userId, userId)))
    .orderBy(desc(formSubmissions.createdAt))
    .limit(50);

  return c.json({ history });
});
