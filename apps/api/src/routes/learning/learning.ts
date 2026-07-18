import { Hono } from "hono";
import {
  submitChallengeRequestSchema,
  type LearningPathDetailResponse,
  type LearningProgressResponse,
  type LessonResponse,
  type ListChallengesResponse,
  type ListLearningPathsResponse,
  type SubmitChallengeResponse,
} from "@layerflow/contracts";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import {
  getLesson,
  getPathDetail,
  getProgress,
  listChallenges,
  listPaths,
  submitChallenge,
} from "../../services/learning/learning";
import type { AppEnv } from "../../types";

export const learningRouter = new Hono<AppEnv>();
learningRouter.use(requireAuth);

// GET /api/learning/paths
learningRouter.get("/paths", async (c) => {
  const paths = await listPaths();
  const response: ListLearningPathsResponse = { paths };
  return c.json(response);
});

// GET /api/learning/paths/:id (id or slug)
learningRouter.get("/paths/:id", async (c) => {
  const detail = await getPathDetail(c.req.param("id"));
  const response: LearningPathDetailResponse = detail;
  return c.json(response);
});

// GET /api/learning/lessons/:id
learningRouter.get("/lessons/:id", async (c) => {
  const detail = await getLesson(c.req.param("id"));
  const response: LessonResponse = detail;
  return c.json(response);
});

// GET /api/learning/challenges?lessonId=
learningRouter.get("/challenges", async (c) => {
  const query = z
    .object({ lessonId: z.string().optional() })
    .parse(c.req.query());
  const challenges = await listChallenges(query.lessonId);
  const response: ListChallengesResponse = { challenges };
  return c.json(response);
});

// POST /api/learning/challenges/:id/submit
learningRouter.post("/challenges/:id/submit", async (c) => {
  const body = submitChallengeRequestSchema.parse(await c.req.json());
  const submission = await submitChallenge(
    c.get("workspaceId"),
    c.get("userId"),
    c.req.param("id"),
    body,
  );
  const response: SubmitChallengeResponse = { submission };
  return c.json(response, 201);
});

// GET /api/learning/progress
learningRouter.get("/progress", async (c) => {
  const progress = await getProgress(c.get("workspaceId"), c.get("userId"));
  const response: LearningProgressResponse = { progress };
  return c.json(response);
});
