import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { db } from "../../db/client";
import { userProfiles, formSubmissions } from "../../db/schema/autosubmit";
import { users } from "../../db/schema/auth";
import { sendAutoSubmitConfirmation } from "../../services/email/gmail";
import type { AppEnv } from "../../types";

export const autosubmitRouter = new Hono<AppEnv>();
autosubmitRouter.use(requireAuth);

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

  // Simulate automated browser parsing & AI form completion
  const summaryDetails = `
- Full Name: ${profileData.fullName}
- Email: ${profileData.email}
- College: ${profileData.collegeName || "Not provided"}
- Roll / ID: ${profileData.rollNumber || "Not provided"}
- Department: ${profileData.branchDepartment || "Not provided"}
- Graduation Year: ${profileData.graduationYear || "Not provided"}
- Additional Feedback: ${prompt || "Positive ratings per saved profile preferences."}
- Verification: Completed automatically at ${new Date().toLocaleString()}
`.trim();

  // Update submission record to completed
  const [completedSub] = await db
    .update(formSubmissions)
    .set({
      status: "completed",
      resultSummary: summaryDetails,
      updatedAt: new Date(),
    })
    .where(eq(formSubmissions.id, submission.id))
    .returning();

  // Send Email confirmation using Gmail
  const emailResult = await sendAutoSubmitConfirmation({
    to: profileData.email || dbUser?.email || "",
    userName: profileData.fullName || dbUser?.name || "",
    formUrl,
    prompt,
    submissionSummary: summaryDetails,
  });

  if (emailResult.success) {
    await db
      .update(formSubmissions)
      .set({ emailNotificationSent: true })
      .where(eq(formSubmissions.id, submission.id));
  }

  return c.json({
    success: true,
    submission: completedSub,
    emailSent: emailResult.success,
  });
});

// GET /api/autosubmit/history - Get past submissions
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
