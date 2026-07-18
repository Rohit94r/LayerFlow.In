import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

export const learningLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);
export type LearningLevel = z.infer<typeof learningLevelSchema>;

export const challengeDifficultySchema = z.enum(["easy", "medium", "hard"]);
export type ChallengeDifficulty = z.infer<typeof challengeDifficultySchema>;

export const learningPathSchema = z.object({
  id: idSchema,
  slug: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  level: learningLevelSchema,
  sortOrder: z.number().int(),
  lessonCount: z.number().int().nonnegative(),
  createdAt: timestampSchema,
});
export type LearningPath = z.infer<typeof learningPathSchema>;

export const lessonSchema = z.object({
  id: idSchema,
  pathId: idSchema,
  slug: z.string(),
  title: z.string(),
  body: z.string(),
  sortOrder: z.number().int(),
});
export type Lesson = z.infer<typeof lessonSchema>;

export const challengeSchema = z.object({
  id: idSchema,
  lessonId: idSchema.nullish(),
  slug: z.string(),
  title: z.string(),
  instructions: z.string(),
  difficulty: challengeDifficultySchema,
});
export type Challenge = z.infer<typeof challengeSchema>;

/** GET /api/learning/paths */
export const listLearningPathsResponseSchema = z.object({
  paths: z.array(learningPathSchema),
});
export type ListLearningPathsResponse = z.infer<typeof listLearningPathsResponseSchema>;

/** GET /api/learning/paths/:id — path with its lessons (and their challenges). */
export const learningPathDetailResponseSchema = z.object({
  path: learningPathSchema,
  lessons: z.array(lessonSchema),
  challenges: z.array(challengeSchema),
});
export type LearningPathDetailResponse = z.infer<typeof learningPathDetailResponseSchema>;

/** GET /api/learning/lessons/:id */
export const lessonResponseSchema = z.object({
  lesson: lessonSchema,
  challenges: z.array(challengeSchema),
});
export type LessonResponse = z.infer<typeof lessonResponseSchema>;

/** GET /api/learning/challenges */
export const listChallengesResponseSchema = z.object({
  challenges: z.array(challengeSchema),
});
export type ListChallengesResponse = z.infer<typeof listChallengesResponseSchema>;

/** POST /api/learning/challenges/:id/submit */
export const submitChallengeRequestSchema = z.object({
  body: z.string().min(1).max(20_000),
  promptVersionId: idSchema.optional(),
});
export type SubmitChallengeRequest = z.infer<typeof submitChallengeRequestSchema>;

export const challengeSubmissionSchema = z.object({
  id: idSchema,
  challengeId: idSchema,
  status: z.enum(["submitted", "passed", "failed"]),
  /** 0-100. */
  score: z.number().int().min(0).max(100).nullish(),
  feedback: z.unknown().nullish(),
  createdAt: timestampSchema,
});
export type ChallengeSubmission = z.infer<typeof challengeSubmissionSchema>;

export const submitChallengeResponseSchema = z.object({
  submission: challengeSubmissionSchema,
});
export type SubmitChallengeResponse = z.infer<typeof submitChallengeResponseSchema>;

/** GET /api/learning/progress — per-path progress for the current user. */
export const pathProgressSchema = z.object({
  pathId: idSchema,
  pathTitle: z.string(),
  totalChallenges: z.number().int().nonnegative(),
  attemptedChallenges: z.number().int().nonnegative(),
  passedChallenges: z.number().int().nonnegative(),
});
export type PathProgress = z.infer<typeof pathProgressSchema>;

export const learningProgressResponseSchema = z.object({
  progress: z.array(pathProgressSchema),
});
export type LearningProgressResponse = z.infer<typeof learningProgressResponseSchema>;
