import { inArray, sql } from "drizzle-orm";
import type {
  Challenge,
  ChallengeSubmission,
  LearningPath,
  Lesson,
  PathProgress,
  SubmitChallengeRequest,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import {
  challengeSubmissions,
  challenges,
  learningPaths,
  lessons,
} from "../../db/schema/learning";
import { AppError } from "../../middleware/app-error";

export function toPathDto(
  row: typeof learningPaths.$inferSelect,
  lessonCount: number,
): LearningPath {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    level: row.level,
    sortOrder: row.sortOrder,
    lessonCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toLessonDto(row: typeof lessons.$inferSelect): Lesson {
  return {
    id: row.id,
    pathId: row.pathId,
    slug: row.slug,
    title: row.title,
    body: row.body,
    sortOrder: row.sortOrder,
  };
}

export function toChallengeDto(row: typeof challenges.$inferSelect): Challenge {
  return {
    id: row.id,
    lessonId: row.lessonId,
    slug: row.slug,
    title: row.title,
    instructions: row.instructions,
    difficulty: row.difficulty,
  };
}

export async function listPaths(): Promise<LearningPath[]> {
  const rows = await db.query.learningPaths.findMany({
    where: (p, { eq }) => eq(p.published, true),
    orderBy: (p, { asc }) => [asc(p.sortOrder)],
  });
  if (rows.length === 0) return [];

  const counts = await db
    .select({
      pathId: lessons.pathId,
      count: sql<number>`count(*)::int`,
    })
    .from(lessons)
    .where(
      inArray(
        lessons.pathId,
        rows.map((r) => r.id),
      ),
    )
    .groupBy(lessons.pathId);
  const byPath = new Map(counts.map((c) => [c.pathId, Number(c.count)]));

  return rows.map((r) => toPathDto(r, byPath.get(r.id) ?? 0));
}

export async function getPathDetail(pathIdOrSlug: string) {
  const path = await db.query.learningPaths.findFirst({
    where: (p, { or, eq }) =>
      or(eq(p.id, pathIdOrSlug), eq(p.slug, pathIdOrSlug)),
  });
  if (!path || !path.published) throw new AppError(404, "not_found", "Learning path not found");

  const pathLessons = await db.query.lessons.findMany({
    where: (l, { eq }) => eq(l.pathId, path.id),
    orderBy: (l, { asc }) => [asc(l.sortOrder)],
  });
  const lessonIds = pathLessons.map((l) => l.id);
  const pathChallenges =
    lessonIds.length === 0
      ? []
      : await db.query.challenges.findMany({
          where: (c, { inArray }) => inArray(c.lessonId, lessonIds),
          orderBy: (c, { asc }) => [asc(c.createdAt)],
        });

  return {
    path: toPathDto(path, pathLessons.length),
    lessons: pathLessons.map(toLessonDto),
    challenges: pathChallenges.map(toChallengeDto),
  };
}

export async function getLesson(lessonId: string) {
  const lesson = await db.query.lessons.findFirst({
    where: (l, { eq }) => eq(l.id, lessonId),
  });
  if (!lesson) throw new AppError(404, "not_found", "Lesson not found");

  const lessonChallenges = await db.query.challenges.findMany({
    where: (c, { eq }) => eq(c.lessonId, lesson.id),
  });
  return {
    lesson: toLessonDto(lesson),
    challenges: lessonChallenges.map(toChallengeDto),
  };
}

export async function listChallenges(lessonId?: string): Promise<Challenge[]> {
  const rows = lessonId
    ? await db.query.challenges.findMany({
        where: (c, { eq }) => eq(c.lessonId, lessonId),
      })
    : await db.query.challenges.findMany({
        orderBy: (c, { asc }) => [asc(c.createdAt)],
        limit: 100,
      });
  return rows.map(toChallengeDto);
}

/**
 * Beginner-friendly auto-grader: keyword checks derived from the challenge
 * instructions. Not an LLM judge — just enough to make /progress meaningful
 * in local/dev without calling a model.
 */
function gradeSubmission(instructions: string, body: string): {
  status: "passed" | "failed";
  score: number;
  feedback: { matched: string[]; missing: string[]; note: string };
} {
  const lower = body.toLowerCase();
  const hints: string[] = [];

  // Pull a few meaningful words from the instructions (quoted phrases + cue words).
  for (const match of instructions.matchAll(/"([^"]{3,40})"/g)) {
    hints.push(match[1].toLowerCase());
  }
  for (const cue of ["you are", "act as", "audience", "format", "keep", "change", "rewrite", "length"]) {
    if (instructions.toLowerCase().includes(cue)) hints.push(cue);
  }

  const unique = Array.from(new Set(hints)).slice(0, 6);
  if (unique.length === 0) {
    // Fallback: any submission ≥ 40 chars "passes" so empty seeds don't brick the API.
    const ok = body.trim().length >= 40;
    return {
      status: ok ? "passed" : "failed",
      score: ok ? 70 : 20,
      feedback: {
        matched: [],
        missing: ok ? [] : ["a substantive answer (≥ 40 characters)"],
        note: "Auto-graded by length (no keyword hints on this challenge).",
      },
    };
  }

  const matched = unique.filter((h) => lower.includes(h));
  const missing = unique.filter((h) => !lower.includes(h));
  const score = Math.round((matched.length / unique.length) * 100);
  const status = score >= 50 ? "passed" : "failed";
  return {
    status,
    score,
    feedback: {
      matched,
      missing,
      note: "Auto-graded by keyword coverage against the challenge instructions.",
    },
  };
}

export async function submitChallenge(
  workspaceId: string,
  userId: string,
  challengeId: string,
  input: SubmitChallengeRequest,
): Promise<ChallengeSubmission> {
  const challenge = await db.query.challenges.findFirst({
    where: (c, { eq }) => eq(c.id, challengeId),
  });
  if (!challenge) throw new AppError(404, "not_found", "Challenge not found");

  const grade = gradeSubmission(challenge.instructions, input.body);

  const [row] = await db
    .insert(challengeSubmissions)
    .values({
      challengeId,
      workspaceId,
      userId,
      promptVersionId: input.promptVersionId ?? null,
      body: input.body,
      status: grade.status,
      score: grade.score,
      feedback: grade.feedback,
    })
    .returning();

  return {
    id: row.id,
    challengeId: row.challengeId,
    status: row.status,
    score: row.score,
    feedback: row.feedback,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getProgress(
  workspaceId: string,
  userId: string,
): Promise<PathProgress[]> {
  const paths = await listPaths();
  if (paths.length === 0) return [];

  const allLessons = await db.query.lessons.findMany({
    where: (l, { inArray }) => inArray(l.pathId, paths.map((p) => p.id)),
  });
  const lessonsByPath = new Map<string, string[]>();
  for (const lesson of allLessons) {
    const list = lessonsByPath.get(lesson.pathId) ?? [];
    list.push(lesson.id);
    lessonsByPath.set(lesson.pathId, list);
  }

  const allChallenges = await db.query.challenges.findMany();
  const challengesByLesson = new Map<string, string[]>();
  for (const ch of allChallenges) {
    if (!ch.lessonId) continue;
    const list = challengesByLesson.get(ch.lessonId) ?? [];
    list.push(ch.id);
    challengesByLesson.set(ch.lessonId, list);
  }

  const submissions = await db.query.challengeSubmissions.findMany({
    where: (s, { and, eq }) => and(eq(s.workspaceId, workspaceId), eq(s.userId, userId)),
  });

  return paths.map((path) => {
    const lessonIds = lessonsByPath.get(path.id) ?? [];
    const challengeIds = lessonIds.flatMap((id) => challengesByLesson.get(id) ?? []);
    const challengeSet = new Set(challengeIds);
    const relevant = submissions.filter((s) => challengeSet.has(s.challengeId));
    const attempted = new Set(relevant.map((s) => s.challengeId));
    const passed = new Set(
      relevant.filter((s) => s.status === "passed").map((s) => s.challengeId),
    );
    return {
      pathId: path.id,
      pathTitle: path.title,
      totalChallenges: challengeIds.length,
      attemptedChallenges: attempted.size,
      passedChallenges: passed.size,
    };
  });
}
