import { Hono } from "hono";
import {
  createCommentRequestSchema,
  likeRequestSchema,
  type CommentResponse,
  type LikeStatusResponse,
  type ListCommentsResponse,
} from "@layerflow/contracts";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import {
  createComment,
  deleteComment,
  likeSubject,
  listComments,
  unlikeSubject,
} from "../../services/community/social";
import type { AppEnv } from "../../types";

export const likesRouter = new Hono<AppEnv>();
likesRouter.use(requireAuth);

// POST /api/likes  { subjectType, subjectId }
likesRouter.post("/", async (c) => {
  const body = likeRequestSchema.parse(await c.req.json());
  const result = await likeSubject(c.get("userId"), body);
  const response: LikeStatusResponse = result;
  return c.json(response, 201);
});

// DELETE /api/likes  { subjectType, subjectId }
likesRouter.delete("/", async (c) => {
  const body = likeRequestSchema.parse(await c.req.json());
  const result = await unlikeSubject(c.get("userId"), body);
  const response: LikeStatusResponse = result;
  return c.json(response);
});

export const commentsRouter = new Hono<AppEnv>();
commentsRouter.use(requireAuth);

// GET /api/comments?subjectType=&subjectId=
commentsRouter.get("/", async (c) => {
  const query = z
    .object({
      subjectType: z.enum(["prompt", "collection"]),
      subjectId: z.string().min(1),
    })
    .parse(c.req.query());
  const comments = await listComments(query.subjectType, query.subjectId);
  const response: ListCommentsResponse = { comments };
  return c.json(response);
});

// POST /api/comments
commentsRouter.post("/", async (c) => {
  const body = createCommentRequestSchema.parse(await c.req.json());
  const comment = await createComment(c.get("userId"), body);
  const response: CommentResponse = { comment };
  return c.json(response, 201);
});

// DELETE /api/comments/:id
commentsRouter.delete("/:id", async (c) => {
  await deleteComment(c.get("userId"), c.req.param("id"));
  return c.body(null, 204);
});
