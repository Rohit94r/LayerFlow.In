import { logger } from "../../config/logger";
import { db } from "../../db/client";
import { challenges, learningPaths, lessons } from "../../db/schema/learning";

/**
 * Idempotent seed of 2 beginner learning paths with a few lessons/challenges.
 * Called only from the local/demo `db:seed` script (never on API startup).
 * Safe to re-run (keyed on path slug). Do not run against Neon production.
 */
export async function seedLearning(): Promise<void> {
  const existing = await db.query.learningPaths.findFirst({
    where: (p, { eq }) => eq(p.slug, "prompting-basics"),
  });
  if (existing) {
    logger.info("learning seed already present");
    return;
  }

  const [basics] = await db
    .insert(learningPaths)
    .values({
      slug: "prompting-basics",
      title: "Prompting Basics",
      description: "Write clearer prompts: role, task, constraints, and examples.",
      level: "beginner",
      sortOrder: 0,
      published: true,
    })
    .returning();

  const [clarity] = await db
    .insert(lessons)
    .values({
      pathId: basics.id,
      slug: "be-specific",
      title: "Be Specific",
      body:
        "Vague prompts get vague answers. Name the audience, the format, and any hard constraints.\n\n" +
        "Bad: \"Write a blog post about AI.\"\n" +
        "Good: \"Write a 400-word blog post for junior developers explaining what a prompt is, with one concrete example.\"",
      sortOrder: 0,
    })
    .returning();

  const [roles] = await db
    .insert(lessons)
    .values({
      pathId: basics.id,
      slug: "give-a-role",
      title: "Give the Model a Role",
      body:
        "Starting with \"You are a …\" steers tone and expertise.\n\n" +
        "Example: \"You are a senior technical writer. Explain OAuth 2.0 to a product manager in plain English.\"",
      sortOrder: 1,
    })
    .returning();

  await db.insert(challenges).values([
    {
      lessonId: clarity.id,
      slug: "rewrite-vague-prompt",
      title: "Rewrite a Vague Prompt",
      instructions:
        "Rewrite this vague prompt so it specifies audience, length, and format:\n\n" +
        "\"Explain machine learning.\"\n\n" +
        "Your answer should include the words audience, format (or length), and at least one concrete constraint.",
      difficulty: "easy",
    },
    {
      lessonId: roles.id,
      slug: "role-prompt",
      title: "Write a Role Prompt",
      instructions:
        "Write a prompt that starts with \"You are\" (or \"Act as\") and asks the model to explain a technical topic to a non-technical audience.",
      difficulty: "easy",
    },
  ]);

  const [comparePath] = await db
    .insert(learningPaths)
    .values({
      slug: "compare-and-iterate",
      title: "Compare & Iterate",
      description: "Use multi-model compare to pick the best draft, then iterate.",
      level: "beginner",
      sortOrder: 1,
      published: true,
    })
    .returning();

  const [iterateLesson] = await db
    .insert(lessons)
    .values({
      pathId: comparePath.id,
      slug: "iterate-on-feedback",
      title: "Iterate on Feedback",
      body:
        "After you get an output, ask for a targeted rewrite instead of starting over.\n\n" +
        "Example: \"Keep the structure, but cut the intro in half and add one real-world example.\"",
      sortOrder: 0,
    })
    .returning();

  await db.insert(challenges).values({
    lessonId: iterateLesson.id,
    slug: "iteration-instruction",
    title: "Write an Iteration Instruction",
    instructions:
      "Write a short follow-up instruction that tells the model what to keep and what to change. " +
      "Include the words \"keep\" and \"change\" (or \"rewrite\").",
    difficulty: "easy",
  });

  logger.info({ paths: 2, lessons: 3, challenges: 3 }, "learning seed complete");
}
